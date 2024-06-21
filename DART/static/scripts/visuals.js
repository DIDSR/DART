
/* || Custom Classes */

const DistributionViewTemplate = document.createElement("template");

DistributionViewTemplate.innerHTML = `
    <style>
        :host {
            display: inline-block;
            min-width: 30px;
            min-height: 30px;
            border: 2px dashed red;
        }
        
    </style>
    <slot name="title">No title</slot>
    <slot name="view-select"></slot>
    <slot name="view">No views added</slot>
`;
const distributionViewOptions = {
    "Pie Chart": "pie-chart",
    "Bar Chart": "bar-chart-v",
}

class DistributionView extends HTMLElement {
    constructor() { 
        super();
        this.attachShadow( {mode: "open"} );
        this.shadowRoot.appendChild(DistributionViewTemplate.content.cloneNode(true));
        this.select = document.createElement("select");
        this.dist = null;
    }
    
    connectedCallback() {
        // set up the select
        this.select.setAttribute("slot", "view-select");
        this.getCurrentView = this.getCurrentView.bind(this);
        this.select.setAttribute("onchange", "this.parentElement.getCurrentView()");
        this.appendChild(this.select);
        for (var o in distributionViewOptions) {
            var opt = document.createElement("option");
            opt.value = distributionViewOptions[o];
            opt.innerText = o;
            this.select.appendChild(opt);
        }
        this.getCurrentView();
        
    }
    static get observedAttributes() { return ['distribution-data'] }
    
    attributeChangedCallback(att, oldVal, newVal) {
        // remove any existing distribution views
        var existing = this.querySelectorAll("[slot='view']");
        for (var e of existing) { this.removeChild(e) };
        // set the distribution (convert to percent)
        this.dist = JSON.parse(newVal);
        var total = Object.values(this.dist).reduce((partialSum,a) => partialSum+a, 0);
        this.dist = Object.entries(this.dist).map( x => [x[0], (x[1]/total)*100]);
        this.dist = Object.fromEntries(this.dist);
        // generate the current view
        this.getCurrentView();
    }
    
    getCurrentView() {
        // determine the correct view from the select
        var currentView = this.select.value;
        if (this.dist == null || !currentView) { return }
        // create the distribution view
        var view = document.createElement(currentView);
        view.setAttribute("slot", "view");
        view.setAttribute("distribution", JSON.stringify(this.dist));
        this.appendChild(view);
        
        
    } 
}

customElements.define("distribution-view", DistributionView);

const PieChartTemplate = document.createElement("template");
PieChartTemplate.innerHTML = `
    <style>
    :host {
        min-width: 20px;
        min-height: 20px;
        border: 2px solid cyan;
        display: block;
    }
    
    :host[hidden] { display:none }
    </style>
    <svg xmlns="http://www.w3.org/2000/svg" width=100 height=100>
        <defs>
            <slot name="def"></slot>
        </defs>
        <slot name="object"></slot>
    </svg>
`;
class PieChart extends HTMLElement {
    constructor() {
        super();
        this.attachShadow( {mode: "open"} );
        this.shadowRoot.appendChild(PieChartTemplate.content.cloneNode(true));
    }
    
    static get observedAttributes() { return ['distribution', 'color-key'] }
    
    connectedCallback() { this.createChart() }
    
    createChart() {
        const data = JSON.parse(this.getAttribute("distribution"));
        var pal = getComputedStyle(this).getPropertyValue("--current-palette") || "red, green";
        var colorKey = this.getAttribute("color-key");
        if (!colorKey) {
            colorKey = {};
            var counter = 0;
            for (let att in data) {
                colorKey[att] = counter;
                counter++;
            }
        }
        console.log(pal, colorKey, colorKey.length);
        const rad = 40;
        var angle = -90;
        const N = 4; // number of points to use
        var center = [50,50];
        const colors = new ColorMap(pal);
        
        // distribution is in percent
        for (let att in data) {
            var a = 360*(data[att]/100);
            var points = [center];
            for (i = 0; i <= N; i++) {
                points.push(getCoord(...center, rad*1.4, angle+(a/N)*i));
            }
            angle = angle + a;
        
        var id = makeid();
        var clip = svgElement("clipPath");
            clip.setAttribute("id",id);
            clip.setAttribute("slot", "def")
            this.appendChild(clip);
        var poly = svgElement("polygon")
            poly.setAttribute("points", points);
            clip.appendChild(poly);
        
        var n = colors.getCat(colorKey[att], Object.keys(colorKey).length);
        var c = svgElement("circle");
            c.setAttribute("cx", center[0]);
            c.setAttribute("cy", center[1]);
            c.setAttribute("r", rad);
            c.classList.add("dist-element");
            c.classList.add("apply-palette");
            c.setAttribute("palette", n);
            
            c.setAttribute("clip-path", `url(#${id})`);
            c.setAttribute("slot", "object");
            
            this.appendChild(c);
            
        var title = svgElement("title");
            title.textContent = `${att} ${(data[att]).toFixed(2)}%`; // 2 decimal places
            c.appendChild(title);
            
        }
    }
    
    
}

