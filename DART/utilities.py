from __future__ import annotations
__all__ = [
    "read_files_to_dataframe",
    "isNumeric",
]


import pandas as pd
from pathlib import Path


SUPPORTED_FILETYPES = [".csv", ".tsv"]

def read_files_to_dataframe(files:list[str|Path]|str|Path, ext:str=None) -> pd.DataFrame: # TODO: improve error handling
    if not isinstance(files, list):
        files = [files]
    data = []
    for file in files:
        file = Path(file)
        if ext is None:
            ext = file.suffix
        assert ext in SUPPORTED_FILETYPES 
        if ext in ['.csv', '.tsv']:
            df = pd.read_csv(file, sep="\t" if ext == ".tsv" else ",")
        data.append(df)
    data = pd.concat(data)
    return data

def isNumeric(string:str):
    """ Checks if a string represents a number; supports signed values as well as decimals """
    return string.replace(".","",1).lstrip("-+").isnumeric()