from flask import Flask, render_template, request, redirect, url_for
from threading import Thread
from pathlib import Path
import pandas as pd
import math
import json

from .HDCmanager import Manager

status = {}



def extract_file_information(filepath):
    filepath = Path(filepath.lstrip("\"").rstrip("\""))
    assert filepath.exists() # TODO: better error handling
    info = {}
    print(filepath)
    df = pd.read_csv(filepath) # TODO: other file types
    for col in df.columns:
        info[col] = df[col].unique().tolist()    
    return info

        
    
def process_database_creation_input(form):
    id_col = None if form["id-col"] == "None" else form["id-col"]
    attributes = {att:{} for att in form.getlist("attribute-column") if att != id_col}
    for att in attributes:
        attributes[att]["type"] = form[f"column-{att}-type"]
        if attributes[att]["type"] == "categorical":
            attributes[att]["options"] = form.getlist(f"column-{att}-option")
        elif attributes[att]["type"] == "numeric":
            items = {k.replace(f"column-{att}-",""):v for k,v in form.items() if k.startswith(f"column-{att}-") and not k.endswith("type")}
            for k, v in items.items():
                try:
                    attributes[att][k] = float(v) 
                except:
                    attributes[att][k] = None
        
    
    database_name = form["database-name"] if len(form["database-name"]) > 0 else "Unnamed Database"
    
    return {"attributes":attributes, "id_col":id_col, "name":database_name}
""" 
def process_attribute_filters(info, attribute):
    att_type = info[f"{attribute}-type"]
    info = {k:v for k,v in info.items() if k.split("-")[0] == attribute and k.split("-")[-1] != "type"} # get only relevant information
    if att_type == "categorical":
        return " OR ".join([f"{attribute}={v}" for v in info.values()])
    elif att_type == "numeric": ### PICKUP HERE -> TODO: Numeric, align the output of this function with the input of the DB comparison function
        comps = {int(k.split("-")[-1]):v for k,v in info.items() if k.split("-")[-2] == "comp"}
        values = {int(k.split("-")[-1]):v for k,v in info.items() if k.split("-")[-2] == "val"}
        joins = {int(k.split("-")[-1]):v for k,v in info.items() if k.split("-")[-2] == "join"}
        criteria = [f" {joins[i].upper()} {attribute}{comps[i]}{values[i]}" if i in joins else f"{attribute}{comps[i]}{values[i]}" for i in values ]
        return "".join(criteria)

"""

def process_filters(form):
    groups = set([k.split("-")[0] for k in form if k.split("-")[0].isdigit()])
    criteria = []
    for g in groups:
        group_criteria = []
        items = {"-".join(k.split("-")[1:]):v for k,v in form.items() if k.split("-")[0] == g}
        attributes = [v for k,v in items.items() if k == "attribute"]
        attributes = form.getlist(f"{g}-attribute")
        criteria.append([process_attribute_filters(items, att) for att in attributes])
    return criteria

    
def get_attribute_information(attributes):
    out = {
        att.name:{
            "display-name":str(att),
            "type":att.type,
            "options":att.options if att.type == "categorical" else "None",
            "min":str(att.min) if hasattr(att,"min") else "None",
            "max":str(att.max) if hasattr(att,"max") else "None",
            "step":str(att.step) if hasattr(att,"step") else "None",
        } for att in attributes
    }
    return out
    
    
def detect_databases(dir): # TODO: better detection
    assert dir.is_dir()
    pickles = [file for file in dir.iterdir() if file.suffix == ".pickle"]
    return [file.stem for file in pickles if file.with_suffix(".db").exists()]


