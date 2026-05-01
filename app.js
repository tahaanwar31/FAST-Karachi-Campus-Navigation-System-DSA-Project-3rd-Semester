// ============================================================
// FAST Campus Navigation - Web Version (JavaScript/Canvas)
// Port from C++/raylib to HTML5 Canvas
// ============================================================

const SCREEN_W = 1920;
const SCREEN_H = 1200;
const NODE_RADIUS = 15;
const MAX_NODES = 50;
const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ====== COLORS (raylib-style [R,G,B,A]) ======
const Theme = {
    BG: [240,242,245,255], UI_DARK: [40,44,52,255], UI_LIGHT: [255,255,255,240],
    ACCENT: [0,122,255,255], TEXT_DARK: [30,30,30,255],
    CLASS: [255,149,0,255], LAB: [175,82,222,255], OFFICE: [10,132,255,255],
    ADMIN: [48,209,88,255], UTIL: [142,142,147,255], SPECIAL: [255,69,58,255],
};
const WHITE = [255,255,255,255], BLACK = [0,0,0,255];
const GRAY = [130,130,130,255], LIGHTGRAY = [200,200,200,255];
const GREEN = [0,228,0,255], RED = [230,57,70,255], ORANGE = [255,165,0,255];

function rgba(c) { return `rgba(${c[0]},${c[1]},${c[2]},${(c[3]/255).toFixed(3)})`; }
function fade(c, a) { return [c[0], c[1], c[2], Math.round(a * 255)]; }
function lighten(c, amt = 55) { return [Math.min(255,c[0]+amt), Math.min(255,c[1]+amt), Math.min(255,c[2]+amt), c[3]]; }

// ====== CANVAS DRAWING HELPERS ======
function drawCircle(ctx, x, y, r, color) {
    r = Math.max(0.1, r);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(color); ctx.fill();
}
function drawCircleOutline(ctx, x, y, r, color) {
    r = Math.max(0.1, r);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(color); ctx.lineWidth = 1.5; ctx.stroke();
}
function drawLine(ctx, x1, y1, x2, y2, w, color) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = rgba(color); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
}
function drawRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = rgba(color); ctx.fillRect(x, y, w, h);
}
function drawRoundedRect(ctx, x, y, w, h, roundness, fillColor, strokeColor) {
    const r = Math.max(0, roundness * Math.min(w, h) * 0.5);
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fillColor) { ctx.fillStyle = rgba(fillColor); ctx.fill(); }
    if (strokeColor) { ctx.strokeStyle = rgba(strokeColor); ctx.lineWidth = 2; ctx.stroke(); }
}
function drawText(ctx, text, x, y, size, color) {
    ctx.font = `bold ${size}px 'Segoe UI',Tahoma,Arial,sans-serif`;
    ctx.fillStyle = rgba(color); ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
}
function measureText(ctx, text, size) {
    ctx.font = `bold ${size}px 'Segoe UI',Tahoma,Arial,sans-serif`;
    return ctx.measureText(text).width;
}
function ptInCircle(px, py, cx, cy, r) {
    const dx = px - cx, dy = py - cy; return dx * dx + dy * dy <= r * r;
}
function ptInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

// ====== DATA STRUCTURES ======

class Graph {
    constructor(v) { this.n = v; this.m = Array.from({length: MAX_NODES}, () => new Int32Array(MAX_NODES)); }
    addEdge(u, v, w) { if (u < MAX_NODES && v < MAX_NODES) { this.m[u][v] = w; this.m[v][u] = w; } }
    getWeight(u, v) { return (u < MAX_NODES && v < MAX_NODES) ? this.m[u][v] : 0; }
    getVertices() { return this.n; }
}

class LocationManager {
    constructor() { this.names = Array(30).fill(''); this.table = new Map(); this.count = 0; }
    addLocation(id, name) {
        if (id >= 0 && id < 30) {
            this.names[id] = name; this.table.set(name.toLowerCase(), id);
            if (id >= this.count) this.count = id + 1;
        }
    }
    getName(id) { return (id >= 0 && id < 30) ? this.names[id] : 'Unknown'; }
    getIdByName(s) { const l = s.toLowerCase(); return this.table.has(l) ? this.table.get(l) : -1; }
    getTotalLocations() { return this.count; }
}

class MinHeap {
    constructor() { this.a = []; }
    isEmpty() { return !this.a.length; }
    push(d, u) {
        this.a.push({dist:d, u}); let i = this.a.length - 1;
        while (i > 0) { const p = (i-1)>>1; if (this.a[i].dist < this.a[p].dist) { [this.a[i],this.a[p]]=[this.a[p],this.a[i]]; i=p; } else break; }
    }
    pop() {
        if (!this.a.length) return {dist:-1,u:-1};
        const root = this.a[0]; this.a[0] = this.a[this.a.length-1]; this.a.pop();
        let i = 0;
        while (true) {
            let l=2*i+1, r=2*i+2, s=i;
            if (l<this.a.length && this.a[l].dist<this.a[s].dist) s=l;
            if (r<this.a.length && this.a[r].dist<this.a[s].dist) s=r;
            if (s!==i) { [this.a[i],this.a[s]]=[this.a[s],this.a[i]]; i=s; } else break;
        }
        return root;
    }
}

class Navigation {
    constructor(g) { this.g = g; }
    shortestPath(src, dest) {
        const INF = 999999, V = this.g.getVertices();
        const dist = new Int32Array(MAX_NODES).fill(INF);
        const parent = new Int32Array(MAX_NODES).fill(-1);
        dist[src] = 0;
        const pq = new MinHeap(); pq.push(0, src);
        while (!pq.isEmpty()) {
            const {dist: d, u} = pq.pop();
            if (d > dist[u]) continue;
            for (let v = 0; v < V; v++) {
                const w = this.g.getWeight(u, v);
                if (w > 0 && dist[u] + w < dist[v]) { dist[v] = dist[u] + w; parent[v] = u; pq.push(dist[v], v); }
            }
        }
        if (dist[dest] === INF) return {path:[], pathSize:0, totalDist:-1};
        const path = []; let c = dest; path.push(c);
        while (parent[c] !== -1) { c = parent[c]; path.push(c); }
        path.reverse();
        return {path, pathSize: path.length, totalDist: dist[dest]};
    }
}

// ====== APP STATE ======
const State = { CAMPUS: 0, FLOOR_SELECT: 1, LOADING: 2, INSIDE: 3 };

