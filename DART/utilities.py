__all__ = [
    "isNumeric",
]

def isNumeric(string:str):
    """ Checks if a string represents a number; supports signed values as well as decimals """
    return string.replace(".","",1).lstrip("-+").isnumeric()