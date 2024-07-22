
const DoubleRangeTemplate = document.createElement("template");
DoubleRangeTemplate.innerHTML = `
    <style>
        :host {
            min-height: 10px;
            display: flex;
            padding: 5px !important;
            align-content: stretch;
            --radius: var(--indicator-radius, 8px);
            --color-1: var(--main-color, var(--accent-1, blue));
            --color-2: var(--secondary-color, var(--accent-2, red));
            --color-3: var(--tertiary-color, var(--background-color, cyan));
        }
        #display {
            min-height: calc(2*var(--radius));
            flex-grow: 2;
            display: flex;
            align-items: center;
            position: relative;
        }
        
        input {
            width: 50px;
        }
        #bar-bg {
            height: 5px;
            flex-grow: 1;
            border: 1px solid;
            border-radius: 10px;
            position: relative;
            overflow: hidden;
            display: flex;
            justify-content: space-between;
            margin: 0px var(--radius) !important;
        }
        
        #bar-fg {
            position: absolute;
            top: 0;
            display: inline-block;
            height: 100%;
            background-color: var(--color-1);
            width: 10px;
        }
        .thumb {
            --border: 2px;
            height: calc(2*calc(var(--radius) - var(--border)));
            width: calc(2*calc(var(--radius) - var(--border)));
            background-color: var(--color-2);
            border: var(--border) solid var(--color-3);
            position: absolute;
            border-radius: calc(2*var(--radius));
            transform: translate(-50%);
        }
    </style>
    <input type=number id=min></input>
    <div id=display>
        <div id=bar-bg>
            <span id=bar-fg></span>
        </div>
        <span class=thumb value=10></span>
        <span class=thumb value=2></span>
    </div>
    <input type=number id=max></input>
`;

class DoubleRange extends HTMLElement {
    constructor() {
        super();
        this.attachShadow( {mode: 'open'} );
        this.shadowRoot.appendChild(DoubleRangeTemplate.content.cloneNode(true));
        this.indicatorBar = this.shadowRoot.querySelector("#bar-fg");
        this.manualChange = this.manualChange.bind(this);
        this.minInput = this.shadowRoot.querySelector("#min");
        this.maxInput = this.shadowRoot.querySelector("#max");
        this.minInput.addEventListener("change", this.manualChange);
        this.maxInput.addEventListener("change", this.manualChange);
        this.startDrag = this.startDrag.bind(this);
        this.snapDrag = this.snapDrag.bind(this);
        this.stopDrag = this.stopDrag.bind(this);
        this.activeThumb=null;
        for (var thumb of this.shadowRoot.querySelectorAll(".thumb")) {
            thumb.addEventListener("mousedown", this.startDrag);
        }
    }
    
    connectedCallback() {
        this.setup();
    }
    
    static get observedAttributes() { return ['min', 'max', 'step'] }
    
    attributeChangedCallback() {
        this.setup();
    }
    
    setup() {
        // initial set up (also triggers on attribute change)
        this.addSnaps();
        // set the initial thumb values
        const thumbs = this.shadowRoot.querySelectorAll(".thumb")
        for (var ii = 0 ; ii < thumbs.length; ii++ ) {
            if (ii == 0) {
                thumbs[ii].setAttribute("value", this.min);
            } else {
                thumbs[ii].setAttribute("value", this.max);
            }
        }
        this.update();
    }
    
    
    startDrag(mouseDownEvent) {
        const thumb = mouseDownEvent.target;
        this.activeThumb = thumb;
        document.addEventListener("mouseup", this.stopDrag);
        document.addEventListener("mousemove", this.snapDrag);
    }
    
    snapDrag(mouseMoveEvent) {
        // get the closest marker to the mouse position
        const dists = this.markers.map(x=> Math.abs(x.getBoundingClientRect().x - mouseMoveEvent.clientX));
        const minDist = Math.min(...dists);
        const value = this.markers[dists.indexOf(minDist)].getAttribute("value");
        this.activeThumb.setAttribute("value", value);
        this.update();
    }
    
