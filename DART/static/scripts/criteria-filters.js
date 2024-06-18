
/* || Filter section creation & management */

/**
 * Global variable to assist with creating the auxiliary filter options (not attributes)
 */
var additionalFilterOptions = {
    "size": {
        "type":"numeric", 
        "display_name":"Subgroup Size",
        "min":0,
    },
    "n_attributes": {
        "type":"numeric", 
        "display_name":"Number of Attributes", 
        "min":1, 
        "step":1,
    },
    "similarity_attributes": {
        "display_name": "Similarity Attributes",
        "type":"categorical",
        "values": {},
    }

}

/**
 * Creates the filter section
 * @param{string} operation - what the form is for (compare/explore)
 * @param{Array} [removeFilterOptions=[]] - A list of options to be excluded from the filter section
 */
function createFilterSection(operation, removeFilterOptions=[]) {
    var info = fromStorage("attribute-information");
    var table = document.getElementById("filters");
    // remove the indicated filter options
    for (opt of removeFilterOptions) {
        delete additionalFilterOptions[opt];
    }
    // fill in the needed information in additionalFilterOptions
    if (additionalFilterOptions["n_attributes"]) {
        // number of attributes to use to define subgroups
        additionalFilterOptions["n_attributes"]["max"] = Object.keys(info).length - 1;
    }
    if (additionalFilterOptions["similarity_attributes"]) {
        for (att in info) {
           additionalFilterOptions["similarity_attributes"]["values"][att] = {"display_name":info[att]["display_name"]}; 
        }
    }
    // create the headers
    var tr = document.createElement("tr");
        table.appendChild(tr);
    for (i = 0; i < 3; i ++) {
        var th = document.createElement("th");
            tr.appendChild(th);
        if (i > 0) {
            th.innerText = `Subgroup ${i}`;
        }
    }
    // add attribute filter rows
    for (attribute in info) {
        var tr = createFilterRow(attribute, info);
            table.appendChild(tr);
    }
    // add additional filter rows
    for (additional in additionalFilterOptions) {
        addToHeader = []
        disableLink = false;
        if (additional == "similarity_attributes") {
            disableLink = true; // this option can ONLY be linked
            var cb = checkBox("remove-inherent", "remove-inherent");
                cb.setAttribute("id", "remove-inherent");
                cb.setAttribute("onchange", "updateFilterSection()");
            var tog = createToggle(cb, "Ignore Inherent", "Ignore Inherent");
                tog.setAttribute("id", "toggle-remove-inherent");
            addToHeader = [tog];
        }
        var tr = createFilterRow(additional, additionalFilterOptions, true, disableLink, addToHeader);
            tr.setAttribute("id", `${additional}-filter-section`);
            table.appendChild(tr);
    }
    // change the route by which the form submits data (allow preprocessing)
    var form = table.parentElement;
        form.addEventListener("submit", (event) => {
            event.preventDefault();

            var formData = new FormData(form);
            var data = processFilters(form);
            
            data["requested-operation"] = operation;
            let request = new XMLHttpRequest();
                request.open("POST", "form-data");
                request.send(JSON.stringify(data));
                
            fireCustomEvent("job-submitted");
        });
    //// set up an event listener for the job-submitted event
    document.body.addEventListener("job-submitted", (e) => {
        setTimeout(monitorJobProgress, 100, operation); // give the program a chance to start
        });
    
    // check the status for previous jobs -> if there is a completed one -> load the results
    monitorJobProgress(operation);
}


/** 
 * Toggles the input linking between Subgroup 1 and Subgroup 2 for a row in the filter table
 * @param {HTMLElement} linkCB - the checkbox HTML input element that indicates link behavior
 */
