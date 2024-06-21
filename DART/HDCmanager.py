from itertools import repeat, combinations, product
from pandas.api.types import is_numeric_dtype
from collections.abc import Iterable
from functools import reduce
from pathlib import Path
import pandas as pd
import numpy as np
import torchhd
import sqlite3
import torch
import dill
import math
import re




# DEFAULTS -> eventually move to some kind of config file
MAX_BINS_PER_ATTRIBUTE = 10
PREFERRED_BINS = [1, 5, 10]
DIMENSIONALITY = 10000
VSA_MODEL = "MAP" # torchhd default
SIMILARITY_MEASURE = "cosine"
ALLOW_OVERLAP = False # TODO
REMOVE_INHERENT = True # TODO
BY_ID = True



similarity = {
    "cosine": torchhd.cosine_similarity,
    "dot" : torchhd.dot_similarity,
    "hamming": torchhd.hamming_similarity,
}

def pairwise_similarity(hypervectors, names:list=[], similarity_measure=SIMILARITY_MEASURE, verbose=True):
    """ calculate the pairwise similarity between the groups. """
    if isinstance(hypervectors, dict): # name:hypervector pairs
        names = list(hypervectors.keys())
        hypervectors = list(hypervectors.values())
    if names:
        assert len(names) == len(hypervectors) # TODO: better error handling
        name_map = dict(enumerate(names))
    combined = torch.cat(hypervectors)
    n = len(hypervectors)
    similarities = {}
    for i, HV in enumerate(hypervectors):
        if verbose:
            print(f"Calculating pairwise similarity... ({i}/{n})", end="\r")
        if names:
            pairs = zip(repeat(name_map[i]), (name_map[x] for x in range(n)))
        else:
            pairs = zip(repeat(i), range(n))  
        sim = similarity[similarity_measure](HV, combined)[0]
        sim = [tens.item() for tens in torch.split(sim, 1)]
        sim = dict(zip(pairs, sim))
        similarities = similarities | sim
    if verbose:
        print(f"Calculating pairwise similarity... ({i+1}/{n})")
    return similarities
    
def map_names(names:list, keys:Iterable[tuple[int,int]]):
    map1 = dict(enumerate(names))
    out = {}
    for key in keys:
        out[key] = tuple([map1[k] for k in key])
    
    return out

def create_hypervectors(values, variable_type:str, vsa_model=VSA_MODEL, dimensionality=DIMENSIONALITY, **kwargs):
    try:
        values = sorted(values)
    except: 
        values = [v.name for v in values]
        values = sorted(values)
    if variable_type == "categorical":
        func = torchhd.random
    elif variable_type == "numeric":
        func = torchhd.level
    HV = func(len(values), dimensionality, vsa=vsa_model, **kwargs)
    return {v: HV[[i],:] for i,v in enumerate(values)}
    
    
def remove_inherent(values:dict, inherent):
    return {k:v for (k,v) in values.items() if k not in inherent}
        
def determine_matching(criteria1, criteria2, group1, group2):
    """ Determine which of the subgroups are matching and for which the equivalent are missing """
    #TODO: work with all numeric operators (>, <, <=, >=) 
    atts1 = [c.split("=")[0] for c in criteria1]
    atts2 = [c.split("=")[0] for c in criteria2]
    #extract the non-user-specified portion of the subgroups found
    sub1 = {k:remove_inherent(v, atts1) for (k,v) in group1.items()}
    sub2 = {k:remove_inherent(v, atts2) for (k,v) in group2.items()}
    # see which of the subgroups are represented in both specified populations and get the equivalent subgroup's id
    pairs = []
    for k in sub1:
        corresponding = list(filter(lambda x: sub2[x] == sub1[k], sub2))
        if len(corresponding) == 1:
            k2 = corresponding[0]
            pairs.append((k,k2))
            
    return pairs
    
    

