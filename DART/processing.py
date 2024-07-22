
def filter_processing(app, formData):
    attributes = app.config['dataset-details']['attributes']
    page = formData["_page_name"].lstrip("/")
    app.config["filters"][page] = {} # reset
    selections = [k.split("|") for k in formData if k.startswith("selection")]
    filter_attributes = formData.getlist("filter-by")
    if len(selections) == 0 or len(filter_attributes) == 0: # no filters to apply
        return
    subgroups = list(set([s[1] for s in selections]))
    for sub in ["Subgroup 1", "Subgroup 2"]:
        filters = {}
        for att in filter_attributes:
            fv = formData.getlist(f"selection|{sub}|{att}")
            if len(fv) > 0:
                config = [a for a in attributes if a.name == att][0]
                if config.kind == "numeric": # process numeric ranges
                    mn,mx = [float(x) for x in fv[0].split(",")]
                    fv = [str(val) for val in config.values if val >= mn and val <= mx]
                filters[att] = fv
        app.config["filters"][page][sub] = filters
    
    # additional options
    app.config["filters"][page]["similarity_attributes"] = formData.getlist("similarity-att")
    app.config["filters"][page]["allowed_attributes"] = formData.getlist("optional-att")
    (mn, mx) = [ int(x) for x in formData["levels-allowed"].split(",")]
    app.config["filters"][page]["levels_allowed"] = list(range(mn, mx+1 ))
    return
  
  
from HDC_backend import fetch_subgroups, compare
import json



def _convert_filter_format(filters): # TODO: figure out where the format becomes odd in the first place (remove this function)
    keys = list(set([x for y in filters for x in y]))
    return {k:[str(x[k]) for x in filters if k in x] for k in keys}
    
    
additional_form_data = [ # fields of information besides subgroup filters
    "allowed_attributes",
    "levels_allowed",
    "similarity_attributes",
]

import numpy as np

def run_similarity(app, formData):
    page = formData["_page_name"].lstrip("/");
    app.config["results"][page] = {} # reset
    app.config["subgroups"][page] = {} # reset
    
    
    kwargs = {k:json.loads(formData[k]) for k in additional_form_data}
    subgroup_filters = [json.loads(formData[sub]) for sub in ["Subgroup 1", "Subgroup 2"] ]
    subgroup_filters = [_convert_filter_format(f) for f in subgroup_filters]
    app.config["basecriteria"][page] = dict(zip(["Subgroup 1", "Subgroup 2"],subgroup_filters))
    # fetch subgroups
    with app.config["current-memory"].memory_context():
        subgroups = [
            fetch_subgroups(subgroup_criteria, **kwargs) for subgroup_criteria in subgroup_filters
        ]
        
        for i, lst in enumerate(subgroups):
            for ii, sub in enumerate(lst):
                sub["distributions"] = {att: [app.config["distribution-details"][att][id] for id in sub['indices']] for att in sub['included_attributes']}
                
        # save the subgroups to the app config
        app.config["subgroups"][page] = {
            'Subgroup 1': subgroups[0],
            'Subgroup 2': subgroups[1],
        }
        
        
        if page == "compare":
            app.config["results"][page] = compare(*subgroups, app=app)
             
        elif page == "explore":
            run_explore(app, subgroups)

    return
   
def run_explore(app, filters): # TODO
    print("NOT IMPLEMENTED! (EXPLORE)")