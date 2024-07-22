

function initPage(accessDataset) {
    /* Set the Theme */
    const currentTheme = localStorage.getItem("current-theme") || "default";
    setTheme(currentTheme);
    /* Set config information */
    setConfig();
    /* Manage Active/Disabled Pages */
    setActivePage();
    if (accessDataset == "False") {
        setDisabledNavigation();
    }
    
    /* Page-specific initialization procedures */
    const page = window.location.pathname; // page name including leading "/"
    if (["/compare","/explore"].includes(page)) {
        initializeFilterSection();
        setSubpage();
    }
    /* Apply colormaps/palettes */
    applyColorPalette();
    /* Basic initialization complete */
    document.documentElement.setAttribute("status", "idle");
    /* Any deterministic loading */
    updatePage();
    
}


const configDefaults = {
    "decimal-places": 3,
}
function setConfig() { // TODO: make any of these variable?
    for (var key in configDefaults) {
        sessionStorage.setItem(key, configDefaults[key]);
    }

}

function updatePage() {
    // updates portions of the page that change in response to user input or background processes
    document.documentElement.setAttribute("status", "loading");
    const page = window.location.pathname; // page name including leading "/"
    if (["/compare","/explore"].includes(page)) {
        // updateFilterRelatedSections(); // Still a WIP
        updateResultsSection();
    }
    /* Complete */
    document.documentElement.setAttribute("status", "idle");
}

/* || Display Settings */
/*
 * formats subgroup criteria into a more reader-friendly view
 * @param {object} criteria - subgroup definition criteria
 * @param {string} [format=default] - the formatting style to use
 */
function formatSubgroupName(criteria, format='default') { // TODO: other formatting styles
    var display = '';
    if (format == 'default') {
        display = Object.entries(criteria).reduce( (str, x) => str + ", " + `${x[0]}: ${x[1]}`, "").slice(2);
    }
    return display;
}

/* || Utilities */

/*
 * Formats a string to work as a query selector (fixes : characters)
 * @param {string} input - string to format
 */
function formatQuery(input) {
    return input.replaceAll(":", "\\:");
}

/*
 * Rounds a number to AT MOST the number of decimals specified
 * @param [number] number - the number to be rounded
 * @param [number] dec - max number of decimal places
 */
function round(number, dec) {
    if (!dec) { 
        dec = sessionStorage.getItem("decimal-places");
    }
    return Math.round((number + Number.EPSILON) * (10**dec)) / (10**dec);
}

/* || Information Management */

/*
 * Saves the attribute configuration information to the session storage for use throughout
 * @param {bool} [force=false] - pass true to set all attribute configurations, regardless of if there is already a configuration saved
 */
function setAttributeConfigurations(force=false) { // TODO: reset on database switch
    const elements = document.getElementsByClassName("attribute-configuration-information");
    var config = JSON.parse(sessionStorage.getItem("database_attribute_configuration")) || {};
    var anyChange = false;
    for (const e of elements) {
        if (!(config[e.getAttribute("name")]) || (force)) {
            anyChange = true;
            const info = namedTupleToObject(e.getAttribute("information"));
            config[e.getAttribute("name")] = info;
        }
    }
    sessionStorage.setItem("database_attribute_configuration", JSON.stringify(config));
    if (anyChange) {
        configureColorSets();
    }
}

/* || Job Management */

/*
 * Monitors a specific job (waits for a complete signal from the python backend)
 * @param {number} name - the job ID to monitor
 * @param {string} message - the message to show while the job is processing
 */
async function monitorJob(name, message, onComplete, onUpdate, updateEvery=1000) {
    var status = await checkJob(name);
    var nChecks = 1;
    while (status === undefined) {
        // No job by that name is found -> check a few more times to wait for flask to catch up, then exit if no job can be found still.
        status = await checkJob(name);
        nChecks++ ;
        if (nChecks > 5) { // set max checks here (typically only needs one)
           status = "invalid"; 
        }
    }
    
    if (status == "invalid") {
        console.error(`No job could be found with the ID ${name}`);
        return;
    } else if (status == "idle") {
        // update status bar
        document.documentElement.setAttribute("status", "idle");
        if (message) {
            document.getElementById("status-text").innerText = ""; // 
        }
        // trigger onUpdate function
        if (onUpdate) {
            onUpdate();
        }
        // trigger the onComplete function
        if (onComplete) {
            onComplete();
        }
        return;
    } else if (status == "running") {
        // update status bar
        document.documentElement.setAttribute("status", "running");
        if (message) {
            document.getElementById("status-text").innerText = message;
        }
        // trigger onUpdate function
        if (onUpdate) {
            onUpdate();
        }
        // set time out to keep checking
        timeout = setTimeout(monitorJob, updateEvery, name, message, onComplete, onUpdate, updateEvery);
    }
}

