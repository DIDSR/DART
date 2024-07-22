from __future__ import annotations
import typing as t

import torchhd
import torch

from itertools import combinations, product

from functools import partial
from functools import reduce

from multiprocessing import Pool
from multiprocessing import Manager

from .globals import current_memory
from .globals import Subgroup # TODO: remove
from .utils import iter_queue

if t.TYPE_CHECKING:
    from .item_memory import ItemMemory
    from multiprocessing import Queue
    

def fetch_subgroups(subgroup_criteria:list[dict]=[], mem:ItemMemory=None, similarity_attributes:list=[], allowed_attributes:list=[], levels_allowed:list=[]):
    if not mem:
        mem = current_memory
    
    if not similarity_attributes: # Use all
        similarity_attributes = [*mem.keys]
    
    # get all of the combinations subgroups that are allowed within the subgroup specified by subgroup_criteria
    complete_criteria = []
    for level in levels_allowed:
        for comb in combinations(allowed_attributes, level):
            combination_options = [mem.get_attribute_options(att) for att in comb]
            for values in product(*combination_options):
                values = [str(v) for v in values] #every option saved as string in item Memory
                criteria = dict(zip(comb, values))
                criteria = {k:[v] for (k,v) in criteria.items()}
                criteria["level"] = level
                complete_criteria.append(subgroup_criteria | criteria)
    
    M = Manager()
    Q = M.Queue()

    with Pool(mem.config["MAX_PROCESSES"]) as P:
        P.map( 
            partial(_fetch_subgroup_samples, queue=Q, similarity_attributes=similarity_attributes),
            complete_criteria
        )
    
    return list(iter_queue(Q))
    
    
    

def _fetch_subgroup_samples(criteria:dict,  similarity_attributes:list, queue:Queue=None, indices_only:bool=False, ):
    """
    Fetches the samples from the memory that match the provided criteria, 
    limits them to the specified similarity_attributes and bundles them together into a subgroup.
    """
    mem = current_memory
    level = criteria.pop("level")
    
    inherent_attributes = [k for k,v in criteria.items() if v]
    
    # Get the indices that match the subgroup
    indices = []
    for att in criteria:
        # For each attribute, select all the samples w/ a value in the provided options (OR)
        indices.append(mem.query(att, criteria[att]))
    
    # Select the samples that meet the criteria of ALL attributes listed (AND)
    indices = reduce(lambda x,y: list( set(x).intersection(set(y)) ), indices)
    
    if indices_only or len(indices) < 1:
        HV = None
    else:
        # compose a subgroup hypervector for each similarity attribute
        HV = {}
        for att in similarity_attributes:
            HV[att] = torchhd.multiset(torch.cat( [mem.get_sample(i, [att]) for i in indices], 0))
    
    sub = {
        "criteria": criteria,
        "included_attributes": similarity_attributes,
        "inherent_attributes": inherent_attributes,
        "indices": indices,
        "hypervector": HV,
        "level": level,
    }
    
    #sub = Subgroup(criteria, similarity_attributes, inherent_attributes, indices, HV)  
    if queue:  
        queue.put(sub)
    
    
    
    