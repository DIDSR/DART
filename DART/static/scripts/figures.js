/* || Utilities */

function svgElement(kind, attributes={}) {
    var e = document.createElementNS("http://www.w3.org/2000/svg",kind);
    if (kind == 'svg') {
        e.setAttributeNS("http://www.w3.org/2000/xmlns/","xmlns:xlink","http://www.w3.org/1999/xlink");
    }
    for (var key in attributes) {
        e.setAttribute(key, attributes[key]);
    }
    
    return e;
}

/* || Custom Classes */

const DistributionFigureTemplate = document.createElement("template");
DistributionFigureTemplate.innerHTML = `
    <style>
        :host {
            display: block;
            position: relative;
            
        }
        #main-section {
            display: block;
        }
        /* Legend Placement */
        :host(:not([legend=left]):not([legend=right])) ::slotted(*) {
            /* horizontally center --> may not work with multiple distiributions*/
            position: relative;
            left: 50%;
            transform: translate(-50%);
        }
        :host([legend=left]) #main-section,
        :host([legend=right]) #main-section {
            display: flex;
            justify-content: center;
            align-items: center;
        }
        :host([legend=left]) #legend-section {
            order: 1;
        }
        :host([legend=left]) #main-section {
            order: 2;
        }
        /* Figure & title sizing */
        :host([no-figure-title]) {
            --figure-title-size: 0px !important;
        }
        ::slotted(*) {
            margin: 5px !important;
            display: inline-block;
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
                
        
    </style>
    <div id=display-options>
        <label for=display-select>Figure type:</label>
        <select id=display-select>
        </select>
    </div>
    <div id=main-section>
        <div id=figures>
            <slot name=figure>No figures</slot>
        </div>
        <div id=legend-section>
        <slot name=legend></slot>
        </div>
    </div>
    
    
    <div id=loading-haze></div>
    <span id=loading-indicator>loop</span>
`;

