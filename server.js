const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const USER_DATA = {
    user_id: "panyakapoor_30052004",
    email_id: "pk2592@srmist.edu.in",
    college_roll_number: "RA2311003030024"
};

function getGroup(start, nodes, graph, par) {
    let group = new Set();
    let q = [start];
    group.add(start);
    
    while (q.length > 0) {
        let curr = q.shift();
        let link = (graph[curr] || []).concat(par[curr] ? [par[curr]] : []);
        for (let n of link) {
            if (!group.has(n)) {
                group.add(n);
                q.push(n);
            }
        }
    }
    return group;
}

app.post('/bfhl', (req, res) => {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: "no data" });
    }

    let bad = [];
    let dups = [];
    let seen = new Set();
    let par = {};
    let graph = {};
    let allNodes = new Set();

    for (let i = 0; i < data.length; i++) {
        let line = data[i].trim();
        
        if (!/^[A-Z]->[A-Z]$/.test(line)) {
            bad.push(data[i]);
            continue;
        }

        let parts = line.split('->');
        let u = parts[0], v = parts[1];
        
        if (u === v) {
            bad.push(data[i]);
            continue;
        }

        if (seen.has(line)) {
            if (!dups.includes(line)) dups.push(line);
            continue;
        }
        seen.add(line);
        
        allNodes.add(u); allNodes.add(v);

        if (!par[v]) {
            par[v] = u;
            if (!graph[u]) graph[u] = [];
            graph[u].push(v);
        }
    }

    let results = [];
    let visited = new Set();

    let roots = Array.from(allNodes).filter(n => !par[n]).sort();

    function makeTree(node) {
        visited.add(node);
        let children = {};
        let d = 0;
        
        if (graph[node]) {
            for (let child of graph[node]) {
                let res = makeTree(child);
                children[child] = res.tree;
                if (res.depth > d) d = res.depth;
            }
        }
        return { tree: children, depth: 1 + d };
    }

    roots.forEach(r => {
        let res = makeTree(r);
        results.push({
            root: r,
            tree: { [r]: res.tree },
            depth: res.depth
        });
    });

    let left = Array.from(allNodes).filter(n => !visited.has(n)).sort();
    while (left.length > 0) {
        let start = left[0];
        let comp = getGroup(start, allNodes, graph, par);
        let min = Array.from(comp).sort()[0];
        
        results.push({ root: min, tree: {}, has_cycle: true });

        comp.forEach(n => visited.add(n));
        left = left.filter(n => !visited.has(n));
    }
    
    let tCount = results.filter(h => h.depth !== undefined);
    let cCount = results.filter(h => h.has_cycle);
    let top = [...tCount].sort((a, b) => b.depth - a.depth || a.root.localeCompare(b.root))[0];

    res.json({
        ...USER_DATA,
        hierarchies: results,
        invalid_entries: bad,
        duplicate_edges: dups,
        summary: {
            total_trees: tCount.length,
            total_cycles: cCount.length,
            largest_tree_root: top ? top.root : null
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`running on ${PORT}`));
