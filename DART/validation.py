__all__ = [
    "sample_encoding",

]

import pandas as pd
import torch
import torchhd

from .hypervector_sets import BaseHypervectorSet

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .dataset import Dataset


def sample_encoding(
        hypervector:torch.Tensor, 
        dataset, #:Dataset, # TODO: figure out why this type hint doesn't work with the if TYPE_CHECKING
        expected:dict,
        ):
    """ Validates the encoding of a single sample's hypervector prior to being combined into a dataset hypervector. """
    result = dataset.query(hypervector, [*expected.keys()])
    return all([dataset._basis[att].is_matching_value(expected[att], result[att]) for att in expected])

