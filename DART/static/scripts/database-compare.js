
/* Build page sections */

function buildCriteriaSection(div_id, attribute_information) { // remove when replaced
    var root = document.getElementById(div_id);
    var gId = div_id.split("-"); // group ID
    var gId = gId[gId.length-1];
    var i = 0;
    for (let att in attribute_information) {
        // div to hold related elements
        var cb = document.createElement("input");
        cb.setAttribute("type", "checkbox");
        cb.setAttribute("name", `${gId}-attribute`);
        cb.setAttribute("id", "attribute");
        cb.setAttribute("value", att);
        cb.setAttribute("onChange", "toggleAttributeCriteria(this)");
        var label = document.createElement("label")
        label.setAttribute("for", "attribute");
        label.innerText = attribute_information[att]["display-name"];
        root.appendChild(cb);
        root.appendChild(label);
        root.appendChild(document.createElement("br"));
        // add a hidden element w/ the attribute type (used in processing the filter inputs)
        var h = document.createElement("input");
        h.setAttribute("type","hidden");
        h.setAttribute("name", `${gId}-${att}-type`);
        h.setAttribute("value", attribute_information[att]["type"]);
        root.appendChild(h);
        // create the criteria div (hidden by default)
        var d = document.createElement("div");
        d.classList.add("attribute-criteria");
        d.setAttribute("name", att);
        d.classList.add("hidden");
        root.appendChild(d);
        // add the options
        if (attribute_information[att]["type"] == "categorical") {
            for (let i in attribute_information[att]["options"]) {
                var o = attribute_information[att]["options"][i];
                var cb = document.createElement("input");
                cb.setAttribute("type", "checkbox");
                cb.setAttribute("name", `${gId}-${att}`);
                cb.setAttribute("id", `${att}`);
                cb.setAttribute("value", o);
                var label = document.createElement("label");
                label.setAttribute("for", `${att}`);
                label.innerText = o; // TODO: support display names for categorical options
                d.appendChild(cb);
                d.appendChild(label);
                d.appendChild(document.createElement("br"));
            }
        } else if (attribute_information[att]["type"] == "numeric") {
            d.appendChild(makeSelector(["<",">","=","<=",">=","!="], "comp", `${gId}-${att}-comp-0`));
            var num = document.createElement("input");
            num.setAttribute("type","number");
            num.setAttribute("name", `${gId}-${att}-val-0`);
            num.setAttribute("min", attribute_information[att]["min"]);
            num.setAttribute("max",attribute_information[att]["max"]);
            num.setAttribute("step", attribute_information[att]["step"]);
            d.appendChild(num);
            var add = document.createElement("button");
            add.setAttribute("type", "button");
            add.setAttribute("onclick", "addNumericOption(this)");
            add.innerText = "+" // TODO (?) better text?
            d.appendChild(add);
        } else {
            d.innerText = `Unrecognized attribute type ${attribute_information[att]["type"]}`;
        }
        i++;
    }
}


function toggleAttributeCriteria(checkbox) {
    // show/hide attribute criteria based on checkbox
    var att = checkbox.getAttribute("value");
    root = checkbox.parentElement;
    // find the criteria div
    for (i = 0; i < root.children.length; i++) {
        if (root.children[i].classList.contains("attribute-criteria") && root.children[i].getAttribute("name") == att ) {
            var div = root.children[i];
        }
    }
    toggleClass(div, "hidden");
}

function addNumericOption(addButton) {
    var div = addButton.parentElement;
    // remove add button temporarily
    div.removeChild(addButton);
    // get the number of filters already applied (and the id of the current)
    var n = div.lastChild.getAttribute("name").split("-");
    var att = n[1];
    var gId = n[0];
    var n = n[n.length-1];
    var id = n;
    id ++;
    // add linebreak and create AND/OR option
    var br = document.createElement("br");
    br.setAttribute("name", `${att}-br-${id}`);
    div.appendChild(br);
    div.appendChild(makeSelector(["and", "or"], "and-or", `${gId}-${att}-join-${id}`));
    // create copies of options
    var c = div.children[0].cloneNode(true);
    var name = c.getAttribute("name").split("-");
    name[name.length-1] = id;
    var name = name.join("-");
    c.setAttribute("name", name);
    var num = div.children[1].cloneNode(true);
    num.value = "";
    var name = num.getAttribute("name").split("-");
    name[name.length-1] = id;
    var name = name.join("-");
    num.setAttribute("name", name);
    div.appendChild(c);
    div.appendChild(num);
    // add a remove button
    var rm = document.createElement("button");
    rm.setAttribute("type", "button");
    rm.setAttribute("name", `${att}-${id}`);
    rm.innerText = "-" // TODO (?) better text?
    rm.setAttribute("onclick", "removeNumericOption(this)");
    div.appendChild(rm);
    // replace add button
    div.appendChild(addButton);
}

