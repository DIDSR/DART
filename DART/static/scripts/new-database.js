// Database creation functions

function buildDatabaseCreationSection(info) {
    var form = document.getElementById("database-creation-form");
    // Database name
    var l = document.createElement("label");
    l.setAttribute("for", "database-name");
    l.innerText = "Database name: ";
    form.appendChild(l);
    var t = document.createElement("input");
    t.setAttribute("type", "text");
    t.setAttribute("name", "database-name");
    t.setAttribute("id", "database-name");
    form.appendChild(t);
    form.appendChild(document.createElement("br"));
    // ID column selector
    var s = document.createElement("select");
    s.setAttribute("id", "id-col");
    s.setAttribute("name", "id-col");
    s.setAttribute("onchange", "updateColumnOptions(this)")
    var l = document.createElement("label");
    l.setAttribute("for", "id-col");
    l.innerText = "ID column: ";
    form.appendChild(l);
    form.appendChild(s);
    var o = document.createElement("option");
    o.value = "None";
    o.text = "None";
    s.appendChild(o);
    
    for (let col in info) {
        var o = document.createElement("option");
        o.value = col;
        o.text = col;
        s.appendChild(o);
        
    }
    // attribute selection options
    for (let col in info) {
        var span = document.createElement("div"); // TODO: change confusing variable name
        //span.appendChild(document.createElement("br"));
        form.appendChild(span);
        span.classList.add("attribute-column-selector");
        span.setAttribute("id", `${col}-group`);
        var cb = document.createElement("input");
        cb.setAttribute("type", "checkbox");
        cb.value = col;
        cb.setAttribute("name", "attribute-column");
        cb.setAttribute("id", `column-${col}`);
        cb.setAttribute("onclick", "toggleColumnConfig(this)");
        cb.checked = true;
        span.appendChild(cb);
        var l = document.createElement("label");
        l.setAttribute("for", "attribute-column");
        l.innerText = col;
        span.appendChild(l);
        var d = document.createElement("span");
        d.setAttribute("id", `column-${col}-config`);
        span.appendChild(d);
        var s = document.createElement("select");
        s.setAttribute("name", `column-${col}-type`);
        s.setAttribute("id", `column-${col}-type`);
        s.setAttribute("onchange", `populationConfigDetails(this, ${JSON.stringify(info)})`);
        d.appendChild(s);
        
        if (!info[col].every(i => typeof i === "string")) { // can only be numeric if all provided options are numbers
            var o = document.createElement("option");
            o.value = "numeric"
            o.text = "Numeric Variable"
            s.appendChild(o)  
        }
        var o = document.createElement("option"); // can always be categorical
        o.value = "categorical"
        o.text = "Categorical Variable"
        s.appendChild(o)     
        var b = document.createElement("button");
        b.setAttribute("type", "button");
        b.innerText = "show details";
        b.setAttribute("onclick", "toggleColumnConfigDetails(this)");
        d.appendChild(b);
        var d = document.createElement("div");
        d.setAttribute("id", `column-${col}-details`);
        d.classList.add("attribute-configuration-details");
        d.classList.add("hidden");
        span.appendChild(d);
        populationConfigDetails(s, info) // initial config
    }
}

function updateColumnOptions(id_col_selector) {
    var col = id_col_selector.value;    
    var options = document.getElementsByClassName("attribute-column-selector");
    for (i = 0; i < options.length; i++) {
        var id = options[i].getAttribute("id");
        id = id.split("-");
        id = id.slice(0,id.length-1).join("-");
        if (id == col) {
            options[i].classList.add("hidden");
        } else if (options[i].classList.contains("hidden")) {
            options[i].classList.remove("hidden");
        }       
    }
}

function populationConfigDetails(selectElement, info) {
    var col = selectElement.getAttribute("id").split("-");
    col = col.slice(1, col.length-1).join("-");
    var div = document.getElementById(`column-${col}-details`);
    // clear existing children
    for (i = div.children.length - 1; i >= 0; i--) {
        div.removeChild(div.children[i]);
    }
    // add configuration details / options
    if (selectElement.value == "categorical") {
        var h = document.createElement("p");
        h.innerText = "Values:"
        div.append(h);
        for (i = 0; i < info[col].length; i++) {
            var cb = document.createElement("input");
            cb.setAttribute("type", "checkbox")
            cb.setAttribute("id", `column-${col}-option`);
            cb.setAttribute("name", `column-${col}-option`);
            cb.value = info[col][i];
            cb.checked = true;
            div.appendChild(cb);
            var l = document.createElement("label");
            l.innerText = info[col][i];
            l.setAttribute("for", `column-${col}-option`);
            div.appendChild(l);
            div.appendChild(document.createElement("br"));            
        }
    } else if (selectElement.value == "numeric") {
        var items = {"min":"Minimum", "max":"Maximum", "step":"Step", "bin":"Bin size"};
        for (let x in items) {
            var n = document.createElement("input");
            n.setAttribute("type", "number");
            n.setAttribute("name", `column-${col}-${x}`);
            n.setAttribute("id", `column-${col}-${x}`);            
            if (x == "min") {
                n.value = Math.min(...info[col]);
            } else if (x == "max") {
                n.value = Math.max(...info[col]);
            } // TODO: set default values for step and bin
            var l = document.createElement("label");
            l.innerText = `${items[x]}: `;
            l.setAttribute("for", `column-${col}-${x}`);
            div.appendChild(l);
            div.appendChild(n);
            div.appendChild(document.createElement("br")); 
        }
    }
}

function toggleColumnConfigDetails(configButton) {
    var d = configButton.parentElement.getAttribute("id").split("-");
    var col = d.slice(1,d.length-1).join("-");
    var c = document.getElementById(`column-${col}-details`);
    if (c.classList.contains("hidden")) {
        c.classList.remove("hidden");
        configButton.innerText = "hide details"
    } else {
        c.classList.add("hidden");
        configButton.innerText = "show details"
    }
}

function toggleColumnConfig(cb) {
    var id = cb.getAttribute("id");
    var d = document.getElementById(`${id}-config`);
    if (!cb.checked && !d.classList.contains("hidden")) {
        d.classList.add("hidden");
    } else if (cb.checked && d.classList.contains("hidden")) {
        d.classList.remove("hidden");
    }
}



