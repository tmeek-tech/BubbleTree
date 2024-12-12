console.log("hello from plot.js")
var width = 700,
    height = 500,
    imageScale = 0.25,
    linkDistance = 60,
    defualtNodeRadius = 7,
    clickMode = "apply",
    startNodeName = "<rule>",
    activeModelName = "view",
    markerSize = 5;

dummyNodes = `
C0 := y
C0 := a(L)
a(L) := z(L)
z(L) := w(L)
z(L) := a(LL)
z(L) := b(L)
`
dummyRules = `
C0 := y
C0 := aL
a(L := z(L
z(L := w(L
z(L := a(LL
z(L := b(L
`

class Rule {
    constructor(find="<true>", replace="<true>") {
        this.find = find;
        this.replace = replace;
        this.text = find + ":=" + replace;
    }
    fromText(text) {
        this.replace = new Node(text.replace(/.*:=/, ""))
        this.replace = new Node(text.replace(/:=.*/, ""))
    }
    apply(node) {
        return new Node(node.text.replace(this.find, this.replace));
    }
}
var allNodes = {}
class Node {
    constructor(text = "<true>", nodeType="expression") {
        if (allNodes[text]) return allNodes[text];
        else allNodes[text] = this;
        this.text = text;
        this.nodeType = nodeType;
        this.x = Math.random() * 50 - 25;
        this.y = Math.random() * 50 - 25;
        this.clickable = false;
    }
}
class Link {
    constructor(source, rule, linkType="replacement") {
        this.source = source;
        this.target = rule.apply(source);
        this.linkType = linkType;
        this.text = source.text + ":=" + this.target.text;
    }
}
class Model {
    constructor(modelName, initialNode) {
        this.nodes = [];
        this.links = [];
        this.rules = [];
        this.modelName = modelName;
        if (initialNode) {
            this.addNode(initialNode);
            this.addLink(new Link(initialNode, this.rules[0])); // initial node points to itself by default
        }
    }
    addNode(node) {
        let existingNode = this.nodes.find(n => n.text === node.text);
        if (!existingNode) { this.nodes.push(node) }
        return this;
    }
    addLink(link) {
        let existingLink = this.links.find(l => l.text === link.text);
        if (!existingLink) { this.links.push(link) }
        return this;
    }
    addRule(rule) {
        let existingRule = this.rules.find(n => n.text === rule.text);
        if (!existingRule) { this.rules.push(rule) }
        return this;
    }
}

// Function to initiate the plotting process
async function begin() {
    // let text = await (await fetch(inputFilePath)).text();
    let text = dummyNodes;
    let lines = text.trim().split('\n');
    let initialNode;
    let inModel = new Model("in");

    // adds initial nodes
    lines.forEach(line => {
        let parts = line.split(/\s*:=\s*/);
        if (parts.length === 2) {
            let sourceNode = new Node(parts[0].trim());
            let targetNode = new Node(parts[1].trim());
            inModel.addNode(sourceNode);
            inModel.addNode(targetNode);
            inModel.addLink(new Link(sourceNode, new Rule(sourceNode.text, targetNode.text)));
            if (!initialNode) initialNode = sourceNode;
        }
    });

    // adds initial rules
    text = dummyRules;
    lines = text.trim().split('\n');
    lines.forEach(line => {
        let parts = line.split(/\s*:=\s*/);
        if (parts.length === 2) {
            inModel.addRule(new Rule(parts[0].trim(), parts[1].trim()));
        }
    });


    console.log(inModel);
    plot(inModel, initializeVisualization());
}

