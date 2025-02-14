__all__ = [
    "CategoricalConfiguration",
    "NumericConfiguration",
    "AttributeGroup",
    "get_default_configuration",
]

from collections.abc import Iterable
from numbers import Number
import pandas as pd 
from pandas.api.types import is_numeric_dtype
import pprint
from typing import Literal

from .utilities import isNumeric
from .parameters import parameters
   

class BaseConfiguration():
    subclasses = {}
    def __init__(self, 
                 source:str, 
                 name:str=None, 
                 include:bool=True,
                 ):
        self.source = source
        self.name = name
        self.include = include
    
    def __init_subclass__(cls, _type):
        cls._type = _type
        super().__init_subclass__()
        cls.subclasses[_type] = cls

    @classmethod
    def from_config(cls, config:dict):
        assert "_type" in config
        _type = config["_type"]
        del config["_type"]
        return cls.subclasses[_type](**config)
    
    @property
    def is_valid(self):
        return len(self.validate) < 1

    def validate(self) -> list: # to be fleshed out as needed for subclasses; only for things that cannot be checked during property setting (e.g., that involve >1 property)
        errors = []
        return errors

    @property
    def source(self): 
        return self._source
    
    @source.setter
    def source(self, value):
        if not isinstance(value, str):
            raise Exception(f"The provided source of an attribute must be a column name of type str not \"{type(value)}\"")
        self._source = value

    @property
    def name(self):
        if self._name is None:
            return self._source
        return self._name
    
    @name.setter
    def name(self, value):
        if value is not None and not isinstance(value, str):
            raise Exception(f"The provided name of an attribute must be of type str or None not \"{type(value)}\"")
        self._name = value

    @property
    def include(self): # TODO
        return self._include   
    
    @include.setter
    def include(self, value):
        if not isinstance(value, bool):
            raise Exception(f"The value of include must be of type bool not \"{type(value)}\"")
        self._include = value

    @property
    def type(self):
        if not hasattr(self, "_type"):
            return None
        return self._type
    
    @property
    def __dict__(self):
        return { "source":self.source, "name":self.name, "type":self.type, "include":self.include }
    
    @property
    def __config__(self): # the minimum information needed to recreate
        return { "source":self._source, "name": self._name, "_type": self.type, "include":self._include }

    def __repr__(self):
        return f"{self.__class__.__name__}({self.__config__})"
    

class CategoricalConfiguration(BaseConfiguration, _type="categorical"):
    def __init__(self, 
                 source:str, 
                 values:Iterable, 
                 groups:dict[str,Iterable]={}, 
                 ungrouped_behavior:Literal["individual", "single"]="individual", 
                 **kwargs
                 ):
        super().__init__(source, **kwargs)
        self.values = values
        self.groups = groups
        self.ungrouped_behavior = ungrouped_behavior

    @classmethod
    def from_numeric(cls, numeric):
        values = [y for x in numeric.bins.values() for y in x]
        self = cls.__new__(cls)
        self.__init__(numeric.source, values)
        return self
    
    def to_numeric(self, value_mapping:dict={}):
        return NumericConfiguration.from_categorical(self, value_mapping=value_mapping)

    @property
    def values(self):
        return self._values
    
    @values.setter
    def values(self, value):
        if not isinstance(value, Iterable):
            raise Exception(f"Attribute values must be iterable, received type \"{type(value)}\"")
        value = sorted(list(set([str(v) for v in value])))
        self._values = value

    @property
    def groups(self): # NOTE: this logic calls at the getter to support preserving the original provided group list
        assigned = set([str(y) for x in self._groups.values() for y in x])
        accounted = set(self.values)
        # deal with values specified in groups that aren't supported values
        missing = assigned.difference(accounted)
        if len(missing) > 0:  # TODO: have a way to change this behavior to optionally error or not warn at all
            print(f"Warning: {len(missing)} value{'' if len(missing) == 1 else 's'} specified in the groups are not accepted values of \"{self.name}\": {missing}")
        # deal with supported values that aren't assigned to a group
        not_specified = accounted.difference(assigned)
        groups = {**self._groups}
        if self.ungrouped_behavior == 'single': # put all ungrouped into a single "unassigned" group
            if "unassigned" not in groups:
                groups["unassigned"] = []
            groups["unassigned"] += list(not_specified)
        elif self.ungrouped_behavior == 'individual': # put each value into its own group
            for val in not_specified:
                assert val not in groups.keys() # TODO: improve error handling
                groups[val] = [val]
        else:
            raise Exception(f"Unknown value of ungrouped_behavior: \"{self.ungrouped_behavior}\"")
        return groups
    
    @groups.setter
    def groups(self, value):
        if not isinstance(value, dict):
            raise Exception(f"The value of groups must be dict not \"{type(value)}\"")
        self._groups = {str(key):[str(v) for v in vals] for (key,vals) in value.items()}
        
    @property
    def __dict__(self):
        return { **super().__dict__, "values":self.values, "groups":self.groups }
    
    @property
    def __config__(self):
        return { **super().__config__, "values": self._values, "groups": self._groups }