customElements.define("pie-chart", PieChart);


/* || Functions */


function makeDistViewSection(attribute, key, div_id, includeType=false) {
    if (div_id) {
        var root = document.getElementById(div_id);
    } else {
        var root = document.body;
    }
    var attInfo = fromStorage("attribute-information");
    
    // make the div specific for this attribute
    var div = document.createElement("div");
        div.classList.add("attribute-distribution");
        root.appendChild(div);
    var head = document.createElement("div");
        div.appendChild(head);
        head.appendChild(collapseIcon());
        head.setAttribute("onclick","toggleCollapse(this, createDistViewIfEmpty, [this.getAttribute(\"att\"), this.getAttribute(\"target\")])");
        head.setAttribute("target", `${attribute}-distribution`);
        head.setAttribute("att", `${attribute}`);
        head.classList.add("collapsible");
        head.classList.add("collapsed");
        
    var h = document.createElement("span");
        h.innerText = attInfo[attribute]["display_name"];
        head.appendChild(h);
    
    if (includeType) {
        // include the attribute type in the label
        var t = document.createElement("span");
            t.innerText = attInfo[attribute]['type'];
            t.classList.add("type-label");
            head.appendChild(t);
    }
 
    var d = document.createElement("div");
        d.setAttribute("id", `${attribute}-distribution`);
        d.setAttribute("data-key", key);
        d.classList.add("hidden");
        div.appendChild(d);
}


function createDistViewIfEmpty(attribute, div_id) {
    var div = document.getElementById(div_id);
    if (div.children.length == 0) {
        var data = fromStorage(div.getAttribute("data-key"));
        var distview = createDistributionView(attribute, data, null, div_id, true);
        div.appendChild(distview);
        
    }
}



/* Constants and Counters */

const distributionViews = {
    "Bar Chart":verticalBars,
    "Pie Chart":pieChart,
    
}

var clipCount = 0; // needed to make unique ids for each clipPath
const numReg = /^-?\d*\.?\d*$/
/* ===================== */

function swapView(element) {
    var root = element.parentElement;
    for (e of root.childNodes) {
        if (e != element && !e.classList.contains("hidden") && !e.classList.contains("title-block")) {
            e.classList.add("hidden");
        }
        if (e.classList.contains(element.value.replace(" ", "-"))) {
            e.classList.remove("hidden");
        }
    }
}

function makeLegend(attribute, data, showAll=false, maxRows=2) {
    // creates a legend showing the colors associated with each of the options
    var colors = new optionColorPalette(attribute);
    
    if (!showAll) {
        // remove options not in data
        var options = Object.keys(data);
    } else {
        var options = Object.keys(colors.mapping);
    }
    

    // determine the number of rows and columns (keeping them as even as possible)
    var nCols = Math.ceil(options.length/maxRows);
    var nRows = Math.ceil(options.length/nCols);    
    
    // create the table to hold the legend
    var tab = document.createElement("table");
        tab.classList.add("legend")
        
    // create the legend title | TODO: make optional?
    var tr = document.createElement("tr");
        tab.appendChild(tr);
    var th = document.createElement("th"); 
        th.innerText = attribute; // TODO: display name
        th.setAttribute("colspan", 2*nCols);
        tr.appendChild(th);
    
    // create the rows
    var rows = {}
    for (i = 0; i < nRows; i++) {
        rows[i] = document.createElement("tr");
        tab.appendChild(rows[i]);
    }
    console.log(rows);

    console.log("overall:", options.length, nRows, nCols);
    for (i = 0; i < options.length; i++) {
        //var c = Math.floor(i/nRows);
        var r = i % nRows;
        // create the colorbox
        var td = document.createElement("td");
            rows[r].appendChild(td);
            td.classList.add("colorbox");
            td.classList.add("apply-palette")
            td.setAttribute("max", colors.length);
            td.setAttribute("palette", colors.get(options[i]));
        // create the label
        var td = document.createElement("td");
            rows[r].appendChild(td);
            td.innerText = options[i] // TODO: display name   
    }
    return tab;
}

