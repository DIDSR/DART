

/* Dev / testing -> to be removed */

function previewSubmissionContent(form) {
    console.log("Previewing submission content");
    var formData = new FormData(form);
    console.log(processFilters(form));
}

/* process forms */

class FilterInstance {
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




/* Build specific elements */
function checkBox(name, value) {
    // create a checkbox element
    var cb = document.createElement("input");
        cb.setAttribute("type", "checkbox");
        cb.classList.add("checkbox");
        cb.setAttribute("name", name);
        cb.value = value;
    return cb;
}

/* update the filter section */

function extractChildren(element, criteria={}, excludeCriteria, extracted=[]) {
    var meetsCriteria = true;

    for (key in criteria) {
        if (!meetsCriteria) {
            break;
        }
        if (key == "class") {
            meetsCriteria = element.classList.contains(criteria[key]);
        } else {
            meetsCriteria = element.getAttribute(key) == criteria[key];
        }
        
    }
    for (key in excludeCriteria) {
        if (!meetsCriteria) {
            break;
        }
        if (key == "class") {
            meetsCriteria = !element.classList.contains(excludeCriteria[key]);
        } else {
            meetsCriteria = element.getAttribute(key) != excludeCriteria[key];
        }
    }
    if (meetsCriteria) {
        extracted.push(element);
    }
    if (element.children) {
        for (child of element.children) {
            extracted = extractChildren(child, criteria, excludeCriteria, extracted);
        }
    }
    return extracted;
}

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
        }
        
        if (element.value && element.value < nActive) {
            element.value = nActive;
        }
    }
    
}


/* Build Page sections */
var numSubgroupsCounter = 0;

function subgroupsSection(div, info, initializeSection) { // WIP
    var nSubs = Object.keys(info["subgroups-by-id"]).length;
    if (initializeSection) { // needs to be populated
        var subdiv = document.createElement("div");
            div.appendChild(subdiv);
        // create the sections for each of the subgroups
        for (sub in info["by-group"]) {
            var s = document.createElement("div");
                subdiv.appendChild(s);
            var label = document.createElement("div");
                label.classList.add("subgroup-label");
                s.appendChild(label);
            var text = document.createElement("span")
                text.innerText = `${sub}: ${Object.keys(info["by-group"][sub]).length} subgroups`;
                label.appendChild(text);
            // filter button
            var fb = document.createElement("i"); // TODO: filtering!
                fb.classList.add("filter-button");
                fb.classList.add("material-icons");
                fb.setAttribute("filtering", "no");
                label.appendChild(fb);
        }
      numSubgroupsCounter = nSubs;  
    }
    // update the section if more subgroups have been added
    if (nSubs != numSubgroupsCounter) {
        console.log("More subgroups have been added!");
        // TODO: make updates
        numSubgroupsCounter = nSubs;
    }
}

class MultiPage extends HTMLElement { //////////////////////////////////////////////////////////////////////////////////////////////////
    constructor() {
        super();
    }
    
    connectedCallback() { // triggers when added to document
        // set defaults
        this.style.display = "block";
        this.maxPerPage = 10;
        this.current = 1;
        this.lastPage = 1;
        this.entries = []
        // initialize the page structure
        /// create the navigation bar
        const navbar = document.createElement("div");
            this.appendChild(navbar);
        //// previous page
        const prev = document.createElement("i");
            prev.classList.add("material-icons");
            prev.classList.add("button");
            prev.setAttribute("onclick", "this.parentElement.parentElement.previousPage()");
            prev.innerHTML = "chevron_left";
            navbar.appendChild(prev);
        //// page selector
        const pageSelector = document.createElement("input");
            pageSelector.setAttribute("type", "number");
            pageSelector.setAttribute("min", 1);
            pageSelector.setAttribute("step", 1);
            pageSelector.setAttribute("onchange", "this.parentElement.parentElement.setPage()");
            navbar.appendChild(pageSelector);
            navbar.appendChild(document.createElement("span")); // will contain the max pages
        //// next page
        const next = document.createElement("i");
            next.classList.add("material-icons")
            next.classList.add("button");
            next.setAttribute("onclick", "this.parentElement.parentElement.nextPage()");
            next.innerHTML = "chevron_right";
            navbar.appendChild(next);
        /// create the table to hold entries
        this.table = document.createElement("table");
            this.appendChild(this.table);
        //// create the header
        var tr = document.createElement("tr");
            this.table.appendChild(tr);
        for (var text of ["Subgroup 1", "Subgroup 2", "Similarity"]) {
            var th = document.createElement("th");
                th.innerText = text;
                tr.appendChild(th);
        }
        
        // set up the style
        const style = document.createElement("style");
        style.textContent = `
        
            multi-page {
                position: relative;
                display: block;
                margin-left: 5px;
                margin-right: 5px;
            }
            
            multi-page > div { /* this is the nav bar */
                position: relative;
                width: 100%;
                height: 24px;
                background-color: lightgrey;
            }
                       
            multi-page div * {
                min-width: 24px;
                height: 24px;
                align-text = center;
                vertical-align: middle;
                display: inline-block;
                line-height: 24px;
            }
            
            multi-page > div > span {/* this is the label of the max pages */
                min-width: 50px;
                text-align: left;
            }
            
            multi-page > div > input[type=number] {
                width: 50px;
            }
            
            multi-page .button {
                background-color: lightgrey;
            }
            
            multi-page .button:hover {
                background-color: grey;
            }
            
            multi-page table {
                border-collapse: collapse;
                width: 100%;
            }
            
            multi-page table * {
                border: 1px solid;            
            }
            
        `
        this.appendChild(style);
     
    }
    
