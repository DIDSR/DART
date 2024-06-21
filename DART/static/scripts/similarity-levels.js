
/* || Utilities */



const regexStr = /[<>=]+/i;
function splitAtOperator(str) {
    return str.split(regexStr);
}


/**
 * Converts information to the related identifiers, returns information w/o an idnetifier as is
 * @param {object} obj - the information to be encoded
 */
function encodeAttributeIdentifiers(obj) {
    var encoded = Object.fromEntries(Object.entries(obj).map( (x) => {
            return x.map( (y) => {
                return AttributeIdentifiers[y] || y;
            });
        }));
    return encoded;
}

function decodeAttributeIdentifier(ID) {
    return Object.keys(AttributeIdentifiers)[Object.values(AttributeIdentifiers).indexOf(ID)];
}

// make attribute identifiers to help with the filtering (if not already made)
var AttributeIdentifiers = fromStorage("attribute-identifiers");
if (!AttributeIdentifiers) {
    var AttributeIdentifiers = {};
    var att_info = fromStorage("attribute-information");
    for (var att in att_info) {
        AttributeIdentifiers[att] = makeid();
    }
    toStorage("attribute-identifiers", AttributeIdentifiers);
}

/* || Custom element */
const SimLevTemplate = document.createElement("template");
SimLevTemplate.innerHTML = `
    <style>
        :host {
            display: flex;
            align-items: stretch;
            flex-grow: 1;
        }
        
        #entry-details-panel {
            flex-grow: 2;
        }
        
        resizable-pane {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: start;
            flex-grow: 1;
        }
        
        ::slotted([slot='entry']) {
        }    
        #filter-button {
            font-family: "Material Icons" !important ;
            font-style: normal;
            border: 1px solid black;
            border-radius: 5px;
            vertical-align: center;
            text-align: center;
            width: 24px;
            height: 24px;
        }
        
        #filter-menu { display: none }
        
        #filter-button[active] + #filter-menu { 
            display: inline;
        }
        
        #filter-button[active] {
            background-color: var(--accent-1, lightgrey);
        }
        
        #filter-menu {
            min-width: 20px;
            min-height: 20px;
            border: 1px solid;
        }
        
    </style>
    <resizable-pane resize="right">
        <i button id="filter-button" onclick="this.toggleAttribute('active')">filter_list</i>
        <div id="filter-menu">
            <slot name="filter">No filters</slot>
        </div>
        <div id="level-filters">
            <span>Level:</span>
            <slot name="level-filter"></slot>
        </div>
        <slot name="entry"></slot>
    </resizable-pane>
    <div id="entry-details-panel">
        <slot name="heading"></slot>
        <slot name="details"></slot>
    </div>
`;

