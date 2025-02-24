from __future__ import annotations
__all__ = [
    "Comparison"
]

import pprint
from typing import Literal

class Comparison():
    """
    Helps organize complex comparison outputs. 
    The actual comparison process is part of :class:`Dataset`.

    Parameters
    ----------
    criteria1, criteria2 : dict
        Criteria describing the two defined groups being compared.
    ignore_inherent : bool
        The ignore_inherent setting passed to :meth:`Dataset.compare`.
    """
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
    
    def export(self, orient:Literal["minimal", "maximal", "tabular"]="minimal", include_empty:bool=False) -> dict|list:
        """
        Exports the comparison information to a dictionary or a list (depending on the value of orient).

        Parameters
        ----------
        orient : {"minimal","maximal", "tabular"}
            Format of how the information should be saved. 
            "minimal" avoids repeating information that applies to multiple :class:`ComparisonItem` objects.
            "maximal" repeats information, producing a more reader-friendly output.
            "tabular" similar to "maximal", but doesn't include :class:`Comparison`-wide information (such as the original two criteria) and formats lists into strings.
        include_empty : bool, default = False
            If False, :class:`ComparisonItem` objects with no similarity values will be excluded.
        """
        items = [item.export(orient=orient) for item in self.items]
        
        if orient == "minimal":
            if not include_empty:
                items = [item for item in items if len(item['similarities']) > 0]
            # avoid repeating information that applies to multiple similarity values
            records = {
                "base_populations": self.criteria,
                "comparisons": items
            }
        elif orient in ["maximal", "tabular"]:
            records = [x for item in items for x in item]
        else:
            raise Exception(f"Unrecognized value of \"orient\" (\"{orient}\"); must be one of: [\"minimal\", \"maximal\", \"tabular\"].")
        return records

    
class ComparisonItem():
    """
    Holds the comparisons related to a specific intersectional subgroup.
    Should be created via the :meth:`Comparison.add` method.

    Parameters
    ----------
    parent : :class:`Comparison`
        The :class:`Comparison` object that this item belongs to.
    subgroup : dict
        The intersectional subgroup that this item describes.
    similarities : dict
        The similarity values this object will store, in format {(similarity_attributes,) : similarity_value}.
    insufficient_samples : bool, default = False
        Flag passed if one or more of the gorups being compared had no samples and thus comparisons could not be made.

    """
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
        """ The intersectional subgroup definition of this specific item. """
        return self._subgroup
    
    @property
    def subgroups(self):
        """ 
        The full description of the groups being compared, 
        a combintation of the two criteria items of the parent :class:`Comparison` and this object's intersectional subgroup.
        """
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
    
    def export(self, orient:Literal["minimal","maximal", "tabular"]="minimal") -> dict|list:
        """
        Exports this item's content to a dictionary or list (depending on the value of orient).

        Parameters
        ----------
        orient : {"minimal", "maximal"}, default = "minimal"
            Format of how the information should be saved. 
            "minimal" avoids repeating information that applies to multiple :class:`ComparisonItem` objects.
            "maximal" repeats information, producing a more reader-friendly output.
            "tabular" similar to "maximal", but doesn't include :class:`Comparison`-wide information (such as the original two criteria) and formats lists into strings.
        """
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
        elif orient == "tabular":
            records = []
            for attributes, similarity in self.items():
                records.append({
                    "subgroup": "; ".join([f"{attribute}: {value}" for (attribute, value) in self.subgroup.items()]),
                    "similarity_from": "; ".join(list(attributes)),
                    "comparison_level": self.level,
                    "similarity": similarity
                })
        return records


    