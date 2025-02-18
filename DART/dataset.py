__all__ = [
    "Dataset"
]

from collections.abc import Iterable
from functools import reduce
from itertools import combinations, product
import pandas as pd
import pprint
import torch
import torchhd
from typing import Literal

from .attribute_configuration import AttributeGroup
from .comparison import Comparison
from .hypervector_sets import HypervectorSet, CategoricalHypervectorSet

class Dataset():
    def __init__(self, configurations:AttributeGroup, samples:pd.DataFrame):
        self._configurations = configurations
        self._samples = samples[self.attributes].copy() # only the needed attributes
        self._roles = CategoricalHypervectorSet.from_values(self.attributes)
        self._basis = {att: HypervectorSet(self.configurations[att]) for att in self.attributes}
        # switch the samples from raw values to binned/grouped values
        for att in self.attributes:
            if (t := self.configurations[att].type) == "categorical":
                mapping = {v:k for (k, values) in self.configurations[att].groups.items() for v in values}
            elif t == 'numeric':
                mapping = {v:k for (k, values) in self.configurations[att].bins.items() for v in values}
            self.samples[att] = self.samples[att].map(mapping)

    @property 
    def configurations(self):
        return self._configurations
    
    @property
    def samples(self):
        return self._samples
    
    @property
    def attributes(self):
        return sorted([*self.configurations.attributes])
    
    def index(self, criteria:dict) -> list[int]:
        """ Gets the indexes of the samples that meet the provided criteria. """
        temp = self.samples.copy()
        for att, condition in criteria.items():
            for att, condition in criteria.items():
                condition = condition if isinstance(condition, list) else [condition]
                temp = temp[temp[att].isin(condition)]
        return temp.index.tolist()
        
    def encode(self, indexes:list[int]) -> dict:
        """ Encode the indicated samples into a single hypervector for each attribute """
        HV = None
        for idx in indexes:
            sample_HV = {
                att: torchhd.bind(
                    self._roles[att],
                    self._basis[att][self.samples.at[idx, att]]
                ) for att in self.attributes
            }
            if HV is None:
                HV = {**sample_HV}
            else:
                HV = {att:torchhd.bundle(HV[att], sample_HV[att]) for att in self.attributes}
        return HV
    
    def subgroups(self,
                  max_level:int,
                  attributes:list,
                ) -> Iterable:
        for level in range(max_level+1):
            for attribute_combination in combinations(attributes, level):
                for attribute_values in product(*[self.samples[att].unique() for att in attribute_combination]):
                    yield dict(zip(attribute_combination, attribute_values))

    def compare(self, 
                criteria1:dict|list|int, 
                criteria2:dict|list|int, 
                similarity_attributes:list|str=None,
                ignore_inherent:bool=True,
                max_intersectionality_level:int=1,
                comparison_type:Literal["default", "extensive", "overall", "individual"]="default",
                ) -> Comparison:
        """
        Runs a series of comparisons between the indicated populations

        Parameters
        ----------
        criteria1, criteria2 : dict or list or int
            Criteria defining a population, should be a valid criteria input for self.index

        similarity_attributes : list or str, default: None
            The attributes which should be encoded into the hypervector representation to measure 
            (i.e., the attributes with which the similarity values are wrt). If none, uses all attributes.

        ignore_inherent : bool, default: True
            Whether attributes which are part of a population's definition should be considered as potential similarity attributes.
        
        max_intersectionality_level : int, default: 0
            The maximum number of other attributes to add to the criteria definitions to look at intersectional population similarity.
            if -1, will go as deep as possible. If 0, will only compare the attributes specified directly by the criteria.
        
        comparison_type : str, default: "default"
            Which combinations of the similarity attributes to measure the similarity wrt.
            "individual" - measure separately for each attribute
            "overall" - take one measurement that encorperates all similarity attributes
            "default" - individual + overall
            "extensive" - take a measurement for every possible combination of similarity attributes
        """
        assert comparison_type in ["individual", "overall", "default", "extensive"]
        inherent_attributes = set([x for criteria in [criteria1, criteria2] for x in criteria])
        if similarity_attributes is None:
            similarity_attributes = [*self.attributes]
        noninherent_attributes = list(set(similarity_attributes).difference(inherent_attributes))
        if max_intersectionality_level == -1:
            max_intersectionality_level = len(noninherent_attributes)
        comparisons = Comparison(criteria1, criteria2, ignore_inherent)
        for subgroup in self.subgroups(max_intersectionality_level, noninherent_attributes):
            indexes1 = self.index({**criteria1, **subgroup})
            indexes2 = self.index({**criteria2, **subgroup})
            if len(indexes1) < 1 or len(indexes2) < 1:
                comparisons.add(subgroup, {}, True)
                continue # nothing to compare!
            # determine the attribute combinations to compare (similarity from)
            available_attributes = set(similarity_attributes)
            if ignore_inherent:
                available_attributes = set(similarity_attributes).difference(set([*subgroup, *inherent_attributes]))
            
            if len(available_attributes) == 1: # same for every comparison_type
                sim_combinations = [tuple(available_attributes)]
            else:
                sim_combinations = []
                if comparison_type in ["overall", "default", "extensive"]:
                    sim_combinations.append(tuple(available_attributes))
                if comparison_type in ["individual", "default", "extensive"]:
                    sim_combinations += [(att,) for att in available_attributes]
                if comparison_type in ["extensive"] and len(available_attributes) > 2:
                    for i in range(2, len(available_attributes)):
                        sim_combinations += [*combinations(available_attributes, i)]
            # encode the samples
            HVs1 = self.encode(indexes1)
            HVs2 = self.encode(indexes2)
            # iterate through the similarity attribute combinations
            similarity_values = {}
            for sim_atts in sim_combinations:
                HV1 = reduce(torchhd.bundle, [HVs1[att] for att in sim_atts])
                HV2 = reduce(torchhd.bundle, [HVs2[att] for att in sim_atts])
                similarity_values[sim_atts] = torchhd.cosine_similarity(HV1, HV2).item()
            comparisons.add(subgroup, similarity_values, False)
        return comparisons
        