class SimilarityLevelsView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow( {mode: "open"} );
        this.shadowRoot.appendChild(SimLevTemplate.content.cloneNode(true));
        // get the submitted filter information from storage
        this.initialCriteria = fromStorage("filter-compare");
        this.criteria = {};
        this.criteria["Subgroup 1"] = Object.fromEntries(this.initialCriteria[1].map(splitAtOperator));
        this.criteria["Subgroup 2"] = Object.fromEntries(this.initialCriteria[2].map(splitAtOperator));
        this.filterEntries = this.filterEntries.bind(this);
    }
    
    static get observedAttributes() { return ['similarity-data'] }
    
    attributeChangedCallback(att, oldVal, newVal) {
        //console.log(newVal, !newVal, newVal == "undefined", typeof newVal);
        
        if (newVal == "undefined") { return }
        try {
            newVal = JSON.parse(newVal);
        } catch (error) {
            console.log("encountered error:", error);
            return;
        }
        
        if (att == "similarity-data") {
            console.log(!this.allEntries);
            if (this.allEntries) {
                // shorten the new values to what is not already in the entries
                // New values are always appended to the end of the list, so we can go by index to find out whats new
                var N = this.allEntries.length;
            }
            
            this.allEntries = JSON.parse(this.getAttribute("similarity-data"));
            this.allEntries = this.allEntries.map(x => JSON.stringify(x));
            // adjust the newVal to only new entries
            if (N) {newVal = newVal.slice(N-1, -1)};
            // Add the new entries
            for (var entryVal of newVal) {this.addEntry(entryVal)};
            this.setUpFilters();
            this.filterEntries();
        }
    }
    
    addEntry(entryInfo) {
        // filter to relevent (not null or inherent based on criteria, same for both subs)
        var keys = Object.keys(entryInfo["Subgroup 1"]).filter((x) => {
            return (entryInfo["Subgroup 1"][x] != null) && 
            (x in AttributeIdentifiers) &&
            (!(x in this.criteria["Subgroup 1"])) && 
            (entryInfo["Subgroup 1"][x] == entryInfo["Subgroup 2"][x]);
        });
        var info = {};
        for (var k of keys) { info[k] = entryInfo["Subgroup 1"][k] };
        // separate similarity values
        var similarities = {};
        for (var x in entryInfo) {
            if (!(x.startsWith("Subgroup"))) { similarities[x] = entryInfo[x] };
        }  
        // create the entry
        var entry = document.createElement("similarity-entry");
        entry.populate(info, similarities);
        entry.setAttribute("slot", "entry");
        entry.setAttribute("entry-idx", this.allEntries.indexOf(JSON.stringify(entryInfo)));
        this.makeLevelFilter(entry.getAttribute("similarity-level"));
        this.appendChild(entry);
    }
    
    setUpFilters() {
        // TODO: remove all previous filters?
        // get the options for the filters
        var entries = [...this.querySelectorAll("[slot=entry]")];
        // each potential attribute
        var atts = Object.values(AttributeIdentifiers);
        for (var att of atts) {
            var attValues = new Set(entries.map( x => x.getAttribute(att)));
            attValues = [...attValues].filter( x => x != null);
            if (attValues.length > 0) {
                var filt = document.createElement("div");
                filt.setAttribute("slot", "filter");
                this.appendChild(filt);
                var t = document.createElement("div");
                t.innerText = decodeAttributeIdentifier(att) + ":";
                filt.appendChild(t);
                for (var v of attValues) {
                    var cb = document.createElement("input");
                    cb.setAttribute("type", "checkbox");
                    cb.toggleAttribute("checked", true);
                    cb.setAttribute("name", att);
                    cb.value = v;
                    filt.appendChild(cb);
                    var l = document.createElement("label");
                    l.innerText = v; // TODO: display_name
                    filt.appendChild(l);
                    filt.appendChild(document.createElement("br"));
                }
            }
        }
        
        // Similarity Attributes
        var simAtts = entries.map( x => x.getAttribute("similarity-attributes")).join(" ");
        simAtts = new Set(simAtts.split(" "));
        simAtts = [...simAtts];
        var filt = document.createElement("div");
        filt.setAttribute("slot", "filter");
        this.appendChild(filt);
        var t = document.createElement("div");
        t.innerText = "Similarity Attributes:";
        filt.appendChild(t);
        for (var att of simAtts) {
            var cb = document.createElement("input");
            cb.setAttribute("type", "checkbox");
            cb.setAttribute("name", "similarity-attributes");
            cb.toggleAttribute("checked", true);
            cb.value = att;
            filt.appendChild(cb);
            var l = document.createElement("label");
            l.innerText = decodeAttributeIdentifier(att);
            filt.appendChild(l);
            filt.appendChild(document.createElement("br"));
        }
      // set up event listeners to filter
      var inputs = this.querySelectorAll("input");
      for (var inp of inputs) {
          inp.addEventListener("click", this.filterEntries);
      }
    }
    
    filterEntries(e) {
        if (e) { e["target"].toggleAttribute("checked")};
        var unchecked =[...this.querySelectorAll("input[type='checkbox']")].filter( x => !(x.hasAttribute("checked")));
        // get the level information as well
        var unRad = [...this.querySelectorAll("input[type='radio']")].filter(x=>!(x.checked));
        unchecked = unchecked.concat(...unRad);
        //unchecked = unchecked.concat(
        var toHide = [];
        for (var unCB of unchecked) {
            var name = unCB.getAttribute("name");
            var val = unCB.value;
            if (name == "similarity-level") {
                toHide = toHide.concat([...this.querySelectorAll(`[${name}="${val}"]`)]);
            } else {
                toHide = toHide.concat([...this.querySelectorAll(`[${name}~=${val}]`)]);
            }
        }
        toHide = new Set(toHide);
        toHide = [...toHide];
        var entries = [...this.querySelectorAll("[slot='entry']")];
        for (var ent of entries) {
            if (toHide.includes(ent)) {
                ent.toggleAttribute("hidden", true);
            } else {
                ent.toggleAttribute("hidden", false);
            }
        }
    }
    
    makeLevelFilter(level) {
        var existing = [...this.querySelectorAll("input[type='radio']")].filter(x=>x.value==level);
        if (existing.length == 0) {
            var s = document.createElement("span");
            var rb = document.createElement("input");
            rb.setAttribute("type", "radio");
            rb.setAttribute("id", `level-filter-${level}`);
            s.setAttribute("slot", "level-filter");
            rb.setAttribute("name", "similarity-level");
            rb.value = level;
            s.appendChild(rb);
            var l = document.createElement("label");
            l.innerText = level;
            l.setAttribute("for", `level-filter-${level}`);
            s.appendChild(l);
            s.addEventListener("click", this.filterEntries);
            this.appendChild(s);
            if ([...this.querySelectorAll("input[type='radio']")].filter(x=>(x.checked)).length<1){
               rb.checked = true; // first radio button
            } 
        }
    }

}

