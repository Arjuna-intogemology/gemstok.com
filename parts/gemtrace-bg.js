(function () {
'use strict';

/* ── INJECT CSS ──────────────────────────────────────────────────────────────*/
const style = document.createElement('style');
style.textContent = `
  #gemtrace-canvas {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    z-index: -1.5;
    pointer-events: none;
    display: block;
  }
`;
document.head.appendChild(style);

/* ── INJECT CANVAS ───────────────────────────────────────────────────────────*/
const CV = document.createElement('canvas');
CV.id = 'gemtrace-canvas';
const X = CV.getContext('2d');
let W, H, DPR;
let mapPaths = [];
let rawGeoFeatures = [];

/* ── BOOT ────────────────────────────────────────────────────────────────────*/
function boot() {
  document.body.insertBefore(CV, document.body.firstChild);
  resize();
  loadMap();
}
if (document.body) { boot(); }
else { document.addEventListener('DOMContentLoaded', boot); }

/* ── RESIZE ──────────────────────────────────────────────────────────────────*/
function resize() {
  DPR = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  CV.width  = W * DPR;
  CV.height = H * DPR;
  CV.style.width  = W + 'px';
  CV.style.height = H + 'px';
  X.setTransform(DPR, 0, 0, DPR, 0, 0);
  buildMapPaths();
}
window.addEventListener('resize', resize);

/* ── MERCATOR PROJECTION ─────────────────────────────────────────────────────
   ONE function used for BOTH map coastlines AND node dots.
   This guarantees perfect alignment — nodes always sit on land.
─────────────────────────────────────────────────────────────────────────────*/
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

/* ── MINIMAL TOPOJSON DECODER ────────────────────────────────────────────────
   No CDN. No dependencies. Decodes world-50m.json directly.
─────────────────────────────────────────────────────────────────────────────*/
function topoFeature(topology, object) {
  const arcs      = topology.arcs;
  const transform = topology.transform;
  const scale     = transform ? transform.scale     : [1, 1];
  const translate = transform ? transform.translate : [0, 0];

  function decodeArc(arcIndex) {
    const reversed = arcIndex < 0;
    const raw = arcs[reversed ? ~arcIndex : arcIndex];
    let x = 0, y = 0;
    const pts = raw.map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
    return reversed ? pts.slice().reverse() : pts;
  }

  function decodeRing(ring) {
    const pts = [];
    ring.forEach(idx => {
      const decoded = decodeArc(idx);
      decoded.forEach((pt, i) => {
        if (i === 0 && pts.length) return; // skip duplicate junction
        pts.push(pt);
      });
    });
    return pts;
  }

  function toFeature(geom) {
    if (!geom) return null;
    if (geom.type === 'Polygon') {
      return { type:'Feature', geometry:{ type:'Polygon', coordinates: geom.arcs.map(decodeRing) }};
    }
    if (geom.type === 'MultiPolygon') {
      return { type:'Feature', geometry:{ type:'MultiPolygon', coordinates: geom.arcs.map(p => p.map(decodeRing)) }};
    }
    return null;
  }

  if (object.type === 'GeometryCollection') {
    return { type:'FeatureCollection', features: object.geometries.map(toFeature).filter(Boolean) };
  }
  return toFeature(object);
}

/* ── LOAD LOCAL MAP ──────────────────────────────────────────────────────────*/
function loadMap() {
  fetch('parts/world-50m.json')
    .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
    .then(topology => {
      // 'land' gives merged coastlines — cleanest outline
      const obj = topology.objects.land || topology.objects.countries;
      const collection = topoFeature(topology, obj);
      rawGeoFeatures = collection.features ? collection.features : [collection];
      buildMapPaths();
      requestAnimationFrame(frame);
    })
    .catch(err => {
      console.warn('GemTrace map:', err.message);
      requestAnimationFrame(frame); // run without map
    });
}

/* ── BUILD PATH2D FROM GEOJSON ───────────────────────────────────────────────*/
function buildMapPaths() {
  if (!rawGeoFeatures.length) return;
  mapPaths = [];
  for (const feature of rawGeoFeatures) {
    if (!feature || !feature.geometry) continue;
    const p    = new Path2D();
    const geom = feature.geometry;
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    for (const poly of polys) {
      for (const ring of poly) {
        if (ring.length < 4) continue; // skip degenerate rings (equator/antimeridian artifacts)
        let first = true;
        for (const [lon, lat] of ring) {
          const [px, py] = project(lon, lat);
          if (first) { p.moveTo(px, py); first = false; }
          else p.lineTo(px, py);
        }
        p.closePath();
      }
    }
    mapPaths.push(p);
  }
}

/* ── DRAW MAP ────────────────────────────────────────────────────────────────*/
function drawMap() {
  if (!mapPaths.length) return;
  X.save();
  X.fillStyle   = 'rgba(255,255,255,0.016)';
  X.strokeStyle = 'rgba(160,158,150,0.22)';
  X.lineWidth   = 0.65;
  X.lineJoin    = 'round';
  X.shadowColor = 'rgba(180,176,165,0.1)';
  X.shadowBlur  = 6;
  for (const p of mapPaths) { X.fill(p); X.stroke(p); }
  X.restore();
}

/* ── NODES ───────────────────────────────────────────────────────────────────*/
const ORIGINS = [
  { name:'Naypyidaw', lon:96.13,  lat:19.74  },
  { name:'Brasília',  lon:-47.93, lat:-15.78 },
  { name:'Lusaka',    lon:28.28,  lat:-15.42 },
  { name:'Moscow',    lon:37.62,  lat:55.75  },
  { name:'Canberra',  lon:149.13, lat:-35.28 },
];
const MARKETS = [
  { name:'Bangkok',   lon:100.52, lat:13.76,  type:'blockchain' },
  { name:'Dubai',     lon:55.30,  lat:25.20,  type:'vault'      },
  { name:'Geneva',    lon:6.14,   lat:46.20,  type:'jewelry'    },
  { name:'Hong Kong', lon:114.17, lat:22.32,  type:'blockchain' },
  { name:'New York',  lon:-74.00, lat:40.71,  type:'jewelry'    },
  { name:'Mumbai',    lon:72.88,  lat:19.08,  type:'blockchain' },
  { name:'Singapore', lon:103.82, lat:1.35,   type:'blockchain' },
  { name:'London',    lon:-0.13,  lat:51.51,  type:'jewelry'    },
];
const JEWELRY  = ['ring','necklace','tiara','bracelet'];
const GEM_CUTS = ['brilliant','oval','pear','cushion','heart','emerald'];

function npos(n) { return project(n.lon, n.lat); } // same project() = perfect alignment

/* ── UTILS ───────────────────────────────────────────────────────────────────*/
const rand  = (a,b) => a + Math.random()*(b-a);
const pick  = a => a[Math.floor(Math.random()*a.length)];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
function eio(t) { return t<.5?2*t*t:-1+(4-2*t)*t; }
function bez(t,ax,ay,bx,by,cx,cy) {
  const m=1-t;
  return {x:m*m*ax+2*m*t*bx+t*t*cx, y:m*m*ay+2*m*t*by+t*t*cy};
}

/* ── ICON STYLE ──────────────────────────────────────────────────────────────*/
function iStyle(alpha) {
  X.globalAlpha = alpha;
  X.strokeStyle = '#ffffff';
  X.lineWidth   = 0.7;
  X.lineCap     = 'round';
  X.lineJoin    = 'round';
  X.shadowColor = 'rgba(255,255,255,0.25)';
  X.shadowBlur  = 5;
}

/* ── ROUGH GEM ───────────────────────────────────────────────────────────────*/
const RPTS = [
  [0,-1],[0.52,-0.72],[0.92,-0.18],[0.78,0.52],[0.28,0.98],
  [-0.38,0.92],[-0.88,0.42],[-0.82,-0.32],[-0.42,-0.86]
];
function drawRoughGem(cx,cy,alpha,sz=10) {
  if (alpha<=0) return;
  X.save(); iStyle(alpha);
  const pts=RPTS.map(([px,py])=>({x:cx+px*sz,y:cy+py*sz}));
  const n=pts.length;
  X.beginPath();
  for (let i=0;i<n;i++) {
    const p0=pts[(i-1+n)%n],p1=pts[i],p2=pts[(i+1)%n];
    const mx1=(p0.x+p1.x)/2,my1=(p0.y+p1.y)/2;
    const mx2=(p1.x+p2.x)/2,my2=(p1.y+p2.y)/2;
    if (i===0) X.moveTo(mx1,my1);
    X.quadraticCurveTo(p1.x,p1.y,mx2,my2);
  }
  X.closePath(); X.stroke(); X.restore();
}

/* ── POLISHED GEM OUTLINES ───────────────────────────────────────────────────*/
function drawGem(type,cx,cy,alpha,sz=11) {
  if (alpha<=0) return;
  X.save(); iStyle(alpha);
  X.beginPath();
  switch(type) {
    case 'brilliant': X.arc(cx,cy,sz,0,Math.PI*2); break;
    case 'oval': X.ellipse(cx,cy,sz,sz*0.68,0,0,Math.PI*2); break;
    case 'pear':
      X.moveTo(cx,cy+sz);
      X.bezierCurveTo(cx+sz*.88,cy+sz*.3,  cx+sz*.88,cy-sz*.55,cx,cy-sz*.52);
      X.bezierCurveTo(cx-sz*.88,cy-sz*.55, cx-sz*.88,cy+sz*.3, cx,cy+sz);
      break;
    case 'cushion': X.roundRect(cx-sz,cy-sz,sz*2,sz*2,sz*.38); break;
    case 'heart': {
      const s=sz*.92;
      X.moveTo(cx,cy+s*.82);
      X.bezierCurveTo(cx-s*1.1,cy+s*.18,  cx-s*1.1,cy-s*.62,cx-s*.5,cy-s*.62);
      X.bezierCurveTo(cx-s*.15,cy-s*.62,  cx,cy-s*.28,       cx,cy-s*.28);
      X.bezierCurveTo(cx,cy-s*.28,        cx+s*.15,cy-s*.62, cx+s*.5,cy-s*.62);
      X.bezierCurveTo(cx+s*1.1,cy-s*.62,  cx+s*1.1,cy+s*.18, cx,cy+s*.82);
      break;
    }
    case 'emerald': {
      const w=sz*1.15,h=sz*.75,c=sz*.3;
      X.moveTo(cx-w+c,cy-h); X.lineTo(cx+w-c,cy-h);
      X.lineTo(cx+w,cy-h+c); X.lineTo(cx+w,cy+h-c);
      X.lineTo(cx+w-c,cy+h); X.lineTo(cx-w+c,cy+h);
      X.lineTo(cx-w,cy+h-c); X.lineTo(cx-w,cy-h+c);
      X.closePath(); break;
    }
  }
  X.stroke(); X.restore();
}

/* ── JEWELRY ─────────────────────────────────────────────────────────────────*/
function drawJewelry(type,cx,cy,alpha) {
  if (alpha<=0) return;
  X.save(); iStyle(alpha);
  switch(type) {
    case 'ring':
      X.beginPath(); X.ellipse(cx,cy+5,7.5,3.5,0,0,Math.PI*2); X.stroke();
      X.beginPath();
      X.moveTo(cx-7.5,cy+5); X.lineTo(cx-5.5,cy-2);
      X.moveTo(cx+7.5,cy+5); X.lineTo(cx+5.5,cy-2);
      X.stroke();
      X.beginPath();
      X.moveTo(cx-5.5,cy-2); X.lineTo(cx-4.5,cy-5.5);
      X.lineTo(cx+4.5,cy-5.5); X.lineTo(cx+5.5,cy-2);
      X.stroke();
      X.beginPath(); X.arc(cx,cy-9,4,0,Math.PI*2); X.stroke();
      break;
    case 'necklace':
      X.beginPath(); X.arc(cx,cy-11,11,0.35,Math.PI-0.35); X.stroke();
      X.beginPath(); X.moveTo(cx,cy-0.5); X.lineTo(cx,cy+2.5); X.stroke();
      X.beginPath();
      X.moveTo(cx,cy+12);
      X.bezierCurveTo(cx+6.5,cy+7,cx+6.5,cy+2.5,cx,cy+2.5);
      X.bezierCurveTo(cx-6.5,cy+2.5,cx-6.5,cy+7,cx,cy+12);
      X.stroke(); break;
    case 'tiara': {
      X.beginPath(); X.arc(cx,cy+10,13,Math.PI+0.28,2*Math.PI-0.28); X.stroke();
      const angs=[Math.PI+0.28,Math.PI+0.56,Math.PI*1.5,2*Math.PI-0.56,2*Math.PI-0.28];
      const hs=[7,10,14,10,7];
      for (let i=0;i<5;i++) {
        const a=angs[i];
        const bx=cx+Math.cos(a)*13,by=cy+10+Math.sin(a)*13;
        const tx=bx+Math.cos(a)*hs[i],ty=by+Math.sin(a)*hs[i];
        X.beginPath(); X.moveTo(bx,by); X.lineTo(tx,ty); X.stroke();
        if (hs[i]>=10) { X.beginPath(); X.arc(tx,ty,1.8,0,Math.PI*2); X.stroke(); }
      }
      break;
    }
    case 'bracelet':
      X.beginPath(); X.arc(cx,cy,10,0.5,Math.PI-0.5); X.stroke();
      X.beginPath(); X.arc(cx,cy,10,Math.PI+0.5,2*Math.PI-0.5); X.stroke();
      X.beginPath(); X.arc(cx,cy-10,3.2,0,Math.PI*2); X.stroke();
      for (const a of [Math.PI*.2,Math.PI*.8]) {
        const bx=cx+Math.cos(-Math.PI/2+a)*10,by=cy+Math.sin(-Math.PI/2+a)*10;
        X.beginPath(); X.arc(bx,by,1.4,0,Math.PI*2); X.stroke();
      }
      break;
  }
  X.restore();
}

/* ── BLOCKCHAIN ──────────────────────────────────────────────────────────────*/
function drawBlockchain(cx,cy,alpha) {
  if (alpha<=0) return;
  X.save(); iStyle(alpha);
  const r=6.5,gap=14,xs=[-gap,0,gap];
  function hex(hx,hy) {
    X.beginPath();
    for (let i=0;i<6;i++) {
      const a=i/6*Math.PI*2-Math.PI/6;
      i===0?X.moveTo(hx+Math.cos(a)*r,hy+Math.sin(a)*r)
           :X.lineTo(hx+Math.cos(a)*r,hy+Math.sin(a)*r);
    }
    X.closePath(); X.stroke();
  }
  xs.forEach(ox=>hex(cx+ox,cy));
  for (let i=0;i<2;i++) {
    X.beginPath(); X.moveTo(cx+xs[i]+r,cy); X.lineTo(cx+xs[i+1]-r,cy); X.stroke();
  }
  X.fillStyle='rgba(255,255,255,0.5)';
  xs.forEach(ox=>{ X.beginPath(); X.arc(cx+ox,cy,1.3,0,Math.PI*2); X.fill(); });
  X.restore();
}

/* ── VAULT ───────────────────────────────────────────────────────────────────*/
function drawVault(cx,cy,alpha) {
  if (alpha<=0) return;
  X.save(); iStyle(alpha);
  X.beginPath(); X.arc(cx,cy,11,0,Math.PI*2); X.stroke();
  X.beginPath(); X.arc(cx,cy,6.5,0,Math.PI*2); X.stroke();
  X.beginPath();
  X.moveTo(cx-5,cy); X.lineTo(cx+5,cy);
  X.moveTo(cx,cy-5); X.lineTo(cx,cy+5);
  X.stroke();
  [[cx,cy-10],[cx+10,cy],[cx,cy+10],[cx-10,cy]].forEach(([bx,by])=>{
    X.beginPath(); X.arc(bx,by,1.6,0,Math.PI*2); X.stroke();
  });
  X.beginPath();
  X.moveTo(cx-11,cy-5); X.lineTo(cx-14,cy-5);
  X.lineTo(cx-14,cy+5); X.lineTo(cx-11,cy+5);
  X.stroke(); X.restore();
}

/* ── LABEL ───────────────────────────────────────────────────────────────────*/
function drawLabel(txt,x,y,alpha) {
  if (alpha<=0) return;
  X.save();
  X.globalAlpha=alpha;
  X.font='7px "Courier New",monospace';
  X.fillStyle='rgba(255,255,255,0.55)';
  X.textAlign='center';
  X.shadowColor='rgba(0,0,0,0.9)'; X.shadowBlur=4;
  X.fillText(txt.toUpperCase(),x,y);
  X.restore();
}

/* ── CHECKMARK ───────────────────────────────────────────────────────────────*/
function drawCheck(cx,cy,alpha) {
  if (alpha<=0) return;
  X.save(); X.globalAlpha=alpha;
  X.strokeStyle='rgba(255,255,255,.55)'; X.lineWidth=0.7; X.lineCap='round';
  X.beginPath(); X.moveTo(cx-4,cy); X.lineTo(cx-1,cy+3); X.lineTo(cx+4,cy-3);
  X.stroke(); X.restore();
}

/* ── STATE ───────────────────────────────────────────────────────────────────*/
let routes=[],pulses=[],microLines=[],verifyBlinks=[];
let scanSweep=null;
let lastRoute=0,routeIv=rand(4000,7000);
let lastPulse=0,pulseIv=rand(9000,15000);
let lastMicro=0,microIv=rand(3500,7000);
let lastScan=0, scanIv=rand(20000,30000);
let lastBlink=0,blinkIv=rand(8000,14000);
let tabActive=true;
document.addEventListener('visibilitychange',()=>{ tabActive=!document.hidden; });

/* ── SPAWN ROUTE ─────────────────────────────────────────────────────────────*/
function spawnRoute() {
  const orig=pick(ORIGINS),dest=pick(MARKETS);
  const [ox,oy]=npos(orig),[dx,dy]=npos(dest);
  const mx=(ox+dx)/2,my=(oy+dy)/2;
  const ddx=dx-ox,ddy=dy-oy;
  const len=Math.sqrt(ddx*ddx+ddy*ddy);
  const arc=Math.min(len*0.44,H*0.38);
  const cpx=mx-ddy/len*arc;
  const cpy=my+ddx/len*arc*0.08-arc*0.55;
  let iconType=dest.type;
  if (dest.name==='Geneva'&&Math.random()<0.45) iconType='vault';
  routes.push({
    orig,dest,ox,oy,dx,dy,cpx,cpy,
    stage:'spawn',st:0,tHead:0,tTail:0,
    dur:3200+len*1.05,
    gemCut:pick(GEM_CUTS),iconType,jewel:pick(JEWELRY),
    roughA:0,gemA:0,iconA:0,labelOrigA:0,labelDestA:0,
  });
}

/* ── FRAME ───────────────────────────────────────────────────────────────────*/
let lastT=0;
function frame(now) {
  if (!tabActive) { requestAnimationFrame(frame); return; }
  const dt=Math.min(now-lastT,50); lastT=now;

  X.clearRect(0,0,W,H);
  X.fillStyle='#090909'; X.fillRect(0,0,W,H);

  drawMap();

  // scan sweep
  if (scanSweep) {
    scanSweep.x+=scanSweep.spd*dt;
    if (scanSweep.x<W+100) {
      const g=X.createLinearGradient(scanSweep.x-90,0,scanSweep.x+50,0);
      g.addColorStop(0,'transparent');
      g.addColorStop(0.55,`rgba(190,188,178,${scanSweep.op})`);
      g.addColorStop(1,'transparent');
      X.save(); X.fillStyle=g; X.fillRect(0,0,W,H); X.restore();
    } else scanSweep=null;
  }

  // micro lines
  microLines=microLines.filter(l=>{
    l.age+=dt; const t=l.age/l.dur; if(t>=1) return false;
    X.save(); X.globalAlpha=Math.sin(Math.PI*t)*0.07;
    X.strokeStyle='rgba(170,168,158,0.9)'; X.lineWidth=0.4;
    X.setLineDash([2,7]);
    X.beginPath(); X.moveTo(l.x1,l.y1); X.lineTo(l.x2,l.y2); X.stroke();
    X.setLineDash([]); X.restore();
    return true;
  });

  // pulses
  pulses=pulses.filter(p=>{
    p.age+=dt; const t=p.age/p.dur; if(t>=1) return false;
    X.save(); X.globalAlpha=(1-t)*0.18;
    X.strokeStyle='rgba(255,255,255,0.7)'; X.lineWidth=0.5;
    X.beginPath(); X.arc(p.x,p.y,p.maxR*eio(t),0,Math.PI*2); X.stroke();
    X.restore(); return true;
  });

  // verify blinks
  verifyBlinks=verifyBlinks.filter(b=>{
    b.age+=dt; const t=b.age/b.dur; if(t>=1) return false;
    drawCheck(b.x,b.y-16,Math.sin(Math.PI*t)*0.55); return true;
  });

  // origin nodes
  for (const o of ORIGINS) {
    const [x,y]=npos(o);
    const pulse=0.065+0.022*Math.sin(now/1000+o.lon);
    X.save(); X.globalAlpha=pulse;
    const g=X.createRadialGradient(x,y,0,x,y,11);
    g.addColorStop(0,'rgba(255,255,255,0.5)');
    g.addColorStop(1,'transparent');
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

  // routes
  routes=routes.filter(r=>{
    r.st+=dt; let keep=true;

    // icon/gem floats 32px ABOVE the destination dot
    // label sits 12px BELOW the destination dot
    const ix = r.dx;
    const iy = r.dy - 32;
    const ly = r.dy + 12;

    if (r.stage==='spawn') {
      r.roughA=clamp(r.st/400,0,1); r.labelOrigA=clamp(r.st/400,0,1);
      drawRoughGem(r.ox,r.oy,r.roughA*.85);
      drawLabel(r.orig.name,r.ox,r.oy-18,r.labelOrigA*.7);
      if (r.st>650) { r.stage='transit'; r.st=0; }

    } else if (r.stage==='transit') {
      r.tHead=clamp(r.st/r.dur,0,1);
      const lag=0.22;
      r.tTail=clamp((r.st/r.dur-lag)/(1-lag),0,1);
      // guide arc
      X.save(); X.globalAlpha=0.09;
      X.strokeStyle='rgba(160,158,148,1)'; X.lineWidth=0.5; X.setLineDash([3,7]);
      X.beginPath();
      for (let i=0;i<=80;i++) {
        const {x,y}=bez(i/80,r.ox,r.oy,r.cpx,r.cpy,r.dx,r.dy);
        i===0?X.moveTo(x,y):X.lineTo(x,y);
      }
      X.stroke(); X.setLineDash([]); X.restore();
      // snake line
      if (r.tHead>0.005) {
        const S=100,i0=Math.floor(r.tTail*S),i1=Math.ceil(r.tHead*S);
        X.save();
        X.strokeStyle='rgba(255,255,255,0.88)'; X.lineWidth=0.9; X.lineCap='round';
        X.shadowColor='rgba(255,255,255,0.2)'; X.shadowBlur=3;
        X.beginPath();
        for (let i=i0;i<=i1;i++) {
          const {x,y}=bez(i/S,r.ox,r.oy,r.cpx,r.cpy,r.dx,r.dy);
          i===i0?X.moveTo(x,y):X.lineTo(x,y);
        }
        X.stroke(); X.restore();
      }
      drawRoughGem(r.ox,r.oy,r.roughA*.85);
      drawLabel(r.orig.name,r.ox,r.oy-18,r.labelOrigA*.65);
      if (r.tHead>=1&&r.tTail>=1) { r.stage='arrive'; r.st=0; }

    } else if (r.stage==='arrive') {
      r.roughA    =clamp(1-r.st/500,0,1);
      r.labelOrigA=clamp(1-r.st/500,0,1);
      r.gemA      =clamp(r.st/500,0,1);
      r.labelDestA=clamp(r.st/400,0,1);
      drawRoughGem(r.ox,r.oy,r.roughA*.85);
      drawLabel(r.orig.name,r.ox,r.oy-18,r.labelOrigA*.65);
      drawGem(r.gemCut,ix,iy,r.gemA);          // gem above dot
      drawLabel(r.dest.name,ix,ly,r.labelDestA*.7); // label below dot
      if (r.st>2000) { r.stage='transform'; r.st=0; }

    } else if (r.stage==='transform') {
      r.gemA =clamp(1-r.st/400,0,1);
      r.iconA=clamp((r.st-200)/450,0,1);
      r.labelDestA=1;
      drawGem(r.gemCut,ix,iy,r.gemA);          // gem fades out above dot
      if (r.iconType==='jewelry')         drawJewelry(r.jewel,ix,iy,r.iconA); // icon fades in above dot
      else if (r.iconType==='blockchain') drawBlockchain(ix,iy,r.iconA);
      else if (r.iconType==='vault')      drawVault(ix,iy,r.iconA);
      drawLabel(r.dest.name,ix,ly,r.labelDestA*.7); // label stays below dot
      if (r.st>2200) { r.stage='fade'; r.st=0; }

    } else if (r.stage==='fade') {
      const t=clamp(r.st/900,0,1);
      r.iconA=1-t; r.labelDestA=1-t;
      if (r.iconType==='jewelry')         drawJewelry(r.jewel,ix,iy,r.iconA); // fades out above dot
      else if (r.iconType==='blockchain') drawBlockchain(ix,iy,r.iconA);
      else if (r.iconType==='vault')      drawVault(ix,iy,r.iconA);
      drawLabel(r.dest.name,ix,ly,r.labelDestA*.7); // fades out below dot
      if (r.st>900) keep=false;
    }
    return keep;
  });

  // timers
  if (now-lastRoute>routeIv) { lastRoute=now; routeIv=rand(4000,7000); if(routes.length<5) spawnRoute(); }
  if (now-lastPulse>pulseIv) { lastPulse=now; pulseIv=rand(9000,15000); const o=pick(ORIGINS);const [x,y]=npos(o); pulses.push({x,y,age:0,dur:2400,maxR:30}); }
  if (now-lastMicro>microIv) { lastMicro=now; microIv=rand(3500,7000); const all=[...ORIGINS,...MARKETS];const a=pick(all),b=pick(all);const [x1,y1]=npos(a),[x2,y2]=npos(b); microLines.push({x1,y1,x2,y2,age:0,dur:rand(700,1200)}); }
  if (!scanSweep&&now-lastScan>scanIv) { lastScan=now; scanIv=rand(20000,30000); scanSweep={x:-90,spd:W/16000,op:rand(0.025,0.042)}; }
  if (now-lastBlink>blinkIv) { lastBlink=now; blinkIv=rand(8000,14000); const o=pick(ORIGINS);const [x,y]=npos(o); verifyBlinks.push({x,y,age:0,dur:1300}); }

  requestAnimationFrame(frame);
}

})();