class Manager(object):
    def __init__(
            self, 
            name:str,
            data_file=None, 
            taxonomy_file=None, 
            save_location="../localdata",
            id_col = None,
            attributes = [],
        ):
        self.name = name
        self.path = Path(save_location).resolve() / Path(f"{name}.pickle")
        self.DBpath = Path(save_location).resolve() / Path(f"{name}.db")
        overwrite = True # TODO -> make this an option
        if self.path.exists(): # TODO: ask if overwrite or just open
            print(f"WARNING: a file already exists at {self.path}, but I haven't implemented overwrite protection yet.")
            if overwrite:
                self.path.unlink() # delete the existing file
        
        if not self.path.exists(): # triggers if there has never been a file there or if overwriting
            self.setup(data_file, taxonomy_file, id_col, attributes)
            
        self.init_connection()
        
    def init_connection(self):
        self.DB_path = self.path.with_suffix(".db")
        self.conn = sqlite3.connect(self.DBpath)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        
    def save(self): # TODO
        """ Save to a pickle file. """
        print(f"Saving to {self.path}")
        del self.cursor # can't pickle a sqlite3 cursor
        with self.path.open("wb") as file:
            dill.dump(self, file)
        self.init_connection()
            
    @classmethod
    def from_file(cls, pickle_file):
        #obj = cls.__new__(cls)
        with open(pickle_file, "rb") as file:
            obj = dill.load(file)
        obj.init_connection()
        return obj

    
    def setup(self, data_file, taxonomy_file, id_col, attributes):
        assert data_file  # TODO: better error handling
        print(f"Creating the database {self.name} at {self.path}")
        data_file = Path(data_file)
        

        assert data_file.exists()  # TODO: better error handling
        data = pd.read_csv(data_file) # TODO: other file types
        
        if id_col:
            assert id_col in data.columns # TODO: better error handling

        # pre-process attributes (names and values)
        self.attributes = []
        
        if attributes: # a list of attributes was provided
            if not set(attributes).issubset(set(data.columns.tolist())):
                data = pd.read_csv(data_file, sep="\t") # DEBUG _> some csvs save as tsvs
            assert set(attributes).issubset(set(data.columns.tolist())) # TODO: better error handling
        else:
            attributes = list(set(data.columns.tolist()) - set([id_col]))
            
        if isinstance(attributes, dict): # data type information provided
            for c, info in attributes.items():
                if info["type"] == "numeric":
                    A = NumericAttribute(name=c, unique=data[c].unique(), _min=info["min"], _max=info["max"], step=info["step"], bin=info["bin"])
                else:
                    A = CategoricalAttribute(name=c, unique=info["options"])
                    data[c] = data[c].apply(format_name)
                    
                self.attributes.append(A)
        else:
            for c in attributes:
                # detect the data type (categorical or numeric)
                # TODO: have a way to override detected data type?
                if is_numeric_dtype(data[c]):
                    A = NumericAttribute(name=c, unique=data[c].unique())
                else:
                    A = CategoricalAttribute(name=c, unique=data[c].unique())
                    data[c] = data[c].apply(format_name)
                
                self.attributes.append(A)
        
        if id_col:
            data = data[[id_col] + list(attributes)].copy() # limit the data to the indicated attributes
        else:
            data = data[list(attributes)].copy() # limit the data to the indicated attributes
        data.rename(columns={c: format_name(c) for c in attributes}, inplace=True)
        if id_col: # TODO (?) allow other id names
            data.rename(columns={id_col: "id"}, inplace=True)
        else: # create a new column named id -> will be a by-sample ID
            data.reset_index(names=["id"], inplace=True)
        
        print(data.head(10)) # DEBUG
        
        # create the database file
        print(f"Creating a database file at: {self.DBpath}")
        if self.DBpath.exists(): # remove the DB file if one already exists
            self.DBpath.unlink() 
        
        conn = sqlite3.connect(self.DBpath)
        self.cursor = conn.cursor()
        data.to_sql("samples", conn , index=False)
        conn.commit()
        
        # Determine the scale factor for each id (used during by_id analysis to ensure that each id has an equal weight, rather than each sample)
        # since this is done via multiplication, larger scale factors should not affect computation time
        ref_col = [c for c in data.columns if c != "id"][0] # arbitrary reference column
        counts = data[["id", ref_col]].copy().rename(columns={ref_col:"count"})
        counts = counts.groupby("id", as_index=False)["count"].count()
        lcm = math.lcm(*counts['count'].values.tolist())
        scale_factor = counts.copy()
        scale_factor['scale_factor'] = lcm / scale_factor['count']
        scale_factor = scale_factor.astype({"scale_factor": "int"})
        scale_factor.drop(columns=['count'], inplace=True)
        
        # create the scale database
        scale_factor.to_sql("scale", conn, index=False)
        conn.commit()
        
        
        # Create a list of the potential subgroups and the number of ids and samples in each (used to select subgroups later)
        attributes = [a.name for a in self.attributes]
        attribute_combinations = []
        for i in range(len(self.attributes) + 1):
            attribute_combinations += list(combinations(attributes, i))
        
        subgroups = pd.DataFrame(columns=attributes)
        for ac in attribute_combinations:
            options = [self.fetch_attribute(att).options for att in ac] # TODO: bin numeric, fetch name for categorical values
            temp = pd.DataFrame(product(*options), columns=[*ac])
            subgroups = pd.concat([subgroups, temp], ignore_index=True)
        
        subgroups['num_attributes'] = subgroups.apply(lambda row: row.notnull().sum(), axis=1)
        subgroups = subgroups.replace(np.nan, None)

        num = [] # (num samples, num ids)
        for _, subgroup in subgroups.iterrows():
            att_values = [subgroup[a] for a in attributes]
            criteria = []
            for (att, value) in zip(attributes, att_values):
                criteria += format_subgroup_criteria(att, value)
            res = self.fetch_subgroup(*criteria, cols=['samples.id'])
            num.append(( len(res), len(set([x[0] for x in res]))))
        subgroups[["num_samples", "num_ids"]] = num        
        subgroups.to_sql("subgroups", conn, index=True)
        conn.commit()
        
        
        # TODO: confirm attribute details?
        self.hypervectors = {att.name: {} for att in self.attributes}
        # TODO: create role hypervectors? (Only needed if we are doing querying, right?)
        
        for att in self.attributes:
            self.create_attribute_hypervectors(att)
            
        self.save()
        
        
    def create_attribute_hypervectors(self, attribute): 
        if isinstance(attribute, str):
            attribute = self.fetch_attribute(attribute)
        self.hypervectors[attribute.name] = create_hypervectors(attribute.values, attribute.type)
        
    def basis_similarity(self, verbose=False, groups=True): # TODO: figure out why not every single combination is calculated (seems to miss a small random subset every time)
        """ 
        Get the pairwise similarity between the basis hypervectors. 
        NOTE: as is, this only works if there are no attribute values that are present in more than one attribute
        """
        names = []
        for k,v in self.hypervectors.items():
            names += list(zip(repeat(k), v))
        hypervectors = [self.hypervectors[att][val] for (att,val) in names]
        names = [name[1] for name in names]
        sim = pairwise_similarity(hypervectors, names)
        if groups:
            groups = {k:list(v) for k,v in self.hypervectors.items()}
            return sim, groups
        else:
            return sim
            
            
    
    def compare(self, group1:list, group2:list, compare_attributes=[], STATUS={}) -> dict: # TODO: remove?
        """ compare two pre-defined subgroups """
        STATUS["status"] = "running"
        STATUS["comparison"] = {}
        self.init_connection() # ensure thread
        
        subgroup1 = self.fetch_subgroup(*group1)
        subgroup2 = self.fetch_subgroup(*group2)
        
        if BY_ID:
            STATUS["comparison"]["subgroup 1 n_ids"] = len(set([row['id'] for row in subgroup1]))
            STATUS["comparison"]["subgroup 2 n_ids"] = len(set([row['id'] for row in subgroup2]))
        STATUS["comparison"]["subgroup 1 n_samples"] = len(subgroup1)
        STATUS["comparison"]["subgroup 2 n_samples"] = len(subgroup2)
        
        
        if len(subgroup1) == 0 or len(subgroup2) == 0:
            print("1+ subgroup has no samples")
        else:
            sim = {}
            STATUS["progress"] = 0
            
            # This part can likely be optimized (currently gets distributions twice)
            HVs1 = self.get_group_hypervectors(subgroup1, attributes=compare_attributes)
            HVs2 = self.get_group_hypervectors(subgroup2, attributes=compare_attributes)
            
            STATUS["comparison"]["subgroup 1"] = {
                "subgroup": group1,
                "distribution": self.get_group_distributions(subgroup1, attributes=compare_attributes),
            }
            
            STATUS["comparison"]["subgroup 2"] = {
                "subgroup": group2,
                "distribution": self.get_group_distributions(subgroup2, attributes=compare_attributes),
            }
            
            for att in compare_attributes + ["overall"]:
                if att == "overall":
                    HV1 = reduce(torchhd.bundle, HVs1.values())
                    HV2 = reduce(torchhd.bundle, HVs2.values())
                else:
                    HV1 = HVs1[att]
                    HV2 = HVs2[att]
                sim[att] = similarity[SIMILARITY_MEASURE](HV1, HV2).item()
                STATUS["progress"] += 100/(len(compare_attributes)+1)
            
            
        STATUS['status'] = "complete"
        print("DONE") # DEBUG
        STATUS["comparison"]["output"] = sim
        return sim
        
        
            
    def explore(self, operation:str, group1:list, group2:list=None, ensure_matching=False, joint={}, compare_attributes=[], verbose=False, STATUS={}) -> dict: 
        """ Select the subgroups that meet each criteria (passed to self.filter_subgroups) and make comparisons between. """
        # TODO (?): multithreading/processing -> this is where the number of subgroups will impact performance
        # TODO: rename (confusing since it does both compare and explore now)
        
        print("BEGINNING EXPLORE")
        STATUS["status"] = "running"
        STATUS['progress'] = 0;
        STATUS[operation] = {}
        self.init_connection() # ensure thread
        
        if not compare_attributes: # not specified -> use all
            compare_attributes = [a.name for a in self.attributes] 
        
        if group2 is None:
            group2 = group1       
        
        criteria1 = group1
        criteria2 = group2
        # Get all of the subgroups that match the criteria given
        subgroups = [self.filter_subgroups(*c, **joint, return_index=True) for c in [group1,group2]]
        
        group1, group2 = subgroups
        STATUS[operation]["subgroups"] = {"by-group":{"Subgroup 1": group1, "Subgroup 2": group2}}
        subgroups = group1 | group2
        # Get the subgroups (IDs and HVs)
        subgroup_HVs = {}
        subgroup_IDs = {}
        STATUS[operation]["subgroups"]['subgroups-by-id'] = {}
        for idx, criteria in subgroups.items():
            criteria = list(map(format_subgroup_criteria, criteria.keys(), criteria.values()))
            criteria = [x for y in criteria for x in y]
            sub = self.fetch_subgroup(*criteria)
            # TODO: remove inherent option
            # add the subgroup ID information to the status tracker
            subgroup_HVs[idx], subgroup_IDs[idx] = self.get_group_hypervectors(sub, compare_attributes, return_ids=True)
            STATUS[operation]["subgroups"]["subgroups-by-id"][idx] = self.get_group_distributions(sub, compare_attributes)
            STATUS[operation]["subgroups"]["subgroups-by-id"][idx]["size"] = len(subgroup_IDs[idx])
            #STATUS['explore']["subgroups"]['subgroups-by-id'][idx] = subgroup_IDs[idx]
        
        if ensure_matching: # "compare" instead of "explore"
            pairs = determine_matching(criteria1, criteria2, group1, group2)
            n_comparisons = len(pairs) 
        else:
            if ALLOW_OVERLAP: # allow the comparison of groups that have IDs in common
                print("allowing overlap") # DEBUG
                pairs = product(group1, group2)
                n_comparisons = len(group1) * len(group2)
            else:
                print("NOT allowing overlap") # DEBUG
                # determine subgroup overlap
                overlap = {(s1,s2):len(set(subgroup_IDs[s1]) & set(subgroup_IDs[s2])) for (s1,s2) in product(group1, group2)}
                pairs = [k for k,v in overlap.items() if v == 0]
                n_comparisons = len(pairs)
        
        # There may be a way to make this faster by just looping through one group and comparing that hypervector to every single one in group 2 at once (or in a few sub sets) (like in the pariwise_similarity function), but there would need to be a different way to get the attribute overlap (and create the correct "overall" vector) for each pair. (As-is, this is actually pretty fast, it's the steps before this that take more processing time)
        # actually make the comparisons
        STATUS["progress"] = 0
        STATUS[operation]["similarity"] = []
        i = 0
        comparisons = {}
        for pair in pairs:
            i += 1
            if verbose:
                print(f"Comparing subgroups ({i+1}/{n_comparisons})", end="\r")
            
            HVs = [ subgroup_HVs[g] for g in pair]
            att_overlap = set(HVs[0]) & set(HVs[1])
            comparisons[pair] = {att: similarity[SIMILARITY_MEASURE](*[HV[att] for HV in HVs]).item() for att in att_overlap}
            HVs = [reduce(torchhd.bundle, [HV[att] for att in att_overlap]) for HV in HVs]
            comparisons[pair]["overall"] = similarity[SIMILARITY_MEASURE](*HVs).item()
            # propagate to the flask app -> convert the format slightly...
            STATUS[operation]["similarity"].append({
                    "Subgroup 1": subgroups[pair[0]] | {"sample-IDs" : subgroup_IDs[pair[0]], "ID":pair[0]},
                    "Subgroup 2": subgroups[pair[1]] | {"sample-IDs" : subgroup_IDs[pair[1]], "ID":pair[1]},
                } | comparisons[pair]
            )
            #STATUS["explore"]["similarity"][str(pair)] = comparisons[pair]
            STATUS["progress"] += 100/n_comparisons
            
        if verbose:
            print() # skip to the next line
            
        STATUS['status'] = "complete"
        print("EXPLORE COMPLETE") # DEBUG
        print("STATUS:", STATUS.keys())
        return comparisons      
            
        
    def get_group_hypervectors(self, subgroup:list, attributes:list, return_ids=False) -> dict:
        """ Get a representative hypervector for the subgroup (one for each attribute provided). """
        distributions = self.get_group_distributions(subgroup, attributes, return_ids)
        HVs = {}
        for att in attributes:
            dist = distributions[att]
            HVs[att] = reduce(torchhd.bundle, [self.hypervectors[att][val]*num for val,num in dist.items()])
            
        if return_ids:
            return HVs, distributions["id"]
        else:
            return HVs
            
        
    def view_distribution(self, subgroup:list=[], attributes:list=None) -> dict: #TODO: remove 
        """
        Get the distributions of the attributes for a subgroup. If attributes is None, get all attributes.
        """
        if attributes is None:
            attributes = [a.name for a in self.attributes]
            
        dists = self.get_group_distributions(subgroup=subgroup, attributes=attributes)
        out = {}
        for a in attributes:
            att = self.fetch_attribute(a)
            out[att.display_name] = {}
            for x in dists[a]:
                val = att.fetch_value(x)
                try:
                    name = val.display_name
                except:
                    name = val
                out[att.display_name][name] = dists[a][x]
        return out
        
        
        
        
        
    def get_group_distributions(self, subgroup:list=[], attributes:list=None, return_ids=False) -> dict:
        """ 
        Get the subgroup's distribution of each of the attributes. 
        Note that if BY_IDS is true, the distributions are relative, not the actual number of samples or ids. 
        """
        if len(subgroup) == 0: # look at the entire database
            subgroup = self.fetch_subgroup()
            
        elif isinstance(subgroup[0], str): # the subgroup criteria was provided
            subgroup = self.fetch_subgroup(*subgroup)
            
        if attributes is None:
            attributes = [a.name for a in self.attributes]
        
        distributions = {}
        for att in attributes:
            if BY_ID: # apply the scale factor when getting the distribution
                dist = [[row[att]]*row["scale_factor"] for row in subgroup]
                dist = [x for y in dist for x in y]
            else:
                dist = [row[att] for row in subgroup]
            
            distributions[att] = {v:dist.count(v) for v in set(dist)}
            
        if return_ids:
            distributions["id"] = list(set([ row['id'] for row in subgroup]))
        
        return distributions
        

    def filter_subgroups(self, *args, exclude_attributes=[], min_size=None, max_size=None, min_attributes=None, max_attributes=None, return_index=False):
        """ return a list of subgroups that meet the supplied criteria """
        query_criteria = [*args] # additional criteria (specific attribute value e.g., sex=female)
        for att in exclude_attributes:
            pass # TODO
        if BY_ID:
            size_col = "num_ids"
        else:
            size_col = "num_samples"
        
        if min_size:
            query_criteria.append(f"{size_col}>={min_size}")
        if max_size:
            query_criteria.append(f"{size_col}<={max_size}")
        
        if min_attributes:
            query_criteria.append(f"num_attributes>={min_attributes}")
        if max_attributes:
            query_criteria.append(f"num_attributes<={max_attributes}")
        
        query_criteria = list(map(format_query, query_criteria))
        if query_criteria:
            query_criteria = " WHERE " + " AND ".join(query_criteria)
        else:
            query_criteria = ""
        
        attributes = [a.name for a in self.attributes]
        res = self.cursor.execute("SELECT * FROM subgroups" + query_criteria ).fetchall()
        
        if return_index:
            subgroups = {row["index"]: dict(zip(attributes, (row[a] for a in attributes))) for row in res}
        else:
            subgroups = [dict(zip(attributes, (row[a] for a in attributes))) for row in res]
        return subgroups
        

    def fetch_subgroup(self, *args, cols=[], count=False):
        """ 
        Fetch a subgroup (as defined by args).
        Fetches only the columns indicated by cols; if none indicated, fetches all columns.
        If count, return the number of samples (ignores indicated columns)
        
        Examples:
        ---------
        
        1) Fetch the female subgroup:
            args = ["sex=female"]
        
        2) Fetch the age 40-49 subgroup:
            args = ["age>=40", "age<=49"]
        
        3) Fetch the male, age 70+ subgroup:
            args = ["sex=male", "age>=70"] 
        
        """
        cols = ", ".join(list(map(format_name, cols))) if cols else "*"
        if count:
            cols = "COUNT(*)"
        
        query_criteria = list(map(format_query, args))
        
        if query_criteria:
            query_criteria = " WHERE " + " AND ".join(query_criteria)
        else:
            query_criteria = ""
        
        res = self.cursor.execute("SELECT " + cols + " FROM samples JOIN scale on samples.id=scale.id" + query_criteria ).fetchall()
        
        if count:
            res = res[0][0] # get the actual value
        return res
    
    
    def fetch_attribute(self, name):
        """ Get the attribute based on the name provided. """
        for A in self.attributes:
            if A.match(name):
                return A
    
    @property
    def attribute_information(self):
        """ Basic attribute information (name, display name, type of attribute --> values and associated display names (if applicable) """
        out = {}
        for att in self.attributes:
            out[att.name] = {
                "display_name" : att.display_name,
                "type" : att.type,
                "values": {}
            }
            
            for val in att.values:
                if isinstance(val, BaseAttribute):
                    out[att.name]["values"][val.name] = {"display_name":val.display_name}
                else:
                    out[att.name]["values"][val] = {"display_name":val}
        return out
                
    @property
    def details(self): # Note: this may need to be improved to work well with larger databases # WIP ===========================
        # TODO: by patient
        attributes = [a.name for a in self.attributes]
        print(attributes) 
        data = self.cursor.execute("SELECT * FROM samples").fetchall()
        distribution = {"by-sample":{}, "by-id":{}}
        ids = [row['id'] for row in data]
        for attribute in self.attributes:
            att = attribute.name
            samples = [row[att] for row in data]
            distribution['by-sample'][att] = {v:samples.count(v) for v in samples}
            print(distribution['by-sample'][att])
            
         
