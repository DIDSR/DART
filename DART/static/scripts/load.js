
var pythonProgress = {
        "dataset-connected": undefined,
        "details-loaded": undefined,
    }

var pythonCheckComplete = false;

var jsProgress = {
    "store-attributes": undefined,
    "create-colorpalettes": undefined,
}
var jsCheckComplete = false;

async function loadDatasetInformation() {
    /* Set the Theme */
    const currentTheme = localStorage.getItem("current-theme") || "default";
    setTheme(currentTheme);
    
    /* Start the loading tasks */
    // reset tracking variables
    pythonProgress = { 
        "dataset-connected": undefined,
        "details-loaded": undefined,
    }
    pythonCheckComplete = false;
    jsProgress = {
        "store-attributes": undefined,
        "create-colorpalettes": undefined,
    }
    jsCheckComplete = false;
    
    /* monitor the python jobs... */
    monitorDatasetLoadingStatus();
    checkJSTrigger();
    monitorLoadingStatus();
}

/* 
 * Checks if the JS functions can be called yet -> calls them if able
 */
async function checkJSTrigger(maxChecks=100, checkEvery=1000, numChecks=0) {
    numChecks++;
    if (numChecks > maxChecks) {
        console.warn("timeout");
        jsCheckComplete = true;
        return;
    }
    if (!pythonCheckComplete) { // can't trigger JS
        setTimeout(checkJSTrigger, checkEvery, maxChecks, checkEvery, numChecks);
    } else {
        /* || Set the attribute configuration information */
        var attConfig = await fetch("/get-dataset-details");
        attConfig = await attConfig.json();
        attConfig = Object.fromEntries(attConfig['attributes'].map( x => [x[0],{"name":x[0], "kind":x[1], "values":x[2]}] ) );
        sessionStorage.setItem("database_attribute_configuration", JSON.stringify(attConfig));
        jsProgress["store-attributes"] = true;
        /* || create the color sets */
        configureColorSets();
        jsProgress["create-colorpalettes"] = true;
        jsCheckComplete = true;
    }
}



/*
 * Monitors the overall loading status
 */
function monitorLoadingStatus(maxChecks=10000, checkEvery=1000, numChecks=0) {
    numChecks++;
    // update the check statuses
    var status = {...pythonProgress, ...jsProgress};
    for (var key in status) {
        var indicator = document.getElementById(`${key}-indicator`);
        if (status[key] === undefined || status[key] === false) {
            indicator.setAttribute("status", "not-started");
        } else if (status[key] === true) {
            indicator.setAttribute("status", "complete");
        } else if (status[key] == "error") {
            indicator.setAttribute("status", "error");
        } else {
            console.warn(`Unrecognized status "${status[key]}" found for job ${key}`);
        }
    }
    
    // update the progress bar
    const pb = document.querySelector("progress");
    var complete = Object.values(status).filter( x => x === true);
    pb.value = complete.length / Object.values(status).length;
    
    
    if ((pythonCheckComplete && jsCheckComplete) || (numChecks > maxChecks)) { // todo -> add javascript check as well
        // loading complete
        if (pb.value != 1) {
            document.getElementById("loading-indicator").toggleAttribute("errored", true);
            document.getElementById("loading-details").toggleAttribute("hidden", false);
        } else {
            document.getElementById("loading-indicator").toggleAttribute("complete", true);
            // TODO: trigger the next page navigation
            document.querySelector("form").submit();
        }
        return;
    } else {
        setTimeout(monitorLoadingStatus, checkEvery, maxChecks, checkEvery, numChecks);
    }
}

/* Monitors the python end of the loading status
*/
async function monitorDatasetLoadingStatus(maxChecks=100, checkEvery=1000, numChecks=0) {
    var res = await fetch("/loading-status");
    pythonProgress = await res.json();
    numChecks++;
    if (Object.values(pythonProgress).some(x => !x) ) { // not all of them are loaded yet
        if (numChecks >= maxChecks) {
            pythonProgress =  Object.fromEntries( Object.entries(pythonProgress).map( x => {
                if (!x[1]) {
                    return [x[0], "error"];
                } else {
                    return x;
                }
            }));
            pythonCheckComplete = true;
            return;
        } else  { // setup another check
        setTimeout(monitorDatasetLoadingStatus, checkEvery, maxChecks, checkEvery, numChecks);
        }
    } else {
        // everything is loaded
        pythonCheckComplete = true;
        return;
    }   
}