function linkUnlink(linkCB) {
    var row = linkCB.parentElement.parentElement.parentElement;
    if (linkCB.checked) {
        row.children[1].classList.add("hidden");
        row.children[2].classList.add("hidden");
        row.children[3].classList.remove("hidden");
            
    } else {
        row.children[1].classList.remove("hidden");
        row.children[2].classList.remove("hidden");
        row.children[3].classList.add("hidden");
    }
    updateFilterSection();
}


/** 
 * Creates a single row in the filter table
 * @param {string} attribute - the name of the attribute to be filtered
 * @param {object} info - the information related to the attributes (e.g., options, display name)
 * @param {bool} [defaultLinked=false] - whether the row should default to linked or separate inputs
 * @param {bool} [disableLink=false] - whether the row should not have the ability to be linked
 * @param {array} [addToHeader=[]] - any additional elements to be added to the header of the row
 */
function createFilterRow (attribute, info, defaultLinked=false, disableLink=false, addToHeader=[]) {
    var tr = document.createElement("tr");
    // create the link/unlink checkbox
    var td = document.createElement("td");
        td.classList.add("checkbox-cell");
        tr.appendChild(td);
    if (!disableLink) {
        var cbl = document.createElement("label");
            td.appendChild(cbl);
            cbl.classList.add("link-checkbox");
        var cb = checkBox("linked-filters", attribute);
            cb.setAttribute("onchange", "linkUnlink(this)");
            if (defaultLinked) {cb.checked = true};
            cbl.appendChild(cb);
        var l = document.createElement("i");
            l.classList.add("material-icons");
            l.classList.add("icon");
            cbl.appendChild(l);
    }
    // make the attribute filter selection section
    for (i = 1; i < 3; i++) {
        var td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(makeAttributeFilter(i, attribute, info, addToHeader));
        if (defaultLinked) {td.classList.add("hidden")};
    }
    // make the linked attribute filter selection section (hidden by default)
    var td = document.createElement("td");
        tr.appendChild(td);
        td.appendChild(makeAttributeFilter("linked", attribute, info, addToHeader));
        if (!defaultLinked) {td.classList.add("hidden")};        
        td.classList.add("linked-options");
        td.setAttribute("colspan", 2);

    return tr;
}

/** 
 * Makes the filter table for a single attribute
 * @param {number} index - the index of the row (used to ensure that each row has a unique label in the form data
 * @param {string} attribute - the name of the attribute
 * @param {object} info - the information related to the attributes (e.g., options, display name)
 * @param {array} [addToHeader=[]] - any additional elements to be added to the header of the row
 */
