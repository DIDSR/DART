__all__ = [
    "HypervectorSet",
]

import torch
import torchhd

from .attribute_configuration import BaseConfiguration, CategoricalConfiguration, NumericConfiguration
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
        pass
        
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
        return len(self.basis.shape[0])


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
        assert key in self._key_mapping
        return self._keys.index(self._key_mapping[key])


def HypervectorSet(config:BaseConfiguration) -> BaseHypervectorSet:
    """ Creates a hypervector set of the appropriate type. """
    assert config.type in BaseHypervectorSet.subclasses # TODO: improve error handling
    return BaseHypervectorSet.subclasses[config.type](config)

