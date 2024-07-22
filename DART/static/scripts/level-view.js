const LevelViewTemplate = document.createElement("template");
LevelViewTemplate.innerHTML = `
    <style>
        :host {
            min-width: 10px;
            min-height: 200px;
            max-height: 100vh; /* TODO: set to height instead of max-height? */
            --cbar-height: 150px; /* TODO */
            --cbar-tick-size: 16px;
            position: relative !important;
            width: 100%;
            display: flex;
            flex-direction: column;
        }
        #filter-bar {
            border-bottom: 3px solid var(--alt-background, cyan);
        }
        .icon {
            font-family:"Material Icons Outlined"; 
        }
        .icon:hover {
            color: var(--accent-1, blue);
        }
        #filter-options {
            display: flex;
            border-bottom: 3px solid var(--alt-background, cyan);
            padding: 5px 20px !important;
        }
        #filter-button {
            position: relative;
        }
        #filter-indicator {
            width: 8px;
            height: 8px;
            display: inline-block;
            background-color: var(--accent-1, cyan);
            border-radius: 50%;
            position: absolute;
            left: 100%;
            top: 0;
            transform: translate(-50%, -25%);
        }
        :host(:not([filter-applied])) #filter-indicator {
            display: none;
        }
        #main {
            display: flex;
            flex-grow: 1;
            overflow: hidden;
        }
        #level-select-bar {
            background-color: var(--alt-background, green);
            flex-shrink: 0;
            flex-grow: 1;
            overflow: auto;
        }
        #subgroup-select-bar {
            min-width: 20px;
            max-width: 20%;
            display: flex;
            flex-direction: column;
            overflow: auto;
            flex-shrink: 0;
            flex-grow:1;
            overflow: auto;
        }
        ::slotted([slot=level]) {
            display: block;
            padding: 5px !important;
            border: 3px solid rgb(0,0,0,0);
        }
        ::slotted([slot=level][active]) {
            border-color: var(--active-selection, red);
        } 
        ::slotted([slot=level]:hover) {
            border-color: var(--background-color, yellow);
        }   
        ::slotted([slot=subgroup]) { /* Most styling of the subgroup should be in level-view-entry!*/
            display:block;
        }
        #filter-options > * > *:not(.button):not(legend) {
            border: 2px solid;
            border-radius: 10px;
            padding: 5px !important;
            margin: 2px !important;
            min-width: 30px;
            text-align: center;
            display: inline-block;
            opacity: 0.2;
        }
        #filter-options > * > [selected]:not(.button) {
            opacity: 1;
            border-color: var(--accent-1, cyan);
            background-color: var(--accent-1, cyan);
        }
        #detail-view {
            border-left: 3px solid var(--alt-background, cyan);
            border-right: 3px solid var(--alt-background, cyan);
            flex-grow: 2;
            padding-left: 20px !important;
            overflow: auto;
        }
        ::slotted([slot=detail]) {
            display: block;
        }
        #colorbar-view {
            display: flex;
            align-items: center;
            padding: 10px !important;
        }
        #colorbar-label {
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            height: calc(var(--cbar-height) + var(--cbar-tick-size) );
            text-align: center;
            width: 20px;
        }
        #tick-labels {
            display: flex;
            height: var(--cbar-height);
            flex-direction: column-reverse;
            justify-content: space-between;
        }
        ::slotted([slot=colorbar-tick]) {
            flex-basis: 0;
            text-align: right;
            height: 0px;
            font-size: var(--cbar-tick-size);
            line-height: 0px;
        }
        ::slotted([slot=colorbar]) {
            height: var(--cbar-height);
            width: 20px;
            flex-shrink: 0;
        }
        /* display options */
        #loading-haze {
            background-color: var(--background-color, white);
            opacity: 0.8;
            display: inline-block;
            width: 100%;
            height: 100%;
            position: absolute;
            left: 0;
            top: 0;   
        }
        #loading-indicator {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            font-family: 'Material Icons';
            animation: rotating 2s linear infinite;
            transform-origin: center;
        }
        :host(:not([is-loading])) #loading-haze,
        :host(:not([is-loading])) #loading-indicator {
            display: none;
        }
        /* || Define animation */
        @keyframes rotating {
            from {
                transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
                transform: translate(-50%, -50%) rotate(360deg);
            }
        }
        
        [hidden] {
            display: none !important;
        }
        :host[hidden] {
            display: none;
        }
    </style>
    <div id=filter-bar>
        <span class=icon id=filter-button>filter_alt<span id=filter-indicator></span></span>
    </div>
    <form id=filter-options hidden>        
        <fieldset id=subgroup-attribute-selection>
            <legend>Subgroups including:</legend>
            <button type=button class=button value=select-all> Select All </button>
            <button type=button class=button value=clear-selection> Select None </button>
            <br>
        </fieldset>
        
        <fieldset id=similarity-attribute-selection>
            <legend>Similarity From:</legend>
            <button type=button class=button value=select-all> Select All </button>
            <button type=button class=button value=clear-selection> Select None </button>
            <br>
        </fieldset>
    </form>
    <div id=main>
        
        <div id=level-select-bar>
            <slot name=level></slot>
        </div>
        <div id=subgroup-select-bar>
            <slot name=subgroup></slot>
        </div>
        <div id=detail-view>
            <slot name=detail></slot>
        </div>
        <div id=colorbar-view>
            <div id=colorbar-label>Similarity</div>
            <div id=tick-labels>
                <slot name=colorbar-tick></slot>
            </div>
            <slot name=colorbar></slot>
        </div>
    </div>
    <div id=loading-haze></div>
    <div id=loading-indicator>loop</div>
    
`;
class LevelView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow( {mode: 'open'} );
        this.shadowRoot.appendChild(LevelViewTemplate.content.cloneNode(true));
        
        this.filterButton = this.shadowRoot.querySelector("#filter-button");
        this.filterSection = this.shadowRoot.querySelector("#filter-options");
        this.showFilters = this.showFilters.bind(this);
        this.filterButton.addEventListener("click", this.showFilters);
        this.filter = this.filter.bind(this);
                
        this.active_level = 0;
        this.active_subgroup = null;
        this.switchLevel = this.switchLevel.bind(this);
        this.levelBar = this.shadowRoot.querySelector("#level-select-bar");
        this.levelBar.addEventListener("click", this.switchLevel);
    
        this.filterSelection = this.filterSelection.bind(this);        
        // update the select all / clear
        for (var b of this.filterSection.querySelectorAll(".button")) {
            b.addEventListener("click", this.filterSelection);
        }
        this.simInput = this.shadowRoot.querySelector("#similarity-attribute-selection");
        this.subInput = this.shadowRoot.querySelector("#subgroup-attribute-selection");
    }
    connectedCallback() {
        //this.setLevelView(); // Needs to trigger after items are added...
        
        // perform the filter initialization
        // get the overall attribute information
        const attInfo = JSON.parse(sessionStorage.getItem("database_attribute_configuration"));
        
        for (var fs of [this.simInput, this.subInput]) {
            for (var att in attInfo) {
                var opt = document.createElement("span");
                opt.innerText = att;
                opt.setAttribute("value", att);
                opt.toggleAttribute("selected", true);
                fs.appendChild(opt);
                opt.addEventListener("click",this.filterSelection);
            }
            
        }
        
        // add the colorbar
        const colorBar = document.createElement("div");
        colorBar.classList.add("colorbar-vertical");
        colorBar.setAttribute("slot", "colorbar");
        this.appendChild(colorBar);
        // add the colorbar ticks
        const markEvery = this.getAttribute("colorbar-tick-every") || 0.5;
        var ii = 0;
        while (ii <= 1) {
            var tick = document.createElement("span");
            tick.setAttribute("slot", "colorbar-tick");
            tick.innerText = ii;
            this.appendChild(tick);
            ii = ii + markEvery;
        }
    }
    filterSelection(clickEvent) {
        const e = clickEvent.target;
        const value = e.getAttribute("value");
        if (value == "select-all") {
            for (var element of e.parentElement.querySelectorAll("[value]:not(.button)")) {
                element.toggleAttribute("selected", true);
            }
        } else if (value == 'clear-selection') {
            for (var element of e.parentElement.querySelectorAll("[value]:not(.button)")) {
                element.toggleAttribute("selected", false);
            }
        } else {
            e.toggleAttribute("selected");
        }
        this.filter();
    }
    showFilters() {
        this.filterSection.toggleAttribute("hidden");
    }
    filter() {
        var filterApplied = false;
        // filter based on the subgroup
        var hideSubs = new Set([...this.subInput.querySelectorAll("[value]:not(.button):not([hidden]):not([selected])")].map(e=>e.getAttribute("value")));
        filterApplied = (filterApplied || [...hideSubs].length > 0) 
        var toHide = [...this.querySelectorAll("grouped-view:not([hidden])")].filter(x=> [...new Set(x.getAttribute("name").split("-")).intersection(hideSubs)].length > 0);
        for (var g of toHide) {
            g.toggleAttribute("hidden", true);
        }
        var toShow = [...this.querySelectorAll(`grouped-view[hidden][level="${this.active_level}"]`)].filter(x=> [...new Set(x.getAttribute("name").split("-")).intersection(hideSubs)].length < 1);
        for (var g of toShow) {
            g.toggleAttribute("hidden", false);
        }
        // filter based on the similarity attributes      
        var showSim = new Set([...this.simInput.querySelectorAll("[value]:not(.button):not([hidden])[selected]")].map(e=>e.getAttribute("value")));
        filterApplied = (filterApplied || [...this.simInput.querySelectorAll("[value]:not(.button):not([hidden]):not([selected])")].length > 0)
        // for each subgroup, select the side entry with the largest number of similarity attributes from the allowed list
        var allSubgroups = [...this.querySelectorAll(`[slot=subgroup][subgroup][level="${this.active_level}"]`)].map(x=>x.getAttribute("subgroup"));
        
        for (var sub of allSubgroups) {
            var elements = this.querySelectorAll(`[slot=subgroup][subgroup="${formatQuery(sub)}"][similarity-attributes]`);
            var valid = [...elements].filter(x=>{
                var simAtts = x.getAttribute("similarity-attributes").split(",");
                return [...new Set(simAtts).intersection(showSim)].length == simAtts.length;
            });
            
            for (var e of elements) {
                e.toggleAttribute("hidden", true);
            }
            if (valid.length == 0) {
                continue;
            }
            var selection = valid[0];
            if (valid.length > 1) {
                var validLengths = valid.map(x=>x.getAttribute("similarity-attributes").split(",").length);
                var idx = validLengths.indexOf(Math.max(...validLengths))
                selection = valid[idx];
            }
            selection.toggleAttribute("hidden", false);
            // show/hide detail cards
            for (var dc of this.querySelectorAll(`[subgroup="${formatQuery(sub)}"] detail-card`) ) {
                dc.toggleAttribute("hidden", !(showSim.has( dc.getAttribute("name") ) ));
            }            
        }
        this.toggleAttribute("filter-applied", filterApplied);
    }
    configureFilters() {
        // get needed information
        this.similarity_attribute_list = [...new Set([...this.querySelectorAll("[slot=subgroup]:not(grouped-view)")].map(x=>x.getAttribute("similarity-attributes").split(",")).flat(1))];
        this.subgroup_attribute_list = [...new Set([...this.querySelectorAll("[slot=subgroup]:not(grouped-view)")].map(x=>x.getAttribute("group").split("-")).flat(1))].filter(x=>x.length>0);
        // update the available filters
        for (var typ of ["similarity", "subgroups"]) {
            var sect = this.simInput;
            var crit = this.similarity_attribute_list;
            if (typ == "subgroups") {
                sect = this.subInput;
                crit = this.subgroup_attribute_list;
            }
            var toHide = [...sect.querySelectorAll(`[value]:not(.button):not([hidden])`)].filter(x=>!crit.includes(x.getAttribute("value")));
            for (var e of toHide) {
                e.toggleAttribute("hidden", true);
            }
            var toShow = [...sect.querySelectorAll(`[value]:not(.button)[hidden]`)].filter(x=>crit.includes(x.getAttribute("value")));
            for (var e of toShow) {
                e.toggleAttribute("hidden", false);
            }
        }
    }
    switchLevel(clickEvent) {
        if (clickEvent.target.hasAttribute("level") && !clickEvent.target.hasAttribute("active")) {
            // switch the active level
            this.querySelector("[slot=level][active]").toggleAttribute("active", false);
            clickEvent.target.toggleAttribute("active", true);
            this.active_level = clickEvent.target.getAttribute("level");
            this.active_subgroup = null;
            const active = this.querySelector("[slot=subgroup][active]");
            if (active) { active.toggleAttribute("active", false) };
            this.setLevelView();
        }
    }
    configureSubgroupBar() {
        const subs = [...this.querySelectorAll(`[slot=subgroup][level="${this.active_level}"]:not(grouped-view)`)];
        const groups = [...new Set(subs.map(x=>x.getAttribute("group")))];
        for (const g of groups) {
            // Create / show the group labels
            var ge = this.querySelector(`grouped-view[name="${g}"]`);
            if (!ge) {
                ge = document.createElement("grouped-view");
                ge.setAttribute("slot","subgroup");
                ge.setAttribute("name", g);
                ge.setAttribute("level", this.active_level);
                this.appendChild(ge);
                const t = document.createElement("span");
                t.innerText = g;
                t.setAttribute("slot", "title");
                ge.appendChild(t);
            }
            
            const elems = subs.filter(x=>x.getAttribute("group")==g);
            for (var e of elems) {
                ge.appendChild(e);
            }
        }
    }
    setLevelView() {
        this.configureSubgroupBar();
        const toHide = this.querySelectorAll(`[slot=subgroup]:not([level='${this.active_level}']):not([hidden])`);
        const toShow = this.querySelectorAll(`[slot=subgroup][level='${this.active_level}'][hidden]`);
        for (var e of toHide) {
            e.toggleAttribute("hidden", true);
        }
        for (var e of toShow) {
            e.toggleAttribute("hidden", false);
        }
        // set the active to the top option
        if (!this.querySelector(`[slot=subgroup]:not([hidden])[active]`) && this.querySelector(`[slot=subgroup][subgroup]:not([hidden])`)) {
            this.active_subgroup = this.querySelector(`[slot=subgroup][subgroup]:not([hidden])`).getAttribute("subgroup");
        }
        this.configureFilters();
        this.filter();
        this.setSubgroupView();
    }
    setSubgroupView() {
        const current = this.querySelectorAll("[slot=detail]:not([hidden])");
        for (var e of current) {
            e.toggleAttribute("hidden", true);
        }
        if (this.active_subgroup) {
            this.querySelector(`[slot=detail][subgroup="${this.active_subgroup}"]`).toggleAttribute("hidden", false);
            // make sure that the related subgroup indicator is selected.
            const ind = this.querySelector(`[slot=subgroup][subgroup="${this.active_subgroup}"]:not([hidden])`);
            if (ind) {
                ind.toggleAttribute("active", true);
            }
            
        }
    }
    
}
customElements.define("level-view", LevelView);


