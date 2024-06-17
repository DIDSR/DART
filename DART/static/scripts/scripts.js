


function isEmpty(element) { // TODO: move to scripts.py
    return element.childNodes.length < 1;
}

function initPage() {
    // set the theme
    var themeName = localStorage.getItem("theme");
    if (!themeName) { // no theme set
        var themeName = "default";
    }
    setTheme(themeName);
    
    // set the active page (while in database)
    var path = window.location.pathname;
    markActivePage(path);
    
    // create an event listener to update colormaps
    document.body.addEventListener("update-cmap", event => {
        applyColormap();
    });
    
    // set the colormap
    var cmap = localStorage.getItem("colormap");
    if (!cmap) { // no colormap set
        var cmap = "red-blue" // TODO: default
    }
    updateColorMap(cmap);
    // set the categorical color palette
    
    var cpal = localStorage.getItem("palette");
    if (!cpal) { // no palette set
        var cpal = "red-yellow-green-blue"; // TODO default
    }
    updateColorPalette(cpal);
}



/* show/hide sections by id */
function toggleShow(id) {
    var element = document.getElementById(id);
    if (element.classList.contains("hidden")) {
        element.classList.remove("hidden");
    } else {
        element.classList.add("hidden");
    }
}

/* Collapsible sections */
function toggleCollapse(element, onOpen, args) {    
    var target = document.getElementById(element.getAttribute("target"));
    if (element.classList.contains("collapsed")) {
        element.classList.remove("collapsed");
        target.classList.remove("hidden");
        if (onOpen) { // (optional) trigger function on opening a collapsed section
            onOpen(...args);        
        }
    } else {
        element.classList.add("collapsed");
        target.classList.add("hidden");
    }
}

function collapseIcon() {
    var icon = document.createElement("i");
        icon.classList.add("collapse-icon");
        icon.classList.add("material-icons");
        icon.innerText = "chevron_right";
    return icon;
}



/* Theme / Color management (broad applications) */

function setTheme(themeName) {
    localStorage.setItem("theme", themeName); // localStorage persists between sessions (sessionStorage does not)
    document.documentElement.className = themeName;
}

function updateColorMap(cmapName) {
    let root = document.documentElement;
        root.style.setProperty("--current-colormap", `var(--colormap-${cmapName}`);
    localStorage.setItem("colormap", cmapName);   
    fireCustomEvent("update-cmap");  
}

function updateColorPalette(cmapName) {
    let root = document.documentElement;
        root.style.setProperty("--current-palette", `var(--colormap-${cmapName}`);
    localStorage.setItem("palette", cmapName);    
}

/* Page management */

function markActivePage(pageName) {
    // update the buttons on the database config bar to indicate which page the user is on
    const elements = {
        "details": document.getElementById("navigate-details-button"),
        "compare": document.getElementById("navigate-compare-button"),
        "explore": document.getElementById("navigate-explore-button"),
    };
    if (pageName.includes("database")) {
        for (let p in elements) { // set all to inactive
            if (elements[p].classList.contains("active")) {
                elements[p].classList.toggle("active");
            }
        }
        var page = pageName.split("/").pop();
        elements[page].classList.toggle("active"); // set current to active
    }
}

/* Event Management */


function fireCustomEvent(name) {
    if (!name) {
        name = "customevent";
    }
    //console.log("the custom event: ", name, " was fired!");
    const e = new CustomEvent(name);
    document.body.dispatchEvent(e);
}

/* General Utilities */
function clearChildren(element) {
    // remove all children from an element
    for (i = element.children.length-1; i>=0; i--) {
        element.removeChild(element.children[i]);
    }
}    

function rtrim(x, characters) {
    var start = 0;
    var end = x.length - 1;
    while (characters.indexOf(x[end]) >= 0) {
    end -= 1;
    }
    return x.substr(0, end + 1);
}

function ltrim(x, characters) {
    var start = 0;
    while (characters.indexOf(x[start]) >= 0) {
    start += 1;
    }
    var end = x.length - 1;
    return x.substr(start);
}

function resetStorage() {
    // Reset local and session storage, trigger a page refresh
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
}

function toStorage(key, object, storage="session") {
    if (storage == "session") {
        sessionStorage[key] = JSON.stringify(object);
    }

}

function fromStorage(key, storage="session") {
    if (storage == "session") {
        if (!sessionStorage[key]) {
            var item = undefined;
        } else {
            var item = JSON.parse(sessionStorage[key]);
        }
    }
    return item;
}

function isArray(a) {
    return Object.prototype.toString.apply(a) == '[object Array]';
}

function toggleClass(element, cls) {
    if (typeof element == "string") {
        element = document.getElementById(element);
    }
    if (element.classList.contains(cls)) {
        element.classList.remove(cls);
    } else {
        element.classList.add(cls);
    }
}



/* Create toggle elements */

function createToggle(checkbox, activeText, inactiveText, textSide="left") {
    // creates an interactive toggle
    var tog = document.createElement("label");
        tog.classList.add("toggle");
    var aText = document.createElement("span");
        aText.classList.add("active-text");
        if (activeText) {
            aText.innerText = activeText;
        }
    var iText = document.createElement("span");
        iText.classList.add("inactive-text");
        if (inactiveText) {
            iText.innerText = inactiveText;
        }
    var l = document.createElement("i");
        l.classList.add("material-icons");
        l.classList.add("icon");
        
    if (textSide == "left") { // add text before toggle
        tog.appendChild(aText);
        tog.appendChild(iText);
    }
        tog.appendChild(checkbox);
        tog.appendChild(l);
        
    if (textSide == "right") {
        tog.appendChild(aText);
        tog.appendChild(iText);
    }
    return tog;
}