function createDistributionView(attribute, data, title, div_id, legend=false) { // todo: legend option
    // wrapper to create a distribution view section
        
    // calculate portions
    var portions = {};
    const total = Object.values(data).reduce((a,b) => a+b, 0);
    for (let cls in data) { portions[cls] = data[cls]/total};
    
    const isNumeric = Object.keys(data).every(function (x) {return numReg.test(x)});
    var viewOptions = Object.keys(distributionViews);
    // Todo: numeric-only distribution views?
    
    // TODO: bin numeric (will need to update optionColorPalette as well)
    
    // build & populate the div
    var div = document.createElement("td");
        div.classList.add("distribution-view")
    
    // get color mapping
    var colors = new optionColorPalette(attribute);
    
    // create the selector
    // todo: only if multiple?
    var sel = document.createElement("select");
        sel.setAttribute("onchange", "swapView(this)");
        div.appendChild(sel);
    
    for (v of viewOptions) {
        var o = document.createElement("option");
            o.value = v;
            o.text = v;
            sel.appendChild(o);
        var svg = distributionViews[v]({"data":data, "por":portions, "colors":colors});
            svg.classList.add(v.replace(" ","-"));
        div.appendChild(svg); 
        
        var scr = document.createElement("script");
            scr.innerText = "applyPalette();" // TODO: trigger on update?
            svg.appendChild(scr);
        
    }
    // set up initial
    swapView(sel);
    
    var wrap = document.createElement("table");
        wrap.classList.add("distribution-view-wrapper");
        //wrap.appendChild(div);
    
    if (title != undefined) {
        var tr = document.createElement("tr");
            wrap.appendChild(tr);
        var titleblock = document.createElement("th");
            titleblock.innerText = title;
            titleblock.classList.add("title-block");
            
            tr.appendChild(titleblock);            
    }
    
    var tr = document.createElement("tr");
        wrap.appendChild(tr);
        tr.appendChild(div);
    
    
    if (legend) {
        if (titleblock) {
            titleblock.setAttribute("colspan", 2);
        }
        
        var td = document.createElement("td");
            td.appendChild(makeLegend(attribute, data));
            tr.appendChild(td);
            
    }
    
    return wrap;
}


/* Specific visualizations */
function verticalBars({data, por, colors}={}) {
    // create a vertical bar plot
    var width = 200;
    var height = 100;
    var spacing = 0.2; // portion of bar width for spacing
    var topPad = 0.4; //portion of the tallest bar
    var max = Math.max(...Object.values(data));
    var svg = svgElement("svg");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        //svg.setAttribute("width", width);
        //svg.setAttribute("height", height);
    
    var len = Object.keys(data).length
    var w = width/(len + spacing*(len +1))
    var s = spacing*w
    var h = height/(max*(1+topPad))

    // create bars 
    count = 0;
    
    
    for (let att in data) {
        var n = colors.get(att)
        
        var rect = svgElement("rect");
            rect.setAttribute("x", (s+w)*count + s);
            rect.setAttribute("y", height-(data[att]*h));
            rect.setAttribute("width", w);
            rect.setAttribute("height", (data[att]*h));
            rect.classList.add("apply-palette");
            rect.setAttribute("palette", n);
            rect.setAttribute("max", colors.length);
            rect.classList.add("dist-element");
            svg.appendChild(rect);
        var title = svgElement("title");
            title.textContent = `${att} ${(por[att]*100).toFixed(2)}%`; // 2 decimal places
            rect.appendChild(title);
        count++;
    }
    
    // make the bottom line
    var l = svgElement("line");
        l.setAttribute("x1", 0);
        l.setAttribute("x2", width);
        l.setAttribute("y1", height);
        l.setAttribute("y2", height);
        l.setAttribute("stroke", "black");
        l.setAttribute("stroke-width", 2);
        svg.appendChild(l);

    return svg;    
}





function pieChart({data, por, colors}={}) {
    // create a pie chart
    var rad = 40;
    var svg = svgElement("svg");
        var p = 1.3; // pad amount
        svg.setAttribute("viewBox", `${-rad*p}, ${-rad*p}, ${rad*p*2}, ${rad*p*2}` ); 
        
    var def = svgElement("defs");
    svg.appendChild(def);
    // todo
    var angle = -90;
    const N = 4; // number of points to use
    var count = 0; // used to track the index of the attribute value
    var center = [0,0]
    for (let att in data) {
        
        var a = 360* por[att];
        // create the clipping mask to make wedge
        var points = [center]
            
            for (i = 0; i <= N; i++) {
                points.push(getCoord(...center, rad*1.4, angle+(a/N)*i));
            }
            angle = angle + a;

        var clip = svgElement("clipPath");
            clip.setAttribute("id", `cp-${clipCount}`);
            
            def.appendChild(clip);
        var poly = svgElement("polygon")
            poly.setAttribute("points", points);
            clip.appendChild(poly);
        
        var n = colors.get(att);
        var c = svgElement("circle");
            c.setAttribute("cx", center[0]);
            c.setAttribute("cy", center[1]);
            c.setAttribute("r", rad);
            c.classList.add("dist-element");
            c.classList.add("apply-palette");
            c.setAttribute("palette", n);
            c.setAttribute("max", colors.length);
            c.setAttribute("clip-path", `url(#cp-${clipCount})`);
            
            svg.appendChild(c);
            
        var title = svgElement("title");
            title.textContent = `${att} ${(por[att]*100).toFixed(2)}%`; // 2 decimal places
            c.appendChild(title);
        clipCount++;
        count++;
    }  
    return svg;
}

function getCoord(x1, y1, len, angle) {
    var x = x1 + len*Math.cos(angle*Math.PI/180);
    var y = y1 + len*Math.sin(angle*Math.PI/180);
    return [x,y];
}

function svgElement(kind) {
    // create an svg element
    var e = document.createElementNS("http://www.w3.org/2000/svg",kind);
    if (kind == "svg") {
        
        e.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
    } 
    return e;
}