class DistributionFigure extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(DistributionFigureTemplate.content.cloneNode(true));
        this.select = this.shadowRoot.querySelector("#display-select");
        // populate the display options
        for (var plotType in DistributionViews) {
            var opt = document.createElement("option");
            opt.value = plotType;
            opt.innerText = DistributionViews[plotType][0];
            this.select.appendChild(opt);
        }
        this.updateViews();
        // track changes to the select
        this.plot = this.plot.bind(this);
        this.select.addEventListener("change", this.plot);
        // track which item is being hovered over
        this.main = this.shadowRoot.querySelector("#main-section");
        this.startTracking = this.startTracking.bind(this);
        this.stopTracking = this.stopTracking.bind(this);
        this.trackActive = this.trackActive.bind(this);
        this.removeHighlight = this.removeHighlight.bind(this);
        this.addEventListener("mouseenter", this.startTracking);
        this.addEventListener("mouseleave", this.stopTracking);
    }
    
    static get observedAttributes() { return ["distributions", "attribute-name", "views"] }
    
    attributeChangedCallback(attName, oldValue, newValue) {
        this.toggleAttribute("is-loading", true);
        if (attName == "views") {
            this.updateViews();            
        } else {
            this.updateAttributes();
        }
        this.plot();
        this.toggleAttribute("is-loading", false);
    }
    
    updateViews() {
        var views = this.getAttribute("views") || Object.keys(DistributionViews);
        if (typeof views == "string") {
            views = views.split(",");
        }
        for (var opt of this.select.children) {
            if (!views.includes(opt.value)) {
                opt.toggleAttribute("hidden", true);
            } else {
                opt.toggleAttribute("hidden", false);
            }
        }
        const first = this.select.querySelector(":not([hidden])");
        if (!first) {
            console.error("no views left");
            return;
        }
        
        this.select.value = first.value;
        
        if (this.select.querySelectorAll(":not([hidden])").length < 2) {
            this.select.parentElement.toggleAttribute("hidden", true);
        } else {
            this.select.parentElement.toggleAttribute("hidden", false);
        }
    }
    
    updateAttributes() {
        this.canPlot = true;
        this.distributions = JSON.parse(this.getAttribute("distributions")) || {};
        if (Object.keys(this.distributions).length < 1) {
            //console.error("No distribution found!");
            this.canPlot = false;
        }
        this.attribute = this.getAttribute("attribute-name");
        if (!this.attribute) {
            console.error("cannot plot a distribution without knowing the attribute!");
            this.canPlot = false;
        }
        const colorSets = JSON.parse(sessionStorage.getItem("attribute_color_sets"));
         if (!colorSets[this.attribute]) {
            console.error(`Cannot find color information for the attribute: "${this.attribute}"`);
            this.canPlot = false;
        }
        this.attributeInfo = JSON.parse(sessionStorage.getItem("database_attribute_configuration"))[this.attribute];
    }
    
    plot() { // Assumes that each distribution is provided as {title: dist}
        if (!this.canPlot) {
            return;
        }
        
        if ((!this.querySelector("[slot=legend]")) & !(this.getAttribute("legend") == "none") ) {
            this.makeLegend();
        }
        const plotType = this.select.value;
        for (var name in this.distributions) {
            const dist = this.distributions[name];
            
            var fig = this.querySelector(`[slot=figure][name="${name}"]`);
            if (!fig) {
                // create the figure holder for this distribution
                fig = document.createElement("span");
                fig.setAttribute("slot", "figure");
                fig.setAttribute("name", name);
                fig.classList.add("figure-wrapper");
                this.appendChild(fig);
                if (!this.hasAttribute("no-figure-title")) {
                    const title = document.createElement("div");
                    title.classList.add("plot-title");
                    title.innerHTML = name;
                    fig.appendChild(title);
                }
            }
            // hide other plots (if applicable)
            for (var p of fig.querySelectorAll(`svg:not(.plot-title):not(hidden):not([plot-type="${plotType}"])`)) {
                p.toggleAttribute("hidden", true);
            }
            // check if there is the correct plot type, otherwise create
            var p = fig.querySelector(`[plot-type="${plotType}"]`);
            if (!p) {
                
                p = DistributionViews[plotType][1](this.attributeInfo, dist);
                p.setAttribute("plot-type", plotType);
                fig.appendChild(p);
            }
            p.toggleAttribute("hidden", false);
            
        }
        applyColorPalette();
    }
    
    makeLegend() {
        const legend = document.createElement("figure-legend");
        legend.setAttribute("slot", "legend");
        legend.setAttribute("attribute", this.attribute);
        this.appendChild(legend);
    }
    
    
    startTracking() {
        this.addEventListener("mousemove", this.trackActive);
    }
    
    trackActive(mouseEvent) {        
        var e = mouseEvent.target;
        e.addEventListener("mouseleave", this.removeHighlight)
        if (!(e.classList.contains("legend-entry") | e.parentElement.classList.contains("legend-entry") | e.classList.contains("plot-element") )) {
            return;
        }
        if (e.parentElement.classList.contains("legend-entry")) {
            e = e.parentElement.querySelector(".legend-entry-color");
        } else if (e.classList.contains("legend-entry")) {
            e = e.querySelector(".legend-entry-color");
        }
        var value = e.getAttribute("color-value");
        
        // Highlight the related elements
        for (var element of this.querySelectorAll(`.legend-entry:has([color-value="${value}"]), .plot-element[color-value="${value}"]`) ) {
            element.toggleAttribute("highlight", true);
        }
    } 
    removeHighlight(event) {
        for (var element of this.querySelectorAll("[highlight]")) {
            element.toggleAttribute("highlight", false);
        }
        event.target.removeEventListener("mouseleave", this.removeHighlight);
    }
    
    stopTracking() {
        this.removeEventListener("mousemove", this.trackActive);
    }
    
    
}

customElements.define("distribution-figure", DistributionFigure)

/* ||| Legend */