const GroupedViewTemplate = document.createElement("template");
GroupedViewTemplate.innerHTML = `
    <style>
        :host {
            display: block;
            min-height: 20px;
            min-width: 20px;
        }
        ::slotted(*) {
            display: block;
        }
        ::slotted([slot=title]) {
            font-weight: bold;
            text-align: center;
        }
    </style>
    <slot name=title>No Title</slot>
    <slot name=subgroup>No Subgroups</slot>
`;

class GroupedView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow( {mode: 'open'} );
        this.shadowRoot.appendChild(GroupedViewTemplate.content.cloneNode(true));
    }
}

customElements.define("grouped-view", GroupedView);


const LevelViewEntryTemplate = document.createElement("template");
LevelViewEntryTemplate.innerHTML = `
    <style>
        :host {
            display: block;
            background-color: cyan; /* DEBUG */
            border: 2px solid var(--background-color, white);
            overflow: hidden;
            transition: max-height 0.2s; /* Note: since the transition is on the max-height, the transition time doesn't directly match the perceived time */
            max-height: 50px;
        }
        :host([active]) {
            border-top-width: 4px;
            border-bottom-width: 4px;
        }
        :host(:not(:hover):not([active])) {
            max-height: 10px;
        }
        ::slotted(*) {
            transition: opacity 0.2s;
        }
        :host(:not(:hover):not([active])) ::slotted(*) {
            opacity: 0;
        }
    </style>
    <slot></slot>
`;

