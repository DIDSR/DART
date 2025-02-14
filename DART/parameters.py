__all__ = [
    "parameters",
    "Parameters"
]

from collections.abc import MutableMapping
import pprint

class Parameters(MutableMapping, dict):
    default = {
        "numeric.ideal_bin_count": [5,10],
        "hypervectors.dimensions": 10000,
        "hypervectors.architecture": "MAP",
        "validate.sample_encoding": True, # TODO: default
    }

    def __init__(self, **kwargs):
        """ Initializes a copy with the default parameters and then sets any specified values """
        for (k,v) in self.default.items():
            self._set(k,v)
        for (k,v) in kwargs.items():
            self[k] = v
        
      
    def _set(self, key, val):
        """ Directly sets value without any checks. """
        dict.__setitem__(self, key, val)

    def __setitem__(self, key, val): # TODO [WIP]
        if key not in self.default:
            raise Exception(f"Unrecognized parameter \"{key}\"")
        # TODO: validate different parameters
        self._set(key, val)
    
    def __getitem__(self, key):
        return dict.__getitem__(self, key)

    def __iter__(self):
        """ Yields a sorted list of keys """
        yield from sorted(dict.__iter__(self))

    def __len__(self):
        return dict.__len__(self)

    def __repr__(self):
        class_name = self.__class__.__name__
        indent = len(class_name) + 1
        repr = ('\n' + ' '*indent).join(pprint.pformat(dict(self), indent=1, width=80 - indent).split("\n"))
        return f"{class_name}({repr})"

parameters = Parameters() # the global instance