    addData(data) { // TODO: ensure no duplicate entries
        this.entries = [...this.entries, ...data]
        this.calcPages()
        this.loadPage();
        
    }
    
    calcPages() {
        this.lastPage = Math.ceil(this.entries.length / this.maxPerPage);
        
        // update the page selector max
        const PS = this.querySelector("input[type='number']");
            PS.setAttribute("max", this.lastPage)
        // update the associated label
        const L = this.querySelector("span");
            L.innerText = " / " + this.lastPage;
    }
    
    loadPage() {
        // load the current page
        // set the page selector
        const PS = this.querySelector("input[type='number']");
            PS.value = this.current;
        
        // remove the exsisting displayed entries
        while (this.table.rows.length > 1) {
            this.table.deleteRow(-1); // delete the last row
        }
        // get the correct entries
        var entries = this.entries.slice((this.current-1)*this.maxPerPage, this.current*this.maxPerPage);
        
        for (var e of entries) {
            // add a new row to the table
            var tr = document.createElement("tr");
                this.table.appendChild(tr);
                tr.setAttribute("subgroup-ids", `${e["Subgroup 1"]["ID"]} ${e["Subgroup 2"]["ID"]}`);
                tr.setAttribute("onclick", "this.parentElement.parentElement.viewPairDetails(this)"); 
            // Add the subgroup information
            for (var sub of ["Subgroup 1", "Subgroup 2"]) {
                var td = document.createElement("td");
                    tr.appendChild(td);
                    var entry_info = Object.keys(e[sub]).filter((x) => {return (x != "ID" && x!= "sample-IDs" && e[sub][x])}); // non-null and non-id
                    var entry = [];
                    for (var key of entry_info) {
                        entry.push(`${key}: ${e[sub][key]}`);
                    }
                    td.innerText = entry.join("\n");
            }
            // Add the similarity information
            var td = document.createElement("td");
                tr.appendChild(td);
                td.innerText = e["overall"].toFixed(3); // Sets the number of decimal places
        }
    }
    
    setPage() {
        // set page based on page selector
        const PS = this.querySelector("input[type='number']");
        var page = PS.value;
            page = Math.max(page, 1);
            page = Math.min(this.lastPage, page);
        this.current = page;
        this.loadPage();
    }
    
    previousPage() {
        if (this.current > 1) {
            this.current--;
            this.loadPage();
        }
    }
    
    nextPage() {
        if (this.current < this.lastPage) {
            this.current++;
            this.loadPage();
        }
    }
    
    viewPairDetails(row) { // TODO
        console.log("viewing pair details for:", row);
    }
    
}

customElements.define("multi-page", MultiPage); // allow use


function similaritySection(div, info, initializeSection) {
    // create the similarity results section
    
    if (initializeSection) {
        var mp = document.createElement("multi-page");
            div.appendChild(mp);
            mp.addData(info);
    }

}

const loadSectionsFunctions = {
    "subgroups":subgroupsSection,
    "similarity": similaritySection,
}

const loadSectionsIds = {
    "subgroups": "subgroups-section", 
    "similarity": "similarity-section",
}

function loadSection(section, info) {
    // wrapper for the different section loading
    var root = document.getElementById("results-section");
    if (root.classList.contains("hidden")) {root.classList.remove("hidden")};
    // determine if the subgroup section needs to be initialized or not
    var div = document.getElementById(loadSectionsIds[section]);
    var initializeSection = isEmpty(div)
    /// show the header if hidden
    var header = document.getElementById(loadSectionsIds[section]+"-header")
        if (header.classList.contains("hidden")) {header.classList.remove("hidden")};
    // trigger the section loading
    loadSectionsFunctions[section](div, info, initializeSection);
}









/*// FILTERS //*/

var additionalFilterOptions = {
    // the "attributes" that represent other things that appear in the filters
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

function createFilterSection(removeFilterOptions=[]) {
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
            
            data["requested-operation"] = "explore";
            let request = new XMLHttpRequest();
                request.open("POST", "form-data");
                request.send(JSON.stringify(data));
                
            fireCustomEvent("job-submitted");
        });
    //// set up an event listener for the job-submitted event
    document.body.addEventListener("job-submitted", (e) => {
        setTimeout(monitorJobProgress, 100,"explore"); // give the program a chance to start
        });
    
    // check the status for previous jobs -> if there is a completed one -> load the results
    monitorJobProgress("explore");
}

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

function createFilterRow (attribute, info, defaultLinked=false, disableLink=false, addToHeader=[]) {
    // Creates a single row in the filter table
    var tr = document.createElement("tr");
        //table.appendChild(tr);
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


function collapseTable(table, linkCollapse=false) {
    // collapse a table by clicking on its heading row
    var rows = table.rows;
    
    if (linkCollapse) {
        // collapse all of the tables in the same row
        var rowTables = table.parentElement.parentElement.querySelectorAll("table")
        for (table of rowTables) {
            collapseTable(table, false);
        }
    } else {

        if (table.classList.contains("collapsed")) {
            table.classList.remove("collapsed");
            for (ri = 1; ri < rows.length; ri++) {
                rows[ri].classList.remove("hidden");
            }
        } else {
            table.classList.add("collapsed");
            for (ri = 1; ri < rows.length; ri++) {
                rows[ri].classList.add("hidden");
            }
        }
    }
}
