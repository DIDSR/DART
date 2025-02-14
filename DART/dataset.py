__all__ = [
    "Dataset",
]

from functools import reduce
import math
import pandas as pd
import torch
import torchhd

from .attribute_configuration import AttributeGroup
from .hypervector_sets import HypervectorSet, CategoricalHypervectorSet
from .parameters import parameters


class Dataset():
    def __init__(self, configurations:AttributeGroup, samples:pd.DataFrame):
        n_chunks = math.ceil(len(samples)/parameters["hypervectors.dimensions"])
        self._attributes = [*configurations.attributes]
        self._basis = {
            "_role": CategoricalHypervectorSet.from_values("_role", configurations.attributes),
            "_chunk": CategoricalHypervectorSet.from_values("_chunk", [str(x) for x in range(n_chunks)]),
            **{att: HypervectorSet(configurations[att]) for att in configurations.attributes}
        }
        self._n_samples = len(samples)
        # encode the samples into a dataset hypervector
        self._HV = None
        for ii, row in samples.iterrows():
            chunk = int(ii/parameters["hypervectors.dimensions"])
            pos = ii % parameters["hypervectors.dimensions"]

            components = [
                torchhd.bind(self._basis["_role"][att], self._basis[att][row[att]])
                for att in self.attributes
            ]
            sample_HV = reduce(torchhd.bundle, components)
            # TODO: optional validation that the original sample attributes can be queried out of the sample hypervector
            sample_HV = torchhd.bind(
                self._basis["_chunk"][str(chunk)],
                sample_HV
            )
            sample_HV = sample_HV.permute(-1*pos)
            if self._HV is None:
                self._HV = sample_HV
            else:
                self._HV = torchhd.bundle(self._HV, sample_HV)
        # TODO: optional validation to check that all original samples' attributes can be queried out of the dataset hypervector
        print(self._HV)

    @property
    def attributes(self):
        return sorted(self._attributes)
    
    @property
    def __len__(self):
        return self._n_samples

