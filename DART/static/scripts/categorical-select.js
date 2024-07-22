/* || Custom classes */
const CatagoricalOptionTemplate = document.createElement("template");
CatagoricalOptionTemplate.innerHTML = `
    <style>
        :host {
            border: 1px solid;
            display: block;
            text-align: center;
            border: 2px solid var(--alt-background);
            border-radius: 10px;
            margin: 5px 5px !important;
            flex-grow: 1;
            opacity: 0.5;
        }
        :host([checked]) {
            background-color: var(--accent-1);
            border-color: var(--accent-1);
            opacity: 1.0;
        }
        ::slotted([slot=cb]) {
            display: none;
        }
        ::slotted([slot=label]) {
            padding: 5px 10px !important;
            display: block;
            text-align: center;
        }
    </style>
    <slot name=cb></slot>
    <slot name=label></slot>
`;

class CategoricalOption extends HTMLElement {
    constructor() {
        super();
        this.attachShadow( {mode: 'open'} );
        this.shadowRoot.appendChild(CatagoricalOptionTemplate.content.cloneNode(true));
        this.cbSlot = this.shadowRoot.querySelector("slot[name=cb]");
        
    }
    connectedCallback() {
        this.addEventListener("click", this.updateState);
        this.updateState = this.updateState.bind(this);
        this.cbSlot.addEventListener("slotchange", this.updateState);
        this.updateState();
    }
    
    updateState() {
        this.cb = this.querySelector("input[type=checkbox]");
        if (this.cb) {
            if (this.cb.checked) {
                this.toggleAttribute("checked", true);
            } else {
                this.toggleAttribute("checked", false);
            }
        }
    }

    
}

customElements.define("categorical-option", CategoricalOption);



const CatagoricalSelectTemplate = document.createElement("template");
CatagoricalSelectTemplate.innerHTML = `
    <style>
        :host {
            display: block;
            border: 2px solid var(--alt-background, grey);
            border-radius: 5px;
            padding: 5px !important;
        }
        #header {
            display: flex;
            gap: 5px;
        }
        ::slotted([slot=title]) {
            flex-grow: 1;
        }
        #content {
            display: flex;
            flex-wrap: wrap;
        }
        
    </style>
    <div id=header>
        <slot name=title></slot>
        <slot name=selection-control></slot>
    </div>
    <div id=content>
        <slot></slot>
    </div>
`;

class CategoricalSelect extends HTMLElement {
    constructor() {
        super();
        this.attachShadow( {mode: 'open'} );
        this.shadowRoot.appendChild(CatagoricalSelectTemplate.content.cloneNode(true));
    }
    
}

customElements.define("categorical-select", CategoricalSelect);


/* || Related Utility Functions */
function selectAll(element) {
    if (typeof element == "string") {
        element = document.getElementById(element);
    }
    const CBs = element.querySelectorAll("input[type=checkbox]");
    for (var cb of CBs) {
        cb.checked = true;
    }
    const opts = element.querySelectorAll("categorical-option");
    for (var o of opts) {
        o.updateState();
    }
}

function deselectAll(element) {
    if (typeof element == "string") {
        element = document.getElementById(element);
    }
    const CBs = element.querySelectorAll("input[type=checkbox]");
    for (var cb of CBs) {
        cb.checked = false;
    }
    const opts = element.querySelectorAll("categorical-option");
    for (var o of opts) {
        o.updateState();
    }
}