// Function to manage clicks on nodes
function click(node, model, vis) {
    if (!node.clickable) return;
    if (clickMode == "apply") { 
        model.rules.forEach((rule, index) => {
            if (d3.select(`#rule-${index}`).property("checked")) {
                console.log("applied a rule")
                let newNode = rule.apply(node);
                model.addNode(newNode);
                model.addLink(new Link(node, rule));
            }
        });
    }
    plot(model, vis);
}
// Function to update the visual representation
function plot(model, vis) {
    // Add the list of rules to the page
    var rulesContainer = d3.select("#bubblePlot").select("#rules-container");
    if (rulesContainer.empty()) {
        rulesContainer = d3.select("#bubblePlot").append("div").attr("id", "rules-container");
    }
    rulesContainer.html(""); // Clear previous rules
    rulesContainer.append("h3").text("Available Rules:");
    model.rules.forEach(function(rule, index) {
        var ruleDiv = rulesContainer.append("div");
        ruleDiv.append("input")
            .attr("type", "checkbox")
            .attr("id", "rule-" + index)
            .attr("checked", true)
            .on("change", function() { refreshPlot(model, vis); });
        ruleDiv.append("label")
            .attr("for", "rule-" + index)
            .text(rule.find + " := " + rule.replace);
    });

    // Add input fields for adding new rules
    var addRuleContainer = d3.select("#bubblePlot").select("#add-rule-container");
    if (addRuleContainer.empty()) {
        addRuleContainer = d3.select("#bubblePlot").append("div").attr("id", "add-rule-container");
    }
    addRuleContainer.html(""); // Clear previous input fields
    addRuleContainer.append("h3").text("Add New Rule:");
    addRuleContainer.append("label").text("Find: ");
    addRuleContainer.append("input")
        .attr("type", "text")
        .attr("id", "new-rule-find");
    addRuleContainer.append("label").text(" Replace: ");
    addRuleContainer.append("input")
        .attr("type", "text")
        .attr("id", "new-rule-replace");
    addRuleContainer.append("button")
        .text("Add Rule")
        .on("click", function() {
            var findText = d3.select("#new-rule-find").property("value");
            var replaceText = d3.select("#new-rule-replace").property("value");
            if (findText && replaceText) {
                model.rules.push(new Rule(findText, replaceText));
                plot(model, vis); // Re-render the plot with the updated rules
            }
        });

    refreshPlot(model, vis);
}

function refreshPlot(model, vis) {
    var link = vis.edgesLayer.selectAll(".link")
        .data(model.links);
    var node = vis.nodesLayer.selectAll(".node")
        .data(model.nodes, function (d) { return d.text; });

    link.enter().append("line")
        .attr("class", "link")
        .style("stroke-width", 2);

    node.enter().append("g")
        .call(cola.drag)
        .on("mousedown", function () { nodeMouseDown = true; })
        .on("mouseup", function () { nodeMouseDown = false; })
        .on("touchmove", function () { d3.event.preventDefault(); })
        .on("click", function (d) { click(d, model, vis); })
        .attr("class", function (d) { return "node"; });
    
    node.append("circle")
        .attr("class", function (d) { // update node class (therefore color) based on rule matches where the rule box is checked
            let ruleMatched = model.rules.find((rule, index) => {
                let isChecked = d3.select(`#rule-${index}`).property("checked");
                return isChecked && d.text.includes(rule.find);
            });
            let canExpand = model.rules.find((rule, index) => {
                let isChecked = d3.select(`#rule-${index}`).property("checked");
                let potentialNode = rule ? rule.apply(d) : null;
                return isChecked && potentialNode && !model.nodes.find(n => n.text === potentialNode.text);
            });
            d.clickable = !!ruleMatched;
            return d.nodeType + (ruleMatched ? "_clickable" : "") + (canExpand ? "_canExpand" : "");
        })
        .attr("r", defualtNodeRadius);

    node.append("text")
        .attr("class", "tooltip")
        .text(d => d.text)
        .attr("x", -5)
        .attr("y", -15);

    link.attr("marker-end", "url(#arrowhead)");
    
    cola.on("tick", function () {
        link.attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });

        node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
    });

    link.exit().remove();
    node.exit().remove();
    cola.nodes(model.nodes)
        .links(model.links)
        .start();
}

// Function to initialize the visualization layout
function initializeVisualization() {
    outer = d3.select("#bubblePlot").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("pointer-events", "all");
    outer.append('rect')
        .attr('class', 'background')
        .attr('width', "100%")
        .attr('height', "100%")
        .call(d3.behavior.zoom().on("zoom", function () {
            if (nodeMouseDown) return;
            vis.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");    
        }));
    
    vis = outer.append('g');
    edgesLayer = vis.append("g");
    nodesLayer = vis.append("g");
    vis.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "-0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", 0)
        .attr("orient", "auto")
        .attr("markerWidth", markerSize)
        .attr("markerHeight", markerSize)
        .attr("xoverflow", "visible")
        .append("svg:path")
        .attr("d", "M 0,-5 L 10 ,0 L 0,5");

    return {edgesLayer: edgesLayer, nodesLayer: nodesLayer};
}
// Core infrastructure
var nodeMouseDown = false;
var cola = cola.d3adaptor(d3)
    .linkDistance(linkDistance)
    .size([width, height]);

function toggleImageZoom(img) {
    var scale = 1;
    d3.select(img).each(function (d) {
        if (Math.abs(img.width.baseVal.value - d.width) < 1) scale /= imageScale;
    });
    d3.select(img)
        .transition()
        .attr("width", function (d) {
            return scale * d.width;
        })
        .attr("height", function (d) { return scale * d.height; });
}
