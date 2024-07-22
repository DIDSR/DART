from __future__ import annotations
import typing as t
import pandas as pd
import numpy as np
import torchhd
import torch

from functools import partial
from multiprocessing import Pool
from multiprocessing import Manager

from .globals import AttributeConfig
from .globals import current_memory
from .utils import iter_queue

if t.TYPE_CHECKING:
    from .item_memory import ItemMemory
    from multiprocessing import Queue
    

# NOTES: 
## Attribute names cannot start with a number or the code will error due to the namedtuple._asdict() function (adding an underscore at the beginning can work around this)
## Using multiprocessing to encode the samples -> I'm not certain if the sample order is perserved (shouldn't affect the tool in general, but may make tool validation challenging)

def encode(data:pd.DataFrame, attributes:dict[str, AttributeConfig], dim:int=10, mem:ItemMemory=None) -> None:
    # TODO: low dimensionality warning
    if not mem:
        mem = current_memory
    # make the key HVs and add to the memory
    keys = torchhd.random(len(attributes), dim)
    for i, att in enumerate(attributes):
        mem.add_key(att, keys[i,:])
    del keys
    
    # make the option HVs and add to the memory
    for att in attributes:
        if att.kind == "categorical":
            enc = torchhd.random
        elif att.kind == "numeric":
            enc = torchhd.level
        else:
            raise Exception(f"Unrecognized attribute kind \"{att.kind}\"")
        
        HVs = enc(len(att.values), dim)
        for i, v in enumerate(att.values):
            mem.add_option(att.name, str(v), HVs[i,:])
    
    # encode the samples themselves
    keys = dict(mem.keys)
    options = dict(mem.options)
    M = Manager()
    Q = M.Queue()

    with Pool(mem.config["MAX_PROCESSES"]) as P:
        P.map( 
            partial(_encode_sample, keys=keys, options=options, queue=Q), 
            map(lambda x: x._asdict(), data.itertuples(index=False) )
        )
    # Add the samples to the memory
    for sample in iter_queue(Q):
        mem.add_sample(sample)   
    
    return

def _encode_sample(sample_data:dict, keys:dict[str,AttributeConfig], options:dict[str,dict[str,AttributeConfig]], queue:Queue) -> torchhd.VSATensor:
    # TODO: convert everything to strings earlier and remove all the str() functions
    attributeHypervectors = []
    for att, value in sample_data.items(): 
        key = keys[str(att)]
        option = options[str(att)][str(value)]
        attributeHypervectors.append(torchhd.bind(key, option))
    queue.put(torchhd.multiset( torch.cat(attributeHypervectors, 0) ))
    #print("Est size:", queue.qsize()) # print the number of samples in the Q
    

def get_default_configuration(data:pd.DataFrame) -> list[AttributeConfig]: # TODO: numeric bin?
    """ Get the default attribute configuration from the data provided """
    cfg = []
    for att in data.columns:
        if pd.api.types.is_numeric_dtype(data[att]) and att.lower() != "id":
            kind = "numeric"
            mn = data[att].min()
            mx = data[att].max()
            step = min(np.diff(sorted(data[att].unique().tolist())))
            values = np.arange(mn,mx+step, step).tolist()
        else:
            kind = "categorical"
            values = data[att].unique().tolist()
        cfg.append(AttributeConfig(name=att, kind=kind, values=values))
    return cfg
    


    
    
    
    
    
    