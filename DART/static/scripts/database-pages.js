/* Configuration Window functions */
function switchTab(name) {
    var element = document.getElementById(`${name}-config-menu`);
    var root = element.parentElement;
    // set all to inactive
    for (i = 0; i < root.children.length; i++) {
        if (!root.children[i].classList.contains("inactive")) {
            root.children[i].classList.add("inactive");
        }
    }
    // set correct to active
    element.classList.remove("inactive");
    
    // deal with the buttons too
    var element = document.getElementById(`${name}-config-button`);
    var root = document.getElementById("config-submenu-bar");
    // set all to inactive
    for (i = 0; i < root.children.length; i++) {
        if (!root.children[i].classList.contains("inactive")) {
            root.children[i].classList.add("inactive");
        }
    }
    // set correct to active
    element.classList.remove("inactive");
}

function updateConfigWindow() {
    // update theme options
    var themes = getThemes();
    var s = document.getElementById("theme-selection");
    
    // remove any existing options
    clearChildren(s);
    // add the options
    for (let name in themes) {
        var o = document.createElement("option");
            o.text = name;
            o.value = name;
            s.appendChild(o);
    }
    // set the default to the current theme
    var current = localStorage.getItem("theme");
        s.value = current;
    updateTheme()
    
    // update cmap+ cpal options
    var colors = getColors();
    var s1 = document.getElementById("cmap-selection");
    var s2 = document.getElementById("cpal-selection");
    
    for (colr in colors) {
        var o = document.createElement("option");
            o.text = colr;
            o.value = colr;
            s1.appendChild(o);
            o = o.cloneNode(true);
            s2.appendChild(o);
    }
    // set the default to the current
    s2.value = localStorage.getItem("palette");
    s1.value = localStorage.getItem("colormap");
}


function colorPreview(type) {
    if (type == "cmap") {
        var s = document.getElementById("cmap-selection");
        var div = document.getElementById("cmap-preview");
    } else if (type == "cpal") {
        var s = document.getElementById("cpal-selection");
        var div = document.getElementById("cpal-preview");
        var n = document.getElementById("cpal-count").value;
    }
    // same for both map/palette
    var cName = s.value;
    //var current = localStorage.getItem("colormap");
    var style = getComputedStyle(document.body).getPropertyValue(`--colormap-${cName}`);
    clearChildren(div);
    
    if (type == "cmap") {
        updateColorMap(cName); // set the colormap
        var cb = document.createElement("div");
        cb.setAttribute("id", "cmap-preview-colorbar");
        cb.classList.add("color-preview");
        cb.style.background = `linear-gradient(${style})`;
        cb.style.height = "200px";
        cb.style.width = "50px";
        div.append(cb);
    } else if (type == "cpal") {
        updateColorPalette(cName); // set the palette
        var colors = new ColorMap(style);
        for (i = 0 ; i < n ; i++) {
            var c = colors.getCat(i,n);
            var b = document.createElement("div");
                b.classList.add("color-preview");
                b.style.backgroundColor = c;
                b.style.width = "50px";
                b.style.height = `${200/n}px`;
                div.append(b);
        }
    }
}

function getThemes() {
    var ss = document.styleSheets;
    for (i=0; i<ss.length; i++) {
        if (ss[i].title == "themes") {
            var themefile = ss[i];
        }
    }
    
    var themes = themefile.rules;
    var themeNames = {};
    for (i=0; i<themes.length; i++) {
        themeNames[themes[i].selectorText.replace(".","")] = themes[i];    
    }
    return themeNames;
    
}

function getColors() {
    // get all of the colormaps
    var style = window.getComputedStyle(document.body);
    var c = Object.values(style).filter(function(x) {return x.startsWith("--colormap")});
    var cNames = {}
    for (color of c) {
        cNames[color.replace("--colormap-","")] = color;
    }
    return cNames;
}

function updateTheme() {
    // update theme from the config window
    var s = document.getElementById("theme-selection");
    var themeName = s.value;
    var themes = getThemes();
    var colors = themes[themeName].style;
    var div = document.getElementById("theme-preview");
    clearChildren(div);
    for (i = 0; i < colors.length; i ++) {
        var name = colors[i];
        var color = colors.getPropertyValue(name);
        var d = document.createElement("div");
            div.appendChild(d);
        var s = document.createElement("span");
            s.innerText = ltrim(name,"-");
            s.classList.add("theme-color-name");
            d.appendChild(s);
        var cb = document.createElement("span");
            cb.classList.add("theme-color-preview");
            cb.style.backgroundColor = color;
            d.appendChild(cb);
            //div.appendChild(document.createElement("br"));
    }
    setTheme(themeName);
    
}



/* Progress and Status tracking */

function updateStatusBar(status, progress) {
    // update the status bar
    if (status != "running") {
        status = "idle";
    }
    var statusBar = document.getElementById("status-bar");
        statusBar.setAttribute("status", status);
    var text = document.getElementById("status-indicator-text");
        text.innerText = status;
    // update the progress bar (/100)
    if (status == "running") {
        var pb = document.getElementById("progress-bar");
            pb.value = progress
        
        var pbText = document.getElementById("progress-text");
            pbText.innerText = `${Math.round(progress)}%`
    }

}    

async function getStatus(status) {
    const res = await fetch("/status");
    stat = await res.json();
    if (status) {
        stat = stat[status];
    } 
    return stat
}


const loadableSectionsByProgram = {
    "explore": {
        //"subgroups":"subgroups", // Commented out until it's determined if this section is needed
        "similarity":"similarity",
    },
    "compare": ["results"],
}

async function monitorJobProgress(program, update_every=1000) { 
    var status = await getStatus("status");
    var progress = await getStatus("progress");
        updateStatusBar(status, progress); 
    console.log(`Current status of page ${program}: ${status}`);
    if (status === undefined) {// No job running or complete
        return;
    }
    var debug = await getStatus();
    var statusInfo = await getStatus(program);  
    // determine what sections need to be created/loaded/updated
    var sectionsToLoad = [];
    if (program == "explore") { // TODO: see if it works with the compare format
        for (key in loadableSectionsByProgram[program]) {
            var infoNeeded = loadableSectionsByProgram[program][key];
            if (statusInfo[infoNeeded]) { sectionsToLoad.push(key) };
        }  
    } else { // compare format
        var sectionsToLoad = loadableSectionsByProgram[program];
    }
    
    //// load needed sections
    console.log("loading needed sections..."); //
    for (section of sectionsToLoad) {
        console.log("loading:", section); //
        if (program == "explore") { // TODO: see if I can convert to work with the compare format
            loadSection(section, statusInfo[loadableSectionsByProgram[program][section]]);
        } else { // compare format
            loadSection(section, statusInfo);
        }
    }
    
    // continue to check status if program still running
    if (status == "running") {
        timeout = setTimeout(monitorJobProgress, update_every, program, update_every);
    }
    
}
