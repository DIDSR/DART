from __future__ import annotations
import typing as t
import contextvars
from .globals import _cv_ctx

if t.TYPE_CHECKING:
    from .item_memory import ItemMemory
    
class MemoryContext:
    def __init__(self, item_memory:ItemMemory):
        self.mem = item_memory
        self._cv_tokens: list[contextvars.Token[MemoryContext]] = []
        
    def __enter__(self) -> ItemMemory:
        self._cv_tokens.append(_cv_ctx.set(self))
        return self
    
    def __exit__(self, *args) -> None:
        _cv_ctx.reset(self._cv_tokens.pop())
        return