def format_name(name):
    """ Formats an attribute name or value. """
    name = name.replace(" ", "_")
    return name.lower()
    
def format_subgroup_criteria(att, criteria) -> list:
    """ Convert the criteria into a different form (compatible with get_comparitor)"""
    if not criteria:
        return []
    elif isinstance(criteria, str) and ", " in criteria: # numeric bounds
        criteria = criteria.lstrip("(").rstrip(")").split(", ")
        assert len(criteria) == 2 # TODO: better error handling
        return [f"{att}>={criteria[0]}",f"{att}>={criteria[1]}"]
    else:
        return [f"{att}={criteria}"]
        
    
def format_query(query:str) -> str:
    """ Make query criteria more SQL friendly """
    comparitor = get_comparitor(query)
    if not comparitor:
        return None
    col, criteria = query.split(comparitor)
    if not criteria.replace(".","").replace("-","").isdigit():
        criteria = "\"" + criteria + "\""
    return "".join([col, comparitor, criteria])
        
    
def get_comparitor(string, options=["=", "<", ">", "!"]):
    """ 
    Gets the comparitor from a provided string, composed of any combinations of the provided options. 
    Returns None if there is not a supported comparitor.
    """
    pattern = "[" + "".join(options) + "]+"
    match = re.search(pattern, string)
    if match:
        return match[0]
    
