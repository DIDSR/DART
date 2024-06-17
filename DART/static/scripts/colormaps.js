

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

function applyColormap() {
    var elements = document.getElementsByClassName("colormapped");
    for (i = 0; i < elements.length; i++) {
        var elem = elements[i];
        var cmap = getComputedStyle(elem).getPropertyValue("--current-colormap");
        var colors = cmap.split(", ");
        var colormap = new ColorMap(colors);
        var color = colormap.getColor(elem.getAttribute("colormap-value"));
        elem.style.backgroundColor = color; // TODO: set any other style?
        // calcluate color brightness -> set color to have enough contrast
        var lum = luminance(color);
        // todo: see if the threshold is good
        if (lum < 0.5) {
            elem.style.color = "white";
        } else {
            elem.style.color = "black";
        }
    } 
}

function applyPalette() { // ====================================
    // deal with the svg elements
    
    var SVGs = document.querySelectorAll("svg")
    var palette = getComputedStyle(document.body).getPropertyValue("--current-palette");
    var palette = new ColorMap(palette);
    
    /*
    for (svg of SVGs) {
        var elements = Object.values(svg.children).filter(function(x) {return x.classList.contains("apply-palette")}); 
        for (e of elements) {
            var val = e.getAttribute("palette");
            var color = palette.getCat(val, elements.length);
            e.setAttribute("fill", color);
        }
    }
    */
    // get the elements
    var elements = document.getElementsByClassName("apply-palette");
    
    for (e of elements) {
        var val = e.getAttribute("palette");
        var max = e.getAttribute("max");
        var color = palette.getCat(val, max);
        if (e instanceof SVGElement) {
            // set fill of svgs
            e.setAttribute("fill", color);
            
        } else {
            // set the background color of html elements
            e.style.backgroundColor = color;
        }
    
    }
    
}
class optionColorPalette {
    constructor(attribute) {
        var options = fromStorage("attribute-information")[attribute]["values"];
        var cpCount = 0;
        this.mapping = {};
        for (var opt in options) {
            this.mapping[opt] = cpCount;
            cpCount++;
        }
        this.length = Object.keys(this.mapping).length;
    }
    
    get(option) {
        
        // get the color for n option
        var out = this.mapping[option];
        if (!out && numReg.test(option)) { // numeric options -> number of decimals is likely off
            for (var opt in this.mapping) {
                if (Number(option) == Number(opt)) {
                    out = this.mapping[opt];
                    break;
                }
            }
        }
        return out;
    }

}


class ColorMap {
    constructor(input_colors) {
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
        value = Math.max(value, 0);
        value = Math.min(value, 1);
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























