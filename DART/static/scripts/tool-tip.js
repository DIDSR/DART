ToolTipTemplate = document.createElement("template");
ToolTipTemplate.innerHTML = `
    <style>
        :host {
            display: inline-block;
        }
        #content {
            visibility: hidden;
            position: fixed;
            border: 1px solid var(--accent-1, cyan);
            border-radius: 2px;
            padding: 2px;
            background: var(--background, white);
        }
        #icon {
            font-family: 'Material Icons';
            display: inline-block;
            color: var(--accent-1, grey);
            height: 24px;
            width: 24px;
            fontsize: 24px;
            line-height: 24px;
            text-align: center;
            border-radius: 20px;
        }
        #icon:hover + #content,
        #icon[showing] + #content {
            visibility: visible;
        }  
        #icon[showing] {
            color: var(--show-icon-color, var( --background, white));
            background-color: var(--accent-1, grey);
        }
        :host([hidden]) { display:none }
    </style>
    <span id=icon onclick=this.toggleAttribute("showing")>help_outline</span>
    <div id=content>
        <slot></slot>
    </div>
`;

class ToolTip extends HTMLElement {
    constructor() {
        super();
        this.attachShadow( {mode: 'open'} );
        this.shadowRoot.appendChild(ToolTipTemplate.content.cloneNode(true));
        this.icon = this.shadowRoot.querySelector("#icon");
        this.content = this.shadowRoot.querySelector("#content");
    }
    connectedCallback() {
        this.setPosition();
    }
    static get observedAttributes() { return ["show"]};
    attributeChangedCallback(attName, oldValue, newValue) {
        if (attName == "show") {
            this.setPosition();
        }
        
    }
    setPosition() {
        // TODO
    }
    
}

customElements.define("tool-tip", ToolTip);
