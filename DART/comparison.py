__all__ = [
    "Comparison"
]

"""
Classes to help organize complex comparison outputs,
the actual comparison process is part of Dataset.
"""

import pprint
from typing import Literal

class Comparison():
    def __init__(self, criteria1:dict, criteria2:dict, ignore_inherent:bool):
        self._criteria1 = {**criteria1}
        self._criteria2 = {**criteria2}
        self._ignore_inherent = ignore_inherent
        self._items = []
    
    @property
    def criteria(self) -> list[dict]:
        return [self._criteria1, self._criteria2]
    
    @property
    def items(self) -> list:
        return self._items
    
    def add(self, subgroup:dict, similarities:dict, insufficient_samples:bool=False): # adds a new ComparisonItem
        self._items.append(ComparisonItem(self, subgroup, similarities, insufficient_samples))
    
    def __iter__(self):
        yield from self.items
    
    def __len__(self):
        return len(self.items)
    
    def __repr__(self) -> str:
        class_name = self.__class__.__name__
        indent = len(class_name) + 1
        repr = ('\n' + ' '*indent).join(pprint.pformat(dict(populations=self.criteria), indent=1, width=80 - indent).split("\n"))
        return f"{class_name}({repr})"

    def __getitem__(self, index:int):
        return self.items[index]
    
    def export(self, orient:Literal["minimal", "maximal"]="minimal", include_empty:bool=False) -> dict:
        items = [item.export(orient=orient) for item in self.items]
        
        if orient == "minimal":
            if not include_empty:
                items = [item for item in items if len(item['similarities']) > 0]
            # avoid repeating information that applies to multiple similarity values
            records = {
                "base_populations": self.criteria,
                "comparisons": items
            }
        elif orient == "maximal": # repeat shared information
            records = [x for item in items for x in item]
        return records

    
class ComparisonItem():
    def __init__(self, parent: Comparison, subgroup:dict, similarities:dict, insufficient_samples:bool=False):
        self._parent = parent
        self._subgroup = subgroup
        self._similarities = similarities
        self._insufficient_samples = insufficient_samples
    
    @property
    def parent(self):
        return self._parent
    
    @property
    def subgroup(self):
        return self._subgroup
    
    @property
    def subgroups(self):
        return [
            {**self.parent._criteria1, **self.subgroup},
            {**self.parent._criteria2, **self.subgroup},
        ]
    
    @property
    def similarities(self):
        return self._similarities
    
    @property
    def level(self):
        return len(self.subgroup)
    
    def items(self):
        yield from self.similarities.items()
    
    def __repr__(self) -> str: 
        class_name = self.__class__.__name__
        indent = len(class_name) + 1
        repr = ('\n' + ' '*indent).join(pprint.pformat(self.subgroup, indent=1, width=80 - indent).split("\n"))
        return f"{class_name}({repr})"
    
    def export(self, orient:Literal["minimal","maximal"]="minimal") -> dict|list:
        if orient == "minimal":
            records = {
                "subgroup": self.subgroup,
                "comparison_level": self.level,
                "similarities": self.similarities,
            }
        elif orient == "maximal":
            records = []
            for attributes, similarity in self.items():
                records.append({
                    "subgroups": self.subgroups,
                    "similarity_from": list(attributes),
                    "comparison_level": self.level,
                    "similarity": similarity
                })
        return records


    