const FigureLegendTemplate = document.createElement("template");
FigureLegendTemplate.innerHTML = `
    <style>
        :host {
            display: block;
            /* Set defaults */
            --num-cols: 1;
            --layout: vertical;
        }
        #title {
            text-align: center;
            font-weight: bold;
            font-size: var(--legend-title-size);
        }
        #main {
            display: grid;
            grid-template-columns: repeat( var(--num-cols), auto);
            overflow: auto;
            white-space: nowrap;
        }   
    </style>
    <div id=title></div>
    <div id=main>
        <slot>No legend entries</slot>
    </div>
    
`;

class FigureLegendElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(FigureLegendTemplate.content.cloneNode(true));
        this.titleBlock = this.shadowRoot.querySelector("#title");
    }
    
    static get observedAttributes() { return ["title", "attribute", "max-columns", "max-rows", "layout-mode"] }
    
    attributeChangedCallback(attName, oldValue, newValue) {
        if (attName == "title" || (attName == "attribute" && !this.hasAttribute("title"))) {
            // set the title
            this.titleBlock.innerText = newValue;
        }
        if (attName == "attribute") {
            // get the potential values for the attribute & create entries
            const attributeConfig = JSON.parse(sessionStorage.getItem("database_attribute_configuration"))
            if (!attributeConfig | !attributeConfig[newValue]) {
                console.error(`Could not retrieve config information for the attribute "${newValue}"`);
                return;
            }
            
            for (const val of attributeConfig[newValue]["values"]) { // TODO: any update for binning?
                this.addEntry(newValue, val) // TODO: pass display name once added
            }
            
        } else if (attName == "max-columns") {
            this.style.setProperty("--max-cols", newValue);
        } else if (attName == "max-rows") {
            this.style.setProperty("--max-rows", newValue);
        } else if (attName == "layout-mode") {
            this.style.setProperty("--layout", newValue);
        }
        this.configureLayout();
        
    }
    
    configureLayout() {
        const style = getComputedStyle(this);
        const layout = style.getPropertyValue("--layout");
        const numEntries = this.children.length;
        if (layout == "horizontal") {
            // prioritize filling the columns, then move to filling the rows
            const maxRows = Number(style.getPropertyValue("--max-rows")) || Infinity;
            const maxCols = Number(style.getPropertyValue("--max-cols")) || 4; // TODO: set default
            const numCols = Math.min(maxCols, numEntries);
            if ( (numEntries / numCols) > maxRows) {
                console.warn(`Cannot fit ${numEntries} entries into ${maxRows} rows and ${maxCols} columns. Disregarding "max-rows" argument (layout-mode=${layout}).`);
            }
            this.style.setProperty("--num-cols", numCols);
        } else { // default => vertical
            // prioritize filling the rows, then move to filling the columns
            const maxRows = Number(style.getPropertyValue("--max-rows")) || 5;
            const maxCols = Number(style.getPropertyValue("--max-cols")) || Infinity;
            const numCols = Math.ceil(numEntries/maxRows);
            if (numCols > maxCols) {
                console.warn(`Cannot fit ${numEntries} entries into ${maxRows} rows and ${maxCols} columns. Disregarding "max-columns" argument (layout-mode=${layout}).`);
            }
            this.style.setProperty("--num-cols", numCols);
        } 
    }
    
    addEntry(attribute, entryName, displayName) {
        displayName = displayName || entryName;
        const entry = document.createElement("span");
        entry.classList.add("legend-entry");
        const colorblock = document.createElement("span");
        colorblock.classList.add("legend-entry-color");
        colorblock.setAttribute("color-set", attribute);
        colorblock.setAttribute("color-value", entryName)
        colorblock.toggleAttribute("colormapped", true);
        entry.appendChild(colorblock);
        const label = document.createElement("span");
        label.innerText = displayName;
        label.classList.add("legend-entry-label");
        entry.appendChild(label);
        this.appendChild(entry);
    }
}


customElements.define("figure-legend", FigureLegendElement);

