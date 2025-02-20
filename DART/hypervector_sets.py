__all__ = [
    "HypervectorSet",
    "CategoricalHypervectorSet",
    "NumericHypervectorSet",
]

from abc import ABC
import pprint
import torch
import torchhd

from .attribute_configuration import *
from .parameters import parameters

class HypervectorSet():
    """ 
    Constructs a :class:`BaseHypervectorSet` of the appropriate type. 
    
    Parameters
    ----------
    config : :class:`BaseConfiguration`
        The config of the attribute from which to construct a set of hypervectors.
    """
    def __new__(self, config:BaseConfiguration):
        assert config.type in BaseHypervectorSet.subclasses
        return BaseHypervectorSet.subclasses[config.type](config)


class BaseHypervectorSet(ABC):
    """ Used to map between keys and hypervectors. """
    subclasses = {}
    def __init__(self):
        self._hv_kwargs = dict(
            dimensions=parameters["hypervectors.dimensions"],
            vsa=parameters["hypervectors.architecture"]
        )
    
    def __init_subclass__(cls, _type:str):
        cls._type = _type
        super().__init_subclass__()
        cls.subclasses[_type] = cls
    
    @property
    def keys(self):
        if not hasattr(self, "_keys"):
            return []
        return self._keys
        
    @property
    def values(self):
        if not hasattr(self, "_values"):
            return []
        return self._values
    
    @property
    def type(self):
        return self._type
    
    def __iter__(self):
        yield from self.keys
    
    def __len__(self):
        return len(self.keys)

    def items(self):
        for i in range(len(self)):
            yield (self.keys[i], self.values[i])
    
    def __getitem__(self, key) -> torch.Tensor:
        idx = self.get_index(key)
        return torch.unsqueeze(self.values[idx][:], dim=0)
    
    def get_index(self, key) -> int:
        return self.keys.index(key)
    
    def __repr__(self) -> str:
        class_name = self.__class__.__name__
        indent = len(class_name) + 1
        repr = ('\n' + ' '*indent).join(pprint.pformat(self.keys, indent=1, width=80 - indent).split("\n"))
        return f"{class_name}({repr})"
    
    @property
    def similarity(self) -> torch.Tensor: # pairwise similarity of the basis
        sim = torchhd.cosine_similarity(self.values, self.values)
        return sim


class CategoricalHypervectorSet(BaseHypervectorSet, _type="categorical"):
    """
    A set of hypervectors representing a categorical variable (i.e., unique values have no inherent similarity).

    Parameters
    ----------
    config : :class:`CategoricalConfiguration`
        The configuration object describing the categorical attribute.
    """
    def __init__(self, config:CategoricalConfiguration):
        super().__init__()
        self._keys = [*config.groups]
        self._values = torchhd.random(
            num_vectors=len(self.keys),
            **self._hv_kwargs
        )
    
    @classmethod
    def from_values(cls, values): # for the creation of role HVsets
        """
        Constructs a :class:`CategoricalHypervectorSet` directly from a list of provided values.

        Parameters
        ----------
        values : Iterable
            The supported unique values of this attribute.
        """
        self = cls.__new__(cls)
        config = CategoricalConfiguration("", values=values)
        self.__init__(config)
        return self


class NumericHypervectorSet(BaseHypervectorSet, _type="numeric"):
    """
    A set of hypervectors representing a numeric attribute
    (i.e., where the similarity of two values depends on their difference and the defined range (min,max) of the attribute).

    Parameters
    ----------
    config : :class:`NumericConfiguration`
        The configuration object desribing the numeric attribute.
    """
    def __init__(self, config:NumericConfiguration):
        super().__init__()
        self._keys = [*config.bins]
        self._values = torchhd.level(
            num_vectors=len(self.keys),
            **self._hv_kwargs
        )
    