class LevelViewEntry extends HTMLElement {
    constructor() {
        super();
        this.attachShadow( {mode: 'open'} );
        this.shadowRoot.appendChild(LevelViewEntryTemplate.content.cloneNode(true));
        this.addEventListener("click", this.setActive);
    }
    connectedCallback() {
        // get the parent level view
        const maxDepth = 3;
        var counter = 0;
        this.parent = this.parentElement;
        while (counter < maxDepth) {
            if (!this.parent || this.parent.nodeName == "LEVEL-VIEW") {
                break;
            }
            this.parent = this.parent.parentElement;
            counter++;
        }
        if (!(this.parent.nodeName == "LEVEL-VIEW")) {
            console.error("Could not find the parent level view for the node:", this, "found parent:", this.parent, `(at search depth: ${counter})`);
        }
    }
    setActive() { 
        // set the element to active and remove any other active element in the levelview
        var current = this.parent.querySelector("[slot=subgroup][active]");
        if (current) {
            current.toggleAttribute("active", false);
        }
        this.toggleAttribute("active", true);
        this.parent.active_subgroup = this.getAttribute("subgroup");
        this.parent.setLevelView();
    }
}

customElements.define("level-view-entry", LevelViewEntry);





const DetailCardTemplate = document.createElement("template");
DetailCardTemplate.innerHTML = `
    <style>
        :host {
            display: inline-block;
            min-width: 200px;
            border-radius: 10px;
            overflow: hidden;
            margin: 4px !important;
        }
        ::slotted([slot=top-info]) {
            display: flex;
            padding: 5px !important;
        }
    </style>
    <slot name=top-info></slot>
    <slot name=figure></slot>
    
`;

class DetailCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow( {mode: 'open'} );
        this.shadowRoot.appendChild(DetailCardTemplate.content.cloneNode(true));
    }
    static get observedAttributes() { return ["name", "value"] }
    attributeChangedCallback(attName, oldVal, newVal) {
        this.configHeader();
    }
    configHeader() {
        const name = this.getAttribute("name") || "Unidentified Attribute";
        const value = Number(this.getAttribute("value")) || Infinity;
        // Remove old (if needed)
        for (var ti of this.querySelectorAll("[slot=top-info]")) {
            this.removeChild(ti);
        }
        const top = document.createElement("div");
        top.innerHTML = `
            <style>
                .title {
                    font-weight: bold;
                    flex-grow: 1;
                }
            </style>
            <span class=title>${name}</span>
            <span>${round(value)}</span>
        `;
        top.setAttribute("slot", "top-info");
        top.toggleAttribute("colormapped");
        top.setAttribute("color-value", value);
        this.appendChild(top);        
    }
}

customElements.define("detail-card", DetailCard);
