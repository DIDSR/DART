from __future__ import annotations
import typing as t
import torchhd
import torch


from .memory_context import MemoryContext
from .utils import unpack
from .globals import AttributeConfig

if t.TYPE_CHECKING:
    from .config import Config



class ItemMemory(object):
    def __init__(self, config:Config):
        self._keys = {}
        self._options = {}
        self._samples = []
        self._attribute_config = []
        self._config = config
    
    @property
    def config(self):
        return self._config
        
    @property
    def keys(self) -> dict[str, torchhd.VSATensor]:
        return self._keys
        
    def add_key(self, attribute:AttributeConfig, hypervector:torchhd.VSATensor) -> None:
        # TODO: check name and hypervector are valid, have toggle to replace existing or not
        self._attribute_config.append(attribute)
        name = attribute.name
        hypervector = self._ensure_valid_hypervector(hypervector)
        self._keys[name] = hypervector
        
    @property
    def options(self) -> dict[str, dict[str, torchhd.VSATensor]]:
        return self._options
    
    def add_option(self, key:str, name:str, hypervector:torchhd.VSATensor) -> None:
        # TODO: check name and hypervector are valid, have toggle to replace existing or not
        if key not in self._keys:
            print(f"Warning: Memory does not contain the key \"{key}\" needed to retrieve the option ({key}, {name})")
        if key not in self._options:
            self._options[key] = {}
        hypervector = self._ensure_valid_hypervector(hypervector)
        self._options[key][name] = hypervector
        
    @property
    def attribute_config(self):
        return self._attribute_config
        
    @property
    def is_empty(self):
        return len(self.keys) == 0 and len(self.options) == 0
    
    @property
    def samples(self):
        return self._samples
        
    def add_sample(self, hypervector:torchhd.VSATensor) -> None:
        hypervector = self._ensure_valid_hypervector(hypervector)
        self._samples.append(hypervector)
        
    def __getitem__(self, x): # TODO: extend to work w/ samples as well?
        """ x can be a tuple of (key,option), a key (str), an option (str) (if no duplicate option names across keys), and AttributeConfig or a hypervector.
        If a hypervector is provided, returns the key or key,option pair that it matches, otherwise returns the indicated hypervector"""
        if isinstance(x, torchhd.VSATensor):
            return self._match(x)
        if isinstance(x, tuple):
            if len(x) == 1:
                x = x[0]
            else:
                return self.options[x[0]][x[1]]
        if isinstance(x, AttributeConfig):
            x = x.name
        
        # narrowed x down to either a key or an option name
        if x in self.keys:
            return self.keys[x]
        matches = []
        for k, v in self.options.items():
            if x in v:
                matches.append( (k,v) )
        
        if len(matches) == 1:
            key, opt = matches[0]
            return self.options[key][opt]
        elif len(matches) == 0:
            raise Exception(f"Could not find an option or key with the name \"{x}\"")
        else:
            raise Exception(f"There are multiple options with the name \"{x}\".Provide key.")
        
    def memory_context(self) -> MemoryContext:
        """ Allows the use of the memory with globals.current_memory """
        return MemoryContext(self)
        
    def get_attribute_options(self, attribute:str):
        """ Get all of the options (subgroup definitions) of the provided attribute """
        att_config = [ a for a in self.attribute_config if a.name == attribute]
        assert len(att_config) == 1 # TODO: error handling
        att_config = att_config[0]
        # TODO: adjust for binning numeric attributes
        return att_config.values # TODO: switch to options or something (accounting for binning)
        
    def query(self, key:str, options:list) -> list[int]:
        """ Get the indices of all of the samples whose value of key is in options """
        if not options: # no options provided -> all indices meet criteria
            return [*range(len(self._samples))]
            
        if not isinstance(options, list):
            options = [options] 
            
        valid_option_idxs = [ [*self.options[key]].index(o) for o in options]   
        samples = [torchhd.bind(HV, self.keys[key]) for HV in self._samples]
        sim = torchhd.cosine_similarity(
            torch.cat(samples, 0),
            torch.cat([*self.options[key].values()], 0),
        )
        option_idxs = torch.squeeze(sim.topk(1,-1).indices).tolist()
        sample_idxs = [i for i,opt_idx in enumerate(option_idxs) if opt_idx in valid_option_idxs]
        return sample_idxs
        
    def get_sample(self, idx, attributes:list=[]) -> torchhd.VSATensor:
        """ Get the hypervector of a sample composed only of the indicated attributes
        If no attributes are indicated, return hypervector with all attributes """
        HV = self.samples[idx]
        if not attributes:
            return HV
        comps = []
        for att in attributes:
            q = torchhd.bind(HV, self.keys[att])
            match = torchhd.cosine_similarity(q, torch.cat([*self.options[att].values()],0))
            match = match.topk(1,-1).indices.item()
            match = [*self.options[att]][match]
            comps.append(torchhd.bind(self.keys[att], self.options[att][match]))
        HV = torch.unsqueeze(torchhd.multiset(torch.cat(comps,0)),0)
        return HV
        
    def _match(self, hypervector:torchhd.VSATensor) -> tuple:
        """ Gets the (key) or (key, option) that match the hypervector best """
        hypervector = self._ensure_valid_hypervector(hypervector)
        vals = unpack(self.keys) | unpack(self.options)
        match_options = [*vals.keys()]
        hypervector_options = torch.cat([*vals.values()], 0)
        del vals
        sim = torchhd.cosine_similarity(hypervector, hypervector_options)
        idx = sim.topk(1,-1).indices.item()
        return match_options[idx]
        
        
    def _ensure_valid_hypervector(self, hypervector:torchhd.VSATensor) -> torchhd.VSATensor: 
        # TODO: Anything else to check?
        if self.is_empty: # first hypervector, log dimensionality
            self._dim = hypervector.shape[-1]
        elif hypervector.shape[-1] != self._dim:
            raise Exception(f"The hypervector(s) in the memory have dimensionality={self._dim}, cannot add new hypervector with dimensionality={hypervector.shape[-1]}")
        while len(hypervector.shape) < 2:
            hypervector = torch.unsqueeze(hypervector, 0)
        return hypervector
        


    