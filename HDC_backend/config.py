
from .globals import default_config

class Config(dict): # TODO: load from file
    def __init__(self):
        super().__init__(default_config)
        
    
    
