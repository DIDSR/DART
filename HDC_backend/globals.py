from __future__ import annotations
import typing as t
from collections import namedtuple
from contextvars import ContextVar
from werkzeug.local import LocalProxy
from werkzeug.datastructures import ImmutableDict

if t.TYPE_CHECKING:
    from .item_memory import ItemMemory
    from .memory_context import MemoryContext

AttributeConfig = namedtuple("AttributeConfig", "name kind values")

Subgroup = namedtuple("Subgroup", "criteria included_attributes inherent_attributes indices hypervector") # TODO: remove

Comparison = namedtuple("Comparison", "subgroups included_attributes similarity")


_no_current_memory_message = "There is no current memory"

_cv_ctx: ContextVar[MemoryContext] = ContextVar("memory_context")

current_memory: ItemMemory = LocalProxy(
    _cv_ctx, "mem", unbound_message=_no_current_memory_message
)

default_config = ImmutableDict(
    {
        "MAX_PROCESSES":5, # TODO: determine reasonable default
        "IGNORE_INHERENT": True,
        "AVOID_OVERLAP": True,
    }
)