    stopDrag(mouseUpEvent) { 
        this.activeThumb = null;    
        document.removeEventListener("mousemove", this.snapDrag);
        document.removeEventListener("mouseup", this.stopDrag);
    }
    
    update() {
        this.placeThumbs();
        this.setValues();
        this.updateIndicatorBar();
        this.value = [Number(this.minInput.value), Number(this.maxInput.value)];
    }
    
    placeThumbs() {
        const root = this.shadowRoot.querySelector("#display");
        const rootPos = root.getBoundingClientRect();
        const div = this.shadowRoot.querySelector("#bar-bg");
        const barOffset = div.offsetLeft;
        // get the percent offset
        const percentOffset = (barOffset / rootPos.width)*100;
        for (var thumb of this.shadowRoot.querySelectorAll(".thumb")) {
            const value = thumb.getAttribute("value");
            const percent = (value / this.max)*100;
            // get the correct snap marker
            const sm = [...this.shadowRoot.querySelectorAll(".snap-marker")].filter(
                x => x.getAttribute("value") == value
            )[0];
            const smPercent = (sm.offsetLeft / rootPos.width)*100;
            thumb.style.left = percentOffset + smPercent + "%";
        }
    }
    
    updateIndicatorBar() {
        // updates the bar showing the range selected
        const minMarker = this.markers.filter(x=>x.getAttribute("value") == this.minInput.value)[0];
        const maxMarker = this.markers.filter(x=>x.getAttribute("value") == this.maxInput.value)[0];
        this.indicatorBar.style.left = minMarker.offsetLeft + "px";
        this.indicatorBar.style.width = maxMarker.offsetLeft - minMarker.offsetLeft + "px";
                
    }
    
    setValues() {
        // set the min and max values based on the thumbs
        const values = [...this.shadowRoot.querySelectorAll(".thumb")].map(
            x=>Number(x.getAttribute("value"))
        );
        this.minInput.value = Math.min(...values);
        this.maxInput.value = Math.max(...values);
    }
    
    manualChange(changeEvent) {
        // handle a manual change to the number inputs
        const input = changeEvent.target;
        if (input.value < this.min) {
            input.value = this.min;
        } else if (input.value > this.max) {
            input.value = this.max;
        } else if ((input.value - this.min) % this.step != 0) {
            const rem = (input.value - this.min) % this.step;
            if (rem < this.step/2) {
                input.value = input.value - rem;
            } else {
                input.value = input.value - rem + this.step;
            }
        }
        const thumbs = [...this.shadowRoot.querySelectorAll(".thumb")];
        const thumbVals = thumbs.map(x=>Number(x.getAttribute("value")));
        
        if (input.getAttribute("id") == "min") {
            // check that it is less than the max setting
            if (Number(input.value) > Number(this.maxInput.value)) {
                input.value = this.maxInput.value;
            }
            const minThumb = thumbs[thumbVals.indexOf(Math.min(...thumbVals))];
            minThumb.setAttribute("value", input.value);
        } else if (input.getAttribute("id") == "max") {
            // check that it is greater than the min setting
            if (Number(input.value) < Number(this.minInput.value)) {
                input.value = this.minInput.value;
            }
            const maxThumb = thumbs[thumbVals.indexOf(Math.max(...thumbVals))];
            maxThumb.setAttribute("value", input.value);
        }
        this.update();
    }
    
    addSnaps() {
        const div = this.shadowRoot.querySelector("#bar-bg");
        // remove any existing snaps
        for (const m of div.querySelectorAll(".snap-marker")) {
            div.removeChild(m);
        }
        // Adds the positions which the thumbs snap to
        this.min = Number(this.getAttribute("min")) || 0;
        this.max = Number(this.getAttribute("max")) || 10;
        this.step = Number(this.getAttribute("step")) || 1;
        var counter = this.min;
        
        while (counter <= this.max) {
            const sm = document.createElement("span");
            sm.classList.add("snap-marker");
            sm.setAttribute("value", counter);
            div.appendChild(sm);
            counter += this.step;
        }
        this.markers = [...this.shadowRoot.querySelectorAll(".snap-marker")];
    }
    
}

customElements.define("double-range", DoubleRange);