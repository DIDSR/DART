
/*
 * Overrides the filter submission process to allow preprocessing and prevent page reload on submission
 */
function initializeFilterSection() {
    const form = document.getElementById("criteria-filter-form");
    if (!form) {
        return;
    }
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        var formData = new FormData(form);
        // get the values of any "double-range" inputs
        const doubleRange = form.querySelectorAll("double-range");
        for (const dr of doubleRange) {
            formData.append(dr.getAttribute("name"), dr.value);
        }
        const jobID = Date.now();
        formData.append("_job_id", jobID);
        formData.append("_job_type", "filter_processing");
        formData.append("_page_name", window.location.pathname);
        let request = new XMLHttpRequest();
        request.open("POST", "job-progress");
        request.send(formData);
        monitorJob(jobID, 
                "Processing filters...", 
                () => {updatePage(); submitSimilarityComparison()}, 
                () =>{updatePage()}
        );
        // switch the active subpage to results
        switchSubpage(document.querySelector("#subpage-selection > [value=results-subpage]"));
    });
}


async function submitSimilarityComparison() {
    var formData = new FormData();
    const jobID = Date.now();
    const pageName = window.location.pathname
    formData.append("_page_name", pageName);
    formData.append("_job_type", "similarity_calculation");
    formData.append("_job_id", jobID);
    
    const res = await fetch(`${pageName}-filters`);
    const filterInfo = await res.json();
    
    for (sub of Object.keys(filterInfo)) {
        if (["Subgroup 1", "Subgroup 2"].includes(sub)) {
            var filters = [];
            for (att in filterInfo[sub]) {
                for (val of filterInfo[sub][att]) {
                    filters.push( {[att]:val} )
                }
            }
            formData.append(sub, JSON.stringify(filters));
        } else {
            formData.append(sub, JSON.stringify(filterInfo[sub]));
        }
        
    }
    
    if (window.location.pathname.includes("compare") & (
            (formData.get("Subgroup 1") == "[]") || (formData.get("Subgroup 2") == "[]")
        )) {
        window.alert("Subgroup 1 and Subgroup 2 must each have at least one filter applied");
        return; // Don't submit the job
    }
    
    let request = new XMLHttpRequest();
    request.open("POST", "job-progress");
    request.send(formData);
    monitorJob(jobID, "Calculating similarity...", () => {updatePage()});
}


function updateFilterSection() {
    const atts = document.getElementById('filter-subpage').querySelectorAll('collapsible-section');
    for (var cs of atts) { // iterate thru collapsible sections -> hide the disabled ones
        const cb = document.getElementById(cs.getAttribute("linked-checkbox"));
        if (cb.checked) {
            cs.toggleAttribute("hidden", false);
        } else {
            cs.toggleAttribute("hidden", true);
        }
    }
    
    
    // update the "optional attribute" and "Calculate similarity using"  sections
    var src = document.getElementById("attribute-selection");
    var checked = [...src.querySelectorAll("categorical-option[checked]")]
    
    for (var sectId of ["similarity-attribute-selection", "optional-attribute-selection"]) {
        var root = document.getElementById(sectId);
        for (var cb of root.querySelectorAll("input")) {
            cb.toggleAttribute("disabled", false);
            cb.parentElement.toggleAttribute("hidden", false);
        }
        for (var att of checked.map(x=> x.querySelector("input").value)) {
            var cb = root.querySelector(`input[value=${att}]`);
            cb.toggleAttribute("disabled", true);
            cb.parentElement.toggleAttribute("hidden", true);
        }
    }
    // update the "levels of intersectionality" slider to account for "filter by"
    var inp = document.getElementById("intersectionality-levels-input");
    
    var definitionAtts = [...document.getElementById("optional-attribute-selection").querySelectorAll("input:not([disabled])")].filter(x=>x.checked);
    inp.setAttribute("max", definitionAtts.length); 
}

async function updateFilterRelatedSections() {
    pageName = window.location.pathname;
    console.log("loading the filter output for:", pageName);
    /* Filter Details */ // TODO: improve numeric variable range display
    const tab = document.getElementById("filter-info");
    // remove previously added
    while (tab.children.length > 1) {
        tab.removeChild(tab.lastChild);
    }
    // get the filter information
    var res = await fetch(`${pageName}-filters`);
    const filterInfo = await res.json();
    const atts = [...new Set(Object.values(filterInfo).map(x=>Object.keys(x)).flat(1))];
    for (var att of atts) {
        const tr = document.createElement("tr");
        tab.appendChild(tr);
        for (var sub of ["Subgroup 1", "Subgroup 2"]) {
            var td = document.createElement("td");
            td.innerText = att;
            td.toggleAttribute("bold", true);
            td.toggleAttribute("center", true);
            tr.appendChild(td);
            td = document.createElement("td");
            tr.appendChild(td);
            const d = document.createElement("div");
            td.appendChild(d);
            var vals = filterInfo[sub][att];
            if (!vals) {
                vals = ["Any"];
            } 
            for (const v of vals) {
                const s = document.createElement("span");
                s.innerText = v;
                s.toggleAttribute("center", true);
                d.appendChild(s);
            }            
        }
    }
    // hide if there are no filters, otherwise show
    if (tab.children.length < 2) {
        tab.parentElement.toggleAttribute("hidden", true);
    } else {
        tab.parentElement.toggleAttribute("hidden", false);
    }
    // Update the subgroup display
    console.warn("WIP: update subgroup display");
    res = await fetch(`${pageName}-subgroups`);
    const subgroupInfo = await res.json();
    console.log("subgroup info:", subgroupInfo);
    if (!subgroupInfo["Subgroup 1"]) { // no subgroup info yet
        return;
    }
    for (var sub in subgroupInfo) {
        console.log("SUB:", sub);
        var t = document.getElementById(`${sub}-list`);
        console.log(t);
        for (var subgrp of subgroupInfo[sub]){
            // check if that entry has already been added
            var name = formatSubgroupName(subgrp['criteria'])
            var id = `${sub}-${name}`.replaceAll(" ","_");
            if (t.querySelector(`#${id.replaceAll(":","\\:")}`)) {
                continue;
            } // Create if needed
            var tr = document.createElement("tr");
            t.appendChild(tr);
            var td = document.createElement("td");
            td.innerText = name;
            td.setAttribute("id", id);
            tr.appendChild(td);
        }
    }
    
}


