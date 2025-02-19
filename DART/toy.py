__all__ = [
    "generate_toy_example", # TODO: remove?
]

from functools import partial
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import random
import seaborn as sns
from scipy.stats import skewnorm


provided_configs = {
    "age_and_sex": [
    {
        "name": "age",
        "type": "numeric",
        "min": 0,
        "max": 100,
        "step": 1,
        "distribution": "normal",
        "skewness": -3,
    },
    {
        "name": "sex",
        "type": "categorical",
        "values": {
            "Female": 1,
            "Male": 2,
        },
    },
]
}
def generate_toy_example(*attribute_configs, num_samples:int=100, random_state:int=None) -> pd.DataFrame:
    """ Generates a toy dataset from the provided attribute configurations. """
    state = random.Random(random_state)
    data = {}
    for attribute in attribute_configs:
        if attribute['type'] == 'categorical':
            if isinstance(values, list): # equally distributed
                values = {v:1 for v in values}
            values = state.choices(
                population=[*attribute['values'].keys()], 
                weights=[*attribute['values'].values()],
                k=num_samples,
            )
        elif attribute['type'] == 'numeric':
            if attribute['distribution'] == "normal": # a normal distribution (with optional skew)
                values = randn_skew(
                    N=num_samples, 
                    random_state=random_state,
                    minimum=attribute['min'],
                    maximum=attribute['max'],
                    step=attribute['step'],
                    skewness=attribute['skewness'] if 'skewness' in attribute else 0.0,
                )
            elif attribute['distribution'] == 'uniform' or 'distribution' not in attribute:
                potential = np.arange(attribute['min'], attribute['max']+attribute['step'], attribute['step'])
                values = state.choices(
                    population=potential,
                    k=num_samples
                )
            else:
                raise Exception(f"Unrecognized numeric value distribution type \"{attribute['type']}\"")
        else:
            raise Exception(f"Unrecognized attribute type \"{attribute['type']}\"")
        data[attribute['name']] = values
    return pd.DataFrame.from_dict(data)


age_and_sex = partial(generate_toy_example, *provided_configs["age_and_sex"])
  
def randn_skew(N, random_state:int, minimum:float=0, maximum:float=1, step:float=0.1, skewness=0.0) -> list[float]:
    allowed_values = np.arange(minimum, maximum+step, step)
    def nearest(value):
        idx = (np.abs(allowed_values - value)).argmin()
        return allowed_values[idx]
    rng = np.random.default_rng(random_state)
    R = skewnorm.rvs(a=skewness, size=N, random_state=rng)
    # scale [0,1]
    R = R - min(R)
    R = R / max(R)
    # scale [minimum, maximum]
    R = R*(maximum-minimum) + minimum
    R = [nearest(r) for r in R]
    return R

def show_distributions(
        data:pd.DataFrame, 
        title:str=None, 
        n_rows:int=None,
        n_cols:int=None, 
        scale:list[float]=[8,6],
        **hist_kws,
        ) -> plt.Figure:
    def get_square(N):
        # gets the number of rows and columns to make approximately square, with a preference to more columns than rows
        sqrt = N**(0.5)
        if sqrt % 1 == 0:
            return [sqrt, sqrt]
        n_rows = int(sqrt)
        while (N / n_rows) % 1 != 0 and n_rows > 1:
            n_rows -= 1
        return [int(n_rows), int(N / n_rows)]
        
    if n_rows is None and n_cols is None:
        n_rows, n_cols = get_square(len(data.columns))
    elif n_rows is None:
        n_rows = int(len(data.columns) / n_cols)
    elif n_cols is None:
        n_cols = int(len(data.columns) / n_rows)
    fig, axes = plt.subplots(n_rows, n_cols, figsize=[n_cols*scale[0], n_rows*scale[-1]])
    for ii, attribute in enumerate(data.columns):
        axes[ii].set_title(attribute)
        sns.histplot(data, x=attribute, ax=axes[ii], **hist_kws)
    fig.suptitle(title)
    return fig
    
        
    