/*
 * Checks job status
 * @param {number} name - the ID of the job to check
 */
async function checkJob(name) {
    const res =  await fetch("/job-progress");
    const jobList = await res.json();
    return jobList[name];
}

/* || Page Navigation & Management */

function pageNavigation(element) {
    if (element.hasAttribute("active-selection")) { // already active
        return; 
    } 
    if (element.hasAttribute("disabled")) { // invalid selection
        return; 
    }
    const form = document.getElementById("navigation-bar");
    const navInput = form.querySelector("input[name='navigate-to']");
    navInput.value = element.getAttribute("page");
    form.submit();
}

/**
 * Sends the information associated with the element pressed (used to select dataset)
 * @param {HTMLElement} element - the element clicked
 */
function sendSelection(element) {
    if (element.hasAttribute("disabled")) { // invalid selection
        return; 
    }
    const form = element.parentElement;
    const input = form.querySelector("input[name='selection']");
    input.value = element.value;
    form.submit();
}

/**
 * Updates the navigation menu to show the current page
 */
function setActivePage() {
    const activePage = window.location.pathname;
    const element = document.querySelector(`.menu-select[page="${activePage}"]`)
    if (element) {
        element.toggleAttribute("active-selection", true);
    }
}

/**
 * Updates which navigation menu options are disabled
 */
function setDisabledNavigation() { // TODO
    const dis = ["/details", "/compare", "/explore"];
    for (var page of dis) {
        const element = document.querySelector(`.menu-select[page="${page}"]`);
        if (element) {
            element.toggleAttribute("disabled", true);
        }
    }
}

/* || Theme management */

function setTheme(themeName) {
    document.documentElement.setAttribute("theme", themeName);
}

/* || Utilities */
/**
 * Converts a python namedtuple (in string form) to a javascript object.
   Designed specifically with the AttributeConfig namedtuples in mind, 
   assumes a single list entry (values)
 * @param {string} namedTuple - python namedtuple in string format
 */
function namedTupleToObject(namedTuple) {
    // Get the tuple content (separate from namedtuple name)
    var regExp = /\(([^)]+)\)/;
    var matches = regExp.exec(namedTuple);
    var info = matches[1].replaceAll("'", "");
    // Get any information in brackets (lists)
    regExp = /\[([^)]+)\]/;
    var bracketed = regExp.exec(info)[0]
    
    // change format to avoid issues with separating the different pieces of information
    info = info.replace(bracketed, bracketed.replaceAll(", ", ","));
    info = info.split(", ").map( x => x.split("=") );
    info = Object.fromEntries(info);
    try {
        info['values'] = JSON.parse(info['values']);
    } catch {
        info['values'] = info['values'].slice(1,info['values'].length-1).split(",");
    }
    return info;  
}


/* || CHecking if session storage has information -> repeat check if the information is not there (to allow time for background processing) */

/*
 * Check if there is a certain key in session storage; if not, repeat check several times (to allow for background processing time)
 * @param{string} key - the key to check for
 * @param{string} [subkey=null] - (optional) key to look for in the retrieved information
 * @param{number} [maxChecks=10] - the maximum number of times to check for the value
 * @param{checkTimeout=100} - the time (ms) between checks
 * @param{number} numChecks - the number of checks already occured
 */
function checkStorage(key, subkey=null, maxChecks=10, checkTimeout=1000, numChecks=0) {
    if (numChecks >= maxChecks) {
        console.log(`Could not find the key "${key} (${subkey})" after ${numChecks} checks`);
        return false;
    }
    numChecks++;
    console.warn(`Checking session storage for the key "${key}"`);
    var foundKey = true;
    var res = sessionStorage.getItem(key);
    
    if (!res) {
        foundKey = false;
    } else if (subkey && !(res[subkey])) {
        foundKey = false;
    }
    
    if (foundKey) {
        console.log(`The key was found after ${numChecks} checks!`);
        console.log(sessionStorage.getItem(key));
        return true;
    } else {
        // set a timeout to check again
        console.log("key not found, checking again...");
        var timeout = setTimeout(checkStorage, checkTimeout, key, subkey, maxChecks, checkTimeout, numChecks);
    }
}