// ====== MAIN APPLICATION ======
class App {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.time = 0;
        this.lastTime = performance.now();

        // State
        this.state = State.CAMPUS;
        this.selectedSrc = -1;
        this.selectedDest = -1;
        this.result = {path:[], pathSize:0, totalDist:-1};
        this.hoveredNode = -1;
        this.hoveredRoom = -1;
        this.searchNode = -1;
        this.curBuilding = -1;
        this.curFloor = -1;
        this.loadingTimer = 0;
        this.pendingBuilding = -1;
        this.pendingFloor = -1;
        this.targetRoom = -1;
        this.intSrc = -1;
        this.intDest = -1;
        this.intPath = null;
        this.designMode = false;

        // Input
        this.mx = 0; this.my = 0;
        this.leftClick = false; this.rightClick = false;
        this.longPressTimer = null;
        this.touchStart = null;

        // Search
        this.searchInput = document.getElementById('search-input');

        this.initNav();
        this.initBuildings();
        this.generateConnections();
        this.initImages();
        this.resize();
        this.setupEvents();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.scale = Math.min(this.canvas.width / SCREEN_W, this.canvas.height / SCREEN_H);
        this.offX = (this.canvas.width - SCREEN_W * this.scale) / 2;
        this.offY = (this.canvas.height - SCREEN_H * this.scale) / 2;
        this.positionSearch();
    }

    toLogical(sx, sy) { return { x: (sx - this.offX) / this.scale, y: (sy - this.offY) / this.scale }; }

    positionSearch() {
        const inp = this.searchInput;
        if (this.state !== State.CAMPUS) { inp.style.display = 'none'; return; }
        inp.style.display = 'block';
        inp.style.left = ((SCREEN_W - 420) * this.scale + this.offX) + 'px';
        inp.style.top = (20 * this.scale + this.offY) + 'px';
        inp.style.width = (400 * this.scale) + 'px';
        inp.style.height = (50 * this.scale) + 'px';
        inp.style.fontSize = Math.max(12, 20 * this.scale) + 'px';
        inp.style.padding = (12 * this.scale) + 'px ' + (20 * this.scale) + 'px';
        inp.style.borderRadius = (12 * this.scale) + 'px';
    }

    // ====== NAVIGATION INIT ======
    initNav() {
        this.lm = new LocationManager();
        this.lm.addLocation(0, 'EE Building'); this.lm.addLocation(1, 'CS Building');
        this.lm.addLocation(2, 'Tennis Court'); this.lm.addLocation(3, 'Basketball Court');
        this.lm.addLocation(4, 'Football Court'); this.lm.addLocation(5, 'Sports Room');
        this.lm.addLocation(6, 'Masjid'); this.lm.addLocation(7, 'Main Entrance');
        this.lm.addLocation(8, 'MultiPurpose Building');

        this.coords = {
            0:{x:1750,y:525}, 1:{x:960,y:520}, 2:{x:139,y:705}, 3:{x:806,y:882},
            4:{x:162,y:347}, 5:{x:179,y:115}, 6:{x:1255,y:92}, 7:{x:1360,y:1030}, 8:{x:460,y:360}
        };

        this.vpaths = {};
        const v = this.vpaths;
        v['0,7'] = [{x:1360,y:525}];
        v['1,7'] = [{x:960,y:750},{x:1360,y:750}];
        v['2,7'] = [{x:143,y:654},{x:255,y:654},{x:255,y:600},{x:605,y:600},{x:605,y:750},{x:1360,y:750}];
        v['3,7'] = [{x:805,y:740},{x:1360,y:750}];
        v['4,7'] = [{x:255,y:600},{x:605,y:600},{x:605,y:750},{x:1360,y:750}];
        v['6,7'] = [{x:1360,y:92}];
        v['1,8'] = [{x:620,y:520},{x:620,y:360}];
        v['5,8'] = [{x:258,y:200},{x:258,y:354}];
        v['2,8'] = [{x:140,y:670},{x:258,y:670},{x:258,y:354}];
        v['3,8'] = [{x:805,y:750},{x:620,y:750},{x:620,y:360}];
        v['4,8'] = [{x:258,y:607},{x:258,y:354}];
        v['6,8'] = [{x:1255,y:275},{x:620,y:275},{x:620,y:360}];
        v['0,6'] = [{x:1360,y:525},{x:1360,y:92}];
        v['1,6'] = [{x:960,y:275},{x:1255,y:275}];
        v['2,5'] = [{x:143,y:654},{x:258,y:654},{x:258,y:200}];
        v['4,5'] = [{x:258,y:607},{x:258,y:200}];
        v['2,4'] = [{x:143,y:654},{x:258,y:654},{x:258,y:607}];
        v['3,4'] = [{x:805,y:750},{x:605,y:750},{x:605,y:600},{x:255,y:600}];
        v['1,3'] = [{x:960,y:760},{x:805,y:760}];
        v['2,3'] = [{x:143,y:654},{x:255,y:654},{x:255,y:600},{x:605,y:600},{x:605,y:750},{x:805,y:750}];

        const g = new Graph(this.lm.getTotalLocations());
        g.addEdge(7,0,850); g.addEdge(7,1,850); g.addEdge(7,2,1600);
        g.addEdge(7,3,800); g.addEdge(7,4,1500); g.addEdge(7,5,1950);
        g.addEdge(7,6,1000); g.addEdge(7,8,1400); g.addEdge(0,1,400);
        g.addEdge(0,2,1950); g.addEdge(0,3,1150); g.addEdge(0,4,1850);
        g.addEdge(0,5,1950); g.addEdge(0,6,800); g.addEdge(0,8,1350);
        g.addEdge(1,2,1450); g.addEdge(1,3,500); g.addEdge(1,4,1350);
        g.addEdge(1,5,1800); g.addEdge(1,6,600); g.addEdge(1,8,500);
        g.addEdge(6,2,1850); g.addEdge(6,3,1200); g.addEdge(6,4,1750);
        g.addEdge(6,5,1350); g.addEdge(6,8,1050); g.addEdge(3,2,850);
        g.addEdge(3,4,750); g.addEdge(3,5,1200); g.addEdge(3,8,700);
        g.addEdge(2,4,100); g.addEdge(2,5,550); g.addEdge(2,8,700);
        g.addEdge(4,5,400); g.addEdge(4,8,600); g.addEdge(5,8,450);
        this.graph = g;
        this.nav = new Navigation(g);
    }

    getPathPts(a, b) {
        if (!this.coords[a] || !this.coords[b]) return [];
        const pts = [this.coords[a]];
        const key = Math.min(a,b)+','+Math.max(a,b);
        if (this.vpaths[key]) {
            let wp = [...this.vpaths[key]];
            if (a > b) wp.reverse();
            pts.push(...wp);
        }
        pts.push(this.coords[b]);
        return pts;
    }

    // ====== BUILDING DATA ======
    initBuildings() {
        this.depts = [
            { name: 'EE Department', floors: [
                { name: 'Ground Floor (A)', img: 'EEFloorA.png', rooms: [
                    {name:'Washroom (M)',x:130,y:210,color:Theme.UTIL}, {name:'Class A-1',x:500,y:140,color:Theme.CLASS},
                    {name:'Class A-2',x:750,y:140,color:Theme.CLASS}, {name:'Faculty Office',x:960,y:140,color:Theme.OFFICE},
                    {name:'Class A-3',x:1160,y:140,color:Theme.CLASS}, {name:'Class A-4',x:1410,y:140,color:Theme.CLASS},
                    {name:'Washroom (F)',x:1770,y:210,color:Theme.UTIL}, {name:'Class A-5',x:500,y:850,color:Theme.CLASS},
                    {name:'Class A-6',x:750,y:850,color:Theme.CLASS}, {name:'Main Entrance',x:960,y:850,color:Theme.ADMIN},
                    {name:'Class A-7',x:1160,y:850,color:Theme.CLASS}, {name:'Class A-8',x:1410,y:850,color:Theme.CLASS},
                ], conns:[[1,2],[2,3]]},
                { name: 'First Floor (B)', img: 'EEFloorB.png', rooms: [
                    {name:'Washroom (M)',x:130,y:210,color:Theme.UTIL}, {name:'Faculty Office',x:500,y:140,color:Theme.OFFICE},
                    {name:'Class B-11',x:750,y:140,color:Theme.CLASS}, {name:'Faculty Office',x:960,y:140,color:Theme.OFFICE},
                    {name:'Class B-9',x:1160,y:140,color:Theme.CLASS}, {name:'Class B-10',x:1410,y:140,color:Theme.CLASS},
                    {name:'Washroom (F)',x:1770,y:210,color:Theme.UTIL}, {name:'Lab 6',x:160,y:850,color:Theme.LAB},
                    {name:'Lab 7',x:420,y:850,color:Theme.LAB}, {name:'Lab 8',x:660,y:850,color:Theme.LAB},
                    {name:'Staff Room',x:1270,y:850,color:Theme.OFFICE}, {name:'Class B-12',x:1525,y:850,color:Theme.CLASS},
                ], conns:[]},
                { name: 'Second Floor (C)', img: 'EEFloorC.png', rooms: [
                    {name:'Washroom (M)',x:130,y:210,color:Theme.UTIL}, {name:'Class C-13',x:500,y:140,color:Theme.CLASS},
                    {name:'Class C-14',x:750,y:140,color:Theme.CLASS}, {name:'Faculty Room',x:960,y:140,color:Theme.OFFICE},
                    {name:'Class C-15',x:1160,y:140,color:Theme.CLASS}, {name:'Class C-16',x:1410,y:140,color:Theme.CLASS},
                    {name:'Washroom (F)',x:1770,y:210,color:Theme.UTIL}, {name:'Class C-17',x:160,y:850,color:Theme.CLASS},
                    {name:'Class C-18',x:420,y:850,color:Theme.CLASS}, {name:'Class C-19',x:660,y:850,color:Theme.CLASS},
                    {name:'Lab 9',x:1770,y:850,color:Theme.LAB}, {name:'Class C-20',x:1270,y:850,color:Theme.CLASS},
                    {name:'Class C-21',x:1525,y:850,color:Theme.CLASS},
                ], conns:[]},
                { name: 'Third Floor (D)', img: 'EEFloorD.png', rooms: [
                    {name:'Washroom (M)',x:130,y:210,color:Theme.UTIL}, {name:'Class D-23',x:480,y:140,color:Theme.CLASS},
                    {name:'Class D-24',x:730,y:140,color:Theme.CLASS}, {name:'Reading Hall',x:1220,y:850,color:Theme.OFFICE},
                    {name:'Class D-25',x:1190,y:140,color:Theme.CLASS}, {name:'Class D-26',x:1440,y:140,color:Theme.CLASS},
                    {name:'Washroom (F)',x:1770,y:210,color:Theme.UTIL}, {name:'Lab 10',x:180,y:850,color:Theme.LAB},
                    {name:'Lab 11',x:450,y:850,color:Theme.LAB}, {name:'Class D-27',x:710,y:850,color:Theme.CLASS},
                    {name:'Class D-28',x:1485,y:850,color:Theme.CLASS},
                ], conns:[]},
                { name: 'Fourth Floor (E)', img: 'EEFloorE.png', rooms: [
                    {name:'Washroom (M)',x:130,y:210,color:Theme.UTIL}, {name:'Class E-29',x:480,y:140,color:Theme.CLASS},
                    {name:'Class E-30',x:730,y:140,color:Theme.CLASS}, {name:'Boys Common Room',x:1750,y:850,color:Theme.ADMIN},
                    {name:'Class E-31',x:1190,y:140,color:Theme.CLASS}, {name:'Class E-32',x:1440,y:140,color:Theme.CLASS},
                    {name:'Washroom (F)',x:1770,y:210,color:Theme.UTIL}, {name:'Lab 12',x:180,y:850,color:Theme.LAB},
                    {name:'Lab 13',x:450,y:850,color:Theme.LAB}, {name:'Lab 14',x:710,y:850,color:Theme.LAB},
                    {name:'Class E-33',x:1220,y:850,color:Theme.CLASS}, {name:'Class E-34',x:1485,y:850,color:Theme.CLASS},
                ], conns:[]},
            ]},
            { name: 'CS Department', floors: [
                { name: 'CS Basement Floor', img: 'CSFloorB.jpg', rooms: [
                    {name:'CS Lab 4',x:430,y:680,color:Theme.LAB}, {name:'Server Room',x:210,y:230,color:Theme.UTIL},
                    {name:'Record Room',x:1660,y:370,color:Theme.UTIL}, {name:'Faculty Office B1',x:210,y:480,color:Theme.OFFICE},
                    {name:'Faculty Office B2',x:430,y:950,color:Theme.OFFICE}, {name:'Faculty Office B3',x:1210,y:950,color:Theme.OFFICE},
                    {name:'Faculty Office B4',x:1340,y:950,color:Theme.OFFICE}, {name:'Faculty Office B5',x:1480,y:950,color:Theme.OFFICE},
                    {name:'Staff Room',x:1210,y:700,color:Theme.OFFICE}, {name:'Staff Room',x:1660,y:600,color:Theme.OFFICE},
                    {name:'Admin Office',x:1340,y:700,color:Theme.ADMIN}, {name:'Meeting Room',x:1480,y:700,color:Theme.CLASS},
                ], conns:[]},
                { name: 'CS Ground Floor', img: 'CSFloorG.jpg', rooms: [
                    {name:'Washroom (M)',x:120,y:200,color:Theme.UTIL}, {name:'Washroom (F)',x:1780,y:200,color:Theme.UTIL},
                    {name:'S2',x:120,y:550,color:Theme.CLASS}, {name:'One Stop',x:1780,y:550,color:Theme.ADMIN},
                    {name:'Finance Office',x:1555,y:740,color:Theme.OFFICE}, {name:'Mystery Room',x:1470,y:1000,color:Theme.UTIL},
                    {name:'HOD Office',x:340,y:740,color:Theme.OFFICE}, {name:'LLC',x:1140,y:1000,color:Theme.UTIL},
                    {name:'Faculty Office 4',x:400,y:1000,color:Theme.OFFICE}, {name:'Faculty Office 1',x:1350,y:740,color:Theme.OFFICE},
                    {name:'Faculty Office 2',x:530,y:740,color:Theme.OFFICE}, {name:'Faculty Office 3',x:1140,y:740,color:Theme.OFFICE},
                    {name:'Class R-11',x:710,y:740,color:Theme.CLASS}, {name:'Class R-12',x:660,y:1000,color:Theme.CLASS},
                ], conns:[]},
                { name: 'CS First Floor', img: 'CSFloor1.jpg', rooms: [
                    {name:'Class E-1',x:1720,y:600,color:Theme.CLASS}, {name:'Class E-2',x:1720,y:400,color:Theme.CLASS},
                    {name:'Class E-3',x:1720,y:200,color:Theme.CLASS}, {name:'Class E-4',x:145,y:600,color:Theme.CLASS},
                    {name:'Class E-5',x:145,y:400,color:Theme.CLASS}, {name:'Class E-6',x:145,y:200,color:Theme.CLASS},
                    {name:'CS Lab 1',x:1420,y:1000,color:Theme.LAB}, {name:'CS Lab 2',x:660,y:1000,color:Theme.LAB},
                    {name:'CS Lab 3',x:400,y:1000,color:Theme.LAB}, {name:'Network Ops',x:1140,y:1000,color:Theme.UTIL},
                    {name:'FYP Lab 1',x:1130,y:740,color:Theme.SPECIAL}, {name:'FYP Lab 2',x:1310,y:740,color:Theme.SPECIAL},
                    {name:'SYS AI Lab',x:1510,y:740,color:Theme.LAB}, {name:'Faculty Office 1',x:360,y:740,color:Theme.OFFICE},
                    {name:'Faculty Office 2',x:530,y:740,color:Theme.OFFICE}, {name:'Faculty Office 3',x:710,y:740,color:Theme.OFFICE},
                ], conns:[]},
            ]},
        ];
    }

    // ====== AUTO-GENERATE ROOM CONNECTIONS (corridor-based) ======
    generateConnections() {
        for (const dept of this.depts) {
            for (const floor of dept.floors) {
                const rooms = floor.rooms;
                const n = rooms.length;

                // Corridor Y = midpoint between min and max room Y
                const allY = rooms.map(r => r.y);
                const corridorY = Math.round((Math.min(...allY) + Math.max(...allY)) / 2);

                // allNodes: [room0..roomN-1, corridor waypoints...]
                const allNodes = rooms.map(r => ({x: r.x, y: r.y}));
                const xToCorr = new Map(); // x → corridor node index in allNodes
                const roomToCorr = [];     // room index → corridor node index

                for (let i = 0; i < n; i++) {
                    const rx = rooms[i].x;
                    if (xToCorr.has(rx)) {
                        roomToCorr.push(xToCorr.get(rx));
                    } else {
                        const idx = allNodes.length;
                        xToCorr.set(rx, idx);
                        roomToCorr.push(idx);
                        allNodes.push({x: rx, y: corridorY});
                    }
                }

                const edges = [];

                // Edge: each room → its corridor waypoint
                for (let i = 0; i < n; i++) {
                    const ci = roomToCorr[i];
                    const dx = allNodes[i].x - allNodes[ci].x;
                    const dy = allNodes[i].y - allNodes[ci].y;
                    edges.push([i, ci, Math.round(Math.sqrt(dx*dx + dy*dy))]);
                }

                // Edge: corridor waypoints connected sequentially (sorted by x)
                const corrSorted = [...xToCorr.entries()]
                    .map(([x, idx]) => ({x, idx}))
                    .sort((a, b) => a.x - b.x);

                for (let i = 0; i < corrSorted.length - 1; i++) {
                    const aIdx = corrSorted[i].idx, bIdx = corrSorted[i+1].idx;
                    const dist = Math.abs(allNodes[aIdx].x - allNodes[bIdx].x);
                    edges.push([aIdx, bIdx, dist]);
                }

                // Build graph
                const totalNodes = allNodes.length;
                const g = new Graph(totalNodes);
                for (const [u, v, w] of edges) g.addEdge(u, v, w);

                floor.conns = edges;
                floor.allNodes = allNodes;
                floor.roomToCorr = roomToCorr;
                floor.nRooms = n;
                floor.corridorY = corridorY;
                floor.graph = g;
                floor.nav = new Navigation(g);
            }
        }
    }

    // ====== IMAGE LOADING ======
    initImages() {
        this.images = {};
        const files = new Set(['campus_map.png']);
        for (const d of this.depts) for (const f of d.floors) files.add(f.img);
        for (const file of files) {
            const img = new Image();
            img.src = file;
            this.images[file] = img;
        }
    }

    // ====== EVENT SETUP ======
    setupEvents() {
        window.addEventListener('resize', () => this.resize());

        // Pointer events (unified mouse + touch)
        this.canvas.addEventListener('pointermove', (e) => {
            const p = this.toLogical(e.clientX, e.clientY);
            this.mx = p.x; this.my = p.y;
            if (this.longPressTimer && this.touchStart) {
                const dx = e.clientX - this.touchStart.x, dy = e.clientY - this.touchStart.y;
                if (dx*dx + dy*dy > 225) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
            }
        });

        this.canvas.addEventListener('pointerdown', (e) => {
            const p = this.toLogical(e.clientX, e.clientY);
            this.mx = p.x; this.my = p.y;
            if (e.button === 0) this.leftClick = true;
            if (e.button === 2) this.rightClick = true;
            if (e.pointerType === 'touch') {
                this.touchStart = {x: e.clientX, y: e.clientY};
                this.leftClick = true;
                this.longPressTimer = setTimeout(() => {
                    this.rightClick = true;
                    this.leftClick = false;
                }, 500);
            }
        });

        this.canvas.addEventListener('pointerup', () => {
            if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
            this.touchStart = null;
        });

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Keyboard for design mode + Escape to go back
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F1') { this.designMode = !this.designMode; e.preventDefault(); }
            if (e.key === 'Escape') {
                if (this.state === State.INSIDE) {
                    this.intSrc = -1; this.intDest = -1; this.intPath = null;
                    this.targetRoom = -1; this.state = State.FLOOR_SELECT;
                } else if (this.state === State.FLOOR_SELECT) {
                    this.state = State.CAMPUS; this.positionSearch();
                }
            }
        });

        // Search input
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { this.handleSearch(); this.searchInput.blur(); }
        });
    }

    handleSearch() {
        const q = this.searchInput.value.toLowerCase();
        if (!q) return;
        this.searchNode = -1; this.targetRoom = -1;
        let found = false;
        for (let id = 0; id < this.lm.getTotalLocations(); id++) {
            if (this.lm.getName(id).toLowerCase().includes(q)) { this.searchNode = id; found = true; break; }
        }
        if (!found) {
            for (let b = 0; b < this.depts.length && !found; b++) {
                for (let f = 0; f < this.depts[b].floors.length && !found; f++) {
                    const floor = this.depts[b].floors[f];
                    for (let i = 0; i < floor.rooms.length; i++) {
                        if (floor.rooms[i].name.toLowerCase().includes(q)) {
                            this.pendingBuilding = b; this.pendingFloor = f; this.targetRoom = i;
                            this.loadingTimer = 0; this.state = State.LOADING;
                            found = true; break;
                        }
                    }
                }
            }
        }
    }

    // ====== UPDATE ======
    update(dt) {
        this.time += dt;
        this.hoveredNode = -1;
        this.hoveredRoom = -1;

        if (this.state === State.CAMPUS) {
            // Right-click to enter buildings
            for (let id = 0; id < this.lm.getTotalLocations(); id++) {
                const p = this.coords[id];
                if (this.rightClick && ptInCircle(this.mx, this.my, p.x, p.y, NODE_RADIUS + 8)) {
                    if (id === 0) { this.curBuilding = 0; this.state = State.FLOOR_SELECT; }
                    else if (id === 1) { this.curBuilding = 1; this.state = State.FLOOR_SELECT; }
                    break;
                }
            }

            if (this.leftClick) {
                // Click on node (not search area)
                for (let id = 0; id < this.lm.getTotalLocations(); id++) {
                    const p = this.coords[id];
                    if (ptInCircle(this.mx, this.my, p.x, p.y, NODE_RADIUS + 8)) {
                        if (this.selectedSrc === -1) {
                            this.selectedSrc = id; this.result = {path:[],pathSize:0,totalDist:-1}; this.selectedDest = -1;
                        } else if (this.selectedDest === -1 && id !== this.selectedSrc) {
                            this.selectedDest = id; this.result = this.nav.shortestPath(this.selectedSrc, this.selectedDest);
                        } else {
                            this.selectedSrc = id; this.selectedDest = -1; this.result = {path:[],pathSize:0,totalDist:-1};
                        }
                        this.searchNode = -1; break;
                    }
                }
            }

            // Hover detection
            for (let id = 0; id < this.lm.getTotalLocations(); id++) {
                const p = this.coords[id];
                if (ptInCircle(this.mx, this.my, p.x, p.y, NODE_RADIUS + 8)) { this.hoveredNode = id; break; }
            }
            // Credits button
            if (this.leftClick && ptInRect(this.mx, this.my, SCREEN_W-160, SCREEN_H-55, 140, 36)) {
                toggleCredits();
            }
        }
        else if (this.state === State.FLOOR_SELECT) {
            const b = this.depts[this.curBuilding];
            for (let i = 0; i < b.floors.length; i++) {
                const btn = {x:100, y:300+i*110, w:500, h:90};
                if (this.leftClick && ptInRect(this.mx, this.my, btn.x, btn.y, btn.w, btn.h)) {
                    this.pendingBuilding = this.curBuilding; this.pendingFloor = i;
                    this.loadingTimer = 0; this.targetRoom = -1; this.state = State.LOADING;
                }
            }
            if (this.leftClick && ptInRect(this.mx, this.my, 40, 40, 140, 44)) {
                this.state = State.CAMPUS; this.positionSearch();
            }
        }
        else if (this.state === State.LOADING) {
            this.loadingTimer += dt;
            if (this.loadingTimer >= 1.5) {
                this.curBuilding = this.pendingBuilding;
                this.curFloor = this.pendingFloor;
                this.intSrc = -1; this.intDest = -1; this.intPath = null;
                this.state = State.INSIDE;
            }
        }
        else if (this.state === State.INSIDE) {
            const floor = this.depts[this.curBuilding].floors[this.curFloor];
            for (let i = 0; i < floor.rooms.length; i++) {
                if (ptInCircle(this.mx, this.my, floor.rooms[i].x, floor.rooms[i].y, NODE_RADIUS + 5)) {
                    this.hoveredRoom = i;
                }
            }
            // Room selection for interior pathfinding
            if (this.leftClick) {
                for (let i = 0; i < floor.rooms.length; i++) {
                    if (ptInCircle(this.mx, this.my, floor.rooms[i].x, floor.rooms[i].y, NODE_RADIUS + 5)) {
                        if (this.intSrc === -1) {
                            this.intSrc = i; this.intDest = -1; this.intPath = null;
                        } else if (this.intDest === -1 && i !== this.intSrc) {
                            this.intDest = i; this.intPath = floor.nav.shortestPath(this.intSrc, this.intDest);
                        } else {
                            this.intSrc = i; this.intDest = -1; this.intPath = null;
                        }
                        break;
                    }
                }
            }
            // Back button
            if (this.leftClick && ptInRect(this.mx, this.my, SCREEN_W-170, SCREEN_H-75, 140, 50)) {
                this.intSrc = -1; this.intDest = -1; this.intPath = null;
                this.targetRoom = -1; this.state = State.FLOOR_SELECT;
            }
            // Design mode
            if (this.designMode && this.leftClick) {
                console.log(`departments[${this.curBuilding}].floors[${this.curFloor}].rooms[idx++] = { "NEW_NODE", ${Math.round(this.mx)}, ${Math.round(this.my)}, Theme::CLASS };`);
            }
        }

        this.leftClick = false;
        this.rightClick = false;
    }

    // ====== DRAWING ======
    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(this.offX, this.offY);
        ctx.scale(this.scale, this.scale);

        drawRect(ctx, 0, 0, SCREEN_W, SCREEN_H, Theme.BG);

        if (this.state === State.CAMPUS) this.drawCampus(ctx);
        else if (this.state === State.FLOOR_SELECT) this.drawFloorSelect(ctx);
        else if (this.state === State.LOADING) this.drawLoading(ctx);
        else if (this.state === State.INSIDE) this.drawInside(ctx);

        ctx.restore();
    }

    drawNode(ctx, x, y, label, baseColor, hovered, selected, target) {
        let r = NODE_RADIUS, c = baseColor;
        if (hovered || target) { r += Math.sin(this.time * 8) * 3; c = Theme.ACCENT; }
        if (selected) { c = Theme.SPECIAL; r += 2; }
        r = Math.max(1, r);
        // Drop shadow
        ctx.beginPath(); ctx.arc(x+3, y+3, r, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
        // Gradient fill (3D look)
        const lc = lighten(c, 60);
        const grad = ctx.createRadialGradient(x-r*0.3, y-r*0.3, r*0.05, x, y, r);
        grad.addColorStop(0, rgba(lc)); grad.addColorStop(1, rgba(c));
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fillStyle = grad; ctx.fill();
        // Glow on active
        if (hovered || selected || target) { ctx.shadowColor = rgba(c); ctx.shadowBlur = 18; }
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.shadowBlur = 0;
        // Label pill
        const tw = measureText(ctx, label, 18);
        const px = x-tw/2-10, py = y+25, pw = tw+20, ph = 28;
        const pr = Math.max(0, 0.5 * Math.min(pw, ph) * 0.5);
        ctx.beginPath(); ctx.roundRect(px, py, pw, ph, pr);
        ctx.fillStyle = 'rgba(30,30,42,0.88)'; ctx.fill();
        drawText(ctx, label, x-tw/2, py+4, 18, WHITE);
    }

    drawCampus(ctx) {
        // Map texture
        const mapImg = this.images['campus_map.png'];
        if (mapImg && mapImg.complete && mapImg.naturalWidth) ctx.drawImage(mapImg, 0, 0, SCREEN_W, SCREEN_H);

        // Path lines (animated dashes)
        if (this.result.pathSize > 1) {
            ctx.save();
            for (let i = 0; i < this.result.pathSize - 1; i++) {
                const pts = this.getPathPts(this.result.path[i], this.result.path[i+1]);
                for (let k = 0; k < pts.length - 1; k++) {
                    // Glow layer
                    ctx.beginPath(); ctx.moveTo(pts[k].x, pts[k].y); ctx.lineTo(pts[k+1].x, pts[k+1].y);
                    ctx.strokeStyle = 'rgba(255,165,0,0.25)'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();
                    // Solid line
                    ctx.beginPath(); ctx.moveTo(pts[k].x, pts[k].y); ctx.lineTo(pts[k+1].x, pts[k+1].y);
                    ctx.strokeStyle = 'rgba(255,165,0,0.85)'; ctx.lineWidth = 4; ctx.stroke();
                    // Animated dashes
                    ctx.setLineDash([12, 8]); ctx.lineDashOffset = -this.time * 60;
                    ctx.beginPath(); ctx.moveTo(pts[k].x, pts[k].y); ctx.lineTo(pts[k+1].x, pts[k+1].y);
                    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
                    ctx.setLineDash([]); ctx.lineDashOffset = 0;
                }
            }
            ctx.restore();
        }

        // Nodes
        for (let id = 0; id < this.lm.getTotalLocations(); id++) {
            const p = this.coords[id];
            let c = Theme.OFFICE;
            if (id === this.selectedSrc) c = Theme.ADMIN;
            else if (id === this.selectedDest) c = Theme.SPECIAL;
            else if (id === this.searchNode) c = Theme.LAB;
            this.drawNode(ctx, p.x, p.y, this.lm.getName(id), c,
                id === this.hoveredNode, id === this.selectedSrc || id === this.selectedDest, false);
            // Building enter hint
            if ((id === 0 || id === 1) && id === this.hoveredNode) {
                const hint = IS_TOUCH ? 'Hold to Enter' : 'Right Click to Enter';
                const hw = measureText(ctx, hint, 18);
                const hx = p.x-hw/2-10, hy = p.y+60;
                ctx.beginPath(); ctx.roundRect(hx, hy, hw+20, 28, 8);
                ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fill();
                drawText(ctx, hint, p.x-hw/2, hy+4, 18, GREEN);
            }
        }

        // Status panel
        const sp = {x:20, y:SCREEN_H-100, w:620, h:80};
        const spGrad = ctx.createLinearGradient(sp.x, sp.y, sp.x+sp.w, sp.y);
        spGrad.addColorStop(0, 'rgba(25,25,45,0.92)');
        spGrad.addColorStop(1, 'rgba(40,40,65,0.92)');
        const spR = Math.max(0, 0.3 * Math.min(sp.w, sp.h) * 0.5);
        ctx.beginPath(); ctx.roundRect(sp.x, sp.y, sp.w, sp.h, spR);
        ctx.fillStyle = spGrad; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke();

        let sTitle = 'FAST NUCES NAVIGATION', sSub = 'Select a start point', sColor = LIGHTGRAY;
        if (this.selectedSrc === -1) { sSub = 'Click a node to Start'; sColor = GREEN; }
        else if (this.selectedDest === -1) {
            sTitle = `Start: ${this.lm.getName(this.selectedSrc)}`;
            sSub = 'Select Destination'; sColor = RED;
        } else {
            sTitle = 'Route Calculated';
            sSub = `${this.lm.getName(this.selectedSrc)} \u2192 ${this.lm.getName(this.selectedDest)} (${this.result.totalDist}m)`;
            sColor = ORANGE;
        }
        drawText(ctx, sTitle, sp.x+20, sp.y+15, 18, [180,180,200,255]);
        drawText(ctx, sSub, sp.x+20, sp.y+42, 26, sColor);

        // Credits button
        const cb = {x: SCREEN_W-160, y: SCREEN_H-55, w: 140, h: 36};
        const cbHover = ptInRect(this.mx, this.my, cb.x, cb.y, cb.w, cb.h);
        ctx.beginPath(); ctx.roundRect(cb.x, cb.y, cb.w, cb.h, 8);
        ctx.fillStyle = cbHover ? 'rgba(0,122,255,0.35)' : 'rgba(25,25,45,0.75)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.stroke();
        drawText(ctx, 'Credits', cb.x+32, cb.y+9, 17, cbHover ? WHITE : LIGHTGRAY);
    }

    drawFloorSelect(ctx) {
        // Gradient background
        const bgGrad = ctx.createLinearGradient(0, 0, SCREEN_W, SCREEN_H);
        bgGrad.addColorStop(0, 'rgba(15,12,41,0.97)'); bgGrad.addColorStop(1, 'rgba(36,36,62,0.97)');
        ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

        const b = this.depts[this.curBuilding];
        // Title with glow
        ctx.shadowColor = 'rgba(0,122,255,0.4)'; ctx.shadowBlur = 30;
        drawText(ctx, b.name, 100, 80, 64, WHITE);
        ctx.shadowBlur = 0;
        drawText(ctx, 'Select a Floor', 100, 155, 24, [160,160,180,255]);

        for (let i = 0; i < b.floors.length; i++) {
            const btn = {x:100, y:220+i*100, w:500, h:80};
            const hover = ptInRect(this.mx, this.my, btn.x, btn.y, btn.w, btn.h);
            const br = Math.max(0, 0.3 * Math.min(btn.w, btn.h) * 0.5);
            ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, br);
            if (hover) {
                const btnGrad = ctx.createLinearGradient(btn.x, btn.y, btn.x+btn.w, btn.y);
                btnGrad.addColorStop(0, 'rgba(0,122,255,0.7)'); btnGrad.addColorStop(1, 'rgba(88,86,214,0.7)');
                ctx.fillStyle = btnGrad;
                ctx.shadowColor = 'rgba(0,122,255,0.3)'; ctx.shadowBlur = 15;
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.05)';
            }
            ctx.fill(); ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke();
            // Number badge
            drawCircle(ctx, btn.x+38, btn.y+40, 20, hover ? fade(WHITE, 0.15) : fade(Theme.ACCENT, 0.25));
            drawText(ctx, `${i+1}`, btn.x+28, btn.y+28, 22, hover ? WHITE : Theme.ACCENT);
            // Floor name
            drawText(ctx, b.floors[i].name, btn.x+75, btn.y+26, 26, hover ? WHITE : LIGHTGRAY);
            // Arrow
            drawText(ctx, '\u2192', btn.x+btn.w-35, btn.y+26, 24, hover ? WHITE : GRAY);
        }
        // Back button
        const backHover = ptInRect(this.mx, this.my, 40, 40, 140, 44);
        ctx.beginPath(); ctx.roundRect(40, 40, 140, 44, 10);
        ctx.fillStyle = backHover ? 'rgba(255,69,58,0.6)' : 'rgba(255,255,255,0.06)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.stroke();
        drawText(ctx, '\u2190 Back', 62, 52, 18, backHover ? WHITE : LIGHTGRAY);
        drawText(ctx, 'ESC', 190, 54, 14, [100,100,120,180]);
    }

    drawLoading(ctx) {
        const bgGrad = ctx.createLinearGradient(0, 0, SCREEN_W, SCREEN_H);
        bgGrad.addColorStop(0, 'rgba(15,12,41,1)'); bgGrad.addColorStop(1, 'rgba(36,36,62,1)');
        ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

        const b = this.depts[this.pendingBuilding];
        const txt = this.targetRoom !== -1
            ? `Going to ${b.floors[this.pendingFloor].rooms[this.targetRoom].name}...`
            : `Entering ${b.name}...`;
        ctx.shadowColor = 'rgba(0,122,255,0.3)'; ctx.shadowBlur = 30;
        drawText(ctx, txt, SCREEN_W/2-measureText(ctx, txt, 36)/2, SCREEN_H/2-55, 36, WHITE);
        ctx.shadowBlur = 0;

        // Progress bar
        const progress = Math.min(1, this.loadingTimer / 1.5);
        const bx = SCREEN_W/2-300, by = SCREEN_H/2+20;
        ctx.beginPath(); ctx.roundRect(bx, by, 600, 12, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
        const barGrad = ctx.createLinearGradient(bx, by, bx+600*progress, by);
        barGrad.addColorStop(0, '#007AFF'); barGrad.addColorStop(1, '#5856D6');
        ctx.beginPath(); ctx.roundRect(bx, by, 600*progress, 12, 6);
        ctx.fillStyle = barGrad; ctx.fill();
    }

    drawInside(ctx) {
        const b = this.depts[this.curBuilding], f = b.floors[this.curFloor];
        const nd = f.allNodes;
        const n = f.nRooms;

        // Floor texture
        const img = this.images[f.img];
        if (img && img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, SCREEN_W, SCREEN_H);

        // Draw corridor line
        if (n > 0 && nd.length > n) {
            const xs = nd.slice(n).map(p => p.x);
            const minX = Math.min(...xs) - 40, maxX = Math.max(...xs) + 40;
            ctx.beginPath(); ctx.moveTo(minX, f.corridorY); ctx.lineTo(maxX, f.corridorY);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 3; ctx.setLineDash([8,6]); ctx.stroke();
            ctx.setLineDash([]);
            for (let i = n; i < nd.length; i++) {
                ctx.beginPath(); ctx.arc(nd[i].x, nd[i].y, 4, 0, Math.PI*2);
                ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
            }
        }

        // Draw room-to-corridor connections (subtle)
        for (let i = 0; i < n; i++) {
            const ci = f.roomToCorr[i];
            ctx.beginPath(); ctx.moveTo(nd[i].x, nd[i].y); ctx.lineTo(nd[ci].x, nd[ci].y);
            ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2; ctx.stroke();
        }

        // Interior path lines (animated)
        if (this.intPath && this.intPath.pathSize > 1) {
            ctx.save();
            for (let i = 0; i < this.intPath.pathSize - 1; i++) {
                const a = nd[this.intPath.path[i]], b = nd[this.intPath.path[i+1]];
                // Glow
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = 'rgba(255,165,0,0.2)'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();
                // Solid
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = 'rgba(255,165,0,0.8)'; ctx.lineWidth = 4; ctx.stroke();
                // Animated dashes
                ctx.setLineDash([10, 7]); ctx.lineDashOffset = -this.time * 60;
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
                ctx.setLineDash([]); ctx.lineDashOffset = 0;
            }
            ctx.restore();
        }

        // Rooms (enhanced with gradients)
        for (let i = 0; i < n; i++) {
            const rm = f.rooms[i];
            const isTarget = i === this.targetRoom;
            let c = rm.color, r = NODE_RADIUS;
            if (i === this.intSrc) { c = Theme.ADMIN; r += 2; }
            else if (i === this.intDest) { c = Theme.SPECIAL; r += 2; }
            else if (i === this.hoveredRoom || isTarget) { c = Theme.ACCENT; r += Math.sin(this.time*8)*3; }
            r = Math.max(1, r);
            // Shadow
            ctx.beginPath(); ctx.arc(rm.x+2, rm.y+2, r, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill();
            // Gradient
            const lc = lighten(c, 50);
            const grd = ctx.createRadialGradient(rm.x-r*0.25, rm.y-r*0.25, r*0.05, rm.x, rm.y, r);
            grd.addColorStop(0, rgba(lc)); grd.addColorStop(1, rgba(c));
            ctx.beginPath(); ctx.arc(rm.x, rm.y, r, 0, Math.PI*2);
            ctx.fillStyle = grd; ctx.fill();
            // Glow on active
            if (i === this.intSrc || i === this.intDest || i === this.hoveredRoom || isTarget) {
                ctx.shadowColor = rgba(c); ctx.shadowBlur = 14;
            }
            ctx.beginPath(); ctx.arc(rm.x, rm.y, r, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.shadowBlur = 0;
            // Label
            const tw = measureText(ctx, rm.name, 17);
            const px = rm.x-tw/2-6, py = rm.y+22, pw = tw+12, ph = 24;
            ctx.beginPath(); ctx.roundRect(px, py, pw, ph, Math.max(0, 0.4*Math.min(pw,ph)*0.5));
            ctx.fillStyle = 'rgba(25,25,40,0.85)'; ctx.fill();
            drawText(ctx, rm.name, rm.x-tw/2, py+3, 17, WHITE);
        }

        // Legend panel
        const legendItems = [
            {label:'Class', color:Theme.CLASS}, {label:'Lab', color:Theme.LAB},
            {label:'Office', color:Theme.OFFICE}, {label:'Admin', color:Theme.ADMIN},
            {label:'Utility', color:Theme.UTIL}, {label:'Special', color:Theme.SPECIAL},
        ];
        const lx = SCREEN_W-190, ly = 20;
        const lh = legendItems.length * 28 + 38;
        ctx.beginPath(); ctx.roundRect(lx, ly, 170, lh, 10);
        ctx.fillStyle = 'rgba(25,25,40,0.85)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke();
        drawText(ctx, 'LEGEND', lx+12, ly+8, 14, [140,140,160,255]);
        for (let i = 0; i < legendItems.length; i++) {
            ctx.beginPath(); ctx.arc(lx+20, ly+35+i*28, 6, 0, Math.PI*2);
            ctx.fillStyle = rgba(legendItems[i].color); ctx.fill();
            drawText(ctx, legendItems[i].label, lx+34, ly+27+i*28, 15, [210,210,220,255]);
        }

        // Info panel
        const ip = {x:20, y:SCREEN_H-80, w:800, h:60};
        const ipGrad = ctx.createLinearGradient(ip.x, ip.y, ip.x+ip.w, ip.y);
        ipGrad.addColorStop(0, 'rgba(25,25,45,0.92)'); ipGrad.addColorStop(1, 'rgba(40,40,65,0.92)');
        ctx.beginPath(); ctx.roundRect(ip.x, ip.y, ip.w, ip.h, 10);
        ctx.fillStyle = ipGrad; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.stroke();

        let infoText = `${b.name} \u2192 ${f.name}`;
        let infoColor = [200,200,220,255];
        if (this.intSrc !== -1 && this.intDest === -1) {
            infoText = `${f.rooms[this.intSrc].name} \u2192 Select destination`;
            infoColor = RED;
        } else if (this.intPath && this.intPath.pathSize > 1) {
            infoText = `${f.rooms[this.intSrc].name} \u2192 ${f.rooms[this.intDest].name} (${this.intPath.totalDist}m)`;
            infoColor = ORANGE;
        } else if (this.intSrc === -1) {
            infoText = `${b.name} \u2192 ${f.name}  |  Click a room to navigate`;
            infoColor = LIGHTGRAY;
        }
        drawText(ctx, infoText, ip.x+20, ip.y+16, 26, infoColor);

        // Back button
        const backHover = ptInRect(this.mx, this.my, SCREEN_W-170, SCREEN_H-75, 140, 50);
        ctx.beginPath(); ctx.roundRect(SCREEN_W-170, SCREEN_H-75, 140, 50, 10);
        ctx.fillStyle = backHover ? 'rgba(255,69,58,0.55)' : 'rgba(255,255,255,0.06)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.stroke();
        drawText(ctx, '\u2190 Back', SCREEN_W-152, SCREEN_H-62, 18, backHover ? WHITE : LIGHTGRAY);
        drawText(ctx, 'ESC', SCREEN_W-65, SCREEN_H-58, 12, [100,100,120,180]);

        // Design mode
        if (this.designMode) drawText(ctx, `X:${Math.round(this.mx)} Y:${Math.round(this.my)}`, this.mx+15, this.my, 18, GREEN);
    }

    // ====== MAIN LOOP ======
    loop() {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;
        this.update(dt);
        this.draw();
        this.positionSearch();
        requestAnimationFrame(() => this.loop());
    }

    start() { this.loop(); }
}

// ====== GLOBAL UI FUNCTIONS ======
function dismissWelcome() {
    const el = document.getElementById('welcome');
    el.classList.add('fade-out');
    setTimeout(() => el.style.display = 'none', 500);
}
function toggleCredits() {
    document.getElementById('credits-overlay').classList.toggle('active');
}

// ====== STARTUP ======
window.addEventListener('DOMContentLoaded', () => {
    const app = new App(document.getElementById('canvas'));
    app.start();
});