customElements.define("sim-levels", SimilarityLevelsView);


/* || Single entry */
const SimEntryTemplate = document.createElement("template");
SimEntryTemplate.innerHTML = `
    <style>
        :host {
            display: flex;
            flex-flow: column;
            align-items: center;
            justify-content: center;
            min-width: 50px;
            min-height: 10px;
            margin-top: 1px !important;
        }
        :host(:not(:hover, [active-entry])) ::slotted(span) {
            display: none;
        }
        
        :host([active-entry]) {
            margin: 5px 0px !important;
        }
        :host([hidden]) {display:none}
        
    </style>
    <slot name="overall-similarity"></slot>
`;
/**
 * The class use to show the similarity value of a single pair
 */
class SimilarityEntry extends HTMLElement {
    constructor () {
        super();
        this.attachShadow( {mode: "open"} );
        this.shadowRoot.appendChild(SimEntryTemplate.content.cloneNode(true));
    }
    
    populate(info, similarities) {
        // Add attributes based on the subgroup attributes (using the identifiers)
        info = encodeAttributeIdentifiers(info);
        for (var key in info) { this.setAttribute(key, info[key]) };
        // Add attributes based on similarity attributes (using identifiers)
        similarities = encodeAttributeIdentifiers(similarities)
        var simAtts = Object.keys(similarities).filter((x) => {return x != "overall"}).join(" ");
        this.setAttribute("similarity-attributes", simAtts);
        // assign level
        this.setAttribute("similarity-level", Object.keys(info).length);
        // set the element to display the overall similarity as text
        var text = document.createElement("span");
        text.innerText = similarities['overall'];
        text.toggleAttribute("configure-decimals", true);
        text.setAttribute("slot","overall-similarity");
        this.appendChild(text);
        // set up colormap information
        this.toggleAttribute("apply-colormap", true);
        this.setAttribute("colormap-value", similarities['overall']);
        // interactivity
        this.setAttribute("onclick", "showEntrySimilarityPanel(this)");
    }
}

customElements.define("similarity-entry", SimilarityEntry);


/* || Interaction Functions */

