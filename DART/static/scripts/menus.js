


function showMenu(menuName) {
    const MenuInitializationFunctions = {
        "settings" : initSettingsMenu,
    }
    const m = document.getElementById(`${menuName}-menu`);
    
    if (!m) {
        console.error("Could not find a menu with the id:", `${menuName}-menu`);
        return;
    }
    if (MenuInitializationFunctions[menuName]) {
        MenuInitializationFunctions[menuName]();
    }
    m.toggleAttribute("hidden", false);
    const h = document.getElementById("menu-haze");
    h.toggleAttribute("hidden", false);
}

function closeMenu(menuName) {
    const m = document.getElementById(`${menuName}-menu`);
    if (!m) {
        console.error("Could not find a menu with the id:", `${menuName}-menu`);
        return;
    }
    m.toggleAttribute("hidden", true);
    const h = document.getElementById("menu-haze");
    h.toggleAttribute("hidden", true);
}

function switchMenuPage(element, menuName, pageName) {
    if (element.hasAttribute("active-selection")) {
        return; // already active
    }
    const m = document.getElementById(`${menuName}-menu`);
    const p = m.querySelector(`#${pageName}-page`);
    if (!p) {
        console.error("Could not find a page with the id:", `${pageName}-menu`, "in the menu:", menuName);
        return;
    }
    const a = m.querySelector(".menu-select[active-selection]");
    if (a) {
        a.toggleAttribute("active-selection", false);
    }
    element.toggleAttribute("active-selection", true);
    const shown = m.querySelectorAll(".menu-page:not([hidden])");
    for (var s of shown) {
        s.toggleAttribute("hidden", true);
    }    
    p.toggleAttribute("hidden", false);
}




/* || Specific Menu Functionalities */
function initSettingsMenu() {
    setCategoricalOptions();
    const toBeSet = {"categorical":"cat","continuous":"cont"};
    const colors = getColorOptions();

    for (const which in toBeSet) {
        const sel = document.getElementById(`${which}-color-selection`).querySelector("select");
        for (var c in colors) {
            if (!sel.querySelector(`[value=${c}]`)) {
                const o = document.createElement("option");
                o.value = c;
                o.innerText = c;
                sel.appendChild(o);
            }
        }
        // get current and set as value
        var current = getComputedStyle(document.documentElement).getPropertyValue(`--current-${toBeSet[which]}-colors`);
        current = Object.keys(colors)[Object.values(colors).indexOf(current)];
        sel.value = current;
    }
    
}

function getColorOptions() {
    const style = getComputedStyle(document.documentElement);
    const colors = [...style].filter( x => x.startsWith("--colors"));
    return Object.fromEntries(colors.map( x => [x.replace("--colors-",""),style.getPropertyValue(x)]));
}

function setCategoricalOptions() {
    const c = document.getElementById("categorical-color-preview-count");
    const p = document.getElementById("categorical-color-preview");
    // clear previous
    while (p.children.length > 0) {
        p.removeChild(p.lastChild);
    }
    // create a dummy color set
    const colors = getComputedStyle(document.documentElement).getPropertyValue("--current-cat-colors");
    var colorSets = JSON.parse(sessionStorage.getItem("attribute_color_sets")) || {};
    colorSets["_color_preview_set"] = makeColorPalette(colors, [...Array(Number(c.value)).keys()]);
    sessionStorage.setItem("attribute_color_sets", JSON.stringify(colorSets));
    // add preview holders
    for (var ii = 0; ii < c.value; ii++) {
        const o = document.createElement("span");
        o.setAttribute("color-set","_color_preview_set");
        o.setAttribute("color-value", ii);
        o.toggleAttribute("colormapped");
        p.appendChild(o);
    }
    applyColorPalette();
}



function changeColorPalette(which, palette) {
    if (palette instanceof HTMLElement) {
        palette = palette.value;
    }
    if (!palette.startsWith("--colors-")) {
        palette = `--colors-${palette}`;
    }
    const style = getComputedStyle(document.documentElement);
    const colors = [...style].filter( x => x.startsWith("--colors"));
    if (!colors.includes(palette)) {
        console.error("Unrecognized color palette:", palette);
        return;
    }
    var nm = ""
    if (which == 'categorical') {
        nm = 'cat';
    } else if (which == "continuous") {
        nm = "cont";
    }
    document.documentElement.style.setProperty(`--current-${nm}-colors`, `var(${palette})`);    
    if (which == 'categorical') {
        configureColorSets();
    } 
    applyColorPalette();  
}




function toggleColorPreviewOutlines(element) {
    const tog = element.querySelector(".toggle");
    tog.toggleAttribute("on");
    const prev = element.parentElement.parentElement.querySelector(".color-preview");
    prev.toggleAttribute("outlined");
}