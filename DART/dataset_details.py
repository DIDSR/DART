from flask import current_app

from HDC_backend import current_memory


def get_dataset_details():
    det = {
        "n_samples": len(current_memory.samples),
        "attributes": current_memory._attribute_config,
        "distributions": {},
    }
    complete_dists = {}
    for att in current_memory._attribute_config:
        det["distributions"][att.name] = {}
        complete_dists[att.name] = {}
        for v in att.values:
            indices = current_memory.query(att.name, str(v))
            complete_dists[att.name][str(v)] = indices
            det["distributions"][att.name][str(v)] = len(indices)
        complete_dists[att.name] = {x:k for (k,v) in complete_dists[att.name].items() for x in v}
    return det, complete_dists
    