function makeAttributeFilter(index, attribute, info, addToHeader=[]) {
    // makes the filter table for a single attribute
    if (!info) {
        var info = fromStorage("attribute-information");
    }
    var tab = document.createElement("table");
        tab.classList.add("attribute-filter");
        tab.classList.add("collapsible");
    
    // make the header (used to collapse the section);
    var tr = document.createElement("tr");
        tr.setAttribute("onclick", "collapseTable(this.parentElement, true)");
        tr.classList.add("heading");
        tab.appendChild(tr);
    var th = document.createElement("th");
        tr.appendChild(th);
    var header = document.createElement("div");
        th.appendChild(header);
        header.appendChild(collapseIcon());
    var text = document.createElement("span");
        text.innerText = info[attribute]['display_name'];
        header.appendChild(text);
    for (item of addToHeader) {
        header.appendChild(item);
    }
        
    // add the options
    if (info[attribute]['type'] == 'categorical') {
        for (v in info[attribute]['values']) {
            var tr = document.createElement("tr");
                tab.appendChild(tr);
            var td = document.createElement("td");
                tr.appendChild(td);
            
            var cb = checkBox(`filters[${index}][${attribute}]`, v);
                cb.setAttribute("onchange", "updateFilterSection()");
                td.appendChild(cb);
            var lab = document.createElement("label");
                lab.innerText = info[attribute]['values'][v]['display_name']
                lab.setAttribute("for", `filters[${index}][${attribute}]`);
                td.appendChild(lab);
        }
    } else {
        // todo - get min/max/step from the attribute information
        var tr = document.createElement("tr");
            tab.appendChild(tr);
        var td = document.createElement("td");
            tr.appendChild(td);
        // lower bound
        var s = document.createElement("select");
            s.setAttribute("name", `filters[${index}][${attribute}][lower-operator]`);
            td.appendChild(s);
        for (op of ["<", "<="]) {
            var o = document.createElement("option");
                o.text = op;
                o.value = op;
                s.appendChild(o);
        }
        var n = document.createElement("input");
            n.setAttribute("name", `filters[${index}][${attribute}][lower-bound]`);
            n.setAttribute("id", `filters[${index}][${attribute}][lower-bound]`);
            n.setAttribute("type", "number");
            n.setAttribute("min", info[attribute]["min"]);
            n.setAttribute("max", info[attribute]["max"]);
            n.setAttribute("step", info[attribute]['step']);
            n.setAttribute("onchange", "updateFilterSection()");
            td.appendChild(n);
        // join
        var s = document.createElement("select");
            s.setAttribute("name", `filters[${index}][${attribute}][join]`);
            td.appendChild(s);
        for (op of ["and", "or"]) {
            var o = document.createElement("option");
                o.text = op;
                o.value = op;
                s.appendChild(o);
        }
        // upper bound
        var s = document.createElement("select");
            s.setAttribute("name", `filters[${index}][${attribute}][upper-operator]`);
            td.appendChild(s);
        for (op of [">", ">="]) {
            var o = document.createElement("option");
                o.text = op;
                o.value = op;
                s.appendChild(o);
        }
        var n = document.createElement("input");
            n.setAttribute("name", `filters[${index}][${attribute}][upper-bound]`);
            n.setAttribute("id", `filters[${index}][${attribute}][upper-bound]`);
            n.setAttribute("type", "number");
            n.setAttribute("min", info[attribute]["min"]);
            n.setAttribute("max", info[attribute]["max"]);
            n.setAttribute("step", info[attribute]['step']);
            n.setAttribute("onchange", "updateFilterSection()");
            td.appendChild(n);    
        
    }
    return tab;
}

/**
 * Updates the filter section
 */
function updateFilterSection() {
    var form = document.getElementById("filters").parentElement;
    var activeAttributes = processFilters(form, true);
    for (key in additionalFilterOptions) {
        if (activeAttributes.has(key)) {
            activeAttributes.delete(key);
        }
    }
    // Update the similarity attributes section
    var removeInherent = document.getElementById("remove-inherent").checked;
    // // Reset currently hidden options
    var simAttSect = document.getElementById("similarity_attributes-filter-section");
    for (td of simAttSect.children) {
        if (!td.classList.contains("checkbox-cell")) {
            var cbs = extractChildren(td, {"type":"checkbox"}, {"id":"remove-inherent"});
            for (cb of cbs) {
                if (cb.parentElement.classList.contains("hidden")) {
                    cb.parentElement.classList.remove("hidden");
                }
            }
        }
    }
    // // hide the inherent (if needed)
    if (removeInherent) {
        var cbs = extractChildren(simAttSect, {"type":"checkbox"});
        for (cb of cbs) {
            if (activeAttributes.has(cb.value)) {
                cb.parentElement.classList.add("hidden");
            }
        }
    }
    // update the minimum number of attributes (reflect whatever is selected)
    var nActive = Array.from(activeAttributes).length
    for (elemGroup of ["1", "2", "linked"]) {
        var element = document.getElementById(`filters[${elemGroup}][n_attributes][lower-bound]`);
        
        if (element) {
            element.setAttribute("min", nActive);
            if (element.value && element.value < nActive) {
                element.value = nActive;
            }
        }
        
        
    }
    
}

/* || Form processing */

