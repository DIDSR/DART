
/* || Tabbed pane element */
const tabbedPaneTemplate = document.createElement("template");
tabbedPaneTemplate.innerHTML = `
    <style>
    :host {
        height: 100%;
        display: flex;
        flex-direction: column; 
        --border: 2px solid black;
    }
    #tab-bar {
        border-bottom: var(--border);
        background-color: rgb(0,0,0,0.05);
        padding: 3px 2px 0px;
        display: flex;
    }
    
    /* Adjust necessary margins by slightly less than border width to overlap borders correctly */
    page-tab { margin-bottom: -1px } 
    
    page-tab:not(:first-of-type) { margin-left: -2px }
    
    ::slotted(*) {
        border: var(--border);
        border-top: none;
        flex-grow: 1;
        overflow: auto;
    }
    :host([hidden]) { display: none }
    </style>
    <div id=tab-bar></div>
    <slot name=page>No pages have been added</slot>
    
`;
/**
 * an HTML element containing multiple tabs that can be swapped between
 */
class TabbedPane extends HTMLElement {
    constructor() { 
        super();
        this.attachShadow( {mode: "open"} );
        this.shadowRoot.appendChild(tabbedPaneTemplate.content.cloneNode(true));
        this._tabBar = this.shadowRoot.querySelector("#tab-bar");
        this._onSlotChange = this._onSlotChange.bind(this);
        this._pageSlot = this.shadowRoot.querySelector('slot[name=page]');
        this._pageSlot.addEventListener("slotchange", this._onSlotChange);
        this._setActive = this._setActive.bind(this);
    }
        
    _onSlotChange() {
        this.setPages();
        // set the first tab/page to active
        var firstTab = this._tabBar.querySelector("page-tab");
        firstTab.toggleAttribute("active", true);
        var firstPage = this.querySelector(`#${firstTab.getAttribute("target")}`);
        firstPage.toggleAttribute("hidden", false);        
    }
    
    _setActive(e) {
        var prev = this._tabBar.querySelector("page-tab[active]");
        var tab = e['target'];
        if (prev != tab) {
            if (prev) { 
                prev.toggleAttribute("active", false);
                var prevPage = this.querySelector(`#${prev.getAttribute("target")}`);
                prevPage.toggleAttribute("hidden", true);  
            };            
            tab.toggleAttribute("active", true);
        }
        var page = this.querySelector(`#${tab.getAttribute("target")}`);
        page.toggleAttribute("hidden", false);  
    }
    
    setPages() {
        var pages = this._pageSlot.assignedElements();
        for (var i in pages) {
            var page = pages[i];
            var id = page.getAttribute("id") || `page-${i}`;
            page.setAttribute("id", id);
            page.toggleAttribute("hidden", true);
            var tab = document.createElement("page-tab");
            tab.innerText = page.getAttribute("name");
            tab.addEventListener("click", this._setActive);
            tab.setAttribute("target", id);
            this._tabBar.appendChild(tab);
        }
    }
}
customElements.define("tabbed-pane", TabbedPane);

const pageTabTemplate = document.createElement("template");
pageTabTemplate.innerHTML = `
    <style>
        :host {
            background-color: var(--accent-3, lightgrey);
            border: var(--border);
            border-radius: 5px 5px 0px 0px;
            padding: 1px 2px;
        }
        :host([active]) {
            border-bottom-color: var(--background, white);
            background-color: var(--background, white);
        };
    </style>
    <slot>Unnamed tab</slot>
`;
/**
 * the tab elements themselves
 */
class PageTab extends HTMLElement {
    constructor() { 
        super();
        this.attachShadow( {mode: "open"} );
        this.shadowRoot.appendChild(pageTabTemplate.content.cloneNode(true));
    }

}
customElements.define("page-tab", PageTab);


