from __future__ import annotations
import typing as t

if t.TYPE_CHECKING:
    from multiprocessing import Queue

def unpack(d:dict, _found:list={}, _root:list=[]) -> list:
    """ Get all of the values of a dictionary, regardless of the nesting involved """
    for k, v in d.items():
        if isinstance(v, dict):
            unpack(v, _found, _root+[k])
        else:
            _found[tuple(_root+[k])] = v
    return _found
    
def iter_queue(q:Queue):
    q.put(None)
    for item in iter(q.get, None):
        yield item