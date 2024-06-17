

/* Dev / testing -> to be removed */

function previewSubmissionContent(form) {
    console.log("Previewing submission content");
    var formData = new FormData(form);
    console.log(processFilters(form));
}



/* unsorted */
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
