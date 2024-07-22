from flask import Flask, render_template, request, redirect, url_for
from threading import Thread
from pathlib import Path
import tempfile
import dill
import json


from .dataset_details import get_dataset_details
from .processing import filter_processing, run_similarity

"""
situational_config = {
    # config that is just used for passing information (name: default)
    "uploaded-file":None,
    "creation-stage": 0,
    "attributes":{},
}
from flask import current_app
def reset_config():
    for k,v in situational_config.items():
        current_app.config[k] = v

def process_creation_forms(req: request):
    stage = req.form["stage"]
    #print(current_app.config['temp-dir'])
    if  stage == "file-upload":
        # save as a temp file -> read the information
        uploaded_file = request.files["file"]
        #ext = Path(uploaded_file.filename).suffix
        current_app.config['uploaded-file'] = uploaded_file
    
    if stage != current_app.config["database-creation-stages"][-1]: 
        current_app.config["creation-stage"] += 1
"""      

def load_dataset(app):
    # connect
    with open(app.config['current-memory-file'], 'rb') as f:
        app.config['current-memory'] = dill.load(f)
    app.config["dataset-loading-status"]["dataset-connected"] = True
    # get database and distribution details
    with app.app_context():
        with app.config['current-memory'].memory_context():
            app.config['dataset-details'], app.config["distribution-details"] = get_dataset_details()
    app.config['dataset-loading-status']['details-loaded'] = True;
    # done
    return


# MAIN APP ======================================================================================================