class NumericConfiguration(BaseConfiguration, _type="numeric"):
    def __init__(self, 
                 source:str,
                 min:Number, 
                 max:Number,
                 step:Number,
                 bin:Number|Literal["auto","none"]="auto",
                 dtype:Literal["auto","none","float","int"]="auto",
                 **kwargs):
        super().__init__(source, **kwargs)
        self.min = min
        self.max = max
        self.step = step
        self.bin = bin
        self.dtype = dtype

    @classmethod
    def from_values(cls, source:str, values:Iterable, **kwargs):
        """ Automatically determines the min/max/step from a list of values. """
        self = cls.__new__(cls)
        values = sorted([float(v) for v in set(values)])
        step = min([abs(values[i+1]-values[i]) for i in range(len(values)-1)])
        self.__init__(source, min=min(values), max=max(values), step=step, **kwargs)
        return self
        
    @classmethod
    def from_categorical(cls, categorical, value_mapping:dict={}):
        """ Convert a CategoricalAttribute to a NumericAttribute """
        values = []
        for value in categorical.values: # TODO(?): create a determine_mapping function to convert number strings to values?
            if value in value_mapping:
                values.append(value_mapping[value])
            elif isNumeric(value) or value in ["nan"]:
                values.append(float(value))
            else:
                raise Exception(f"Could not determine the numeric value of \"{value}\" please provide an appropriate mapping.")
        return cls.from_values(categorical.source, values)

    def to_categorical(self):
        return CategoricalConfiguration.from_numeric(self)
    
    def validate(self) -> list:
        errors = super().validate()
        if (_range := self.max - self.min) / self.step < 0:
            errors.append(f"Cannot reach max ({self.max}) from min ({self.min}) with step ({self.step})")
        if _range % self.step != 0:
            errors.append(f"The active range (max - min = {_range}) is not equally divisible by step ({self.step})")
        return errors

    @property
    def min(self):
        return self._set_type(self._min)
    
    @min.setter
    def min(self, value): # TODO: improve error handling
        if isinstance(value, str):
            assert isNumeric(value)
            value = float(value)
        assert isinstance(value, Number)
        self._min = value
    
    @property
    def max(self):
        return self._set_type(self._max)
    
    @max.setter
    def max(self, value): # TODO: improve error handling
        if isinstance(value, str):
            assert isNumeric(value)
            value = float(value)
        assert isinstance(value, Number)
        self._max = value

    @property
    def step(self):
        return self._set_type(self._step)
    
    @step.setter
    def step(self, value): # TODO: improve error handling
        if isinstance(value, str):
            assert isNumeric(value)
            value = float(value)
        assert isinstance(value, Number)
        assert value != 0
        self._step = value

    @property
    def bin(self):
        if self._bin == "none":
            value = abs(self.step)
        elif self._bin == "auto":
            # determine an "ideal" bin size (tries to do a power of ten as the bin size)
            _range = abs(self.max - self.min)
            if ( N := int(_range / self.step) ) >= parameters["numeric.ideal_bin_count"][0] and N <= parameters["numeric.ideal_bin_count"][-1]: # no need to bin
                return abs(self.step)
            mag = [len(str(int(n))) for n in [self.min, self.max]]
            mag = list(set([x for m in mag for x in range(m-1, m+2)]))
            potential = [10**m for m in mag]
            n_bins = [_range/p for p in potential]
            pref =[n for n in n_bins if n >= parameters["numeric.ideal_bin_count"][0] and n <= parameters["numeric.ideal_bin_count"][-1]]
            if len(pref) < 1:
                print(f"Warning: could not determine a bin size for \"{self.name}\" please specify a bin number (not binning)")
                value = abs(self.value)
            else:
                value = potential[n_bins.index(max(pref))]
        else:
            value = self._bin
        return self._set_type(value)
    
    @bin.setter
    def bin(self, value): # TODO: improve error handling
        if value == "auto":
            self._bin = value
            return
        if isinstance(value, str):
            assert isNumeric(value)
        assert isinstance(value, Number)
        self._bin = value
        
    @property
    def dtype(self):
        if self._dtype == "auto":
            numbers = [self._min, self._max, self._step]
            if self._bin != "auto":
                numbers.append(self._bin)
            if all([n % 1 == 0 for n in numbers]):
                return "int"
            else:
                return "float"
        else:
            return self._dtype
    
    @dtype.setter
    def dtype(self, value): # TODO: improve error handling
        if value in [float, "float"]:
            value = "float"
        elif value in [int, "int"]:
            value = "int"
        elif value in [None, "none"]:
            value = "none"
        assert value in ["auto", "none", "float", "int"]
        self._dtype = value

    @property
    def bins(self):
        B = self.bin
        n_bins = round((self.max-self.min)/B)
        bin_ranges = [[ self.min+(B*i), self.min+(B*(i+1)) ] for i in range(n_bins)]
        bin_ranges[-1][-1] = max(bin_ranges[-1][-1],self.max + self.step)
        return { f"[{L}, {U})":[*range(L,U,self.step)] for [L,U] in bin_ranges}

    def _set_type(self, value):
        if self.dtype == "int":
            return int(value)
        elif self.dtype == "float":
            return float(value)
        else:
            raise NotImplementedError()
    
    @property
    def __dict__(self):
        return { **super().__dict__, "min":self.min, "max":self.max, "step":self.step, "bin":self.bin, "dtype":self.dtype, "bins":[*self.bins.keys()]}

    @property
    def __config__(self):
        return { **super().__config__, "min":self._min, "max":self._max, "step":self._step, "bin":self._bin, "dtype":self._dtype}


