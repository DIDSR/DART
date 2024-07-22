
/* || Utilities */

class Color {
    constructor(color) {
        // convert to rgb (if not already)
        const rgbRegex = /^rgb\((\d{1,3}),(\s{0,1})(\d{1,3}),(\s{0,1})(\d{1,3})\)/
        if (!rgbRegex.test(color)) { // either a namedcolor or a hex code 
            color = colorToRGB(color);
        }    
        this.color = color;
        [this.r, this.g, this.b] = this.color.replace("rgb(","").replace(")","").replace(" ","").split(",");
    }
}

function luminance(rgb) {
    // get the luminance of an rgb color
    if (typeof rgb === "string") {
        rgb = new Color(rgb);
    }
    var lum = (0.299*rgb.r) + (0.587*rgb.g) + (0.114*rgb.b);
        lum = lum / 255; // get on a 0-1 scale
    return lum;
}

function colorToRGB(color) {
    // create temp element -> set color
    var t = document.createElement("p");
        t.innerText = "color test";
        t.style.color = color;
        document.body.appendChild(t)
    // get the rgb value
    let rgbValue = window.getComputedStyle(t).color;
    // remove the temp element
    document.body.removeChild(t);
    return rgbValue;
}

/**
 * makes a categorical color palette
 * @constructor
 */
function makeColorPalette(colors, values) {
    const CM = new ContinuousColorMap(colors, 0, 1);
    var palette = {};
    for (var i in values) {
        palette[values[i]] = CM.getCat(i, values.length);
    }
    return palette;
}


class ContinuousColorMap {
    constructor(input_colors, minValue=0, maxValue=1) {
        this.minValue = minValue;
        this.maxValue = maxValue;
        if (typeof input_colors == "string") {
            input_colors = input_colors.split(", ");
        }
        this.input = input_colors;
        this.colors = []
        this.placements = []
        for (var ii = 0; ii < input_colors.length; ii++) {
            var color = input_colors[ii];
            if (color.indexOf("%") > -1) {
                // placement value(s) were given
                var placements = color.split(" ");
                    placements = placements.filter(function(x) {return x.indexOf("%") > -1});
                var color = color.split(" ");
                    color = color.filter(function(x) {return !(x.indexOf("%") > -1)}).join(" ");
                
                for (var n = 0; n < placements.length; n++) {
                    this.placements.push(placements[n]);
                    this.colors.push(color)
                }
            } else {
                // no placement value
                var placement = `${(ii / (input_colors.length - 1))*100}%`;
                this.placements.push(placement)
                this.colors.push(color);
            }
        }
        
        // ensure that we have a 0% and 100% value
        if (this.placements.indexOf("0%") <= -1) {
            this.colors.unshift(this.colors[0]);
            this.placements.unshift("0%");
        }
        
        if (this.placements.indexOf("100%") <= -1) {
            this.colors.push(this.colors[this.colors.length-1]);
            this.placements.push("100%");
        }
        
        this.placements = this.placements.map( function(x) {
            x = x.replace("%","");
            return Number(x)/100;
        });      
    }
    
    getColor(value) {
        // clip the color into the accepted range
        value = Math.max(value, this.minValue);
        value = Math.min(value, this.maxValue);
        // get the lower and upper bounds
        var lower = this.placements.filter( function(x) { return x <= value });
            lower = Math.max(...lower);
        var c1 =  new Color(this.colors[this.placements.indexOf(lower)]);
        var upper = this.placements.filter( function(x) { return x >= value });
            upper = Math.min(...upper);
        var c2 = new Color(this.colors[this.placements.indexOf(upper)]);
        // get the weights of each from the portion of way between
        var w2 = (value - lower) / (upper - lower) || 0;
        var w1 = 1 - w2;
        // interpolate the colors
        var r = (c1.r*w1) + (c2.r*w2);
        var g = (c1.g*w1) + (c2.g*w2);
        var b = (c1.b*w1) + (c2.b*w2);
        return `rgb(${r}, ${g}, ${b})`
    }
    
    getCat(value, max=0) {
        // get a categorical value
        max = Math.max(max, this.input.length);
        return this.getColor(value/(max-1));
    }
}

/* || Color Palette / Maps application and management */


/*
 * Sets up color sets for each of the dataset attributes
 */
function configureColorSets() {
    const config = JSON.parse(sessionStorage.getItem("database_attribute_configuration"));
    const colors = getComputedStyle(document.documentElement).getPropertyValue("--current-cat-colors");
    var colorSets = {};
    for (var att in config) {
        const cp = makeColorPalette(colors, config[att]["values"]);
        colorSets[att] = cp;
    }
    // Create a dummy set for the settings menu preview
    // create a dummy color set
    const c = document.getElementById("categorical-color-preview-count") 
    if (c) {
        colorSets["_color_preview_set"] = makeColorPalette(colors, [...Array(Number(c.value)).keys()]);
    }
    sessionStorage.setItem("attribute_color_sets", JSON.stringify(colorSets));
}


/*
 * Applies colormap/color sets to all indicated elements
 */
function applyColorPalette() {
    // get all indicated elements
    const elements = document.querySelectorAll("[colormapped]");
    const colorSets = JSON.parse(sessionStorage.getItem("attribute_color_sets"));
    const CM = new ContinuousColorMap(getComputedStyle(document.documentElement).getPropertyValue("--current-cont-colors"));
    for (var e of elements) {
        var color = null;
        if (e.hasAttribute("color-set")) {
            // applying a categorical palette
            const csName = e.getAttribute("color-set");
            if (!(colorSets[csName])) {
                console.warn("No color set with the name:", csName);
                continue;
            }
            color = colorSets[csName][e.getAttribute("color-value")];
        } else {
            // applying a continuous palette
            color = CM.getColor(e.getAttribute("color-value"));
        }
        if (e instanceof SVGElement) {
            // update fill colors of svg elements
            e.setAttribute("fill", color);
        } else {
            // update background color of html elements
            e.style.backgroundColor = color;
            if (luminance(color) < 0.5) { // TODO: luminance threshold
                e.style.color = "white";
            } else {
                e.style.color = "black";
            }
        }
        
    }
}