function removeNumericOption(rmButton) {
    var div = rmButton.parentElement;
    var id = rmButton.getAttribute("name").split("-");
    var id = id[id.length-1];
    for (i = div.children.length - 1; i >= 0; i--) {
        var nm = div.children[i].getAttribute("name");
        if (!nm) {
            continue
        }
        var nm = nm.split("-");
        var nm = nm[nm.length-1];
        if (nm == id) {
            div.removeChild(div.children[i]);
        }
    }
}

var uniqueCounter = 0; // used when to construct elements with arbitrary unique ids

function createSimilaritySection(info, title, data1, data2) { 
    var div = document.createElement("div");
        div.classList.add("similarity-group");
        
    if (title) {
        var h = document.createElement("h2");
            h.innerText = title;
            div.appendChild(h);
    }
    
    for (let label in info) { // TODO: use display names
        var s = document.createElement("div");
            s.classList.add("colormapped");
            s.setAttribute("colormap-value", info[label]);
            div.appendChild(s);
            
        if (data1 != undefined & data2 != undefined) {
            var distComp = document.createElement("div")
                distComp.classList.add("distribution-comparison");
                distComp.classList.add("hidden");
                distComp.setAttribute("id", `id-${uniqueCounter}`);
                div.appendChild(distComp);
            s.setAttribute("target",`id-${uniqueCounter}`); 
                s.setAttribute("onclick", "toggleCollapse(this)");
                s.appendChild(collapseIcon());
                s.classList.add("collapsed");
            var t = document.createElement("span");
                t.innerText = `${label}: ${info[label].toFixed(2)}`; // sets to 2 decimal places
                s.appendChild(t);
            uniqueCounter++;
            // create the distribution plots
            var distView = createDistributionView(label, data1['distribution'][label], data1['subgroup'].join(", "));
                distComp.appendChild(distView);
            var distView = createDistributionView(label, data2['distribution'][label], data2['subgroup'].join(", "));
                distComp.appendChild(distView);
        } else {
            s.innerText = `${label}: ${info[label].toFixed(2)}`; // sets to 2 decimal places
        }
    } 
    
    return div;
}

function buildAdditionalQueryOptions(div_id, attribute_information) {
    var root = document.getElementById(div_id);
    
    // consider inherent or not
    // TODO: automatically remove inherent attributes from list if checked
    var cb = document.createElement("input");
    cb.setAttribute("type", "checkbox");
    cb.setAttribute("name", "ignore-inherent");
    cb.setAttribute("id", "ignore-inherent");
    cb.value = "ignore-inherent";
    cb.checked = true;
    root.appendChild(cb);
    var label = document.createElement("label")
    label.setAttribute("for","ignore-inherent");
    label.innerText = "ignore inherent attributes" // TODO (?) terminology
    root.appendChild(label);
    root.appendChild(document.createElement("br"))
    
    // select which attributes are considered during similarity calculations
    var div = document.createElement("div");
    div.setAttribute("id", "similarity-attribute-selection");
    root.appendChild(div)
    var label = document.createElement("span");
    label.innerText = "Attributes considered during similarity calculation:"
    root.appendChild(label);
    // TODO: select all / clear selection options
    root.appendChild(document.createElement("br"))
    for (let att in attribute_information) {
        var cb = document.createElement("input");
        cb.setAttribute("type", "checkbox");
        cb.setAttribute("name", "consider");
        cb.setAttribute("id","consider");
        cb.checked = true;
        cb.value = att
        root.appendChild(cb)
        var label = document.createElement("label");
        label.setAttribute("for", "consider");
        label.innerText = attribute_information[att]["display-name"];
        root.appendChild(label);
        root.appendChild(document.createElement("br"))
    }
    
}

async function showComparisonSimilarity() {
    var status_info = await getStatus();
    var status = status_info["status"];
    var info = status_info["comparison"];
    var div = document.getElementById("comparison-status-tracker");
    
    var sim = info["output"];
    var h = document.createElement("h1");
        h.innerText = "Similarity";
        div.append(h);
    
    
    // overall
    var d = createSimilaritySection({"overall": sim["overall"]});
        div.appendChild(d);
    // specific attributes
    var sSim = sim;
    delete sSim["overall"]
    var sub1 = info["subgroup 1"];
    var sub2 = info["subgroup 2"];

    var d = createSimilaritySection(sSim, "Similarity breakdown", sub1, sub2);
        div.appendChild(d);
    
    // update colormaps
    fireCustomEvent("update-cmap");
}


function makeSelector(options, _class, name) {
    // make a form selector with the provided options
    var s = document.createElement("select")
    s.classList.add(_class);
    s.setAttribute("name", name);
    for (let text in options) {
        var o = document.createElement("option");
        o.value = options[text];
        if (isArray(options)) {
            o.text = options[text];
        } else {
            o.text = text;
        }
        s.appendChild(o);
    }
    return s
}