class AttributeGroup():
    def __init__(self, attributes:list[BaseConfiguration]):
        self._attributes = {}
        for attribute in attributes:
            self.add(attribute)
    
    @classmethod
    def default(cls, data:pd.DataFrame|pd.Series, **kwargs):
        attributes = get_default_configuration(data, **kwargs)
        self = cls.__new__(cls)
        self.__init__(attributes)
        return self

    @property
    def attributes(self):
        return [*self._attributes.keys()]

    def add(self, attribute:BaseConfiguration): # NOTE: using source since name can theorhetically change during config, if that isn't a problem then best to switch to names
        """ Adds an attribute to the group, while ensuring that all attributes have unique names. """
        assert attribute.source not in self.attributes # TODO: improve error handling
        self._attributes[attribute.source] = attribute
    
    def update(self, name:str, new_configuration:BaseConfiguration):
        assert name in self.attributes # TODO: improve error handling
        self._attributes[name] = new_configuration
    
    def __iter__(self):
        yield from self._attributes.values()

    def __repr__(self):
        items = {k:v.type for (k,v) in self._attributes.items()}
        class_name = self.__class__.__name__
        indent = len(class_name) + 1
        repr = ('\n' + ' '*indent).join(pprint.pformat(items, indent=1, width=80-indent).split("\n"))
        return f"{class_name}({repr})"
    


def get_default_configuration(
        data:pd.Series|pd.DataFrame, 
        include_columns:list=None, 
        exclude_columns:list=[],
    ) -> list[BaseConfiguration]:
    """ 
    Determines the type of a provided data series (single attribute) based on the values provided, 
    returns the appropriate type of configuration
    """
    if isinstance(data, pd.DataFrame):
        columns = set([*data.columns]).difference(set(exclude_columns))
        if include_columns is not None:
            columns = columns.intersection(set(include_columns))
        data_list = [data[col] for col in data.columns]
    elif isinstance(data, pd.Series):
        data_list = [data]
    else:
        raise Exception(f"Unsupported data format {data.__class__.__name__}; must be pandas.Series or pandas.DataFrame.")
    configurations = []
    for item in data_list:
        # determine attribute type
        if is_numeric_dtype(item) or all([isNumeric(x) for x in item.unique()]):
            config = NumericConfiguration.from_values(item.name, item.unique())
        else:
            config = CategoricalConfiguration(item.name, item.unique())
        configurations.append(config)
    return configurations

    