/** Class representing a filter applied to a single attribute / group combination. */
class FilterInstance {
    /**
     * Create a new filter instance
     * @param {string} group - the group (e.g., Subgroup 1) associated with the filter
     * @param {string} attribute - the attribute name
     * @param {FormData} formData - the assocaited user input
     */
    constructor(group, attribute, formData) {
        this.group = group;
        this.attribute = attribute;
        var s = `filters[${group}][${attribute}]`
        var keys = new Set([...formData.keys()].filter(function(k){return k.startsWith(s)}));
            keys = Array.from(keys);
            
        if (keys.length > 1) {
            // numeric attribute -> need to combine the different pieces of information
            var bounds = []
            for (var bound of ["lower", "upper"]) {
                var value = formData.get(s + `[${bound}-bound]`);
                if (value) { // value entered for this bound
                    var operator = formData.get(s + `[${bound}-operator]`);
                    bounds.push(`${attribute}${operator}${value}`);
                }
            }
            this.filter = bounds.join(` ${formData.get(s + "[join]")} `);
            if (this.filter.length < 1) {
                this.filter = null;
            }            
        } else if (keys.length == 1) {
            // categorical attribute
            var filters = formData.getAll(keys[0]);
                filters = filters.map(function(f){return `${attribute}=${f}`}); // = or ==?
            this.filter = filters.join(" or "); // categorical are always or (have an alternative?)
        }  else {
            // no keys -> empty filter
            this.filter = null;
        }
    }
}

/** 
 * Processes the user-input in the forms into a more python-friendly format
 * @param {HTMLElement} form - the form to be processed
 * @param {bool} [d=false] - if true, returns a list of the attributes with filters specified
 */
function processFilters(form, getActiveAttributes=false) {
    var data = new FormData(form);
    var info = {}
    for (key of data.keys()) {
        info[key] = data.getAll(key);
    }
    var keys = Object.keys(info).filter(function(x){return x.split("[").length>=3});
    var groups = new Set(keys.map(function(x){return x.replaceAll("]","").split("[")[1]}));
        groups = Array.from(groups);
        groups = groups.filter(function(x){return x != "linked"});
    var attributes = new Set(keys.map(function(x){return x.replaceAll("]","").split("[")[2]}));
        attributes = Array.from(attributes);
        // remove the similarity_attributes from the attributes list (dealt with separately)
        var idx = attributes.indexOf("similarity_attributes");
        if (idx > -1) {
            attributes.splice(idx, 1);
        }
    var linkedFilters = data.getAll("linked-filters");
    var groupFilters = {};
    for (g of groups) {
        groupFilters[g] = [];
    }
    activeAttributes = new Set();
    for (att of attributes) {
        if (linkedFilters.includes(att)) {
            // linked filter -> apply to all groups
            var FI = new FilterInstance("linked", att, data);
            for (g of groups) {
                if (FI.filter) {
                    groupFilters[g].push(FI.filter);
                    activeAttributes.add(FI.attribute);
                }
            }
        } else {
            // unlinked filter --> declared separately for each group
            for (g of groups) {
                var FI = new FilterInstance(g, att, data);
                if (FI.filter) {
                    groupFilters[g].push(FI.filter);
                    activeAttributes.add(FI.attribute);
                }
            }
        }
    }
    // process the similarity attributes
    var similarityAttributes = data.getAll("filters[linked][similarity_attributes]");
    var removeInherent = document.getElementById("remove-inherent").checked;
    if (removeInherent) {
        // remove any attribute used to describe a subgroup
        for (idx = similarityAttributes.length - 1; idx >= 0; idx--) {
            if (activeAttributes.has(similarityAttributes[idx])) {
                similarityAttributes.splice(idx, 1);
            }
        }
    }
    // Add needed information to the filters (to be passed to the comparison/explore)
    groupFilters["remove-inherent"] = removeInherent;
    groupFilters["similarity-attributes"] = similarityAttributes;
    // Return
    if (getActiveAttributes) {
        return activeAttributes;
    } else {
        return groupFilters;
    }
}