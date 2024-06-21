/* || Resizing functions */

/* Create placeholder variable to use when resizing */
var activeResizeElement = undefined;

/**
 * resize an element
 * @param {event} e - the mousemove event
 */
function resize(e) {
    const side = activeResizeElement.getAttribute("side");
    const element = activeResizeElement.offsetParent; // not parentElement b/c in shadow
    if (side == "left" || side == "right") {
        element.style.width = (e.clientX - element.offsetLeft) + "px";
    } else if (side == "top" || side == "bottom") {
        element.style.height = (e.clientY - element.offsetTop) + "px";
    }
}

/**
 * stop resizing an element
 * @param {event} e - the mouseup event
 */
function stopResize(e) {
    window.removeEventListener("mousemove", resize, false);
    window.removeEventListener("mouseup", stopResize, false);
}

/* || Resizable pane element */

const resizePaneTemplate = document.createElement("template");
resizePaneTemplate.innerHTML = `
    <style>
        :host {
                --bar-size: 2px; /* size of the resize bars */
                min-width: 10px;
                min-height: 10px;
                position: relative;
                overflow: hidden;
                display: inline-block;
            }
        :host([resize~="right"]) { padding-right: var(--bar-size) !important }
        :host([resize~="left"]) { padding-left: var(--bar-size) !important }
        :host([resize~="top"]) { padding-top: var(--bar-size) !important }
        :host([resize~="bottom"]) { padding-bottom: var(--bar-size) !important }
        :host([hidden]) { display: none }
        
        resize-bar {
            min-width: var(--bar-size, 2px);
            min-height: var(--bar-size, 2px);
            background-color: lightgrey;
            position: absolute;
            z-index: 100;
        }
        resize-bar:not([side=top]) { bottom:0 }
        resize-bar:not([side=bottom]) { top:0 }
        resize-bar:not([side=right]) { left:0 }
        resize-bar:not([side=left]) { right:0 }
        resize-bar:is([side=right], [side=left]) { cursor: ew-resize }
        resize-bar:is([side=top], [side=bottom]) { cursor: ns-resize }
        resize-bar:hover { transform: scale(2) } 
        
    </style>
    <slot></slot>
`;
/**
 * A Pane / div that can be resized with the mouse
 */
class ResizablePane extends HTMLElement {
    constructor() { 
        super();
        this.attachShadow( {mode: "open"} );
        this.shadowRoot.appendChild(resizePaneTemplate.content.cloneNode(true));  
    }
    
    connectedCallback() {
        const sides = this.getAttribute("resize");
        if (sides) { this.createResizers(sides) };
    }
    
    static get observedAttributes() {
        return ['resize'];
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (name == "resize") { this.createResizers(newValue) };
    }
    
    createResizers(newSides) {
        // remove any existing bars
        const existing = this.shadowRoot.querySelectorAll("resize-bar");
        for (var elem of existing) { this.shadowRoot.removeChild(elem) };
        // add the correct bars
        newSides = newSides.split(" ");
        for (var side of newSides) {
            var rs = document.createElement("resize-bar");
            rs.setAttribute("side", side);
            this.shadowRoot.appendChild(rs);
        }
    }
}
customElements.define("resizable-pane", ResizablePane);


/* || Resize bar element */

/**
 * Facilitates the resizing of ResizePane
 */
class ResizeBar extends HTMLElement {
    constructor() { 
        super();
        this.addEventListener("mousedown", this.startResize); 
    }
    
    /**
     * Begin a resizing instance
     */
    startResize(e) {
        activeResizeElement = this;
        window.addEventListener("mousemove", resize, false);
        window.addEventListener("mouseup", stopResize, false);
    } 
}
customElements.define("resize-bar", ResizeBar);

