__all__ = [
    "HypervectorSet",
]

import pandas as pd
import torch
import torchhd

from .attribute_configuration import *
from .parameters import parameters

class BaseHypervectorSet():
    """
    Base class to add functionality that is needed for hypervector sets of all types.
    Used to instantiate the appropriate subclass.
    """
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
    def type(self):
        if not hasattr(self, "_type"):
            return None
        return self._type

    @property
    def basis(self):
        if not hasattr(self, "_basis"):
            return None
        return self._basis
    
    @property
    def key_mapping(self):
        if not hasattr(self, "_key_mapping"):
            return {k:[k] for k in self.keys()}
        return self._key_mapping

    def keys(self):
        yield from self._keys

    def values(self):
        yield from self._basis
    
    def __getitem__(self, key) -> torch.Tensor:
        idx = self.get_index(key)
        return torch.unsqueeze(self.basis[idx][:], dim=0)
    
    def items(self):
        for key in self.keys():
            yield (key, self[key])
    
    def __len__(self):
        return self.basis.shape[0]
    
    def match(self, hypervector:torch.Tensor, return_similarity:bool=False):
        """ Returns the key of the value with the highest similarity. """
        sim = torchhd.cosine_similarity(self._basis, hypervector)
        sim = torch.squeeze(sim)
        if len(sim.shape) == 0: # for HypervectorSets with only one item
            sim = torch.unsqueeze(sim, dim=0)
        idx = sim.argmax().item()
        if return_similarity:
            return self._keys[idx], sim[idx].item()
        else:
            return self._keys[idx]
    
    def is_matching_value(self, *values) -> bool:
        assert len(values) == 2 # TODO: better error handling
        if values[0] == values[1]:
            return True
        for idx, v in enumerate(values):
            other = values[abs(1-idx)]
            if v in self.key_mapping:
                return self.key_mapping[v] == other
        return False            
        

class CategoricalHypervectorSet(BaseHypervectorSet, _type="categorical"):
    def __init__(self, config:CategoricalConfiguration):
        assert config.type == self.type # TODO: improve error handling
        super().__init__()
        self._keys = sorted([*config.groups])
        self._key_mapping = {x:k for (k,v) in config.groups.items() for x in v}
        self._basis = torchhd.random(
            num_vectors=len(self._keys),
            **self._hv_kwargs
        )

    def get_index(self, key) -> int:
        assert key in self._key_mapping
        return self._keys.index(self._key_mapping[key])
    
    @classmethod
    def from_values(cls, name, values):
        """ Used as a shortcut for creating _role and _chunk hypervector sets. """
        config = CategoricalConfiguration(name, values)
        self = cls.__new__(cls)
        self.__init__(config)
        return self


class NumericHypervectorSet(BaseHypervectorSet, _type="numeric"):
    def __init__(self, config:NumericConfiguration):
        assert config.type == self.type # TODO: improve error handling
        super().__init__()
        self._keys = sorted([*config.bins])
        self._key_mapping = {x:k for (k,v) in config.bins.items() for x in v}
        self._basis = torchhd.level(
            num_vectors=len(self._keys),
            **self._hv_kwargs
        )
    
    def get_index(self, key) -> int:
        if key not in self._key_mapping:
            raise Exception(f"Unsupported value \"{key}\", must be one of: {self._key_mapping}")
        # assert key in self._key_mapping
        return self._keys.index(self._key_mapping[key])



def HypervectorSet(config:BaseConfiguration) -> BaseHypervectorSet:
    """ Creates a hypervector set of the appropriate type. """
    assert config.type in BaseHypervectorSet.subclasses # TODO: improve error handling
    return BaseHypervectorSet.subclasses[config.type](config)