class BaseAttribute(object):
    """ Base Attribute can be used to represent an attribute or a categorical attribute value """
    def __init__(self, name:str, display_name:str=None):
        if not display_name:
            display_name = name
        self.display_name = display_name
        self.name = format_name(name)
        self.aliases = [self.name, self.display_name]
        self.values = [] # placeholder
        
    @property
    def options(self): # placeholder
        return []
    
    def match(self, arg:str):
        """ Check if the arg is a supported alias or a supported format of the name """        
        return arg in self.aliases or format_name(arg) == self.name
        
    def __str__(self):
        return self.display_name # display name or name?
        
    def __len__(self):
        return len(self.values)
        
class NumericAttribute(BaseAttribute):
    def __init__(self, unique, *args, _min=None, _max=None, step=None, bin=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.type = "numeric"
        
        # determine min, max, step, bin
        self.min = _min if _min else min(unique) 
        self.max = _max if _max else max(unique)
        
        if step:
            self.step = step
        else:
            unique = sorted(unique)
            self.step = min([unique[i+1] - unique[i] for i in range(len(unique)-1)])
        
        if bin:
            self.bin = bin
        else:
            if PREFERRED_BINS: # select the closest bin size from the preferred bins (that also satisfies the max bins)
                rng = (self.max - self.min)
                self.bin = max([bin for bin in PREFERRED_BINS if rng / bin <= MAX_BINS_PER_ATTRIBUTE])
            else:
                self.bin = (self.max - self.min) / MAX_BINS_PER_ATTRIBUTE
                if self.bin % self.step != 0:
                    self.bin = (int(self.bin / self.step) + 1) * self.step
                
        self.values = np.arange(self.min, self.max+self.step, self.step) # the entire range of accepted values
        
    @property
    def options(self): # binned values
        mn =  int(self.min/self.bin)*self.bin
        mx = math.ceil(self.max/self.bin)*self.bin
        bins = np.arange(mn, mx, self.bin).tolist()
        bins = [(b, b+(self.bin-self.step)) for b in bins]
        bins[-1] = (bins[-1][0], max(bins[-1][1], self.max)) # make sure that the final bin reachs the max (only an issue if self.max == mx)
        bins = list(map(str, bins)) # str format to work nice with SQL
        return bins
        

    @property
    def details(self):
        dets = [
            "A Numeric Attribute with the following properties:",
            f"Name: {self.name}",
            f"Display name: {self.display_name}",
            f"Minimum accepted value: {self.min}",
            f"Maximum accepted value: {self.max}",
            f"Step size: {self.step}",
            f"Bin size: {self.bin}",
        ]
        return "\n    ".join(dets)
        
    def fetch_value(self, value):
        if value in self.values:
            idx = np.argwhere(self.values == value)[0][0]
            return self.values[idx]
        
class CategoricalAttribute(BaseAttribute):
    def __init__(self, unique, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.type = "categorical"
        self.values = [BaseAttribute(v) for v in unique]
    
    @property
    def options(self):
        return [v.name for v in self.values]
        
    @property
    def details(self):
        dets = [
            "A Categorical Attribute with the following properties:",
            f"Name: {self.name}",
            f"Display name: {self.display_name}",
            f"Number of unqiue values: {len(self.values)}",
            # List the unique values? (this could get long for attributes with a large number of unique values)
        ]
        return "\n    ".join(dets)
        
    def fetch_value(self, name):
        for v in self.values:
            if v.match(name):
                return v
        
        
    
if __name__ == "__main__":
    import os
    os.system("clear")

    M = Manager(
            name='debug_database',
            data_file = "/home/alexis.burgon/code/VSA-HDC-MadeEasy/localdata/toy.csv",
            id_col = "id",
            ) 
            
    print(M.details)
            
    exit() # DBEUG
    M.explore(
        ["disease_status=positive"], 
        ["disease_status=negative"], 
        joint = dict(min_size=1, max_attributes=3),
        verbose=True
        )
        
        
    #M.filter_subgroups(max_attributes=4, min_attributes=4, min_size=3)
    #sub = M.fetch_subgroup("Sex=female", "age>=-20.0")
    #print(sub)
            
    exit() # DEBUG
    sim, groups = M.basis_similarity()
    #print(sim)
    
    out = plot_pairwise_similarity(
        sim, 
        groups=groups,
        cmap="red-yellow-green",
        box_size=10,   
        sort=True,     
        )
    #print(out)
    with open("temp-test.svg", "w") as file:
        file.write(out)
    