def create_app() -> Flask:
    app = Flask(__name__)
    
    app.config["DEMO"] = True # TODO: cli command toggle (following flask docs doesnt seem to work)
    
    app.config["dataset-loading-status"] = {
        "dataset-connected": False,
        "details-loaded": False,
    }
    
    app.config["filters"] = {
        "compare":{},
        "explore":{},
    }
    app.config["subgroups"] = {
        "compare":{},
        "explore":{},
    }
    app.config["results"] = {
        "compare":{},
        "explore":{},
    }
    app.config["basecriteria"] = {
        "compare":{},
        "explore":{},
    }
    app.config["dataset-directories"] = [
        Path(__file__).parent.parent / Path("localdata"),
    ]
    app.config["database-creation-stages"] = ["file-upload", "attribute-configuration"]
    
    app.config['current-memory-file'] = None
    app.config['current-memory'] = None
    app.config['dataset-details'] = {} 
    app.config["distribution-details"] = {}
    app.config['creation-stage'] = 0
    
    app.config['current-memory-file'] = app.config['dataset-directories'][0] / Path('test_dataset.pkl') # DEBUG
    
    _job_tracker = {};
    
    if app.config['current-memory-file']:
        with open(app.config['current-memory-file'], 'rb') as f:
            app.config['current-memory'] = dill.load(f)
    
    available_dataset_files = {
        x.stem:x for y in app.config["dataset-directories"] for x in y.iterdir()
    }
    
    
    # || Home page =====================================================
    @app.route("/", methods=["GET", "POST"])
    def home():
        """
        with app.app_context():
            reset_config()   # reset the portions of config related to current dataset
        """
        if request.method == "POST":
            if "navigate-to" in request.form:
                return redirect(request.form["navigate-to"])
            elif "action" in request.form and request.form['action'] == 'dataset-selection':
                # select the current database 
                app.config["current-memory-file"] = available_dataset_files[request.form['selection']]
                # Go to a loading screen (while loading the dataset information)
                return redirect("/loading")
                with open(app.config['current-memory-file'], 'rb') as f:
                    app.config['current-memory'] = dill.load(f)
                return redirect("/details")
        return render_template('home.html', datasets=available_dataset_files, access_dataset= bool(app.config["current-memory-file"]), demo=app.config["DEMO"])
        
    # || Loading Screen ===========================================================
    @app.route("/loading", methods=["GET","POST"])
    def load_content():
        if request.method == "POST":
            if "navigate-to" in request.form:
                return redirect(request.form["navigate-to"])
        
        # set the app loading
        load_dataset(app)
        return render_template('load.html', datasets=available_dataset_files, access_dataset=bool(app.config["current-memory-file"]), demo=app.config["DEMO"])
    
    
    
    
    
    # || New dataset creation/upload ==============================================
    @app.route("/new", methods=["GET","POST"])
    def new_dataset_creation():
        if request.method == "POST":
            if "navigate-to" in request.form:
                return redirect(request.form["navigate-to"])
        """
        if "creation-stage" not in app.config:
            return redirect("/")
        
        if request.method == "POST":
            with app.app_context():
                process_creation_forms(request)
            
        return render_template(
            'add_new_dataset.html', 
            stage=app.config["database-creation-stages"][app.config["creation-stage"]],
            all_stages=app.config["database-creation-stages"],
            attributes=app.config["attributes"],
        )
        """
        return "Not Yet Implemented :("
        
        
    # Working within a dataset ======================================================================
    ## View High-level Dataset Details --------------------------------------------------------------
    @app.route("/details", methods=["GET", "POST"])
    def details():
        if request.method == "POST":
            if "navigate-to" in request.form:
                return redirect(request.form["navigate-to"])
        '''
        if not app.config['dataset-details']:
            with app.app_context():
                with app.config['current-memory'].memory_context():
                    app.config['dataset-details'], app.config["distribution-details"] = get_dataset_details()
        '''
        
        return render_template('dataset_details.html', **app.config['dataset-details'], access_dataset= bool(app.config["current-memory-file"]), demo=app.config["DEMO"])
        
    ## Compare two specific subgroups / populations --------------------------------------------------
    @app.route("/compare", methods=["GET", "POST"])
    def compare():
        if request.method == "POST":
            if "navigate-to" in request.form:
                return redirect(request.form["navigate-to"])
        if not app.config['dataset-details']: # should already have details, but get them in case
            with app.app_context():
                with app.config['current-memory'].memory_context():
                    app.config['dataset-details'], app.config["distribution-details"] = get_dataset_details()
        
        
        return render_template(
            "compare.html", 
            access_dataset=bool(app.config["current-memory-file"]),
            attributes=app.config['dataset-details']['attributes'],
            demo=app.config["DEMO"])
        
    ## Backend -> communication between python and javascript ------------------------------
    
    @app.route("/loading-status")
    def loading_status():
        return json.dumps(app.config["dataset-loading-status"])
    
    @app.route("/get-dataset-details")
    def get_dataset_details():
        return json.dumps(app.config['dataset-details'])
        
    @app.route("/get-idx-attributes")
    def get_subgroup_distributions():
        return json.dumps(app.config["distribution-details"]);
        
    _job_functions = {
        "filter_processing": filter_processing,
        "similarity_calculation": run_similarity,
    }
    
    @app.route("/job-progress", methods=["GET", "POST"])
    def job_progress_tracking():
        if request.method == "POST":
            assert "_job_id" in request.form
            assert "_job_type" in request.form
            assert "_page_name" in request.form
            assert request.form["_job_type"] in _job_functions
            # create the thread
            t = Thread(
                target = _job_functions[request.form["_job_type"]],
                kwargs= dict(
                    app = app,
                    formData = request.form,
                )
            )
            # Submit the job
            t.start()
            _job_tracker[request.form["_job_id"]] = t
        # Check the thread progress for each job
        _job_status = {job_id:"running" if thread.is_alive() else "idle" for (job_id, thread) in _job_tracker.items()}
        return json.dumps(_job_status)
    
    @app.route("/<pageName>-<dtype>", methods=["GET"])
    def view_data(pageName, dtype):
        if dtype not in app.config:
            return f"Unrecognized data request: {dtype}"
        if pageName not in app.config[dtype]:
            return f"Unrecognized page name: {pageName}"
        if dtype == "subgroups":
            out = {}
            for sub, lst in app.config[dtype][pageName].items():
                out[sub] = [ {k:v for (k,v) in x.items() if k!='hypervector'} for x in lst]
            return json.dumps(out)
        else:
            return json.dumps(app.config[dtype][pageName])
    
        
    return app