function showEntrySimilarityPanel(entry) {
    if (entry.hasAttribute("active-entry")) {return} // already active
    // get the destination and clear old entry information + active status
    var root = document.querySelector("sim-levels");
    
    // get the distribution information
    var distInfo = JSON.parse(root.getAttribute("subgroup-data"));
    // remove previous content
    var prev = root.querySelector("[active-entry]");
    if (prev) {
        prev.toggleAttribute("active-entry", false);
        var toRemove = [...root.querySelectorAll("[slot=details]")];
        toRemove = toRemove.concat([...root.querySelectorAll("[slot=heading]")]);
        for (var x of toRemove) {root.removeChild(x)};
    }
    // get the needed information
    var info = JSON.parse(root.allEntries[entry.getAttribute("entry-idx")]);
    // build the similarity panel
    
    /// header 
    //// get the subgroup information
    var atts = Object.values(AttributeIdentifiers);
    var sub = []
    for (var a of atts) {sub.push([decodeAttributeIdentifier(a), entry.getAttribute(a)])}
    sub = sub.filter( x => !(x.includes(null)));
    sub = Object.fromEntries(sub);
    var h = document.createElement("p");
    h.innerText = formatSubgroupName(sub);
    h.setAttribute("slot", "heading");
    root.appendChild(h);
    /// overall Similarity & subgroup sizes -> TODO
    
    // other similarities
    for (var att in info) {
        if (!(["Subgroup 1", "Subgroup 2", "overall"].includes(att))) {
            var det = document.createElement("similarity-detail-panel");
            det.setAttribute("slot", "details")
            root.appendChild(det);
            // make the header section of the panel
            var h = document.createElement("div");
            h.setAttribute("slot", "panel-title");
            h.setAttribute("colormap-value", info[att]);
            h.toggleAttribute("apply-colormap", true);
            det.appendChild(h);
            var t = document.createElement("span");
            t.innerText = att; // TODO: display name
            h.appendChild(t);
            var t = document.createElement("span");
            t.innerText = info[att];
            t.toggleAttribute("configure-decimals", true);
            h.appendChild(t);
            // create the distribution view elements -- > TODO / WIP
            /*
            for (var sub of ["Subgroup 1", "Subgroup 2"]) {
                var subID = info[sub]["ID"];
                var d = document.createElement("distribution-view");
                d.setAttribute("distribution-data", JSON.stringify(distInfo[subID][att]));
                d.setAttribute("slot", "distribution");
                det.appendChild(d);
                
                var t = document.createElement("div");
                t.innerText = sub;
                t.setAttribute("slot", "title");
                d.appendChild(t);
            }
            */
        }
    }
    entry.toggleAttribute("active-entry", true);
    updatePage();
} 


/* || Similarity Details Panel */

// TODO: move to own file? (If useful in other contexts)

const SimDetailPanelTemplate = document.createElement("template");
SimDetailPanelTemplate.innerHTML = `
    <style>
        :host {
            min-width: 10px;
            min-height: 10px;
            /*border: 3px solid black;*/
            display: block;
            border-radius: 10px;
            overflow: hidden;
            flex-direction: column;
            margin: 2px !important;
        }
        ::slotted(div[slot="panel-title"]) {
            display: flex;
            justify-content: space-between;
            padding: 0px 10px !important;
        }
        #distribution-view-section {
            display: flex;
            align-content: stretch;
            justify-content: space-around;
            height: 100%;
            flex-grow: 1;
        }
        ::slotted(div[slot="distribution"]) {
            flex-grow: 1;
        }
    </style>
    <slot name="panel-title">Untitled Panel</slot>
    <div id="distribution-view-section">
        <slot name="distribution"></slot>
        <slot name="distribution-key"></slot>
    </div>
    

`;

class SimDetailPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow( {mode: "open"} );
        this.shadowRoot.appendChild(SimDetailPanelTemplate.content.cloneNode(true));
    }
}
customElements.define("similarity-detail-panel", SimDetailPanel);


