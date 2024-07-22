from __future__ import annotations
import typing as t
import torchhd
import torch
from itertools import combinations, repeat
import numpy as np

from .globals import current_memory


if t.TYPE_CHECKING:
    from .item_memory import ItemMemory
    from .globals import Subgroup # TODO: remove
    
def compare(subgroups1:list[dict], subgroups2:list[dict]=None, mem:ItemMemory=None, app=None):
    if not mem:
        mem = current_memory
    
    
    if not isinstance(subgroups1, list):
        subgroups1 = [subgroups1]
    if not subgroups2: # pairwise
        subgroups2 = subgroups1
    if not isinstance(subgroups1, list):
        subgroups2 = [subgroups2]
    # Remove any subgroups without samples (TODO: add them in later to say that there are no samples)
    subgroups1 = [s for s in subgroups1 if len(s['indices']) > 0]
    subgroups2 = [s for s in subgroups2 if len(s['indices']) > 0]
    
    # Take 2 -> just try all combinations, rather than filtering before
    attributes = set([x for y in subgroups1 for x in y['included_attributes']]) & set([x for y in subgroups2 for x in y['included_attributes']])
    attributes = list(attributes)
    # the entire collection of attributes that are included in at least one of each set
    N = len(attributes)
    comparisons = []
    for i in range(1, N+1):
        for comb in combinations(attributes, i):
            # make all the comparisons, according to the set of attributes currently being used
            s1_HVs = _compose_subgroup_hypervectors(subgroups1, comb, mem)
            s2_HVs = _compose_subgroup_hypervectors(subgroups2, comb, mem)
            similarities = torchhd.cosine_similarity(s1_HVs, s2_HVs)
            comparisons += _compose_comparison_information(subgroups1, subgroups2, comb, similarities, app)
            
    return comparisons

def _compose_comparison_information(subs1, subs2, atts, sim, app):
    out = []
    base_criteria = {} # defualt (no app)
    if app:
        base_criteria = app.config["basecriteria"]["compare"]
    
    for ii, s1 in enumerate(subs1):
        out += [{
                "Subgroup 1": {
                    "criteria": s1["criteria"],
                    "size": len(s1["indices"]),
                    "added_criteria": {k:v for (k,v) in s1["criteria"].items() if k not in base_criteria["Subgroup 1"]},
                    "indices": s1["indices"],
                },
                "Subgroup 2": {
                    "criteria": s2["criteria"],
                    "size": len(s2["indices"]),
                    "added_criteria": {k:v for (k,v) in s2["criteria"].items() if k not in base_criteria["Subgroup 2"]}, 
                    "indices": s2["indices"],
                },
                "similarity": sim[ii,j].item(),
                "overlap": len(set(s1["indices"]) & set(s2["indices"])),
                "similarity_attributes": list(atts),
            } for (j, s2) in enumerate(subs2)
        ]
    return out

def _compose_subgroup_hypervectors(subgroups:list[dict], atts:list, mem:ItemMemory) -> list[torchhd.VSATensor]:
    out = []
    for sub in subgroups:
        out.append(
            torch.unsqueeze(torchhd.multiset(torch.cat( [mem.get_sample(idx, atts) for idx in sub['indices']],0)),0)
        )
    return torch.cat(out,0)

    
def compare_OLD(subgroups1:list[Subgroup], subgroups2:list[Subgroup]=None, mem:ItemMemory=None):
    print("\n\nBeginning comparison!")#
    print(*subgroups1, sep="\n\n")#
    
    if not mem:
        mem = current_memory
    if not isinstance(subgroups1, list):
        subgroups1 = [subgroups1]
    if not subgroups2: # pairwise
        subgroups2 = subgroups1
    if not isinstance(subgroups1, list):
        subgroups2 = [subgroups2]
    qualifiers = []
    if mem.config["AVOID_OVERLAP"]:
        qualifiers.append(_check_overlap(subgroups1, subgroups2))
    
    qualifiers.append(_check_same_included_attributes(subgroups1, subgroups2))
    # this second qualifier makes sure that we aren't comparing subgroup hypervectors made of different attributes, but there isn't yet a workaround for using the subset of attributes that they do have in common
    
    print("\n\n",*qualifiers, sep="\n")
    _included_attribute_overlap(subgroups1, subgroups2)
    
def _check_overlap(subgroups1, subgroups2):
    N = len(subgroups1)
    arr = np.full([N,len(subgroups2)],None)
    for i in range(N):
        arr[i,:] = [ len( set(subgroups1[i].indices) & set(s.indices) ) == 0 for s in subgroups2]
    return arr
    
def _check_same_included_attributes(subgroups1, subgroups2):
    N = len(subgroups1)
    arr = np.full([N,len(subgroups2)],None)
    for i in range(N):
        arr[i,:] = [ subgroups1[i].included_attributes == s.included_attributes for s in subgroups2]
    return arr

def _included_attribute_overlap(subgroups1, subgroups2):
    N = len(subgroups1)
    arr = np.full([N, len(subgroups2)],None, dtype=tuple)
    for i in range(N):
        arr[i,:] = [_get_included_attribute_overlap(subgroups1[i], s) for s in subgroups2]
    print("\nINCLUDED ATT CHECK:\n", arr)
    print(np.unique(arr))

def _get_included_attribute_overlap(sub1, sub2):
    return tuple(set(sub1.included_attributes) & set(sub2.included_attributes))
    
    
    
