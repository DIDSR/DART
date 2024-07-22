
/* || Custom Class */
CollapsibleSectionTemplate = document.createElement("template");
CollapsibleSectionTemplate.innerHTML = `
    <style>
        :host {
            display: block;
            min-height: 10px;
            margin: 10px;
            box-shadow: 0 2px var(--border-color, grey);
        }
        #icon {
            font-family: 'Material Icons';
            display: inline-block;
            transition: transform 0.2s;
            float: left;
        }
        #content {
            min-height: 0.1px;
            transition: min-height 0.2s, height 0.2s;
        }
        #header {
            border-bottom: 1px solid var(--border-color, grey);
        }        
        :host([collapsed]) #icon {
            transform: rotate(-90deg);
        }
        :host([collapsed]) #content {
            min-height: 0px;
            height: 0px;
        }
        :host([collapsed]) ::slotted(:not([slot=header])) {
            display:none;
            visibility: hidden;
        }
        :host([hidden]) { display:none }
    </style>
    


    <div id=header>
        <span id=icon>expand_more</span>
        <slot name="header"></slot>
    </div>
    <div id=content>
        <slot></slot>
    </div>
`;


class CollapsibleSection extends HTMLElement {
    constructor() {
        super();
        this.attachShadow( {mode: 'open'} );
        this.shadowRoot.appendChild(CollapsibleSectionTemplate.content.cloneNode(true));
        this.toggleCollapse = this.toggleCollapse.bind(this)
        this.shadowRoot.querySelector("#header").addEventListener("click", this.toggleCollapse);
    }
    
    toggleCollapse() { this.toggleAttribute("collapsed") }

}

customElements.define("collapsible-section", CollapsibleSection);


/* || Related Utility Functions */

/**
 * Collapses all collapsible-sections within the element
 */
function collapseAll(element) {
    if (typeof element == "string") {
        element = document.getElementById(element);
    }
    const collapsible = element.querySelectorAll("collapsible-section");
    for (var col of collapsible) {
        col.toggleAttribute("collapsed", true);
    }
}

/**
 * Expands all collapsible-sections within the element
 */
function expandAll(element) {
    if (typeof element == "string") {
        element = document.getElementById(element);
    }
    const collapsible = element.querySelectorAll("collapsible-section");
    for (var col of collapsible) {
        col.toggleAttribute("collapsed", false);
    }
}