def create_app() -> Flask: # Main function ------------------------------------------------------------------------------------------------------------
    from .HDCmanager import Manager
    app = Flask(__name__)
    
    # TODO: load config from file (allow non-default values)
    app.config["LOCALDIR"] = Path(__file__).parent.parent / Path("example_data")
    app.config["DATABASES"] = detect_databases(app.config["LOCALDIR"])
    app.config["ACTIVE"] = None
    
    @app.route("/", methods=["GET", "POST"])
    def load():
        """ Create a new database or load an existing one """
        if request.method == "POST":
            if request.form["selected-database"] == "create-new": # TODO
                return redirect(url_for("new"))
            app.config["ACTIVE"] = request.form["selected-database"]
            return redirect(url_for("details"))
        return render_template("select_database.html", databases=app.config["DATABASES"])
        
        
    @app.route("/new", methods=["GET","POST"])
    def new():
        """ Create a new database """
        if request.method == "POST":
            if "filepath" in request.form:
                app.config["INPUT_DATAFILE"] = request.form["filepath"].lstrip("\"").rstrip("\"")
                file_information = extract_file_information(request.form["filepath"])
                return render_template("new_database.html", file_information = file_information)
            elif "database-creation-complete" in request.form:
                app.config["DB_CREATION_ARGS"] = process_database_creation_input(request.form)
                print(app.config["DB_CREATION_ARGS"])
                return redirect(url_for("process_database_creation"))
            
        return render_template("new_database.html")
        
    
    @app.route("/initializing", methods=["GET"])
    def process_database_creation(): 
        """ Runs while the database is being created"""
        if not set(["INPUT_DATAFILE","DB_CREATION_ARGS"]).issubset(set(app.config)):
            return redirect(url_for("new"))
        M = Manager(**app.config["DB_CREATION_ARGS"], data_file=app.config["INPUT_DATAFILE"],save_location=app.config["LOCALDIR"])
        app.config["DATABASES"].append(M.name)
        app.config["ACTIVE"] = M.name
        return redirect(url_for("details"))
        #return render_template("progressbar.html", loading_message="Intializing database...") -> TODO (if needed) show progress bar while the database initializes
        
        
    @app.route("/status", methods=["GET"])
    def getStatus():
        """ Transfer status and information from python to javascript """
        global status
        statusList = status
        return json.dumps(statusList)
        
        
    @app.route("/database/details", methods=["GET","POST"])
    def details():
        """ "landing page" for the database -> shows a high-level overview """
        if not app.config["ACTIVE"]: # somehow got to this page w/o an active database
            return redirect(url_for("load"))
        if request.method == "POST":
            if "navigate-to" in request.form:
                return redirect(url_for(request.form["navigate-to"]))
        database_pickle_file = app.config["LOCALDIR"] / Path(app.config["ACTIVE"] + ".pickle")
        # TODO: pull more information from the database file
        # TODO: make sure that it only tries to load the database once (not every time this page it loaded)
        app.config["DB"] = Manager.from_file(database_pickle_file)
        return render_template(
            "database_details.html", 
            database_name=app.config["ACTIVE"], 
            distribution_information=app.config["DB"].get_group_distributions(), 
            attribute_information=app.config["DB"].attribute_information
        )
        
        
    @app.route("/database/compare", methods=["GET","POST"]) # TODO: update to use the same style of form as explore
    def compare(): 
        """ Compare two user-specified subgroups """
        global status
        if not app.config["ACTIVE"]:
            return redirect(url_for("load"))
        if request.method == "POST":
            if "navigate-to" in request.form:
                return redirect(url_for(request.form["navigate-to"]))
            # process the query criteria
            criteria = process_filters(request.form)
            # make comparison
            t = Thread(target=app.config["DB"].compare, args=[*criteria], kwargs=dict(STATUS=status,compare_attributes=request.form.getlist("consider")))
            t.start()
        return render_template("database_compare.html", database_name=app.config["ACTIVE"], attribute_information=get_attribute_information(app.config["DB"].attributes), status=status)
        
        
    @app.route("/database/explore", methods=["GET","POST"])
    def explore():  
        """ Comparison of many different subgroups """
        if not app.config["ACTIVE"]: 
            return redirect(url_for("load"))
        if request.method == "POST":
            if "navigate-to" in request.form:
                return redirect(url_for(request.form["navigate-to"]))
        return render_template("database_explore.html", database_name=app.config["ACTIVE"],  groups=2, attribute_information=get_attribute_information(app.config["DB"].attributes))


    @app.route("/database/form-data", methods=["POST"])
    def fetchFormData():
        """ Manages formdata transfer -> allows processsing w/o reloading page """
        if request.method == "POST":
            data = request.get_json(force=True)
            if data['requested-operation'] == 'explore':
                t = Thread(
                    target=app.config["DB"].explore,
                    kwargs = dict(
                        group1=data["1"],
                        group2=data["2"],
                        compare_attributes=data["similarity-attributes"],
                        STATUS=status,
                    ),
                )
                t.start()
        return data

    return app
