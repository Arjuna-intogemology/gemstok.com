/* =============================================================
   GEMTRACE BACKGROUND ENGINE  v2.0
   gemtrace-bg.js

   Requires: gemtrace-bg.css
   Requires: parts/world-50m.json  (Natural Earth TopoJSON)

   Add to any project via engine.js:
     const link = document.createElement('link');
     link.rel = 'stylesheet'; link.href = 'parts/gemtrace-bg.css';
     document.head.appendChild(link);
     const s = document.createElement('script');
     s.src = 'parts/gemtrace-bg.js';
     document.body.appendChild(s);
   ============================================================= */
(function () {
'use strict';

/* ── DOM ─────────────────────────────────────────────────────────────────── */
const CV  = document.createElement('canvas');
CV.id     = 'gemtrace-canvas';
const X   = CV.getContext('2d');

const LBL = document.createElement('div');
LBL.id    = 'gemtrace-label';
LBL.innerHTML = `GemLog<span>Global Supply Intelligence<br>
    Brought to you by GemLogBook.com<br>
    <p><strong>System Status:</strong> Simulation Mode (v1.0)</p>
    Real-time blockchain integration scheduled for Q3 2026.</span>`;
    
/* ── DIMENSIONS ──────────────────────────────────────────────────────────── */
let W, H, DPR;
let mapPaths = [], rawGeoFeatures = [];



function boot() {
  document.body.insertBefore(CV, document.body.firstChild);
  document.body.appendChild(LBL);
  resize();
  loadMap();
}
if (document.body) boot();
else document.addEventListener('DOMContentLoaded', boot);


function resize() {
  DPR = window.devicePixelRatio || 1;
  W   = window.innerWidth;
  H   = window.innerHeight;
  CV.width  = W * DPR; CV.height = H * DPR;
  CV.style.width = W + 'px'; CV.style.height = H + 'px';
  X.setTransform(DPR, 0, 0, DPR, 0, 0);
  buildMapPaths();
}
window.addEventListener('resize', resize);

/* ── MERCATOR ────────────────────────────────────────────────────────────── */
const PX = 0.055, PY = 0.085;
function project(lon, lat) {
  const uw = W * (1 - 2 * PX);
  const uh = H * (1 - 2 * PY);
  const x  = (lon + 180) / 360 * uw + W * PX;
  const r  = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
  const n  = Math.log(Math.tan(Math.PI / 4 + r / 2));
  const y  = H * PY + uh / 2 - n * uh / (2 * Math.PI) * 2.4;
  return [x, y];
}

/* ── TOPOJSON DECODER ────────────────────────────────────────────────────── */
function topoFeature(topology, object) {
  const arcs = topology.arcs;
  const sc   = topology.transform ? topology.transform.scale     : [1,1];
  const tr   = topology.transform ? topology.transform.translate : [0,0];

  function decodeArc(idx) {
    const rev = idx < 0;
    const raw = arcs[rev ? ~idx : idx];
    let x = 0, y = 0;
    const pts = raw.map(([dx,dy]) => { x+=dx; y+=dy; return [x*sc[0]+tr[0], y*sc[1]+tr[1]]; });
    return rev ? pts.slice().reverse() : pts;
  }
  function decodeRing(ring) {
    const pts = [];
    ring.forEach(i => decodeArc(i).forEach((pt,j) => { if (j===0&&pts.length) return; pts.push(pt); }));
    return pts;
  }
  function toFeat(g) {
    if (!g) return null;
    if (g.type==='Polygon')      return {type:'Feature',geometry:{type:'Polygon',     coordinates:g.arcs.map(decodeRing)}};
    if (g.type==='MultiPolygon') return {type:'Feature',geometry:{type:'MultiPolygon',coordinates:g.arcs.map(p=>p.map(decodeRing))}};
    return null;
  }
  if (object.type==='GeometryCollection')
    return {type:'FeatureCollection', features:object.geometries.map(toFeat).filter(Boolean)};
  return toFeat(object);
}

/* ── LOAD MAP ────────────────────────────────────────────────────────────── */
function loadMap() {
  const _base = document.currentScript ? document.currentScript.src.replace(/\/[^/]+$/, '/') : '';
fetch(_base + 'world-50m.json')
    .then(r => { if (!r.ok) throw new Error('world-50m.json not found'); return r.json(); })
    .then(topo => {
      const obj = topo.objects.land || topo.objects.countries;
      const col = topoFeature(topo, obj);
      rawGeoFeatures = col.features ? col.features : [col];
      buildMapPaths();
      requestAnimationFrame(frame);
    })
    .catch(e => { console.warn('GemTrace:', e.message); requestAnimationFrame(frame); });
}

function buildMapPaths() {
  if (!rawGeoFeatures.length) return;
  mapPaths = [];
  for (const feat of rawGeoFeatures) {
    if (!feat||!feat.geometry) continue;
    const p = new Path2D();
    const polys = feat.geometry.type==='Polygon' ? [feat.geometry.coordinates] : feat.geometry.coordinates;
    for (const poly of polys) {
      for (const ring of poly) {
        if (ring.length < 4) continue;
        let first = true, prevPx = null, hasWrap = false;
        for (const [lon,lat] of ring) {
          const [px,py] = project(lon,lat);
          if (first) { p.moveTo(px,py); first=false; }
          else if (prevPx!==null && Math.abs(px-prevPx) > W*0.3) {
            p.moveTo(px,py);
            hasWrap = true;
          }
          else p.lineTo(px,py);
          prevPx = px;
        }
        if (!hasWrap) p.closePath();
      }
    }
    mapPaths.push(p);
  }
}
/* ── DRAW MAP ────────────────────────────────────────────────────────────── */
function drawMap() {
  if (!mapPaths.length) return;
  X.save();
  X.lineJoin = 'round';
  // Pass 1 — ocean bleed glow
  X.strokeStyle = 'rgba(255,255,255,0.005)';
  X.lineWidth   = 3.5;
  X.shadowColor = 'rgba(255,255,255,0.3)';
  X.shadowBlur  = 20;
  for (const p of mapPaths) X.stroke(p);
  // Pass 2 — crisp coastline
  X.strokeStyle = 'rgba(255,255,255,0.2)';
  X.lineWidth   = 0.5;
  X.shadowColor = 'rgba(255,255,255,0.15)';
  X.shadowBlur  = 3;
  for (const p of mapPaths) X.stroke(p);
  X.restore();
}

/* ── NODES ───────────────────────────────────────────────────────────────── */
const ORIGINS = [
  { name:'Colombo',    lon:79.86,  lat:6.93   },
  { name:'Naypyidaw',  lon:96.13,  lat:19.74  },
  { name:'Brasília',   lon:-47.93, lat:-15.78 },
  { name:'Lusaka',     lon:28.28,  lat:-15.42 },
  { name:'Moscow',     lon:37.62,  lat:55.75  },
  { name:'Canberra',   lon:149.13, lat:-35.28 },
  { name:'Jaipur',     lon:75.79,  lat:26.91  },
  { name:'Bogotá',     lon:-74.07, lat:4.71   },
];
const MARKETS = [
  { name:'Bangkok',    lon:100.52, lat:13.76  },
  { name:'Dubai',      lon:55.30,  lat:25.20  },
  { name:'Geneva',     lon:6.14,   lat:46.20  },
  { name:'Hong Kong',  lon:114.17, lat:22.32  },
  { name:'New York',   lon:-74.00, lat:40.71  },
  { name:'Mumbai',     lon:72.88,  lat:19.08  },
  { name:'Singapore',  lon:103.82, lat:1.35   },
  { name:'London',     lon:-0.13,  lat:51.51  },
  { name:'Zurich',     lon:8.54,   lat:47.37  },
  { name:'Luxembourg', lon:6.13,   lat:49.61  },
  { name:'Monaco',     lon:7.42,   lat:43.73  },
  { name:'Abu Dhabi',  lon:54.37,  lat:24.45  },
];

// Icon pool — fully random per route, any city
const ICON_POOL    = ['ring','necklace','tiara','bracelet','blockchain','padlock','microscope','book'];
const GEM_CUTS     = ['brilliant','oval','pear','cushion','marquise','emerald'];
const CRYSTAL_TYPES= ['hexprism','octahedron','rhombo','prism','blocky','elongated'];

function npos(n) { return project(n.lon, n.lat); }

/* ── UTILS ───────────────────────────────────────────────────────────────── */
const rand  = (a,b) => a + Math.random()*(b-a);
const pick  = a => a[Math.floor(Math.random()*a.length)];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
function bez(t,ax,ay,bx,by,cx,cy) {
  const m=1-t; return {x:m*m*ax+2*m*t*bx+t*t*cx, y:m*m*ay+2*m*t*by+t*t*cy};
}

/* ── ICON CONSTANTS ──────────────────────────────────────────────────────── */
const ICON_OFFSET = 20;  // icon center this many px above dot
const S = 10;            // universal icon half-size (fits 20px radius bounding)

/* ── ICON STYLE HELPER ───────────────────────────────────────────────────── */
function iStyle(alpha, color) {
  X.globalAlpha = clamp(alpha, 0, 1);
  X.strokeStyle = color || '#ffffff';
  X.fillStyle   = color || '#ffffff';
  X.lineWidth   = 0.75;
  X.lineCap     = 'round';
  X.lineJoin    = 'round';
  X.shadowColor = color || 'rgba(255,255,255,0.25)';
  X.shadowBlur  = 5;
}

/* ── CRYSTAL ROUGH GEMS (6 types, all geometric) ─────────────────────────── */
function drawCrystal(type, cx, cy, alpha) {
  if (alpha <= 0) return;
  X.save(); iStyle(alpha);

  switch (type) {

    case 'hexprism': {
      // Hexagonal prism — top face + side columns
      const r = S*0.75, ry = r*0.42, drop = S*0.7;
      const pts = [];
      for (let i=0;i<6;i++) {
        const a = i/6*Math.PI*2 - Math.PI/6;
        pts.push([cx+Math.cos(a)*r, cy-S*0.2+Math.sin(a)*ry]);
      }
      // top face
      X.beginPath();
      pts.forEach(([px,py],i) => i===0?X.moveTo(px,py):X.lineTo(px,py));
      X.closePath(); X.stroke();
      // bottom face
      X.beginPath();
      pts.forEach(([px,py],i) => i===0?X.moveTo(px,py+drop):X.lineTo(px,py+drop));
      X.closePath(); X.stroke();
      // visible vertical edges
      for (let i=0;i<6;i++) {
        if (pts[i][0] >= cx - r*0.1) { // only front-facing edges
          X.beginPath(); X.moveTo(pts[i][0],pts[i][1]); X.lineTo(pts[i][0],pts[i][1]+drop); X.stroke();
        }
      }
      break;
    }

    case 'octahedron': {
      // Two pyramids base to base — diamond/spinel
      const w=S*0.82;
      X.beginPath();
      X.moveTo(cx,   cy-S);   // top apex
      X.lineTo(cx+w, cy);     // right
      X.lineTo(cx,   cy+S);   // bottom apex
      X.lineTo(cx-w, cy);     // left
      X.closePath(); X.stroke();
      // equator
      X.beginPath(); X.moveTo(cx-w,cy); X.lineTo(cx+w,cy); X.stroke();
      // depth lines (faint)
      X.globalAlpha *= 0.4;
      X.beginPath(); X.moveTo(cx,cy-S); X.lineTo(cx+w*0.35,cy-S*0.3); X.lineTo(cx+w,cy); X.stroke();
      X.beginPath(); X.moveTo(cx,cy+S); X.lineTo(cx+w*0.35,cy+S*0.3); X.lineTo(cx+w,cy); X.stroke();
      break;
    }

    case 'rhombo': {
      // Rhombohedron — ruby/sapphire corundum structure (tilted cube)
      const tilt=S*0.38;
      // front face
      X.beginPath();
      X.moveTo(cx-S+tilt, cy-S*0.48);
      X.lineTo(cx+S*0.6+tilt, cy-S*0.48);
      X.lineTo(cx+S*0.6,      cy+S*0.48);
      X.lineTo(cx-S,          cy+S*0.48);
      X.closePath(); X.stroke();
      // top face
      X.beginPath();
      X.moveTo(cx-S+tilt,     cy-S*0.48);
      X.lineTo(cx+S*0.6+tilt, cy-S*0.48);
      X.lineTo(cx+S*0.3+tilt, cy-S);
      X.lineTo(cx-S*0.3+tilt, cy-S);
      X.closePath(); X.stroke();
      // top-left edge
      X.beginPath(); X.moveTo(cx-S+tilt,cy-S*0.48); X.lineTo(cx-S*0.3+tilt,cy-S); X.stroke();
      break;
    }

    case 'prism': {
      // Prismatic column with termination cap — quartz
      const hw=S*0.48;
      // body
      X.beginPath();
      X.moveTo(cx-hw, cy-S*0.1);
      X.lineTo(cx+hw, cy-S*0.1);
      X.lineTo(cx+hw, cy+S*0.75);
      X.lineTo(cx-hw, cy+S*0.75);
      X.closePath(); X.stroke();
      // termination (pointed cap)
      X.beginPath();
      X.moveTo(cx-hw,    cy-S*0.1);
      X.lineTo(cx-hw*0.4,cy-S*0.7);
      X.lineTo(cx,       cy-S);
      X.lineTo(cx+hw*0.4,cy-S*0.7);
      X.lineTo(cx+hw,    cy-S*0.1);
      X.stroke();
      // faint striation
      X.globalAlpha *= 0.35;
      X.beginPath(); X.moveTo(cx,cy-S*0.1); X.lineTo(cx,cy+S*0.75); X.stroke();
      break;
    }

    case 'blocky': {
      // Irregular blocky cleavage — rough diamond/tanzanite
      X.beginPath();
      X.moveTo(cx-S,       cy-S*0.55);
      X.lineTo(cx+S*0.3,   cy-S*0.55);   // top — notch
      X.lineTo(cx+S*0.3,   cy-S*0.1);
      X.lineTo(cx+S,       cy-S*0.1);
      X.lineTo(cx+S,       cy+S*0.55);
      X.lineTo(cx-S*0.4,   cy+S*0.55);
      X.lineTo(cx-S*0.4,   cy+S*0.15);
      X.lineTo(cx-S,       cy+S*0.15);
      X.closePath(); X.stroke();
      // cleavage crack
      X.beginPath();
      X.moveTo(cx+S*0.3,   cy-S*0.55);
      X.lineTo(cx+S*0.62,  cy-S*0.92);
      X.stroke();
      break;
    }

    case 'elongated': {
      // Elongated oval — tumbled stone (only curved form)
      X.beginPath();
      X.ellipse(cx, cy, S*0.52, S, 0, 0, Math.PI*2);
      X.stroke();
      // subtle highlight line
      X.globalAlpha *= 0.3;
      X.beginPath();
      X.ellipse(cx-S*0.1, cy-S*0.15, S*0.2, S*0.45, -0.3, 0, Math.PI*2);
      X.stroke();
      break;
    }
  }
  X.restore();
}

/* ── POLISHED GEM OUTLINES (slow rotation) ───────────────────────────────── */
function drawGem(type, cx, cy, alpha, angle) {
  if (alpha <= 0) return;
  X.save(); iStyle(alpha);
  X.translate(cx,cy); X.rotate(angle||0);
  const g = S*0.92;
  X.beginPath();
  switch(type) {
    case 'brilliant': X.arc(0,0,g,0,Math.PI*2); break;
    case 'oval':      X.ellipse(0,0,g,g*0.68,0,0,Math.PI*2); break;
    case 'pear':
      X.moveTo(0,g);
      X.bezierCurveTo( g*.88,g*.3,  g*.88,-g*.55, 0,-g*.52);
      X.bezierCurveTo(-g*.88,-g*.55,-g*.88,g*.3,  0, g);
      break;
    case 'cushion': X.roundRect(-g,-g,g*2,g*2,g*0.38); break;
    case 'marquise':
      X.moveTo(0,-g);
      X.bezierCurveTo( g*.9,-g*.4, g*.9,g*.4,  0, g);
      X.bezierCurveTo(-g*.9, g*.4,-g*.9,-g*.4, 0,-g);
      break;
    case 'emerald': {
      const w=g*1.15,h=g*0.75,c=g*0.3;
      X.moveTo(-w+c,-h); X.lineTo(w-c,-h); X.lineTo(w,-h+c); X.lineTo(w,h-c);
      X.lineTo(w-c,h);   X.lineTo(-w+c,h); X.lineTo(-w,h-c);  X.lineTo(-w,-h+c);
      X.closePath(); break;
    }
  }
  X.stroke(); X.restore();
}

/* ── JEWELRY ─────────────────────────────────────────────────────────────── */
function drawJewelry(type, cx, cy, alpha) {
  if (alpha <= 0) return;
  X.save(); iStyle(alpha);

  switch(type) {
    case 'ring':
      X.beginPath(); X.ellipse(cx,cy+S*.3,S*.6,S*.28,0,0,Math.PI*2); X.stroke();
      X.beginPath();
      X.moveTo(cx-S*.6,cy+S*.3); X.lineTo(cx-S*.44,cy-S*.2);
      X.moveTo(cx+S*.6,cy+S*.3); X.lineTo(cx+S*.44,cy-S*.2);
      X.stroke();
      X.beginPath();
      X.moveTo(cx-S*.44,cy-S*.2); X.lineTo(cx-S*.36,cy-S*.52);
      X.lineTo(cx+S*.36,cy-S*.52); X.lineTo(cx+S*.44,cy-S*.2);
      X.stroke();
      X.beginPath(); X.arc(cx,cy-S*.82,S*.3,0,Math.PI*2); X.stroke();
      break;

    case 'necklace':
      X.beginPath(); X.arc(cx,cy-S*.55,S*.7,0.38,Math.PI-0.38); X.stroke();
      X.beginPath(); X.moveTo(cx,cy-S*.02); X.lineTo(cx,cy+S*.16); X.stroke();
      X.beginPath();
      X.moveTo(cx,cy+S*.88);
      X.bezierCurveTo(cx+S*.48,cy+S*.52,cx+S*.48,cy+S*.16,cx,cy+S*.16);
      X.bezierCurveTo(cx-S*.48,cy+S*.16,cx-S*.48,cy+S*.52,cx,cy+S*.88);
      X.stroke();
      break;

    case 'tiara': {
      X.beginPath(); X.arc(cx,cy+S*.45,S*.82,Math.PI+0.32,2*Math.PI-0.32); X.stroke();
      const angs=[Math.PI+0.32,Math.PI+0.64,Math.PI*1.5,2*Math.PI-0.64,2*Math.PI-0.32];
      const hs  =[S*.4,S*.6,S*.88,S*.6,S*.4];
      for (let i=0;i<5;i++) {
        const a=angs[i];
        const bx=cx+Math.cos(a)*S*.82, by=cy+S*.45+Math.sin(a)*S*.82;
        const tx=bx+Math.cos(a)*hs[i], ty=by+Math.sin(a)*hs[i];
        X.beginPath(); X.moveTo(bx,by); X.lineTo(tx,ty); X.stroke();
        if (hs[i]>=S*.55) { X.beginPath(); X.arc(tx,ty,1.8,0,Math.PI*2); X.stroke(); }
      }
      break;
    }

    case 'bracelet':
      X.beginPath(); X.arc(cx,cy,S*.7,0.52,Math.PI-0.52); X.stroke();
      X.beginPath(); X.arc(cx,cy,S*.7,Math.PI+0.52,2*Math.PI-0.52); X.stroke();
      X.beginPath(); X.arc(cx,cy-S*.7,S*.22,0,Math.PI*2); X.stroke();
      for (const a of [Math.PI*.2,Math.PI*.8]) {
        const bx=cx+Math.cos(-Math.PI/2+a)*S*.7, by=cy+Math.sin(-Math.PI/2+a)*S*.7;
        X.beginPath(); X.arc(bx,by,1.5,0,Math.PI*2); X.stroke();
      }
      break;
  }
  X.restore();
}

/* ── BLOCKCHAIN (4 isometric cubes, sequential light-up) ─────────────────── */
function drawBlockchain(cx, cy, alpha, now) {
  if (alpha <= 0) return;
  X.save();
  const cs  = S*0.58;   // cube half-size
  const gap = S*0.28;
  const total = 4*(cs*2) + 3*gap;
  const sx  = cx - total/2 + cs;
  const phase = Math.floor(now/320) % 4;

  for (let i=0;i<4;i++) {
    const bx  = sx + i*(cs*2+gap);
    const lit = i===phase;
    X.globalAlpha = lit ? clamp(alpha,0,1) : clamp(alpha*0.38,0,1);
    X.strokeStyle = '#ffffff';
    X.lineWidth   = 0.75;
    X.shadowColor = lit ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.08)';
    X.shadowBlur  = lit ? 9 : 2;

    const tx=cs*0.55, ty=cs*0.55; // iso top offset
    // front face
    X.beginPath(); X.rect(bx-cs, cy-cs, cs*2, cs*2); X.stroke();
    // top face
    X.beginPath();
    X.moveTo(bx-cs,  cy-cs);
    X.lineTo(bx-cs+tx, cy-cs-ty);
    X.lineTo(bx+cs+tx, cy-cs-ty);
    X.lineTo(bx+cs,    cy-cs);
    X.stroke();
    // right face
    X.beginPath();
    X.moveTo(bx+cs,    cy-cs);
    X.lineTo(bx+cs+tx, cy-cs-ty);
    X.lineTo(bx+cs+tx, cy+cs-ty);
    X.lineTo(bx+cs,    cy+cs);
    X.stroke();

    // connector
    if (i<3) {
      X.globalAlpha = clamp(alpha*0.3,0,1);
      X.shadowBlur  = 0;
      X.beginPath(); X.moveTo(bx+cs,cy); X.lineTo(bx+cs+gap,cy); X.stroke();
    }
  }
  X.restore();
}

/* ── PADLOCK ─────────────────────────────────────────────────────────────── */
function drawPadlock(cx, cy, alpha) {
  if (alpha <= 0) return;
  X.save(); iStyle(alpha);
  // shackle arch
  X.beginPath(); X.arc(cx, cy-S*.3, S*.38, Math.PI, 0); X.stroke();
  // body rectangle
  X.beginPath(); X.roundRect(cx-S*.5, cy-S*.18, S, S*.88, S*.1); X.stroke();
  // keyhole circle
  X.beginPath(); X.arc(cx, cy+S*.18, S*.13, 0, Math.PI*2); X.stroke();
  // keyhole stem
  X.beginPath(); X.moveTo(cx, cy+S*.31); X.lineTo(cx, cy+S*.52); X.stroke();
  X.restore();
}

/* ── MICROSCOPE ──────────────────────────────────────────────────────────── */
function drawMicroscope(cx, cy, alpha) {
  if (alpha <= 0) return;
  X.save(); iStyle(alpha);
  // eyepiece
  X.beginPath(); X.rect(cx-S*.17, cy-S, S*.34, S*.26); X.stroke();
  // arm tube
  X.beginPath(); X.moveTo(cx, cy-S*.74); X.lineTo(cx, cy-S*.1); X.stroke();
  // objective
  X.beginPath(); X.rect(cx-S*.2, cy-S*.1, S*.4, S*.3); X.stroke();
  // stage
  X.beginPath(); X.moveTo(cx-S*.52, cy+S*.26); X.lineTo(cx+S*.52, cy+S*.26); X.stroke();
  // base legs
  X.beginPath();
  X.moveTo(cx-S*.52, cy+S*.26);
  X.lineTo(cx-S*.34, cy+S*.72);
  X.lineTo(cx+S*.34, cy+S*.72);
  X.lineTo(cx+S*.52, cy+S*.26);
  X.stroke();
  // focus knob
  X.beginPath(); X.arc(cx+S*.4, cy+S*.06, S*.13, 0, Math.PI*2); X.stroke();
  X.restore();
}

/* ── BOOK ────────────────────────────────────────────────────────────────── */
function drawBook(cx, cy, alpha) {
  if (alpha <= 0) return;
  X.save(); iStyle(alpha);
  // spine
  X.beginPath(); X.moveTo(cx-S*.07,cy-S*.82); X.lineTo(cx-S*.07,cy+S*.82); X.stroke();
  // front cover
  X.beginPath();
  X.moveTo(cx-S*.07,cy-S*.82); X.lineTo(cx+S*.65,cy-S*.7);
  X.lineTo(cx+S*.65,cy+S*.7);  X.lineTo(cx-S*.07,cy+S*.82);
  X.stroke();
  // back cover
  X.beginPath();
  X.moveTo(cx-S*.07,cy-S*.82); X.lineTo(cx-S*.65,cy-S*.7);
  X.lineTo(cx-S*.65,cy+S*.7);  X.lineTo(cx-S*.07,cy+S*.82);
  X.stroke();
  // page lines
  X.globalAlpha *= 0.38;
  for (const oy of [-S*.28, S*.02, S*.32]) {
    X.beginPath();
    X.moveTo(cx+S*.06, cy+oy); X.lineTo(cx+S*.54, cy+oy+S*.04);
    X.stroke();
  }
  X.restore();
}

/* ── ICON DISPATCHER ─────────────────────────────────────────────────────── */
function drawIcon(type, cx, cy, alpha, now) {
  switch(type) {
    case 'ring': case 'necklace': case 'tiara': case 'bracelet':
      drawJewelry(type,cx,cy,alpha); break;
    case 'blockchain':
      drawBlockchain(cx,cy,alpha,now); break;
    case 'padlock':
      drawPadlock(cx,cy,alpha); break;
    case 'microscope':
      drawMicroscope(cx,cy,alpha); break;
    case 'book':
      drawBook(cx,cy,alpha); break;
  }
}

/* ── LABEL ───────────────────────────────────────────────────────────────── */
function drawLabel(txt, x, y, alpha) {
  if (alpha <= 0) return;
  X.save();
  X.globalAlpha = clamp(alpha,0,1);
  X.font        = '7px "Courier New",monospace';
  X.fillStyle   = 'rgba(255,255,255,0.55)';
  X.textAlign   = 'center';
  X.shadowColor = 'rgba(0,0,0,0.9)'; X.shadowBlur = 4;
  X.fillText(txt.toUpperCase(), x, y);
  X.restore();
}

/* ── CHECKMARK ───────────────────────────────────────────────────────────── */
function drawCheck(cx, cy, alpha) {
  if (alpha <= 0) return;
  X.save(); X.globalAlpha=clamp(alpha,0,1);
  X.strokeStyle='rgba(255,255,255,.55)'; X.lineWidth=0.7; X.lineCap='round';
  X.beginPath(); X.moveTo(cx-4,cy); X.lineTo(cx-1,cy+3); X.lineTo(cx+4,cy-3);
  X.stroke(); X.restore();
}

/* ── BLOCKCHAIN TRACEBACK ────────────────────────────────────────────────── */
let tracebacks = [];

function spawnTraceback(route) {
  const count = Math.random() < 0.5 ? 1 : 2;
  const pool  = MARKETS.filter(m => m.name !== route.dest.name);
  const stops = [];
  for (let i=0;i<count;i++) {
    const m = pick(pool);
    if (!stops.find(s=>s.name===m.name)) stops.push(m);
  }
  const nodes    = [route.dest, ...stops, route.orig];
  const segments = [];
  for (let i=0;i<nodes.length-1;i++) {
    const [x1,y1]=npos(nodes[i]), [x2,y2]=npos(nodes[i+1]);
    segments.push({x1,y1,x2,y2});
  }
  tracebacks.push({ segments, segIdx:0, segT:0, drawn:[], phase:'draw', pulseN:0, pulseT:0 });
}

function updateTracebacks(dt) {
  tracebacks = tracebacks.filter(tb => {
    if (tb.phase==='draw') {
      tb.segT += dt/550;
      if (tb.segT >= 1) {
        tb.drawn.push(tb.segments[tb.segIdx]);
        tb.segIdx++; tb.segT=0;
        if (tb.segIdx >= tb.segments.length) { tb.phase='pulse'; tb.pulseT=0; }
      }
      tb.drawn.forEach(seg => traceSegment(seg, 1));
      if (tb.segIdx < tb.segments.length) {
        const seg=tb.segments[tb.segIdx];
        traceSegment({
          x1:seg.x1, y1:seg.y1,
          x2:seg.x1+(seg.x2-seg.x1)*tb.segT,
          y2:seg.y1+(seg.y2-seg.y1)*tb.segT,
        }, 1);
      }
    } else {
      tb.pulseT += dt/380;
      const a = Math.abs(Math.sin(tb.pulseT*Math.PI));
      tb.drawn.forEach(seg => traceSegment(seg, a));
      if (tb.pulseT >= 1) { tb.pulseT=0; tb.pulseN++; }
      if (tb.pulseN >= 3) return false;
    }
    return true;
  });
}

function traceSegment(seg, a) {
  X.save();
  X.globalAlpha = a * 0.45;
  X.strokeStyle = '#00d9ff';
  X.lineWidth   = 0.8;
  X.setLineDash([3,5]);
  X.shadowColor = 'rgba(0,217,255,0.5)';
  X.shadowBlur  = 7;
  X.beginPath(); X.moveTo(seg.x1,seg.y1); X.lineTo(seg.x2,seg.y2);
  X.stroke(); X.setLineDash([]); X.restore();
}

/* ── SRI LANKA RADAR ─────────────────────────────────────────────────────── */
let slRings=[], slNext=0, slInterval=rand(28000,38000);

function updateRadar(now, dt) {
  if (now > slNext) {
    slNext = now + slInterval;
    slInterval = rand(28000,38000);
    for (let i=0;i<3;i++) slRings.push({r:0, maxR:Math.max(W,H)*1.25, age:-i*500, dur:4000});
  }
  const [slx,sly] = project(79.86,6.93);
  slRings = slRings.filter(ring => {
    ring.age += dt;
    if (ring.age < 0) return true;
    const t = ring.age/ring.dur;
    if (t >= 1) return false;
    X.save();
    X.globalAlpha = (1-t)*0.15;
    X.strokeStyle = 'rgba(255,255,255,0.9)';
    X.lineWidth   = 0.6;
    X.shadowColor = 'rgba(255,255,255,0.2)';
    X.shadowBlur  = 10;
    X.beginPath(); X.arc(slx, sly, ring.maxR*t, 0, Math.PI*2);
    X.stroke(); X.restore();
    return true;
  });
}

/* ── AMBIENT STATE ───────────────────────────────────────────────────────── */
let routes=[], pulses=[], microLines=[], verifyBlinks=[];
let lastRoute=0, routeIv=rand(4000,7000);
let lastPulse=0, pulseIv=rand(9000,15000);
let lastMicro=0, microIv=rand(3500,7000);
let lastBlink=0, blinkIv=rand(8000,14000);
let tabActive=true;
document.addEventListener('visibilitychange',()=>{ tabActive=!document.hidden; });

/* ── SPAWN ROUTE ─────────────────────────────────────────────────────────── */
function spawnRoute() {
  const orig=pick(ORIGINS), dest=pick(MARKETS);
  const [ox,oy]=npos(orig), [dx,dy]=npos(dest);
  const mx=(ox+dx)/2, my=(oy+dy)/2;
  const ddx=dx-ox, ddy=dy-oy;
  const len=Math.sqrt(ddx*ddx+ddy*ddy);
  const arc=Math.min(len*0.44,H*0.38);
  const cpx=mx-ddy/len*arc;
  const cpy=my+ddx/len*arc*0.08-arc*0.55;
  routes.push({
    orig,dest,ox,oy,dx,dy,cpx,cpy,
    stage:'spawn', st:0,
    tHead:0, tTail:0, headDone:false,
    dur: 3000+len*1.1,
    crystalType: pick(CRYSTAL_TYPES),
    gemCut:      pick(GEM_CUTS),
    iconType:    pick(ICON_POOL),
    gemAngle:    0,
    roughA:0,gemA:0,iconA:0,labelOrigA:0,labelDestA:0,
    traceSpawned:false,
  });
}

/* ── MAIN FRAME ──────────────────────────────────────────────────────────── */
let lastT=0;
function frame(now) {
  if (!tabActive) { requestAnimationFrame(frame); return; }
  const dt=Math.min(now-lastT,50); lastT=now;

  X.clearRect(0,0,W,H);
  X.fillStyle='#090909'; X.fillRect(0,0,W,H);

  drawMap();
  updateRadar(now,dt);

  // micro lines
  microLines=microLines.filter(l=>{
    l.age+=dt; const t=l.age/l.dur; if(t>=1) return false;
    X.save(); X.globalAlpha=Math.sin(Math.PI*t)*0.07;
    X.strokeStyle='rgba(170,168,158,0.9)'; X.lineWidth=0.4; X.setLineDash([2,7]);
    X.beginPath(); X.moveTo(l.x1,l.y1); X.lineTo(l.x2,l.y2); X.stroke();
    X.setLineDash([]); X.restore(); return true;
  });

  // pulses
  pulses=pulses.filter(p=>{
    p.age+=dt; const t=p.age/p.dur; if(t>=1) return false;
    const r=p.maxR*(t<.5?2*t*t:-1+(4-2*t)*t);
    X.save(); X.globalAlpha=(1-t)*0.18;
    X.strokeStyle='rgba(255,255,255,0.7)'; X.lineWidth=0.5;
    X.beginPath(); X.arc(p.x,p.y,r,0,Math.PI*2); X.stroke(); X.restore(); return true;
  });

  // verify blinks
  verifyBlinks=verifyBlinks.filter(b=>{
    b.age+=dt; const t=b.age/b.dur; if(t>=1) return false;
    drawCheck(b.x,b.y-16,Math.sin(Math.PI*t)*0.55); return true;
  });

  // origin nodes
  for (const o of ORIGINS) {
    const [x,y]=npos(o);
    X.save(); X.globalAlpha=0.065+0.022*Math.sin(now/1000+o.lon);
    const g=X.createRadialGradient(x,y,0,x,y,11);
    g.addColorStop(0,'rgba(255,255,255,0.5)'); g.addColorStop(1,'transparent');
    X.fillStyle=g; X.beginPath(); X.arc(x,y,11,0,Math.PI*2); X.fill(); X.restore();
    X.save(); X.globalAlpha=0.7; X.fillStyle='#fff';
    X.beginPath(); X.arc(x,y,1.6,0,Math.PI*2); X.fill(); X.restore();
  }

  // market nodes
  for (const m of MARKETS) {
    const [x,y]=npos(m);
    X.save(); X.globalAlpha=0.15; X.fillStyle='#fff';
    X.beginPath(); X.arc(x,y,1.1,0,Math.PI*2); X.fill(); X.restore();
  }

  // tracebacks
  updateTracebacks(dt);

  // routes
  routes=routes.filter(r=>{
    r.st+=dt; let keep=true;

    // icon/crystal: ICON_OFFSET px above dot
    // label: 12px below dot
    const ix=r.dx,  iy=r.dy-ICON_OFFSET, ly=r.dy+12;
    const ox2=r.ox, oy2=r.oy-ICON_OFFSET, oly=r.oy+12;

    if (r.stage==='spawn') {
      r.roughA    =clamp(r.st/400,0,1);
      r.labelOrigA=clamp(r.st/400,0,1);
      drawCrystal(r.crystalType,ox2,oy2,r.roughA*.85);
      drawLabel(r.orig.name,r.ox,oly,r.labelOrigA*.7);
      if (r.st>650) { r.stage='transit'; r.st=0; }

    } else if (r.stage==='transit') {
      // Phase 1: head extends to dest (tail stays at 0)
      // Phase 2: head parked at dest, tail chases
      if (!r.headDone) {
        r.tHead = clamp(r.st/r.dur,0,1);
        r.tTail = 0;
        if (r.tHead >= 1) { r.headDone=true; r.st=0; }
      } else {
        r.tHead = 1;
        r.tTail = clamp(r.st/(r.dur*0.55),0,1);
        if (r.tTail >= 1) { r.stage='arrive'; r.st=0; }
      }

      // snake line
      if (r.tHead > 0.005) {
        const NS=120;
        const i0=Math.floor(r.tTail*NS), i1=Math.ceil(r.tHead*NS);
        X.save();
        X.strokeStyle='rgba(255,255,255,0.88)'; X.lineWidth=0.9; X.lineCap='round';
        X.shadowColor='rgba(255,255,255,0.2)'; X.shadowBlur=3;
        X.beginPath();
        for (let i=i0;i<=i1;i++) {
          const {x,y}=bez(i/NS,r.ox,r.oy,r.cpx,r.cpy,r.dx,r.dy);
          i===i0?X.moveTo(x,y):X.lineTo(x,y);
        }
        X.stroke(); X.restore();
      }
      drawCrystal(r.crystalType,ox2,oy2,r.roughA*.85);
      drawLabel(r.orig.name,r.ox,oly,r.labelOrigA*.65);

    } else if (r.stage==='arrive') {
      r.roughA    =clamp(1-r.st/500,0,1);
      r.labelOrigA=clamp(1-r.st/500,0,1);
      r.gemA      =clamp(r.st/500,0,1);
      r.labelDestA=clamp(r.st/400,0,1);
      r.gemAngle +=dt*0.00042;
      drawCrystal(r.crystalType,ox2,oy2,r.roughA*.85);
      drawLabel(r.orig.name,r.ox,oly,r.labelOrigA*.65);
      drawGem(r.gemCut,ix,iy,r.gemA,r.gemAngle);
      drawLabel(r.dest.name,r.dx,ly,r.labelDestA*.7);
      if (r.st>2000) { r.stage='transform'; r.st=0; }

    } else if (r.stage==='transform') {
      r.gemA =clamp(1-r.st/400,0,1);
      r.iconA=clamp((r.st-200)/450,0,1);
      r.labelDestA=1;
      r.gemAngle+=dt*0.00042;
      drawGem(r.gemCut,ix,iy,r.gemA,r.gemAngle);
      drawIcon(r.iconType,ix,iy,r.iconA,now);
      if (!r.traceSpawned && r.iconA>0.05) { spawnTraceback(r); r.traceSpawned=true; }
      drawLabel(r.dest.name,r.dx,ly,r.labelDestA*.7);
      if (r.st>2200) { r.stage='fade'; r.st=0; }

    } else if (r.stage==='fade') {
      const t=clamp(r.st/900,0,1);
      r.iconA=1-t; r.labelDestA=1-t;
      drawIcon(r.iconType,ix,iy,r.iconA,now);
      drawLabel(r.dest.name,r.dx,ly,r.labelDestA*.7);
      if (r.st>900) keep=false;
    }
    return keep;
  });

  // spawn timers
  if (now-lastRoute>routeIv) { lastRoute=now; routeIv=rand(4000,7000); if(routes.length<6) spawnRoute(); }
  if (now-lastPulse>pulseIv) { lastPulse=now; pulseIv=rand(9000,15000); const o=pick(ORIGINS);const [x,y]=npos(o); pulses.push({x,y,age:0,dur:2400,maxR:30}); }
  if (now-lastMicro>microIv) { lastMicro=now; microIv=rand(3500,7000); const all=[...ORIGINS,...MARKETS];const a=pick(all),b=pick(all);const [x1,y1]=npos(a),[x2,y2]=npos(b); microLines.push({x1,y1,x2,y2,age:0,dur:rand(700,1200)}); }
  if (now-lastBlink>blinkIv) { lastBlink=now; blinkIv=rand(8000,14000); const o=pick(ORIGINS);const [x,y]=npos(o); verifyBlinks.push({x,y,age:0,dur:1300}); }

  requestAnimationFrame(frame);
}

})();
