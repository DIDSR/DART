
/* || Load page sections */

const loadSectionsFunctions = {
    "results":loadResultsSection,
}

/**
 * Wrapper to load different deterministic page sections
 * @param {string} section - the name of the section to load
 * @param {object} info - the information needed to populate the section
 */
function loadSection(section, info) {
    const s = document.getElementById(`${section}-section`);
    const h = document.getElementById(`${section}-section-heading`);
    // Show the section and heading if hidden
    if (h.hasAttribute("hidden")) {h.toggleAttribute("hidden")}
    if (s.hasAttribute("hidden")) {s.toggleAttribute("hidden")}
    loadSectionsFunctions[section](s, info);
}


/* Variable used to track changes to the information displayed */
var resultsSectionInformation = {};

/**
 * Load the results section
 * @param {HTMLElement} div - the element to populate
 * @param {object} info - the information needed to populate the element
 */
function loadResultsSection(div, info) {
    console.log(div, info);
    if (isEmpty(div)) { // perform first time initialization
        
    } 
    
    if (!isEquiv(info, resultsSectionInformation)) { // fill in the missing information
        resultsSectionInformation = info; // set equal
    }
}