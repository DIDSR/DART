__all__ = [
    "parameters",
    "Parameters"
]

from collections.abc import MutableMapping
import pprint

class Parameters(MutableMapping, dict):
    """
    Manages package-wide parameters.

    Parameters
    ----------
    **kwargs
        Specified parameter values. Default values will be used for any parameter not specified.

    Notes
    -----
    :class:`parameters` is a global version of :class:`Parameters` with all default values.
    """
    default = {
        "numeric.ideal_bin_count": [5,10],
        "hypervectors.dimensions": 10000,
        "hypervectors.architecture": "MAP",
        "random_state": None,
    }
    supported_architectures = ["MAP"]

    def __init__(self, **kwargs):
        """ Initializes a copy with the default parameters and then sets any specified values """
        for (k,v) in self.default.items():
            self._set(k,v)
        for (k,v) in kwargs.items():
            self[k] = v
        
      
    def _set(self, key, val):
        """ Directly sets value without any checks. """
        dict.__setitem__(self, key, val)

    def __setitem__(self, key, val):
        if key not in self.default:
            raise Exception(f"Unrecognized parameter \"{key}\"")
        if key == "hypervectors.architecture" and val not in self.supported_architectures:
            raise Exception(f"The architecture \"{val}\" is not currently supported.")
        if key == "hypervectors.dimensions" and val < 10000:
            print(f"Warning: it is recommended that the hypervector dimensionality be >=10,000. Using dimensionality \"{val}\" may produce unexpected results.")
        if key == "random_state":
            if val is not None and not isinstance(val, int):
                raise Exception(f"random_state must be either an integer or None.")
        # TODO: improve parameter validation
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