/* || Specific distribution plotting */
DistributionViews = {
    "vertical-bar": ["Bar Chart", makeVerticalBarChart],
    //"pie": ["Pie Chart", makePieChart],
}
/* Creates an svg of size comparison "tiles"
 * @constructor
 */
function sizeTiles(attConfig, distribution) { // attConfig not used, just included to prevent errors with the wrapper class
    

}


/*
 * Creates an svg of a bar chart (bars run vertically)
 * @constructor
 * @param {Object} attributeInfo - the attribute configuration information
 * @param {Object} distribution - the distribution to plot
 * @param {number} [defaultBarWidth=10] - default bar width, only overridden if figure will exceed maxWidth
 * @param {number} [maxwidth=200] - maximum figure width, pass 0 for no maximum width
 * @param {number} [totalHeight=100] - total figure height
 * @param {number} [barPad=0.2] - the amount of padding between bars, as a portion of bar width
 * @param {number} [lineWidth=1] - width of the baseline
 * @param {string} [backgroundColor=null] - svg background color, pass null for transparent background 
 * @param {bool} [scaleHeight=true] - if true, will scale the active area such that the tallest bar fills the height; otherwise, the total active area height will represent a bar of 100%
 */
function makeVerticalBarChart(attributeInfo, 
                              distribution, 
                              defaultBarWidth=20, 
                              maxWidth=200,
                              totalHeight=100,
                              barPad=0.2,
                              lineWidth=1,
                              backgroundColor=null,
                              scaleHeight=true,
                              ) {
    //determine bar width
    /// determine portion of active area assigned to each bar
    const values = attributeInfo.values;
    const innerPadPortion = barPad * (values.length-1);
    const maxPlotArea = maxWidth;
    var barWidth = maxPlotArea / (values.length + innerPadPortion);
    barWidth = Math.min(barWidth, defaultBarWidth);
    const plotWidth = barWidth * (values.length + innerPadPortion);
    const totalWidth = plotWidth;
    const plotHeight = totalHeight - lineWidth;
    
    // Configure svg
    const d = svgElement("svg");
    d.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
    // Set background (optional)
    if (backgroundColor) {
        const bg = svgElement("rect", {
            "width":totalWidth, 
            "height":totalHeight, 
            "fill":backgroundColor,
            "x":0,
            "y":0,
        });
        d.appendChild(bg);
    }

    // Determine how much space is needed to account for hover scaling
    const scale = getComputedStyle(document.documentElement).getPropertyValue("--plot-element-hover-scale");
    // Add the bars
    const total = Object.values(distribution).reduce((partialSum, a) => partialSum+a,0);
    var maxPortion = scale;
    if (scaleHeight) {
        maxPortion = (Math.max(...Object.values(distribution)) / total) * scale;
    }
    for (var ii in values) {
        const val = values[ii];
        const portion = (distribution[val]/total) || 0;
        const barHeight = plotHeight*(portion/maxPortion)
        const bar = svgElement("rect", {
            "width": barWidth,
            "height": barHeight,
            "x": ii*(barWidth+barPad*barWidth),
            "y": (plotHeight-barHeight),
            "clip-path":"url(#activeArea)",
        });
        // Styling
        bar.classList.add("plot-element");
        /// Set necessary colormap arguments
        bar.toggleAttribute("colormapped", true);
        bar.setAttribute("color-value", val);
        bar.setAttribute("color-set", attributeInfo["name"]);
        d.appendChild(bar);
        // Make the hover text
        const t = svgElement("title");
        t.textContent = `${val}\n ${portion*100}%`; // TODO: improve
        bar.appendChild(t);
    }
    
    
    // Add the baseline
    const bl = svgElement("rect",{
        "width":plotWidth,
        "height":lineWidth,
        "x": 0,
        "y": totalHeight-lineWidth,
        "fill":"black", // TODO: make variable?
    });
    d.appendChild(bl);
    
    return d;
}
function makePieChart() { // TODO
    console.warn("Pie chart not yet implemented");
    const d = svgElement("svg");
    return d;
}


