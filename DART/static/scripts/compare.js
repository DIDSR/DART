

/* || Subpage management */ // TODO: move to use for explore as well
function switchSubpage(element) {
    const options = [...document.getElementById("subpage-selection").children].filter(x=>x.hasAttribute("value"));
    for (var o of options) {
        o.toggleAttribute("active", false);
    }
    element.toggleAttribute("active", true);
    setSubpage();
}

function setSubpage() { 
    // get the active subpage -> if none, set filters to active
    var active = document.getElementById("subpage-selection").querySelector("[active]");
    if (!active) {
        active = document.getElementById("subpage-selection").querySelector("[value=filter-subpage]");
        active.toggleAttribute("active", true);
    }
    const id = active.getAttribute("value");
    const toHide = document.querySelectorAll(`.subpage:not([hidden]):not(#${id})`);
    for (var e of toHide) {
        e.toggleAttribute("hidden", true);
    }
    const subpage = document.getElementById(id);
    if (!subpage) {
        console.warn("no subpage could be found with the id:", id);
        return;
    }
    
    subpage.toggleAttribute('hidden', false);
    
}


async function updateResultsSection() { 
    const root = document.getElementById("results-subpage");
    root.toggleAttribute("is-loading", true);
    var res = await fetch("/compare-results");
    var results = await res.json();
    const dec = sessionStorage.getItem("decimal-places");
    
    if (Object.keys(results).length < 1) {
        //root.toggleAttribute("is-loading", false);
        return; // no results yet
    }
    // TODO: improve the method of updating. Currently it removes all previous results and adds everything, which is terribly inefficient if any of the removed results are still relevent.
    
    for (var element of root.querySelectorAll("[slot=subgroup], [slot=level], [slot=detail]") ) { 
        try {
            root.removeChild(element);
        } catch {
            continue;
        }
    }
    
    // Add the results to the level view
    // filter to only the ones that we want to be comparing (subgroup matches aside from base criteria)
    results = results.filter( x => JSON.stringify(x["Subgroup 1"]["added_criteria"]) == JSON.stringify(x["Subgroup 2"]["added_criteria"]))
    // get the levels & subgroups
    results = results.map( x=> {
        var sub = x["Subgroup 1"]["added_criteria"];
        var level = Object.keys(sub).length;
        x["level"] = level;
        x["Subgroup"] = sub;
        return x;
    })
    // TODO: add an ignore-inherent toggle? (Currently always behaves as ignore_inherent)
    results = results.filter( x =>[...new Set(Object.keys(x["Subgroup"])).intersection(new Set(x["similarity_attributes"]))].length < 1); 
    
    // get the needed distribution information
    var distInfo = await fetch("get-idx-attributes");
    distInfo = await distInfo.json();
    
    var levels = [...new Set(results.map(x => x['level']))].sort();
    for (var lvl of levels) {
        var s = document.createElement("span");
        s.setAttribute("slot", "level");
        s.setAttribute("level", lvl);
        if (!root.querySelector("[slot=level][active]")) {
            s.toggleAttribute("active", true);
        }
        s.innerHTML = `Level ${lvl}`;
        root.appendChild(s);
        var levelSubs = results.filter(x=>x['level'] == lvl);
        
        for (var sub of levelSubs) { 
            var s = document.createElement("level-view-entry");
            s.setAttribute("slot", "subgroup");
            s.setAttribute("group", Object.keys(sub["Subgroup"]).join("-"));
            
            var subName = sub["Subgroup"];
            if (Object.keys(subName).length < 1) {
                subName = "Overall";
            } else {
                subName = formatSubgroupName(subName);
            }
            s.setAttribute("subgroup", subName);
            //s.innerText = subName; // TODO (other info)
            s.innerHTML = `
                <div center>${subName}</div>
                <div center>${round(sub["similarity"], dec)}</div>
            `;
            //round(sub["similarity"], dec)
            s.setAttribute("level", lvl);
            s.setAttribute("similarity-attributes",sub["similarity_attributes"].join(","));
            s.setAttribute("color-value", sub["similarity"])
            s.toggleAttribute("colormapped", true);
            
            root.appendChild(s);
            // Add the detail view (only one needed per subgroup!) (WIP!)
            var d = root.querySelector(`[slot=detail][subgroup="${formatQuery(subName)}"]`);
            if (!d)  {
                d = document.createElement("span");
                d.setAttribute("slot", "detail");
                d.toggleAttribute("hidden", true);
                d.setAttribute("subgroup", subName);
                root.appendChild(d);
                // create the header section of the detail view
                h = document.createElement("div");
                h.classList.add("detail-view-header");
                h.innerHTML = `
                    <div>Comparing:</div>
                    <div class=detail-view-subgroup-display>
                        <div> <div bold emph>Subgroup 1:</div> ${buildSubgroupDetailDisplay(sub["Subgroup 1"])} </div>
                        <div> <div bold emph>Subgroup 2:</div> ${buildSubgroupDetailDisplay(sub["Subgroup 2"])} </div>
                    </div>
                `;
                if (sub["overlap"] > 0) {
                    h.innerHTML = h.innerHTML + `<div> <i>Overlap: ${sub["overlap"]}</i></div>`;
                }
                d.appendChild(h);
                
            }
            // add the card
            if (sub["similarity_attributes"].length == 1) {
                var card = document.createElement("detail-card");
                card.setAttribute("name",sub["similarity_attributes"].join(","));
                card.setAttribute("value", sub["similarity"]);
                
                var attDist = {};
                
                for (var subName of ["Subgroup 1", "Subgroup 2"]) {
                    attDist[subName] = sub[subName]['indices'].map( x => distInfo[sub["similarity_attributes"]][x]).reduce(function (acc, curr) { 
                        return acc[curr] ? ++acc[curr] : acc[curr] = 1, acc
                    }, {});
                }
                // create the distribution figure
                var fig = document.createElement("distribution-figure");
                fig.setAttribute("attribute-name", sub["similarity_attributes"]);
                fig.setAttribute("distributions", JSON.stringify(attDist));
                fig.setAttribute("slot", "figure");
                fig.setAttribute("legend", "right");
                card.appendChild(fig);
                d.appendChild(card);
                card.configHeader();
            }
            
        }
    }
    applyColorPalette();
    // TODO: set the subgroup selector as active
    root.setLevelView(); // configure the level view
    root.toggleAttribute("is-loading", false);
}


function buildSubgroupDetailDisplay(info) {
    var str = ``;
    
    for (var key in info["criteria"]) {
        str = str + `<div><span bold>${key}: </span><span>${info["criteria"][key]}</span></div>`;
    }
    
    str = str + `<div emph><span bold>Size: </span><span>${info["size"]}</span></div>`;
    
    return str;
    
    
    
}