/* Micrometer screw gauge · diameter, volume and density of a sphere — lesson app (no dependencies) */
(function () {
  'use strict';

  /* tutorial clock: virtual milliseconds that stop while paused and run faster at higher speed */
  const TC = { speed: 1, paused: false, base: 0, at: performance.now() };
  function tnow() { const n = performance.now(); if (!TC.paused) TC.base += (n - TC.at) * TC.speed; TC.at = n; return TC.base; }
  function tcSet(o) { tnow(); Object.assign(TC, o); }

  /* =====================================================================
     1. CONSTANTS + HELPERS
     ===================================================================== */
  const PITCH = 0.5, NDIV = 50, LC = PITCH / NDIV, RANGE = 25;   // mm, divisions, mm, mm
  /* Example: steel ball, zero error nil */
  const EX = { psr: 12.5, hsr: [20, 21, 19, 22, 20], mass: 8.38 };
  EX.d = EX.hsr.map(h => +(EX.psr + h * LC).toFixed(2));
  EX.mean = +(EX.d.reduce((a, b) => a + b, 0) / 5).toFixed(3);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) { const t = el('text', Object.assign({ x, y }, attrs || {}), parent); t.textContent = s; return t; }
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function svgPoint(svg, e) {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  function parseNum(s) { if (s == null) return NaN; s = String(s).trim().replace(',', '.').replace(/\s/g, ''); if (!s) return NaN; return Number(s); }
  const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
  const near = (a, b, tol) => isFinite(a) && isFinite(b) && b !== 0 && rel(a, b) <= tol;
  function trueReading(x) {
    let psr = Math.floor((x + 1e-9) / PITCH) * PITCH;
    let hsr = Math.round((x - psr) / LC);
    if (hsr >= NDIV) { psr += PITCH; hsr -= NDIV; }
    return { psr: +psr.toFixed(1), hsr };
  }
  const F_HEAD = 'Archivo, system-ui, sans-serif', F_MONO = 'Spline Sans Mono, ui-monospace, monospace', F_BODY = 'Public Sans, system-ui, sans-serif';

  /* shared gradients for the instrument and the balls */
  function defsFor(svg, id) {
    const d = svg.querySelector('defs') || el('defs', null, svg);
    function lin(name, stops, x2, y2) {
      const g = el('linearGradient', { id: `${id}-${name}`, x1: 0, y1: 0, x2: x2 || 0, y2: y2 == null ? 1 : y2 }, d);
      stops.forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, g));
    }
    function rad(name, stops) {
      const g = el('radialGradient', { id: `${id}-${name}`, cx: .36, cy: .32, r: .75, fx: .32, fy: .26 }, d);
      stops.forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, g));
    }
    lin('frame', [[0, '#5a616b'], [.45, '#3b4149'], [1, '#262a30']]);
    lin('steel', [[0, '#7d8792'], [.25, '#f3f5f7'], [.55, '#c2c9d0'], [.75, '#eef1f4'], [1, '#78828d']]);
    lin('sleeve', [[0, '#9aa4af'], [.28, '#f6f7f9'], [.6, '#dce1e6'], [1, '#929ca7']]);
    lin('thim', [[0, '#87919c'], [.3, '#eceff2'], [.62, '#c6cdd4'], [1, '#7f8994']]);
    lin('ratch', [[0, '#8a949f'], [.35, '#e5e9ed'], [1, '#6f7a86']]);
    lin('tray', [[0, '#e8ebef'], [1, '#c9cfd6']]);
    lin('bal', [[0, '#f4f5f7'], [1, '#cfd5dc']]);
    lin('lcd', [[0, '#26303a'], [1, '#181e25']]);
    rad('b-steel', [[0, '#ffffff'], [.22, '#e3e7eb'], [.62, '#959ea8'], [1, '#56606b']]);
    rad('b-brass', [[0, '#fff6d8'], [.25, '#e8c972'], [.7, '#ad862f'], [1, '#6b5016']]);
    rad('b-alu', [[0, '#ffffff'], [.35, '#e9ecef'], [.8, '#b6bdc5'], [1, '#8f98a2']]);
    const p = el('pattern', { id: `${id}-knurl`, width: 4, height: 4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, d);
    el('rect', { width: 4, height: 4, fill: 'rgba(0,0,0,0)' }, p);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 4, stroke: 'rgba(30,36,44,.35)', 'stroke-width': 1 }, p);
    el('line', { x1: 0, y1: 0, x2: 4, y2: 0, stroke: 'rgba(30,36,44,.25)', 'stroke-width': 1 }, p);
    const sh = el('filter', { id: `${id}-sh`, x: '-20%', y: '-20%', width: '140%', height: '160%' }, d);
    el('feDropShadow', { dx: 0, dy: 3, stdDeviation: 3, 'flood-color': '#1c2026', 'flood-opacity': .22 }, sh);
    return d;
  }

  /* =====================================================================
     2. THE INSTRUMENT — side view; reading x in mm sets spindle + thimble
     ===================================================================== */
  function drawInstrument(root, o) {
    const id = o.id, S = o.S, AX = o.AX, cy = o.cy;
    const rs = 3.1 * S, rsl = 4.0 * S, rt = 4.9 * S, rr = 3.0 * S;
    const L = AX - 4.2 * S, T = 5.6 * S;
    const BX0 = AX + 27 * S, BX1 = BX0 + 6 * S, Z0 = BX1 + 2.6 * S;
    const yT = cy - 4.6 * S, yI = cy + 9.5 * S, yO = yI + 5 * S;
    const g = el('g', { class: 'mic' }, root);
    // spindle (behind the frame boss)
    const spG = el('g', null, g);
    const sp = el('rect', { y: cy - rs, height: 2 * rs, fill: `url(#${id}-steel)`, stroke: '#5f6974', 'stroke-width': .8 }, spG);
    const spTip = el('rect', { y: cy - rs, height: 2 * rs, width: .8 * S, fill: '#68727d' }, spG);
    // frame
    const R = 7 * S, Ri = 5.5 * S;
    const r1 = 1.2 * S;
    const cshape = `M${L - T + r1} ${yT} H${L} V${yI - Ri} A${Ri} ${Ri} 0 0 0 ${L + Ri} ${yI} H${BX0 - Ri} A${Ri} ${Ri} 0 0 0 ${BX0} ${yI - Ri} V${yT} H${BX1 - r1} Q${BX1} ${yT} ${BX1} ${yT + r1} V${yO - R} A${R} ${R} 0 0 1 ${BX1 - R} ${yO} H${L - T + R} A${R} ${R} 0 0 1 ${L - T} ${yO - R} V${yT + r1} Q${L - T} ${yT} ${L - T + r1} ${yT} Z`;
    el('path', { d: cshape, fill: `url(#${id}-frame)`, stroke: '#1d2126', 'stroke-width': 1, filter: o.shadow === false ? null : `url(#${id}-sh)` }, g);
    el('path', { d: `M${L - T + 1.2 * S} ${yT + 1.5} H${L - 1}  M${BX0 + 1} ${yT + 1.5} H${BX1 - 1.2 * S}`, stroke: 'rgba(255,255,255,.25)', 'stroke-width': 1.5 }, g);
    // label plate
    const px = (L + BX0) / 2;
    el('rect', { x: px - 8.5 * S, y: yI + .9 * S, width: 17 * S, height: 3.4 * S, rx: .6 * S, fill: '#1b1f24', stroke: '#596270', 'stroke-width': .8 }, g);
    txt(g, px, yI + 2.35 * S, '0–25 mm', { 'text-anchor': 'middle', 'font-family': F_HEAD, 'font-weight': 700, 'font-size': 1.25 * S, fill: '#e9ecef' });
    txt(g, px, yI + 3.75 * S, '0.01 mm', { 'text-anchor': 'middle', 'font-family': F_HEAD, 'font-size': 1.15 * S, fill: '#f39a5c' });
    // anvil
    el('rect', { x: L - .3 * S, y: cy - rs, width: AX - L + .3 * S, height: 2 * rs, fill: `url(#${id}-steel)`, stroke: '#5f6974', 'stroke-width': .8 }, g);
    el('rect', { x: AX - .8 * S, y: cy - rs, width: .8 * S, height: 2 * rs, fill: '#68727d' }, g);
    // spindle bearing collar on the boss
    el('rect', { x: BX0 - 1.3 * S, y: cy - rs - .7 * S, width: 1.3 * S + 1, height: 2 * rs + 1.4 * S, rx: .4 * S, fill: `url(#${id}-sleeve)`, stroke: '#5f6974', 'stroke-width': .8 }, g);
    // lock: knurled ring on top of the boss with a lever
    const lx = BX0 + 3 * S, ly = yT - 1.3 * S;
    const lockG = el('g', { class: 'lock-g' }, g);
    el('rect', { x: lx - 1.6 * S, y: yT - 2.3 * S, width: 3.2 * S, height: 2.4 * S, rx: .5 * S, fill: `url(#${id}-ratch)`, stroke: '#4c5560', 'stroke-width': .8 }, lockG);
    el('rect', { x: lx - 1.6 * S, y: yT - 2.3 * S, width: 3.2 * S, height: 2.4 * S, rx: .5 * S, fill: `url(#${id}-knurl)` }, lockG);
    const lever = el('g', null, lockG);
    el('path', { d: `M${lx} ${ly - .4 * S} L${lx - 4.2 * S} ${ly - 1.7 * S} a${.75 * S} ${.75 * S} 0 0 0 0 ${1.5 * S} L${lx} ${ly + .4 * S}Z`, fill: '#2a2f36', stroke: '#15181c', 'stroke-width': .6 }, lever);
    el('circle', { cx: lx, cy: ly, r: .7 * S, fill: '#9aa4af', stroke: '#3c4550', 'stroke-width': .6 }, lockG);
    // sleeve with the main (pitch) scale
    const slClip = el('clipPath', { id: `${id}-slclip` }, root.querySelector('defs') || el('defs', null, root));
    const slClipR = el('rect', { x: BX1 - 2, y: cy - rsl - 2, height: 2 * rsl + 4, width: 10 }, slClip);
    const slG = el('g', { 'clip-path': `url(#${id}-slclip)` }, g);
    el('rect', { x: BX1, y: cy - rsl, width: Z0 + 27 * S - BX1, height: 2 * rsl, fill: `url(#${id}-sleeve)`, stroke: '#6f7984', 'stroke-width': .8 }, slG);
    el('line', { x1: BX1 + .3 * S, y1: cy, x2: Z0 + 26.5 * S, y2: cy, stroke: '#1c2026', 'stroke-width': Math.max(.8, .13 * S) }, slG);
    for (let k = 0; k <= RANGE * 2; k++) {
      const p = k / 2, X = Z0 + p * S, whole = k % 2 === 0;
      if (whole) el('line', { x1: X, y1: cy, x2: X, y2: cy - (p % 5 === 0 ? 1.9 : 1.3) * S, stroke: '#1c2026', 'stroke-width': Math.max(.6, .1 * S) }, slG);
      else el('line', { x1: X, y1: cy, x2: X, y2: cy + 1.0 * S, stroke: '#1c2026', 'stroke-width': Math.max(.6, .1 * S) }, slG);
      if (whole && p % 5 === 0) txt(slG, X, cy - 2.35 * S, String(p), { 'text-anchor': 'middle', 'font-family': F_HEAD, 'font-size': 1.3 * S, fill: '#1c2026' });
    }
    // thimble + ratchet (moves with the reading)
    const thG = el('g', null, g);
    const thBody = el('g', { class: 'thimble-body' }, thG);
    el('rect', { x: Z0, y: cy - rt, width: 11 * S, height: 2 * rt, rx: .7 * S, fill: `url(#${id}-thim)`, stroke: '#4c5560', 'stroke-width': .9 }, thBody);
    el('rect', { x: Z0 + 5.2 * S, y: cy - rt + .3 * S, width: 5.4 * S, height: 2 * rt - .6 * S, fill: `url(#${id}-knurl)`, opacity: .55 }, thBody);
    el('path', { d: `M${Z0} ${cy - rsl - .25 * S} L${Z0 + 1.7 * S} ${cy - rt} V${cy + rt} L${Z0} ${cy + rsl + .25 * S}Z`, fill: '#e9ecef', stroke: '#5c6672', 'stroke-width': .7 }, thBody);
    const divG = el('g', { 'pointer-events': 'none' }, thG);
    const ratG = el('g', { class: 'ratchet-g' }, thG);
    el('rect', { x: Z0 + 11 * S - 1, y: cy - .9 * rr, width: 1.2 * S, height: 1.8 * rr, fill: '#7d8792' }, ratG);
    el('rect', { x: Z0 + 12 * S, y: cy - rr, width: 4.2 * S, height: 2 * rr, rx: .8 * S, fill: `url(#${id}-ratch)`, stroke: '#4c5560', 'stroke-width': .8 }, ratG);
    el('rect', { x: Z0 + 12 * S, y: cy - rr, width: 4.2 * S, height: 2 * rr, rx: .8 * S, fill: `url(#${id}-knurl)` }, ratG);
    const Rd = rsl + .35 * S;
    function drawDivs(x) {
      divG.innerHTML = '';
      const h = (((x % PITCH) + PITCH) % PITCH) / LC;
      for (let k = 0; k < NDIV; k++) {
        let a = (k - h) * 7.2; a = ((a + 180) % 360 + 360) % 360 - 180;
        if (Math.abs(a) > 84) continue;
        const ar = a * Math.PI / 180, c = Math.cos(ar), y = cy - Rd * Math.sin(ar);
        const len = (k % 10 === 0 ? 1.9 : k % 5 === 0 ? 1.55 : 1.0) * S;
        el('line', { x1: Z0 + .1 * S, y1: y, x2: Z0 + .1 * S + len, y2: y, stroke: '#1c2026', 'stroke-width': Math.max(.5, .09 * S) * (.5 + .5 * c), opacity: .35 + .65 * c }, divG);
        if (k % 5 === 0 && o.thimbleNumbers !== false) {
          const t = txt(divG, 0, 0, String(k), { 'font-family': F_HEAD, 'font-size': 1.05 * S, fill: '#1c2026', 'dominant-baseline': 'central', opacity: .3 + .7 * c });
          t.setAttribute('transform', `translate(${Z0 + 2.35 * S} ${y}) scale(1 ${Math.max(.15, c).toFixed(3)})`);
        }
      }
    }
    function set(x) {
      const tip = AX + x * S;
      sp.setAttribute('x', tip); sp.setAttribute('width', Math.max(0, BX0 + .5 * S - tip));
      spTip.setAttribute('x', tip);
      thG.setAttribute('transform', `translate(${(x * S).toFixed(2)} 0)`);
      slClipR.setAttribute('width', Math.max(0, Z0 + x * S - BX1 + 2 + .9 * S));
      drawDivs(x);
    }
    function setLock(on) { lever.setAttribute('transform', on ? `rotate(180 ${lx} ${ly})` : ''); }
    set(o.x || 0);
    return { g, set, setLock, thG, thBody, ratG, lockG, divG, geom: { S, AX, cy, rs, rsl, rt, rr, L, BX0, BX1, Z0, yT, yI, yO, lx, ly } };
  }

  /* close-up of the reading area: sleeve scale + thimble at the datum line */
  function drawScale(svg, o) {
    const W = o.W || 600, H = o.H || 300, Sm = o.Sm || 52, EX0 = o.edgeX || 360, cy = o.cy || 150, Rt = o.Rt || 118;
    const id = o.id;
    defsFor(svg, id);
    const d = svg.querySelector('defs');
    const cp = el('clipPath', { id: `${id}-clip` }, d); el('rect', { x: 0, y: 0, width: W, height: H, rx: 12 }, cp);
    const root = el('g', { 'clip-path': `url(#${id}-clip)` }, svg);
    el('rect', { x: 0, y: 0, width: W, height: H, fill: '#f2f4f6' }, root);
    el('rect', { x: 0, y: cy - 78, width: EX0, height: 156, fill: `url(#${id}-sleeve)` }, root);
    el('line', { x1: 0, y1: cy - 78, x2: EX0, y2: cy - 78, stroke: '#8a949f' }, root);
    el('line', { x1: 0, y1: cy + 78, x2: EX0, y2: cy + 78, stroke: '#8a949f' }, root);
    const tick = el('g', null, root);
    el('line', { x1: 0, y1: cy, x2: EX0, y2: cy, stroke: '#1c2026', 'stroke-width': 2 }, root);
    const thG = el('g', { class: 'mag-thimble' }, root);
    el('rect', { x: EX0, y: cy - Rt - 20, width: W - EX0 + 10, height: 2 * Rt + 40, fill: `url(#${id}-thim)` }, thG);
    el('rect', { x: EX0, y: cy - Rt - 20, width: 26, height: 2 * Rt + 40, fill: '#eef1f3' }, thG);
    el('line', { x1: EX0, y1: 0, x2: EX0, y2: H, stroke: '#4c5560', 'stroke-width': 1.5 }, thG);
    el('rect', { x: EX0 + 150, y: cy - Rt - 20, width: W, height: 2 * Rt + 40, fill: `url(#${id}-knurl)`, opacity: .4 }, thG);
    const div = el('g', { 'pointer-events': 'none' }, root);
    const hiG = el('g', { 'pointer-events': 'none' }, root);
    let lastX = 0;
    function set(x) {
      lastX = x;
      tick.innerHTML = ''; div.innerHTML = '';
      const pmin = x - EX0 / Sm - .5;
      for (let k = Math.max(0, Math.ceil(pmin * 2)); k / 2 <= x + 1e-9; k++) {
        const p = k / 2, X = EX0 + (p - x) * Sm;
        if (k % 2 === 0) {
          el('line', { x1: X, y1: cy, x2: X, y2: cy - (p % 5 === 0 ? 50 : 34), stroke: '#1c2026', 'stroke-width': 2.4 }, tick);
          if (p % 5 === 0) txt(tick, X, cy - 58, String(p), { 'text-anchor': 'middle', 'font-family': F_HEAD, 'font-size': 23, 'font-weight': 600, fill: '#1c2026' });
        } else el('line', { x1: X, y1: cy, x2: X, y2: cy + 30, stroke: '#1c2026', 'stroke-width': 2.4 }, tick);
      }
      const h = (((x % PITCH) + PITCH) % PITCH) / LC;
      for (let k = 0; k < NDIV; k++) {
        let a = (k - h) * 7.2; a = ((a + 180) % 360 + 360) % 360 - 180;
        if (Math.abs(a) > 82) continue;
        const ar = a * Math.PI / 180, c = Math.cos(ar), y = cy - Rt * Math.sin(ar);
        const len = k % 5 === 0 ? 46 : 30;
        el('line', { x1: EX0 + 2, y1: y, x2: EX0 + 2 + len, y2: y, stroke: '#1c2026', 'stroke-width': (2.3 * (.45 + .55 * c)).toFixed(2), opacity: (.3 + .7 * c).toFixed(2) }, div);
        if (k % 5 === 0) {
          const t = txt(div, 0, 0, String(k), { 'font-family': F_HEAD, 'font-size': 23, 'font-weight': 600, fill: '#1c2026', 'dominant-baseline': 'central', opacity: (.3 + .7 * c).toFixed(2) });
          t.setAttribute('transform', `translate(${EX0 + 58} ${y.toFixed(2)}) scale(1 ${Math.max(.12, c).toFixed(3)})`);
        }
      }
      if (hiKind) hi(hiKind);
    }
    let hiKind = null;
    function hi(kind) {
      hiKind = kind; hiG.innerHTML = '';
      if (!kind) return;
      const x = lastX, tr = trueReading(Math.max(0, x));
      if (kind === 'psr') {
        const X = EX0 + (Math.floor((x + 1e-9) / PITCH) * PITCH - x) * Sm;
        const Xw = EX0 + (Math.floor(x + 1e-9) - x) * Sm;
        el('rect', { x: Math.min(X, Xw) - 14, y: cy - 66, width: EX0 - Math.min(X, Xw) + 14, height: 104, rx: 10, fill: 'rgba(232,98,12,.12)', stroke: '#e8620c', 'stroke-width': 2.5 }, hiG);
        const lab = `PSR = ${tr.psr.toFixed(1)} mm`;
        el('rect', { x: 14, y: H - 46, width: 200, height: 34, rx: 8, fill: '#1c2026' }, hiG);
        txt(hiG, 114, H - 23, lab, { 'text-anchor': 'middle', 'font-family': F_MONO, 'font-size': 18, fill: '#ffd2b0' });
      } else if (kind === 'hsr') {
        el('rect', { x: EX0 - 6, y: cy - 16, width: 120, height: 32, rx: 8, fill: 'rgba(232,98,12,.12)', stroke: '#e8620c', 'stroke-width': 2.5 }, hiG);
        el('rect', { x: 14, y: H - 46, width: 200, height: 34, rx: 8, fill: '#1c2026' }, hiG);
        txt(hiG, 114, H - 23, `HSR = ${tr.hsr} div`, { 'text-anchor': 'middle', 'font-family': F_MONO, 'font-size': 18, fill: '#ffd2b0' });
      }
    }
    set(o.x || 0);
    return { set, hi, thG, root, geom: { EX0, cy, Sm, Rt, W, H } };
  }

  function drawBall(parent, id, mat, r, mark) {
    const g = el('g', { class: 'ball-g' }, parent);
    el('ellipse', { cx: 0, cy: r * .96, rx: r * .7, ry: r * .12, fill: 'rgba(20,26,34,.18)', class: 'b-shadow' }, g);
    el('circle', { cx: 0, cy: 0, r, fill: `url(#${id}-b-${mat})`, stroke: 'rgba(30,36,44,.45)', 'stroke-width': .8 }, g);
    const m = el('g', { class: 'b-mark' }, g);
    if (mark !== false) {
      el('ellipse', { cx: 0, cy: 0, rx: r * .93, ry: r * .32, fill: 'none', stroke: 'rgba(30,36,44,.16)', 'stroke-width': 1 }, m);
      el('circle', { cx: r * .55, cy: -r * .12, r: Math.max(1.5, r * .06), fill: 'rgba(30,36,44,.28)' }, m);
    }
    el('ellipse', { cx: -r * .32, cy: -r * .38, rx: r * .22, ry: r * .13, fill: 'rgba(255,255,255,.75)', transform: `rotate(-30 ${-r * .32} ${-r * .38})` }, g);
    return { g, mark: m };
  }

  /* =====================================================================
     3. BACKGROUND — slowly turning thimble dials + helical screw threads
     ===================================================================== */
  (function background() {
    const cv = $('bg'), ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    const dials = [], screws = [];
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const m = Math.min(W, H);
      dials.length = 0; screws.length = 0;
      dials.push({ fx: 1.02, fy: .12, R: m * .42, w: .05, ph: 0 });
      dials.push({ fx: .12, fy: 1.04, R: m * .5, w: -.035, ph: 1.3 });
      dials.push({ fx: .62, fy: .6, R: m * .16, w: .09, ph: 2.1 });
      screws.push({ y: .3, ang: -.12, R: Math.max(16, m * .035), p: Math.max(18, m * .04), v: 10, w: 1.1 });
      screws.push({ y: .82, ang: .08, R: Math.max(12, m * .026), p: Math.max(14, m * .03), v: -7, w: .8 });
    }
    function drawDial(D, t) {
      const cx = D.fx * W, cy = D.fy * H, rot = D.ph + D.w * t;
      ctx.save(); ctx.translate(cx, cy);
      ctx.beginPath(); ctx.arc(0, 0, D.R, 0, 6.2832); ctx.strokeStyle = 'rgba(60,72,88,.10)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, D.R * .82, 0, 6.2832); ctx.strokeStyle = 'rgba(60,72,88,.05)'; ctx.stroke();
      ctx.rotate(rot);
      ctx.font = `${Math.max(10, D.R * .055)}px Spline Sans Mono, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let k = 0; k < 50; k++) {
        const a = k / 50 * 6.2832, long = k % 5 === 0;
        const r1 = D.R, r2 = D.R * (long ? .9 : .94);
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
        ctx.strokeStyle = long ? 'rgba(232,98,12,.16)' : 'rgba(60,72,88,.12)'; ctx.lineWidth = long ? 1.4 : 1; ctx.stroke();
        if (long) { ctx.save(); ctx.translate(Math.cos(a) * D.R * .85, Math.sin(a) * D.R * .85); ctx.rotate(a + Math.PI / 2); ctx.fillStyle = 'rgba(60,72,88,.13)'; ctx.fillText(String(k), 0, 0); ctx.restore(); }
      }
      ctx.restore();
      // fixed datum mark
      ctx.beginPath(); ctx.moveTo(cx - D.R * 1.08, cy); ctx.lineTo(cx - D.R * .9, cy); ctx.strokeStyle = 'rgba(28,32,38,.14)'; ctx.lineWidth = 1.4; ctx.stroke();
    }
    function drawScrew(Sc, t) {
      const y0 = Sc.y * H, R = Sc.R, p = Sc.p, len = Math.hypot(W, H) * 1.2;
      ctx.save(); ctx.translate(W / 2, y0); ctx.rotate(Sc.ang);
      const shift = ((Sc.v * t) % p + p) % p;
      ctx.beginPath(); ctx.moveTo(-len / 2, -R); ctx.lineTo(len / 2, -R); ctx.moveTo(-len / 2, R); ctx.lineTo(len / 2, R);
      ctx.strokeStyle = 'rgba(60,72,88,.07)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.lineWidth = Sc.w;
      for (let x = -len / 2 - p; x < len / 2 + p; x += p) {
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) {
          const th = i / 16 * Math.PI, xx = x + shift + p * .5 * (th / Math.PI), yy = -R * Math.cos(th);
          i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.strokeStyle = 'rgba(60,72,88,.11)'; ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) {
          const th = i / 16 * Math.PI, xx = x + shift + p * .5 + p * .5 * (th / Math.PI), yy = R * Math.cos(th);
          i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.strokeStyle = 'rgba(232,98,12,.06)'; ctx.stroke();
      }
      ctx.restore();
    }
    const t0 = performance.now();
    function frame(now) {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      screws.forEach(s => drawScrew(s, t));
      dials.forEach(d => drawDial(d, t));
      if (!reduced) requestAnimationFrame(frame);
    }
    window.addEventListener('resize', () => { size(); if (reduced) frame(performance.now()); });
    size(); requestAnimationFrame(frame);
  })();

  /* =====================================================================
     4. NAVIGATION + GAUGE RAIL
     ===================================================================== */
  const views = Array.from(document.querySelectorAll('.view'));
  const ids = views.map(v => v.id.replace('view-', ''));
  const nav = $('rail-nav'), railFill = $('rail-fill'), railTh = $('rail-thimble'), btnPrev = $('btn-prev');
  const items = views.map((v, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rail-item';
    b.innerHTML = `<span>${v.dataset.title}</span>`;
    b.addEventListener('click', () => goTo(i, true));
    nav.appendChild(b);
    return b;
  });
  let current = -1;
  const onEnter = {}, onLeave = {};
  function fillRail() {
    const it = items[current]; if (!it) return;
    const mobile = window.matchMedia('(max-width:980px)').matches;
    const gauge = railFill.parentElement;
    if (mobile) {
      gauge.style.setProperty('--fillw', ((current + .5) / items.length * 100) + '%');
      railFill.style.height = ''; railTh.style.top = '';
    } else {
      const tb = gauge.getBoundingClientRect(), ib = it.getBoundingClientRect();
      const y = clamp(ib.top + ib.height / 2 - tb.top, 0, 2000);
      railFill.style.height = y + 'px'; railTh.style.top = y + 'px';
    }
  }
  function goTo(i, push) {
    i = clamp(i, 0, views.length - 1);
    if (i === current) return;
    if (current >= 0 && onLeave[ids[current]]) onLeave[ids[current]]();
    current = i;
    views.forEach((v, k) => v.classList.toggle('active', k === i));
    items.forEach((b, k) => {
      b.classList.toggle('current', k === i); b.classList.toggle('done', k < i);
      if (k === i) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    btnPrev.hidden = i === 0;
    document.querySelector('.stage-top').style.maxWidth = views[i].querySelector('.sheet.wide') ? '1240px' : '';
    requestAnimationFrame(() => {
      fillRail();
      if (window.matchMedia('(max-width:980px)').matches) items[i].scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    if (push && location.hash !== '#' + ids[i]) history.pushState(null, '', '#' + ids[i]);
    window.scrollTo({ top: 0 });
    document.title = views[i].dataset.title.replace('&amp;', '&') + ' · Micrometer';
    if (onEnter[ids[i]]) onEnter[ids[i]]();
  }
  window.addEventListener('resize', () => requestAnimationFrame(fillRail));
  btnPrev.addEventListener('click', () => goTo(current - 1, true));
  document.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => goTo(current + 1, true)));
  function fromHash() { const k = ids.indexOf(location.hash.replace('#', '')); return k < 0 ? 0 : k; }
  window.addEventListener('popstate', () => goTo(fromHash(), false));
  window.addEventListener('hashchange', () => goTo(fromHash(), false));

  /* =====================================================================
     5. CUSTOM CURSOR — a tiny micrometer whose jaws mark the hotspot
     ===================================================================== */
  const cur = $('cursor');
  if (window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener('mousemove', e => {
      if (!document.body.classList.contains('has-cursor')) document.body.classList.add('has-cursor');
      cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      cur.classList.remove('hidden');
      const t = e.target && e.target.closest ? e.target : null;
      const grab = t && t.closest('.grab-t, .ball-g.free, .mag-thimble, .knob-t');
      const hot = t && t.closest('button:not(:disabled), a, select, label, input[type=range], input[type=checkbox], .live');
      cur.classList.toggle('grab', !!grab);
      cur.classList.toggle('hot', !!hot && !grab);
    }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.add('hidden'));
    window.addEventListener('blur', () => cur.classList.add('hidden'));
  }

  /* shared bench pieces */
  function drawBalance(parent, id, cx, by) {
    const g = el('g', { class: 'balance' }, parent);
    el('path', { d: `M${cx - 142} ${by} L${cx - 126} ${by - 82} H${cx + 126} L${cx + 142} ${by} Z`, fill: `url(#${id}-bal)`, stroke: '#8d97a2', 'stroke-width': 1.2, filter: `url(#${id}-sh)` }, g);
    el('rect', { x: cx - 146, y: by - 4, width: 292, height: 8, rx: 3, fill: '#aeb6bf' }, g);
    el('rect', { x: cx - 56, y: by - 64, width: 132, height: 42, rx: 6, fill: `url(#${id}-lcd)`, stroke: '#0f1318' }, g);
    const disp = txt(g, cx + 54, by - 33, '0.00', { 'text-anchor': 'end', 'font-family': F_MONO, 'font-size': 27, 'font-weight': 500, fill: '#ffb27a' });
    txt(g, cx + 68, by - 33, 'g', { 'text-anchor': 'middle', 'font-family': F_MONO, 'font-size': 15, fill: '#c9a385' });
    const tare = el('g', { class: 'tare-g' }, g);
    el('rect', { x: cx - 122, y: by - 58, width: 52, height: 28, rx: 6, fill: '#e8620c', stroke: '#b5480a' }, tare);
    txt(tare, cx - 96, by - 39, 'TARE', { 'text-anchor': 'middle', 'font-family': F_HEAD, 'font-weight': 700, 'font-size': 12, fill: '#fff', 'letter-spacing': '.06em' });
    el('rect', { x: cx - 7, y: by - 98, width: 14, height: 17, fill: '#9aa4af' }, g);
    el('ellipse', { cx, cy: by - 100, rx: 94, ry: 9, fill: '#d6dbe1', stroke: '#8d97a2' }, g);
    el('ellipse', { cx, cy: by - 102, rx: 90, ry: 7, fill: '#eef1f4' }, g);
    return { g, disp, tare, panY: by - 104 };
  }
  function drawDish(parent, cx, rimY, n) {
    const g = el('g', null, parent);
    el('path', { d: `M${cx - 68} ${rimY} Q${cx - 62} ${rimY + 28} ${cx - 30} ${rimY + 31} H${cx + 30} Q${cx + 62} ${rimY + 28} ${cx + 68} ${rimY} Z`, fill: 'rgba(220,226,232,.9)', stroke: '#9aa4af', 'stroke-width': 1.1 }, g);
    el('ellipse', { cx, cy: rimY, rx: 68, ry: 9, fill: 'rgba(248,249,251,.9)', stroke: '#9aa4af', 'stroke-width': 1.1 }, g);
    if (n != null) {
      el('circle', { cx, cy: rimY + 47, r: 11, fill: '#1c2026' }, g);
      txt(g, cx, rimY + 52, String(n), { 'text-anchor': 'middle', 'font-family': F_HEAD, 'font-weight': 700, 'font-size': 14, fill: '#fff' });
    }
    return g;
  }

  /* =====================================================================
     6. AIM HERO + MEDICAL ICONS
     ===================================================================== */
  (function aimHero() {
    const svg = $('aim-hero'); defsFor(svg, 'ah');
    el('ellipse', { cx: 370, cy: 262, rx: 300, ry: 10, fill: 'rgba(28,32,38,.08)' }, svg);
    const d = 12.7, M = drawInstrument(svg, { id: 'ah', S: 8, AX: 100, cy: 118, x: d });
    const B = drawBall(svg, 'ah', 'steel', d / 2 * 8);
    B.g.setAttribute('transform', `translate(${100 + d / 2 * 8} 118)`);
    const pop = txt(svg, 0, 0, 'click', { 'font-family': F_HEAD, 'font-weight': 700, 'font-size': 15, fill: '#e8620c', opacity: 0 });
    const t0 = performance.now();
    function f(now) {
      const t = ((now - t0) / 1000) % 7;
      let x = d, rot = 0, pa = 0;
      if (t < 1.6) { x = d; pa = t > .3 && t < 1.3 ? 1 - Math.abs(t - .8) * 2 : 0; }
      else if (t < 3) x = d + .9 * Math.sin((t - 1.6) / 1.4 * Math.PI / 2) ** 2;
      else if (t < 4.6) { x = d + .9; rot = (t - 3) / 1.6 * 70; }
      else if (t < 6.2) { x = d + .9 * Math.cos((t - 4.6) / 1.6 * Math.PI / 2) ** 2; rot = 70; }
      else { x = d; rot = 70; }
      M.set(x);
      B.mark.setAttribute('transform', `rotate(${rot.toFixed(1)})`);
      const g = M.geom; pop.setAttribute('x', g.Z0 + x * 8 + 14 * 8); pop.setAttribute('y', 118 - 34); pop.setAttribute('opacity', pa.toFixed(2));
      if (!reduced) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  })();
  (function medIcons() {
    const ink = '#3c4a5a', o = '#e8620c';
    let s = $('med-ic-1');
    el('circle', { cx: 40, cy: 40, r: 38, fill: '#e7ebf0' }, s);
    el('path', { d: 'M18 58 L58 18', stroke: ink, 'stroke-width': 3, 'stroke-linecap': 'round' }, s);
    el('path', { d: 'M58 18 L63 13', stroke: '#8d9bab', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, s);
    el('ellipse', { cx: 22, cy: 54, rx: 4, ry: 2.2, transform: 'rotate(-45 22 54)', fill: 'none', stroke: ink, 'stroke-width': 1.6 }, s);
    const jaw = el('g', null, s);
    el('rect', { x: 30, y: 30, width: 6, height: 14, rx: 1, fill: o, transform: 'rotate(45 40 40)' }, jaw);
    el('rect', { x: 44, y: 30, width: 6, height: 14, rx: 1, fill: o, transform: 'rotate(45 40 40)' }, jaw);
    s = $('med-ic-2');
    el('circle', { cx: 40, cy: 40, r: 38, fill: '#fdeee3' }, s);
    [0, 1, 2].forEach(i => {
      const y = 26 + i * 11;
      const p = el('path', { d: `M14 ${y} Q27 ${y - 5} 40 ${y} T66 ${y}`, fill: 'none', stroke: i === 1 ? o : ink, 'stroke-width': i === 1 ? 4 : 2.4, 'stroke-linecap': 'round' }, s);
      if (!reduced) el('animate', { attributeName: 'd', values: `M14 ${y} Q27 ${y - 5} 40 ${y} T66 ${y};M14 ${y} Q27 ${y + 4} 40 ${y} T66 ${y};M14 ${y} Q27 ${y - 5} 40 ${y} T66 ${y}`, dur: (3 + i * .6) + 's', repeatCount: 'indefinite' }, p);
    });
    s = $('med-ic-3');
    el('circle', { cx: 40, cy: 40, r: 38, fill: '#e7ebf0' }, s);
    el('path', { d: 'M26 20 Q24 10 32 12 Q40 9 48 12 Q56 10 54 20 Q52 30 48 32 H32 Q28 30 26 20Z', fill: '#fff', stroke: ink, 'stroke-width': 2 }, s);
    for (let i = 0; i < 6; i++) el('line', { x1: 33, y1: 36 + i * 6, x2: 47, y2: 34 + i * 6, stroke: '#8d9bab', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, s);
    el('rect', { x: 34, y: 33, width: 12, height: 36, rx: 3, fill: 'none', stroke: ink, 'stroke-width': 1.8 }, s);
    const cal = el('path', { d: 'M18 30 V68 M62 30 V68 M18 66 H62', fill: 'none', stroke: o, 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-dasharray': '4 3' }, s);
    if (!reduced) el('animate', { attributeName: 'stroke-dashoffset', values: '0;14', dur: '1.6s', repeatCount: 'indefinite' }, cal);
  })();

  /* =====================================================================
     7. THEORY — labelled parts, reading demo, zero error
     ===================================================================== */
  (function parts() {
    const svg = $('parts-svg'); defsFor(svg, 'pt');
    const x = 7.73, S = 9, AX = 112, cy = 170;
    const M = drawInstrument(svg, { id: 'pt', S, AX, cy, x });
    const G = M.geom, edge = G.Z0 + x * S, tip = AX + x * S;
    const lab = el('g', null, svg);
    function call(px, py, tx, ty, s, anchor) {
      el('line', { x1: px, y1: py, x2: tx, y2: ty + (ty < py ? 6 : -18), stroke: '#e8620c', 'stroke-width': 1.4 }, lab);
      el('circle', { cx: px, cy: py, r: 3.2, fill: '#e8620c' }, lab);
      txt(lab, tx, ty, s, { 'text-anchor': anchor || 'middle', 'font-family': F_HEAD, 'font-weight': 600, 'font-size': 17, fill: '#1c2026' });
    }
    call(AX - 2 * S, cy - G.rs, AX - 30, 44, 'Anvil (stud)');
    call(tip + 5 * S, cy - G.rs, tip + 5 * S + 20, 44, 'Spindle');
    call(G.lx, G.yT - 2.3 * S, G.lx + 30, 22, 'Lock');
    call(edge + 6 * S, cy - G.rt, edge + 6 * S, 44, 'Thimble · head scale');
    call(edge + 14 * S, cy - G.rr, edge + 14 * S + 60, 92, 'Ratchet', 'start');
    call(G.Z0 + 3 * S, cy + 1.2 * S, 560, 318, 'Sleeve · main (pitch) scale', 'start');
    call(G.BX1 + 1.6 * S, cy, G.BX1 + 30, 366, 'Datum line');
    call(G.L - 3 * S, G.yO - 8 * S, 60, 382, 'Frame', 'start');
  })();

  (function reader() {
    const svg = $('read-svg'), V = drawScale(svg, { id: 'rd', x: 7.73 });
    const sl = $('read-sl'), out = $('read-out');
    let quiz = null;
    function show(x) {
      const tr = trueReading(x), whole = Math.floor(x + 1e-9), half = tr.psr - whole >= .5;
      out.innerHTML = `Last whole-mm mark: <b>${whole}</b>${half ? ', and a half-mm mark is showing' : ', no half-mm mark past it'}<br>PSR = <b>${tr.psr.toFixed(1)} mm</b> · HSR = <b>${tr.hsr}</b> div<br>HSR × L.C = ${tr.hsr} × 0.01 = <b>${(tr.hsr * LC).toFixed(2)} mm</b><br><span class="tot">d = ${tr.psr.toFixed(1)} + ${(tr.hsr * LC).toFixed(2)} = ${(tr.psr + tr.hsr * LC).toFixed(2)} mm</span>`;
    }
    function setX(x, fromQuiz) {
      x = +clamp(x, 0, RANGE).toFixed(2);
      sl.value = x; V.set(x);
      if (!fromQuiz) { quiz = null; show(x); }
    }
    sl.addEventListener('input', () => setX(+sl.value));
    document.querySelectorAll('[data-turn]').forEach(b => b.addEventListener('click', () => setX(+sl.value + +b.dataset.turn)));
    $('read-quiz').addEventListener('click', () => {
      quiz = +(1 + Math.random() * 22).toFixed(2);
      setX(quiz, true);
      out.innerHTML = `What does the gauge read?<br><label>d = <input type="text" inputmode="decimal" id="rq-in" autocomplete="off"> mm</label> <button type="button" class="btn-quiet sm" id="rq-go">Check</button><div id="rq-fb"></div>`;
      const inp = $('rq-in'), fb = $('rq-fb');
      function go() {
        const v = parseNum(inp.value);
        if (!isFinite(v)) { fb.textContent = 'Type the reading in mm, e.g. 7.73.'; return; }
        const tr = trueReading(quiz), tot = tr.psr + tr.hsr * LC;
        if (Math.abs(v - tot) < .005) fb.innerHTML = `<b>Correct:</b> ${tr.psr.toFixed(1)} + ${tr.hsr} × 0.01 = ${tot.toFixed(2)} mm.`;
        else if (Math.abs(Math.abs(v - tot) - .5) < .005) fb.textContent = 'Off by 0.5 mm: check the half-millimetre marks below the datum line.';
        else if (Math.abs(v - tot) < .06) fb.textContent = 'PSR looks right; look again at the thimble division on the datum line.';
        else fb.textContent = 'Not quite. Read the last mark uncovered on the sleeve first, then the thimble.';
      }
      $('rq-go').addEventListener('click', go);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
    $('read-show').addEventListener('click', () => { show(+sl.value); quiz = null; });
    // drag the close-up thimble too
    let drag = null;
    V.thG.addEventListener('pointerdown', e => { drag = { y: e.clientY }; V.thG.setPointerCapture(e.pointerId); });
    V.thG.addEventListener('pointermove', e => { if (!drag) return; const dy = e.clientY - drag.y; drag.y = e.clientY; const r = svg.getBoundingClientRect(); setX(+sl.value + dy * (600 / r.width) / 118 / (7.2 * Math.PI / 180) * LC); });
    V.thG.addEventListener('pointerup', () => { drag = null; });
    V.thG.addEventListener('pointercancel', () => { drag = null; });
    show(7.73);
  })();
  (function zeroPanels() {
    drawScale($('zero-a'), { id: 'za', x: 0, edgeX: 330 });
    drawScale($('zero-b'), { id: 'zb', x: .03, edgeX: 330 });
    drawScale($('zero-c'), { id: 'zc', x: -.02, edgeX: 330 });
  })();

  /* =====================================================================
     8. METHOD — apparatus + step figures
     ===================================================================== */
  (function apparatus() {
    const grid = $('app-grid');
    const list = [
      ['Micrometer screw gauge', svg => { defsFor(svg, 'ap1'); svg.setAttribute('viewBox', '0 0 300 140'); const M = drawInstrument(svg, { id: 'ap1', S: 3.1, AX: 40, cy: 52, x: 9, thimbleNumbers: false, shadow: false }); M.set(9); }],
      ['Spheres (steel, brass, aluminium)', svg => { defsFor(svg, 'ap2'); svg.setAttribute('viewBox', '0 0 300 140'); [[90, 'steel', 38], [175, 'brass', 26], [240, 'alu', 32]].forEach(([x, m, r]) => { const b = drawBall(svg, 'ap2', m, r); b.g.setAttribute('transform', `translate(${x} ${118 - r})`); }); }],
      ['Digital balance', svg => { defsFor(svg, 'ap3'); svg.setAttribute('viewBox', '0 0 300 140'); const g = el('g', { transform: 'translate(150 128) scale(.9) translate(-150 0)' }, svg); const B = drawBalance(g, 'ap3', 150, 0); B.disp.textContent = '0.00'; }],
      ['Dishes for the spheres', svg => { svg.setAttribute('viewBox', '0 0 300 140'); const g = el('g', { transform: 'translate(0 10) scale(.62)' }, svg); [1, 2, 3].forEach((n, i) => drawDish(g, 90 + i * 150, 120, n)); }]
    ];
    list.forEach(([name, fn]) => {
      const d = document.createElement('div'); d.className = 'app-item';
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('aria-hidden', 'true');
      d.appendChild(svg); fn(svg);
      const s = document.createElement('span'); s.textContent = name; d.appendChild(s);
      grid.appendChild(d);
    });
  })();
  (function methodSteps() {
    const fig = $('step-fig'), cap = $('step-cap');
    const btns = Array.from(document.querySelectorAll('#steps .step'));
    function newSvg(vb) { fig.innerHTML = ''; const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', vb || '0 0 600 320'); s.setAttribute('role', 'img'); fig.appendChild(s); return s; }
    function inst(s, id, x, ball) {
      defsFor(s, id);
      const M = drawInstrument(s, { id, S: 6.2, AX: 70, cy: 120, x });
      if (ball) { const b = drawBall(s, id, 'steel', ball / 2 * 6.2); b.g.setAttribute('transform', `translate(${70 + ball / 2 * 6.2} 120)`); }
      return M;
    }
    const figs = [
      () => { const s = newSvg('0 -44 600 394'); drawScale(s, { id: 'm1', x: .505 }); txt(s, 300, -16, 'one turn → 0.5 mm   ·   50 divisions', { 'text-anchor': 'middle', 'font-family': F_HEAD, 'font-weight': 600, 'font-size': 20, fill: '#1c2026' }); txt(s, 300, 334, 'L.C = 0.5 mm ÷ 50 = 0.01 mm', { 'text-anchor': 'middle', 'font-family': F_MONO, 'font-size': 20, fill: '#b5480a' }); return 'The sleeve marks half millimetres; one turn of the thimble uncovers one more of them.'; },
      () => { const s = newSvg('0 0 600 350'); drawScale(s, { id: 'm2', x: 0 }); txt(s, 300, 334, 'jaws closed: 0 on the datum line → zero error nil', { 'text-anchor': 'middle', 'font-family': F_HEAD, 'font-weight': 600, 'font-size': 18, fill: '#1c2026' }); return 'With nothing between the jaws, closed by the ratchet, the reading should be exactly zero.'; },
      () => { const s = newSvg('0 0 640 260'); const M = inst(s, 'm3', 12.7, 12.7); const G = M.geom; const rx = G.Z0 + 12.7 * 6.2 + 14 * 6.2; el('path', { d: `M${rx - 16} ${120 - 30} a22 22 0 1 1 30 0`, fill: 'none', stroke: '#e8620c', 'stroke-width': 3 }, s); txt(s, rx, 70, 'click, click', { 'text-anchor': 'middle', 'font-family': F_HEAD, 'font-weight': 700, 'font-size': 16, fill: '#e8620c' }); return 'Close the last part with the ratchet: it slips with a click when the spindle touches the sphere.'; },
      () => { const s = newSvg('0 0 600 300'); const V = drawScale(s, { id: 'm4', x: 12.70 }); V.hi('psr'); return 'Last whole-mm mark: 12; a half-mm mark below the line is showing, so PSR = 12.5 mm.'; },
      () => { const s = newSvg('0 0 600 300'); const V = drawScale(s, { id: 'm5', x: 12.70 }); V.hi('hsr'); return 'Division 20 lies on the datum line, so HSR = 20.'; },
      () => { const s = newSvg('0 0 600 220'); [['d = PSR + (HSR × L.C)', 60, '#1c2026'], ['= 12.5 + (20 × 0.01)', 120, '#3a414b'], ['= 12.70 mm', 180, '#b5480a']].forEach(([t, y, c]) => txt(s, 300, y, t, { 'text-anchor': 'middle', 'font-family': F_MONO, 'font-size': 30, fill: c })); return 'Add the two parts. With zero error nil, no correction is needed.'; },
      () => { const s = newSvg('0 0 640 260'); inst(s, 'm7', 12.7, 12.7); const cx = 70 + 6.35 * 6.2; el('path', { d: `M${cx - 42} 66 A48 18 0 0 1 ${cx + 42} 66`, fill: 'none', stroke: '#e8620c', 'stroke-width': 2.5 }, s); el('path', { d: `M${cx + 42} 66 l-12 -3 M${cx + 42} 66 l-4 -11`, stroke: '#e8620c', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round' }, s); EX.d.forEach((d, i) => txt(s, 360 + i * 54, 240, d.toFixed(2), { 'text-anchor': 'middle', 'font-family': F_MONO, 'font-size': 15, fill: '#3a414b' })); return 'Turn the sphere between readings: five diameters, then their mean.'; },
      () => { const s = newSvg('0 0 600 260'); defsFor(s, 'm8'); const B = drawBalance(s, 'm8', 300, 230); B.disp.textContent = EX.mass.toFixed(2); const b = drawBall(s, 'm8', 'steel', 34); b.g.setAttribute('transform', `translate(300 ${B.panY - 34})`); return 'Place the sphere on the pan of the tared balance and read its mass in grams.'; },
      () => { const s = newSvg('0 0 600 220'); [['V = (4/3) π (d/2)³', 70, '#1c2026'], ['ρ = m / V', 140, '#b5480a']].forEach(([t, y, c]) => txt(s, 300, y, t, { 'text-anchor': 'middle', 'font-family': F_MONO, 'font-size': 34, fill: c })); txt(s, 300, 196, 'd in cm, V in cm³, ρ in g/cm³', { 'text-anchor': 'middle', 'font-family': F_BODY, 'font-size': 18, fill: '#68717d' }); return 'Convert d to cm first, then calculate the volume and the density.'; }
    ];
    function pick(i) {
      btns.forEach((b, k) => b.setAttribute('aria-pressed', k === i ? 'true' : 'false'));
      cap.textContent = figs[i]();
    }
    btns.forEach((b, i) => b.addEventListener('click', () => pick(i)));
    pick(0);
  })();

  /* =====================================================================
     9. RESULTS — example table + spread of the trials
     ===================================================================== */
  (function results() {
    const tb = document.querySelector('#res-table tbody');
    EX.hsr.forEach((h, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${EX.psr.toFixed(1)}</td><td>${h}</td><td>${(h * LC).toFixed(2)}</td><td>${EX.d[i].toFixed(2)}</td>`;
      tb.appendChild(tr);
    });
    const svg = $('spread-svg');
    const x0 = 120, x1 = 720, y0 = 40, y1 = 170, lo = 12.68, hi = 12.73;
    const Y = v => y1 - (v - lo) / (hi - lo) * (y1 - y0);
    for (let v = lo; v <= hi + 1e-9; v += .01) {
      el('line', { x1: x0, y1: Y(v), x2: x1, y2: Y(v), stroke: '#e3e7eb' }, svg);
      txt(svg, x0 - 12, Y(v) + 5, v.toFixed(2), { 'text-anchor': 'end', 'font-family': F_MONO, 'font-size': 14, fill: '#68717d' });
    }
    txt(svg, x0 - 12, 22, 'd (mm)', { 'text-anchor': 'end', 'font-family': F_HEAD, 'font-weight': 600, 'font-size': 15, fill: '#3a414b' });
    el('line', { x1: x0, y1: Y(EX.mean), x2: x1, y2: Y(EX.mean), stroke: '#e8620c', 'stroke-width': 2, 'stroke-dasharray': '6 5' }, svg);
    txt(svg, x1, Y(EX.mean) - 8, `mean ${EX.mean.toFixed(3)}`, { 'text-anchor': 'end', 'font-family': F_MONO, 'font-size': 14, fill: '#b5480a' });
    EX.d.forEach((d, i) => {
      const X = x0 + 60 + i * 120;
      el('circle', { cx: X, cy: Y(d), r: 7, fill: '#3c4a5a' }, svg);
      txt(svg, X, 196, 'trial ' + (i + 1), { 'text-anchor': 'middle', 'font-family': F_BODY, 'font-size': 14, fill: '#68717d' });
    });
  })();

  /* =====================================================================
     10. MCQs — one list, numbered, choices shuffled
     ===================================================================== */
  const MCQ = [
    { q: 'What is the aim of this practical?', a: 'To measure the diameter, volume and density of a sphere', o: ['To measure the pitch of a screw thread', 'To find the zero error of a balance', 'To measure the mass of a sphere only'],
      hint: 'The micrometer gives one quantity and the balance another; both feed a final result.', ex: 'The diameter (micrometer) gives the volume; with the mass (balance) that gives the density.' },
    { q: 'The pitch of a micrometer screw is…', a: 'the distance the spindle moves in one full turn of the thimble', o: ['the number of divisions on the thimble', 'the smallest length the gauge can read', 'the length of the main scale'],
      hint: 'Think of one complete rotation.', ex: 'Pitch = distance moved ÷ number of full turns, here 0.5 mm.' },
    { q: 'Two full turns of the thimble move the spindle 1 mm. The pitch is…', a: '0.5 mm', o: ['1 mm', '2 mm', '0.25 mm'],
      hint: 'Pitch = distance ÷ number of turns.', ex: '1 mm ÷ 2 turns = 0.5 mm per turn.' },
    { q: 'The least count of a micrometer is given by…', a: 'pitch ÷ number of head-scale divisions', o: ['number of head-scale divisions ÷ pitch', 'pitch × number of head-scale divisions', 'main-scale division ÷ 10'],
      hint: 'One turn is shared equally among the divisions.', ex: 'L.C = pitch ÷ N, e.g. 0.5 mm ÷ 50 = 0.01 mm.' },
    { q: 'Pitch 0.5 mm and 50 head-scale divisions give a least count of…', a: '0.01 mm', o: ['0.1 mm', '0.001 mm', '25 mm'],
      hint: 'Divide 0.5 by 50.', ex: '0.5 ÷ 50 = 0.01 mm.' },
    { q: 'The PSR is read from…', a: 'the main scale on the sleeve, at the edge of the thimble', o: ['the thimble division on the datum line', 'the ratchet', 'the frame label'],
      hint: 'PSR stands for pitch scale reading.', ex: 'PSR is the last mark the thimble has uncovered on the sleeve scale.' },
    { q: 'The HSR is…', a: 'the thimble division lined up with the datum line', o: ['the last mark uncovered on the sleeve', 'the number of full turns made', 'the reading in mm shown on the frame'],
      hint: 'HSR stands for head scale reading.', ex: 'HSR is counted in divisions on the thimble, read where the datum line meets it.' },
    { q: 'The total reading of a micrometer is…', a: 'PSR + (HSR × L.C)', o: ['PSR × HSR × L.C', '(PSR + HSR) × L.C', 'PSR − (HSR × L.C)'],
      hint: 'The head scale adds a small fraction to the main-scale reading.', ex: 'd = PSR + (HSR × L.C).' },
    { q: 'PSR = 12.5 mm and HSR = 20 with L.C = 0.01 mm. The diameter is…', a: '12.70 mm', o: ['32.5 mm', '12.52 mm', '14.5 mm'],
      hint: 'HSR × L.C = 20 × 0.01.', ex: '12.5 + 0.20 = 12.70 mm.' },
    { q: 'The sleeve shows 7 whole mm and a half-mm mark past it; HSR = 23. The reading is…', a: '7.73 mm', o: ['7.23 mm', '7.53 mm', '30.5 mm'],
      hint: 'The half-mm mark adds 0.5 mm to the PSR.', ex: 'PSR = 7.5 mm; 7.5 + 23 × 0.01 = 7.73 mm.' },
    { q: 'With the jaws closed and nothing between them, the thimble 0 is 3 divisions below the datum line. The zero error is…', a: '+0.03 mm', o: ['−0.03 mm', '+0.3 mm', 'nil'],
      hint: 'Below the datum line means the gauge reads a little more than zero.', ex: 'The closed gauge reads +0.03 mm, so 0.03 mm is subtracted from every reading.' },
    { q: 'An observed reading is 8.46 mm and the zero error is +0.02 mm. The corrected reading is…', a: '8.44 mm', o: ['8.48 mm', '8.46 mm', '6.46 mm'],
      hint: 'Corrected = observed − zero error.', ex: '8.46 − 0.02 = 8.44 mm.' },
    { q: 'Why is the ratchet used for the final tightening?', a: 'It slips at a set light pressure, so the object is not squeezed', o: ['It makes the spindle move faster', 'It locks the spindle in place', 'It removes the zero error'],
      hint: 'Listen for the click.', ex: 'The ratchet clicks once contact is made, giving the same gentle pressure every time.' },
    { q: 'Over-tightening the thimble on a sphere usually makes the reading…', a: 'too small, and it can damage the screw', o: ['too large', 'exactly right', 'change only the HSR to zero'],
      hint: 'Forcing the jaws together compresses the contact.', ex: 'Forcing the spindle squeezes the sphere and strains the frame, so the gauge reads short.' },
    { q: 'Why take five readings at different positions on the sphere?', a: 'The sphere may not be perfectly round, and averaging reduces random error', o: ['The micrometer needs to warm up', 'Each reading has a different least count', 'The first four readings are always wrong'],
      hint: 'Think about the shape of a real ball.', ex: 'Different orientations sample the true shape; the mean is more reliable than one reading.' },
    { q: 'The mean diameter is 12.704 mm. In centimetres this is…', a: '1.2704 cm', o: ['127.04 cm', '0.12704 cm', '12.704 cm'],
      hint: '10 mm = 1 cm.', ex: '12.704 ÷ 10 = 1.2704 cm.' },
    { q: 'The volume of a sphere of diameter d is…', a: '(4/3) π (d/2)³', o: ['(4/3) π d³', '(4/3) π (d/2)²', '4 π (d/2)²'],
      hint: 'Use the radius, cubed.', ex: 'V = (4/3) π r³ with r = d/2.' },
    { q: 'Using d instead of r in V = (4/3) π r³ makes the volume…', a: '8 times too big', o: ['2 times too big', '4 times too big', 'unchanged'],
      hint: '(2r)³ = ?', ex: '(2r)³ = 8r³, so the volume is 8 times too big.' },
    { q: 'A sphere has m = 8.38 g and V = 1.074 cm³. Its density is about…', a: '7.80 g/cm³', o: ['0.128 g/cm³', '9.00 g/cm³', '78.0 g/cm³'],
      hint: 'ρ = m ÷ V.', ex: '8.38 ÷ 1.074 ≈ 7.80 g/cm³, close to steel.' },
    { q: 'Before placing the sphere on a digital balance, the balance should be…', a: 'tared to read 0.00 g with the pan empty', o: ['tared with the sphere already on the pan', 'switched off and on after each reading', 'tilted slightly towards the user'],
      hint: 'The display should start from zero.', ex: 'Taring the empty balance makes the display show only the mass of the sphere.' }
  ];
  (function mcq() {
    const list = $('mcq-list'), score = $('mcq-score');
    let solved = 0;
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function updScore() { score.textContent = `${solved} of ${MCQ.length} correct`; }
    function render() {
      solved = 0; list.innerHTML = '';
      MCQ.forEach((m, qi) => {
        const li = document.createElement('li'); li.className = 'mcq';
        const opts = shuffle([m.a].concat(m.o));
        li.innerHTML = `<p class="mcq-q"><span class="mcq-n">${qi + 1}.</span><span></span></p><div class="mcq-opts"></div><div class="mcq-fb" aria-live="polite"></div>`;
        li.querySelector('.mcq-q span:last-child').textContent = m.q;
        const box = li.querySelector('.mcq-opts'), fb = li.querySelector('.mcq-fb');
        opts.forEach(o => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = o;
          b.addEventListener('click', () => {
            if (li.classList.contains('solved')) return;
            if (o === m.a) {
              b.classList.remove('wrong'); b.classList.add('right'); li.classList.add('solved');
              box.querySelectorAll('.opt').forEach(x => { x.disabled = true; x.classList.remove('wrong'); });
              fb.className = 'mcq-fb show explain'; fb.textContent = m.ex;
              solved++; updScore();
            } else {
              b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
              fb.className = 'mcq-fb show hint'; fb.textContent = 'Not quite. ' + m.hint;
            }
          });
          box.appendChild(b);
        });
        list.appendChild(li);
      });
      updScore();
    }
    $('mcq-reset').addEventListener('click', render);
    render();
  })();

  /* =====================================================================
     11. PRACTICAL — micrometer, dishes, balance, magnifier, table, calculation
     ===================================================================== */
  (function practical() {
    const svg = $('rig'); defsFor(svg, 'rg');
    const S = 10, AX = 120, CY = 175, VBW = 960;
    const DISH_X = [100, 250, 400, 550], RIM = 548, PAN_X = 790;
    // bench, tray, dishes, balance
    el('rect', { x: 0, y: 608, width: VBW, height: 42, fill: '#dfe3e8' }, svg);
    el('line', { x1: 0, y1: 608, x2: VBW, y2: 608, stroke: '#c3cad2' }, svg);
    el('rect', { x: 22, y: 580, width: 610, height: 28, rx: 6, fill: 'url(#rg-tray)', stroke: '#9aa4af' }, svg);
    DISH_X.forEach((x, i) => drawDish(svg, x, RIM, i + 1));
    const BAL = drawBalance(svg, 'rg', PAN_X, 600);
    BAL.tare.classList.add('live');
    BAL.tare.setAttribute('role', 'button'); BAL.tare.setAttribute('tabindex', '0'); BAL.tare.setAttribute('aria-label', 'Tare the balance');
    const M = drawInstrument(svg, { id: 'rg', S, AX, cy: CY, x: 6 });
    const G = M.geom;
    // a dashed outline showing where the magnifier looks
    const loupe = el('rect', { y: CY - 46, width: 96, height: 92, rx: 12, fill: 'none', stroke: '#e8620c', 'stroke-width': 1.6, 'stroke-dasharray': '5 4', opacity: .75, 'pointer-events': 'none' }, svg);
    const fx = el('g', { 'pointer-events': 'none' }, svg);
    const overMark = el('g', { opacity: 0 }, fx);
    const overRing = el('circle', { r: 16, fill: 'rgba(184,64,42,.15)', stroke: '#b8402a', 'stroke-width': 2 }, overMark);
    const overTxt = txt(overMark, 0, 0, 'over-tightened', { 'text-anchor': 'middle', 'font-family': F_HEAD, 'font-weight': 700, 'font-size': 15, fill: '#b8402a' });
    const hiRing = el('rect', { rx: 12, fill: 'none', stroke: '#e8620c', 'stroke-width': 3, opacity: 0 }, fx);
    const ballLayer = el('g', null, svg);
    // thimble, ratchet, lock as controls
    const thumb = M.thBody; thumb.classList.add('grab-t', 'knob-t');
    thumb.setAttribute('tabindex', '0'); thumb.setAttribute('role', 'slider'); thumb.setAttribute('aria-label', 'Thimble: drag, scroll or use the arrow keys to turn');
    thumb.setAttribute('aria-valuemin', '0'); thumb.setAttribute('aria-valuemax', '25');
    el('rect', { class: 'focus-ring', x: G.Z0 - 4, y: CY - G.rt - 4, width: 11 * S + 8, height: 2 * G.rt + 8, rx: 9, fill: 'none', stroke: '#e8620c', 'stroke-width': 2.5 }, thumb);
    const ratG = M.ratG; ratG.classList.add('grab-t', 'knob-t');
    ratG.setAttribute('tabindex', '0'); ratG.setAttribute('role', 'button'); ratG.setAttribute('aria-label', 'Ratchet: hold to close gently');
    el('rect', { class: 'focus-ring', x: G.Z0 + 12 * S - 4, y: CY - G.rr - 4, width: 4.2 * S + 8, height: 2 * G.rr + 8, rx: 9, fill: 'none', stroke: '#e8620c', 'stroke-width': 2.5 }, ratG);
    const lockG = M.lockG; lockG.classList.add('live', 'knob-t');
    lockG.setAttribute('tabindex', '0'); lockG.setAttribute('role', 'button'); lockG.setAttribute('aria-label', 'Lock');
    const MG = drawScale($('mag'), { id: 'mg', x: 6 });

    /* ---------- balls ---------- */
    const MATS = { steel: ['steel', 7.8], brass: ['brass', 8.5], alu: ['aluminium', 2.7] };
    const BALLS = [
      { n: 1, mat: 'steel', d0: 12.704, m: 8.38 },
      { n: 2, mat: 'steel', d0: 9.525, m: 3.53 },
      { n: 3, mat: 'brass', d0: 7.94, m: 2.23 },
      { n: 4, mat: 'alu', d0: 11.11, m: 1.94 }
    ];
    BALLS.forEach((b, i) => {
      b.r = b.d0 / 2 * S; b.hx = DISH_X[i]; b.hy = RIM + 6 - b.r;
      const D = drawBall(ballLayer, 'rg', b.mat, b.r); b.g = D.g; b.markG = D.mark;
      b.g.setAttribute('role', 'img'); b.g.setAttribute('aria-label', `Ball ${b.n}`);
      b.x = b.hx; b.y = b.hy; b.loc = 'dish'; b.dt = b.d0; b.trial = 0; b.rot = i * 40; b.weighed = false;
      b.g.addEventListener('pointerdown', e => grabBall(b, e));
    });
    function placeBall(b) { b.g.setAttribute('transform', `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`); b.markG.setAttribute('transform', `rotate(${b.rot.toFixed(1)})`); }
    function freeState() { BALLS.forEach(b => b.g.classList.toggle('free', b.loc === 'dish' || b.loc === 'pan' || (b.loc === 'jaws' && st.x > b.dt + .002))); }

    /* ---------- state ---------- */
    const st = { v: 6, x: 6, sq: 0, locked: false, jaw: null, pan: null, clicks: 0, zero: 'unchecked', tare: 0, shown: 0, lastRec: null, tableBall: null, overMsg: false, trialN: 0, force: [], gest: false };
    const rows = [];
    const msgEl = $('rig-msg');
    function say(t, cls) { msgEl.textContent = t; msgEl.className = 'rig-msg' + (cls ? ' ' + cls : ''); }
    const contact = () => st.jaw ? st.jaw.dt : 0;

    function apply() {
      const c = contact();
      if (st.v >= c) { st.x = st.v; st.sq = 0; }
      else { st.sq = Math.min(.03, (c - st.v) * .5); st.x = c - st.sq; }
      M.set(st.x); MG.set(st.x);
      thumb.setAttribute('aria-valuenow', st.x.toFixed(2));
      const edge = G.Z0 + st.x * S;
      loupe.setAttribute('x', edge - 62);
      if (st.jaw) { const b = st.jaw; b.x = AX + b.dt / 2 * S; b.y = CY; placeBall(b); }
      const tip = AX + st.x * S;
      if (st.sq > .004) {
        overMark.setAttribute('opacity', 1);
        overRing.setAttribute('cx', tip); overRing.setAttribute('cy', CY);
        overTxt.setAttribute('x', (AX + tip) / 2); overTxt.setAttribute('y', CY - G.rs - 18);
      } else overMark.setAttribute('opacity', 0);
      freeState();
      if (st.jaw && st.x > st.jaw.dt + 1.5) fall(st.jaw);
    }

    /* ---------- sound + click pop ---------- */
    let actx = null;
    ['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { st.gest = true; }, { capture: true }));
    function clickSound() {
      if (!st.gest) return;
      try {
        if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        const sr = actx.sampleRate, buf = actx.createBuffer(1, Math.floor(sr * .03), sr), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * .003));
        const src = actx.createBufferSource(); src.buffer = buf;
        const f = actx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800;
        const gn = actx.createGain(); gn.gain.value = .22;
        src.connect(f); f.connect(gn); gn.connect(actx.destination); src.start();
      } catch (e) { /* audio is optional */ }
    }
    function pop() {
      if (tut.on && tut.skip) return;          // no click marks while a step is being skipped
      const x = G.Z0 + st.x * S + 14.1 * S;
      const t = txt(fx, x, CY - G.rr - 10, 'click', { 'text-anchor': 'middle', 'font-family': F_HEAD, 'font-weight': 700, 'font-size': 16, fill: '#e8620c' });
      if (t.animate) { const an = t.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-16px)' }], { duration: 650, easing: 'ease-out' }); an.playbackRate = TC.speed; an.onfinish = () => t.remove(); }
      else setTimeout(() => t.remove(), 650);
    }

    /* ---------- thimble, ratchet, lock ---------- */
    function lockedMsg() { say('The lock is on, so the spindle cannot turn. Release the lock first.', 'warn'); }
    function turnThimble(dmm) {
      if (st.locked) { lockedMsg(); return; }
      const c = contact();
      let nv = st.v + dmm;
      nv = clamp(nv, c - .07, RANGE);
      if (nv > c + 1e-9) st.clicks = 0;
      st.v = nv; apply();
      if (st.sq > .004) {
        if (!st.overMsg) say(st.jaw ? 'Over-tightened: the thimble was forced past contact, so the jaws squeeze the ball and the scale now reads short. This can also damage the screw. Open slightly and close again with the ratchet.' : 'Over-tightened: the spindle is forced against the anvil and the scale reads below zero. Open slightly and close with the ratchet.', 'bad');
        st.overMsg = true;
      } else if (st.overMsg && st.sq === 0) { st.overMsg = false; say('Pressure released. Finish the closing with the ratchet so it stops at the right pressure.'); }
    }
    function click() {
      st.clicks++; clickSound(); pop();
      if (st.sq > .004) { say('The ratchet slips, but the jaws were already forced past contact with the thimble. Open slightly and close again with the ratchet only.', 'bad'); return; }
      if (st.jaw) {
        if (st.clicks === 2) say(`The ratchet clicks: the spindle touches ball ${st.jaw.n} with light, even pressure. Lock it, then read PSR and HSR in the magnifier.`, 'ok');
      } else if (st.clicks >= 2 && st.v <= 1e-9) {
        if (st.zero !== 'nil') { st.zero = 'nil'; updZero(); }
        if (st.clicks === 2) say('Jaws closed with the ratchet: the sleeve shows 0 and the thimble 0 sits on the datum line. Zero error nil.', 'ok');
      }
    }
    function ratchetStep(dmm) {
      if (st.locked) { lockedMsg(); return false; }
      const c = contact();
      if (dmm > 0) { st.v = Math.min(RANGE, st.v + dmm); st.clicks = 0; apply(); return true; }
      if (st.v > c + 1e-9) { st.v = Math.max(c, st.v + dmm); apply(); if (st.v <= c + 1e-9) click(); return true; }
      click(); return false;
    }
    let rHold = null;
    function ratchetHold(on) {
      if (on) {
        if (rHold) return;
        if (st.locked) { lockedMsg(); return; }
        rHold = { t0: performance.now(), last: performance.now(), lastClick: 0 };
        $('c-ratchet').classList.add('on');
        const loop = now => {
          if (!rHold) return;
          const dt = Math.min(.05, (now - rHold.last) / 1000); rHold.last = now;
          const c = contact();
          if (st.locked) { ratchetHold(false); return; }
          if (st.v > c + 1e-9) {
            const sp = Math.min(3.5, .8 + 2.2 * (now - rHold.t0) / 1000);
            st.v = Math.max(c, st.v - sp * dt); apply();
            if (st.v <= c + 1e-9) { click(); rHold.lastClick = now; }
          } else if (now - rHold.lastClick > 150) { click(); rHold.lastClick = now; }
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      } else { rHold = null; $('c-ratchet').classList.remove('on'); }
    }
    function setLock(on) {
      st.locked = on; M.setLock(on);
      $('c-lock').setAttribute('aria-pressed', on ? 'true' : 'false');
      lockG.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) ratchetHold(false);
    }
    function toggleLock() {
      setLock(!st.locked);
      say(st.locked ? 'Locked: the spindle cannot move while the scales are read.' : 'Lock released: the thimble and ratchet turn again.');
    }

    // thimble by drag (rig and magnifier), wheel and keys
    function svgScale(s) { const r = s.getBoundingClientRect(); return s.viewBox.baseVal.width / r.width; }
    function dragTurn(target, svgEl, radius) {
      let d = null;
      target.addEventListener('pointerdown', e => {
        if (document.body.classList.contains('tut-on')) return;
        e.preventDefault(); target.setPointerCapture(e.pointerId);
        d = { y: e.clientY, t: performance.now() };
      });
      target.addEventListener('pointermove', e => {
        if (!d) return;
        const now = performance.now(), dy = e.clientY - d.y, dt = Math.max(1, now - d.t);
        d.y = e.clientY; d.t = now;
        const v = Math.abs(dy) / dt;
        const factor = Math.min(60, 1 + 25 * Math.pow(v, 1.4));
        const ang = dy * svgScale(svgEl) / radius;
        turnThimble(ang / (2 * Math.PI) * PITCH * factor);
      });
      const end = () => { d = null; };
      target.addEventListener('pointerup', end); target.addEventListener('pointercancel', end);
    }
    dragTurn(thumb, svg, G.rsl + .35 * S);
    dragTurn(MG.thG, $('mag'), MG.geom.Rt);
    let wh = { t: 0, m: 1 };
    function wheelTurn(e) {
      if (document.body.classList.contains('tut-on')) return;
      e.preventDefault();
      const now = performance.now();
      wh.m = now - wh.t < 60 ? Math.min(25, wh.m * 1.3) : 1; wh.t = now;
      turnThimble(Math.sign(e.deltaY) * LC * Math.round(wh.m) * (e.shiftKey ? 10 : 1));
    }
    thumb.addEventListener('wheel', wheelTurn, { passive: false });
    MG.thG.addEventListener('wheel', wheelTurn, { passive: false });
    let kr = 1;
    thumb.addEventListener('keydown', e => {
      const up = ['ArrowUp', 'ArrowRight', 'PageUp'].includes(e.key), dn = ['ArrowDown', 'ArrowLeft', 'PageDown'].includes(e.key);
      if (!up && !dn) return;
      e.preventDefault();
      kr = e.repeat ? Math.min(20, kr * 1.15) : 1;
      const step = (e.shiftKey || e.key.startsWith('Page') ? PITCH : LC) * Math.round(kr);
      turnThimble(up ? step : -step);
    });
    // ratchet: hold (pointer / button / keys), wheel
    function holdable(elm) {
      elm.addEventListener('pointerdown', e => { if (document.body.classList.contains('tut-on')) return; e.preventDefault(); try { elm.setPointerCapture(e.pointerId); } catch (_) { /* svg capture can fail */ } ratchetHold(true); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => elm.addEventListener(ev, () => ratchetHold(false)));
    }
    holdable(ratG); holdable($('c-ratchet'));
    ratG.addEventListener('wheel', e => { if (document.body.classList.contains('tut-on')) return; e.preventDefault(); ratchetStep(e.deltaY > 0 ? .02 : -.02); }, { passive: false });
    [ratG, $('c-ratchet')].forEach(elm => {
      elm.addEventListener('keydown', e => {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); ratchetStep(-.03); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); ratchetStep(.03); }
      });
    });
    lockG.addEventListener('click', toggleLock);
    lockG.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleLock(); } });
    $('c-lock').addEventListener('click', toggleLock);

    /* ---------- moving balls ---------- */
    function tween(b, x, y, ms, ease) {
      return new Promise(res => {
        const x0 = b.x, y0 = b.y, t0 = tnow(), g0 = tut.gen;
        const f = () => {
          if (g0 !== tut.gen) return res();
          let k = Math.min(1, (tnow() - t0) / ms); if (tut.on && tut.skip) k = 1;
          const e = ease ? ease(k) : (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
          b.x = x0 + (x - x0) * e; b.y = y0 + (y - y0) * (ease ? k : e); if (ease) b.y = y0 + (y - y0) * ease(k);
          placeBall(b);
          if (k < 1) requestAnimationFrame(f); else res();
        };
        requestAnimationFrame(f);
      });
    }
    async function home(b, msg, cls) {
      b.loc = 'anim'; freeState();
      if (msg) say(msg, cls);
      await tween(b, b.hx, b.hy, 520);
      b.loc = 'dish'; freeState();
    }
    async function fall(b) {
      if (st.jaw === b) st.jaw = null;
      b.loc = 'anim'; apply();
      say(`The gap opened far wider than ball ${b.n}, so it dropped out of the jaws and rolled back to dish ${b.n}.`, 'warn');
      await tween(b, b.x - 10, 608 - b.r, 420, k => k * k);
      await tween(b, b.x - 18, 608 - b.r - 18, 160, k => 1 - (1 - k) * (1 - k));
      await tween(b, b.x - 22, 608 - b.r, 160, k => k * k);
      await tween(b, b.hx, b.hy, 650);
      b.loc = 'dish'; freeState();
    }
    function newOrientation(b) {
      let dt;
      if (st.force.length) dt = st.force.shift();
      else {
        do { dt = +(b.d0 + (Math.random() - .5) * .04).toFixed(3); } while (Math.abs(dt - b.dt) < .004);
      }
      b.dt = dt; b.trial = ++st.trialN;
    }
    function putInJaws(b) {
      st.jaw = b; b.loc = 'jaws'; st.clicks = 0;
      apply();
    }
    function weighDisplay() {
      const target = (st.pan ? st.pan.m : 0) - st.tare;
      const start = st.shown, t0 = tnow(), ms = 750;
      const tok = (weighDisplay.tok = (weighDisplay.tok || 0) + 1);
      const f = () => {
        if (tok !== weighDisplay.tok) return;
        let k = Math.min(1, (tnow() - t0) / ms); if (tut.on && tut.skip) k = 1;
        const jit = k < 1 ? (Math.random() - .5) * .06 * (1 - k) : 0;
        st.shown = start + (target - start) * (1 - Math.pow(1 - k, 3)) + jit;
        BAL.disp.textContent = (Math.abs(st.shown) < .005 ? 0 : st.shown).toFixed(2);
        if (k < 1) requestAnimationFrame(f);
        else { st.shown = target; BAL.disp.textContent = (Math.abs(target) < .005 ? 0 : target).toFixed(2); if (st.pan && Math.abs(st.tare) < 1e-9) st.pan.weighed = true; }
      };
      requestAnimationFrame(f);
    }
    function putOnPan(b) {
      st.pan = b; b.loc = 'pan'; b.x = PAN_X; b.y = BAL.panY - b.r; placeBall(b); freeState();
      weighDisplay();
      say(Math.abs(st.tare) < 1e-9 ? `Ball ${b.n} is on the pan. Wait for the display to settle, then read the mass in grams.` : 'The balance was tared with a load on it, so this reading is not the mass of the ball. Take the ball off, tare the empty pan and weigh again.', Math.abs(st.tare) < 1e-9 ? '' : 'warn');
    }
    BAL.tare.addEventListener('click', () => {
      st.tare = st.pan ? st.pan.m : 0;
      if (st.pan) st.pan.weighed = false;
      st.shown = 0; weighDisplay.tok = (weighDisplay.tok || 0) + 1; BAL.disp.textContent = '0.00';
      say(st.pan ? 'Tared with a ball on the pan: the display now ignores that ball. Tare with the pan empty before weighing.' : 'Balance tared: the empty pan reads 0.00 g.', st.pan ? 'warn' : '');
    });
    BAL.tare.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); BAL.tare.dispatchEvent(new Event('click')); } });

    let drag = null;
    function grabBall(b, e) {
      if (document.body.classList.contains('tut-on') || drag) return;
      if (b.loc === 'anim') return;
      if (b.loc === 'jaws' && st.x <= b.dt + .002) {
        say(`Ball ${b.n} is held between the anvil and the spindle. Open the thimble a little before taking it out.`, 'warn');
        return;
      }
      e.preventDefault();
      ratchetHold(false);
      if (b.loc === 'jaws') { st.jaw = null; apply(); }
      if (b.loc === 'pan') { st.pan = null; weighDisplay(); }
      b.loc = 'drag'; freeState();
      ballLayer.appendChild(b.g);
      const p = svgPoint(svg, e);
      drag = { b, dx: b.x - p.x, dy: b.y - p.y, id: e.pointerId };
      svg.setPointerCapture(e.pointerId);
    }
    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      const p = svgPoint(svg, e);
      drag.b.x = clamp(p.x + drag.dx, 20, VBW - 20); drag.b.y = clamp(p.y + drag.dy, 20, 630);
      placeBall(drag.b);
    });
    function endDrag() {
      if (!drag) return;
      const b = drag.b; drag = null;
      const x = b.x, y = b.y;
      const tip = AX + st.x * S;
      if (x > AX - 20 && x < Math.max(tip, AX + b.r * 2) + 30 && Math.abs(y - CY) < 95) {
        if (st.jaw) return home(b, `The jaws already hold ball ${st.jaw.n}. Ball ${b.n} goes back to dish ${b.n}.`, 'warn');
        const old = b.dt; newOrientation(b);
        if (st.x < b.dt) { b.dt = old; st.trialN--; return home(b, `The gap is too narrow for ball ${b.n}. Turn the thimble to open the jaws a little wider than the ball first.`, 'warn'); }
        putInJaws(b);
        if (st.jaw === b) say(`Ball ${b.n} sits between the anvil and the spindle. Close the gap with the thimble, then finish with the ratchet until it clicks.`);
        return;
      }
      if (Math.abs(x - PAN_X) < 110 && y > 360 && y < 560) {
        if (st.pan) return home(b, `The pan already holds ball ${st.pan.n}. Ball ${b.n} goes back to dish ${b.n}.`, 'warn');
        return putOnPan(b);
      }
      const j = DISH_X.findIndex(dx => Math.abs(x - dx) < 75 && y > 400);
      if (j >= 0 && j !== b.n - 1) return home(b, `Each ball has its own dish: ball ${b.n} goes back to dish ${b.n}.`);
      return home(b, j === b.n - 1 ? `Ball ${b.n} is back in dish ${b.n}.` : `Ball ${b.n} returns to dish ${b.n}.`);
    }
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);

    function turnBall(animate) {
      const b = st.jaw;
      if (!b) { say('Place a ball between the anvil and the spindle first.', 'warn'); return false; }
      if (st.x < b.dt + .05) { say('Open the thimble slightly first (about one turn) so the ball can turn freely.', 'warn'); return false; }
      newOrientation(b);
      const r0 = b.rot, r1 = r0 + 55 + Math.random() * 50, t0 = tnow();
      const f = () => { const k = Math.min(1, (tnow() - t0) / 600); b.rot = r0 + (r1 - r0) * k; placeBall(b); if (k < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
      apply();
      say(`Ball ${b.n} turned to a new position. Close again with the ratchet for the next reading.`);
      return true;
    }
    $('c-turn').addEventListener('click', () => turnBall(true));
    function updZero() {
      const z = $('zero-stat');
      z.innerHTML = st.zero === 'nil' ? 'Zero error: <b>nil</b> (jaws closed by the ratchet read 0.00 mm)' : 'Zero error: <b>not checked</b>';
      z.classList.toggle('ok', st.zero === 'nil');
    }
    $('c-zero').addEventListener('click', () => {
      if (st.jaw) { say('Take the ball out of the jaws first: the zero is checked with nothing between them.', 'warn'); return; }
      say('Zero check: turn the thimble until the spindle is close to the anvil, then finish with the ratchet until it clicks. Read the scales in the magnifier.');
    });

    /* ---------- observation table ---------- */
    const tbody = $('p-tbody'), inPsr = $('in-psr'), inHsr = $('in-hsr'), recMsg = $('rec-msg'), meanBox = $('p-mean');
    function rsay(t, cls) { recMsg.textContent = t; recMsg.className = 'rec-msg' + (cls ? ' ' + cls : ''); }
    const meanD = () => rows.reduce((a, r) => a + r.d, 0) / rows.length;
    function renderTable(fresh) {
      tbody.innerHTML = '';
      if (!rows.length) { tbody.innerHTML = '<tr class="empty"><td colspan="5">No trials recorded yet.</td></tr>'; }
      rows.forEach((r, i) => {
        const tr = document.createElement('tr'); if (i === fresh) tr.className = 'fresh';
        tr.innerHTML = `<td>${i + 1}</td><td>${r.psr.toFixed(1)}</td><td>${r.hsr}</td><td>${(r.hsr * LC).toFixed(2)}</td><td>${r.d.toFixed(2)}</td>`;
        tbody.appendChild(tr);
      });
      const done = rows.length === 5;
      meanBox.hidden = !done;
      if (done) {
        const m = meanD();
        meanBox.innerHTML = `<div>Mean (d) = (${rows.map(r => r.d.toFixed(2)).join(' + ')}) ÷ 5 = <b>${m.toFixed(3)} mm</b></div>`;
        $('fx-mean').textContent = m.toFixed(3);
      } else $('fx-mean').textContent = '—';
      inPsr.disabled = inHsr.disabled = $('btn-rec').disabled = done;
      $('btn-undo').disabled = !rows.length;
    }
    function flag(inp, on) { inp.classList.toggle('flag', !!on); }
    function record() {
      flag(inPsr, false); flag(inHsr, false);
      if (rows.length >= 5) return rsay('Five trials are recorded. Delete the last row to redo one.', 'warn');
      const P = parseNum(inPsr.value), H = parseNum(inHsr.value);
      if (!isFinite(P) || !isFinite(H)) { flag(inPsr, !isFinite(P)); flag(inHsr, !isFinite(H)); return rsay('Enter both the PSR (mm) and the HSR (divisions).', 'warn'); }
      const b = st.jaw;
      if (!b) return rsay('Clamp a ball between the anvil and the spindle first, closing with the ratchet until it clicks.', 'warn');
      if (st.tableBall && b !== st.tableBall) return rsay(`The table holds readings for ball ${st.tableBall.n}. Use the same ball for all five trials, or Start over.`, 'warn');
      if (st.v > b.dt + 1e-6) return rsay('The spindle is not touching the ball yet. Close with the ratchet until it clicks, then read the scales.', 'warn');
      if (st.sq > .004) return rsay('The jaws were forced past contact with the thimble, so they squeeze the ball and the scale reads short. Open slightly and close again with the ratchet.', 'warn');
      if (st.lastRec === b.trial) return rsay('This position is already recorded. Open the jaws slightly, turn the ball and close again with the ratchet for the next trial.', 'warn');
      if (H !== Math.round(H) || H < 0 || H >= NDIV) {
        flag(inHsr, true);
        if (H > 0 && H < 1) return rsay('HSR is counted in divisions (for example 20), not in mm. The table multiplies it by L.C.', 'warn');
        return rsay('HSR is a whole number of thimble divisions, from 0 to 49.', 'warn');
      }
      if (Math.abs(P * 2 - Math.round(P * 2)) > 1e-6 || P < 0) { flag(inPsr, true); return rsay('PSR goes up in steps of 0.5 mm: whole millimetres, plus 0.5 if a half-millimetre mark is showing.', 'warn'); }
      const tr = trueReading(st.x), tot = P + H * LC;
      if (Math.abs(tot - st.x) > .0105) {
        if (Math.abs(P - (tr.psr - .5)) < 1e-6) { flag(inPsr, true); return rsay('A half-millimetre mark below the datum line is showing past the last whole-mm mark. Add 0.5 mm to the PSR.', 'warn'); }
        if (Math.abs(P - (tr.psr + .5)) < 1e-6) { flag(inPsr, true); return rsay('That half-millimetre mark is still under the edge of the thimble, so it does not count yet.', 'warn'); }
        if (Math.abs(P - tr.psr) < 1e-6) { flag(inHsr, true); return rsay('The PSR is right. Read the thimble division that sits on the datum line; the magnifier shows it clearly.', 'warn'); }
        if (Math.abs(Math.abs(P - tr.psr) - 1) < 1e-6) { flag(inPsr, true); return rsay('Count the whole-millimetre marks above the datum line again; the numbers mark every 5 mm.', 'warn'); }
        flag(inPsr, true); flag(inHsr, true);
        return rsay('That does not match the scales. Read the last mark the thimble has uncovered, then the division on the datum line.', 'warn');
      }
      rows.push({ psr: P, hsr: H, d: +(P + H * LC).toFixed(2) });
      st.lastRec = b.trial; st.tableBall = b;
      inPsr.value = ''; inHsr.value = '';
      renderTable(rows.length - 1);
      let m = `Trial ${rows.length} recorded: d = ${P.toFixed(1)} + ${H} × 0.01 = ${(P + H * LC).toFixed(2)} mm.`;
      if (rows.length < 5) m += ' Open slightly, turn the ball and close again for the next trial.';
      else m += ' Five trials done: the mean is below the table.';
      if (rows.length === 1 && st.zero !== 'nil') m += ' The zero has not been checked yet (Check zero, with the jaws empty).';
      rsay(m, 'ok');
    }
    $('btn-rec').addEventListener('click', record);
    [inPsr, inHsr].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') record(); }));
    $('btn-undo').addEventListener('click', () => {
      rows.pop(); st.lastRec = null; if (!rows.length) st.tableBall = null;
      renderTable(); rsay('Last row deleted.');
    });

    /* ---------- calculation + check ---------- */
    const inDcm = $('in-dcm'), inR = $('in-r'), inV = $('in-v'), inM = $('in-m'), inRho = $('in-rho'), chk = $('check-msg');
    const calcIns = [inDcm, inR, inV, inM, inRho];
    const vol = r => 4 / 3 * Math.PI * r * r * r;
    function check() {
      calcIns.forEach(i => i.classList.remove('flag', 'okf'));
      if (rows.length < 5) { chk.className = 'check-msg nudge'; chk.textContent = 'Record five trials first: the calculation starts from their mean.'; return false; }
      const mean = meanD(), b = st.tableBall, probs = [];
      const v = { dcm: parseNum(inDcm.value), r: parseNum(inR.value), V: parseNum(inV.value), m: parseNum(inM.value), rho: parseNum(inRho.value) };
      const res = (inp, ok, msg) => { inp.classList.add(ok ? 'okf' : 'flag'); if (!ok) probs.push(msg); return ok; };
      const dE = mean / 10;
      let ok = isFinite(v.dcm) && near(v.dcm, dE, .002);
      if (!isFinite(v.dcm)) res(inDcm, false, 'Fill in d in cm.');
      else if (ok) res(inDcm, true);
      else if (near(v.dcm, mean, .002)) res(inDcm, false, 'd is still in millimetres. Divide by 10, since 10 mm = 1 cm.');
      else if (near(v.dcm, mean / 100, .002)) res(inDcm, false, 'To change mm to cm, divide by 10, not by 100.');
      else if (near(v.dcm, mean * 10, .002)) res(inDcm, false, 'To change mm to cm, divide by 10 rather than multiply.');
      else res(inDcm, false, 'd (cm) is the mean diameter in mm divided by 10.');
      const dU = ok ? v.dcm : dE, rE = dU / 2;
      ok = isFinite(v.r) && near(v.r, rE, .003);
      if (!isFinite(v.r)) res(inR, false, 'Fill in the radius r.');
      else if (ok) res(inR, true);
      else if (near(v.r, dU, .003)) res(inR, false, 'That is the diameter. The radius is half of it: r = d ÷ 2.');
      else if (near(v.r, mean / 2, .003)) res(inR, false, 'This radius is in mm. Use d in cm so that V comes out in cm³.');
      else res(inR, false, 'r = d ÷ 2, with d in cm.');
      const rU = ok ? v.r : rE, VE = vol(rU);
      ok = isFinite(v.V) && near(v.V, VE, .01);
      if (!isFinite(v.V)) res(inV, false, 'Fill in the volume V.');
      else if (ok) res(inV, true);
      else if (near(v.V, vol(2 * rU), .01)) res(inV, false, 'This uses the diameter in place of the radius, so V is 8 times too big. Use r = d ÷ 2.');
      else if (near(v.V, 4 / 3 * Math.PI * rU * rU, .01)) res(inV, false, 'The radius needs to be cubed: V = (4/3) × π × r × r × r.');
      else if (near(v.V, vol(rU * 10), .01) || near(v.V, vol(rU * 20), .01)) res(inV, false, 'This volume is in mm³ because the length was left in mm. Use r in cm to get V in cm³.');
      else if (near(v.V, Math.PI * rU ** 3, .01)) res(inV, false, 'The factor 4/3 is missing: V = (4/3) π r³.');
      else if (near(v.V, 4 / 3 * rU ** 3, .01)) res(inV, false, 'π is missing: V = (4/3) π r³.');
      else res(inV, false, 'V = (4/3) × π × r³; check the arithmetic.');
      const VU = ok ? v.V : VE;
      ok = isFinite(v.m) && Math.abs(v.m - b.m) < .006;
      if (!isFinite(v.m)) res(inM, false, b.weighed ? 'Fill in the mass from the balance.' : `Weigh ball ${b.n} on the tared balance; m is its display reading.`);
      else if (ok) res(inM, true);
      else res(inM, false, b.weighed ? `This differs from the balance reading for ball ${b.n}.` : `Weigh ball ${b.n} on the balance with the empty pan tared first; m is its display reading.`);
      const mU = ok ? v.m : b.m, rhoE = mU / VU;
      ok = isFinite(v.rho) && near(v.rho, rhoE, .012);
      if (!isFinite(v.rho)) res(inRho, false, 'Fill in the density ρ.');
      else if (ok) res(inRho, true);
      else if (near(v.rho, VU / mU, .012)) res(inRho, false, 'This is V ÷ m, volume per gram. Density is mass per volume: ρ = m ÷ V.');
      else if (near(v.rho, mU / (VU * 1000), .02)) res(inRho, false, 'With V in mm³ the density is 1000 times too small; use V in cm³.');
      else res(inRho, false, 'ρ = m ÷ V; check the division.');
      if (!probs.length) {
        const [mn, rr] = MATS[b.mat];
        chk.className = 'check-msg ok';
        chk.textContent = `All correct. ρ ≈ ${v.rho.toFixed(2)} g/cm³, close to ${mn} (about ${rr} g/cm³).`;
        return true;
      }
      chk.className = 'check-msg nudge';
      chk.innerHTML = 'Some values need another look:<ul>' + probs.map(p => `<li>${p}</li>`).join('') + '</ul>';
      return false;
    }
    $('btn-check').addEventListener('click', check);
    calcIns.forEach(i => i.addEventListener('input', () => i.classList.remove('flag', 'okf')));

    /* ---------- start over ---------- */
    function resetAll() {
      ratchetHold(false);
      rows.length = 0; st.lastRec = null; st.tableBall = null; st.trialN = 0; st.force = [];
      st.jaw = null; st.pan = null; st.tare = 0; st.shown = 0; st.zero = 'unchecked'; st.clicks = 0; st.overMsg = false;
      weighDisplay.tok = (weighDisplay.tok || 0) + 1; BAL.disp.textContent = '0.00';
      BALLS.forEach(b => { b.loc = 'dish'; b.x = b.hx; b.y = b.hy; b.dt = b.d0; b.weighed = false; placeBall(b); });
      setLock(false); st.v = 6; apply(); updZero();
      inPsr.value = inHsr.value = ''; flag(inPsr, false); flag(inHsr, false); rsay('');
      calcIns.forEach(i => { i.value = ''; i.classList.remove('flag', 'okf'); });
      ['w-dcm', 'w-r', 'w-v', 'w-m', 'w-rho'].forEach(k => { $(k).textContent = ''; });
      chk.className = 'check-msg'; chk.textContent = '';
      MG.hi(null); hiSvg(null);
      renderTable();
      say('Drag the thimble up or down (or scroll over it) to turn it. Drag a ball from its dish into the jaws, or onto the balance pan.');
    }
    $('btn-reset').addEventListener('click', resetAll);

    /* ---------- tutorial ---------- */
    function hiSvg(kind) {
      if (!kind) { hiRing.setAttribute('opacity', 0); return; }
      const edge = G.Z0 + st.x * S;
      const box = kind === 'ratchet' ? [edge + 12 * S - 8, CY - G.rr - 8, 4.2 * S + 16, 2 * G.rr + 16]
        : kind === 'lock' ? [G.lx - 4.6 * S, G.yT - 3.2 * S, 6.6 * S, 3.6 * S]
        : kind === 'thimble' ? [edge - 6, CY - G.rt - 6, 11 * S + 12, 2 * G.rt + 12]
        : kind === 'pan' ? [PAN_X - 110, 380, 220, 240]
        : [AX - 16, CY - 80, 300, 160];
      hiRing.setAttribute('x', box[0]); hiRing.setAttribute('y', box[1]); hiRing.setAttribute('width', box[2]); hiRing.setAttribute('height', box[3]);
      hiRing.setAttribute('opacity', 1);
      hiSvg.kind = kind;
    }
    const tut = { on: false, cancel: false, skip: false, idx: -1, ff: false, target: 0, restartTo: null, gen: 0, plan: null };
    const btnPause = $('tut-pause'), selSpeed = $('tut-speed');
    let pausedAnims = [];
    function setPaused(p) {
      tcSet({ paused: p });
      btnPause.classList.toggle('paused', p); btnPause.setAttribute('aria-pressed', p ? 'true' : 'false');
      btnPause.querySelector('.tl').textContent = p ? 'Resume' : 'Pause';
      btnPause.title = p ? 'Resume (Space)' : 'Pause (Space)';
      document.body.classList.toggle('tut-paused', p);
      if (p) { pausedAnims = document.getAnimations().filter(a => a.playState === 'running'); pausedAnims.forEach(a => a.pause()); }
      else { pausedAnims.forEach(a => { try { a.play(); } catch (_) { /* finished */ } }); pausedAnims = []; }
    }
    function resetPlayback() { setPaused(false); tcSet({ speed: 1 }); selSpeed.value = '1'; }
    btnPause.addEventListener('click', () => { if (tut.on) setPaused(!TC.paused); });
    selSpeed.addEventListener('change', () => { tcSet({ speed: +selSpeed.value || 1 }); });
    document.addEventListener('keydown', e => {
      if (!tut.on || e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest && e.target.closest('input, select, textarea, button, a, [role="button"], [role="slider"], [tabindex]')) return;
      e.preventDefault(); setPaused(!TC.paused);
    });
    function tScroll(y) {
      return new Promise(res => {
        const y0 = window.scrollY, t0 = tnow(), ms = Math.min(900, 250 + Math.abs(y - y0) * .5), g0 = tut.gen;
        (function f() {
          if (tut.cancel || g0 !== tut.gen) return res();
          let k = Math.min(1, (tnow() - t0) / ms); if (tut.skip) k = 1;
          const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          window.scrollTo({ top: y0 + (y - y0) * e, behavior: 'instant' });
          if (k < 1) requestAnimationFrame(f); else res();
        })();
      });
    }
    const bar = $('tut-bar'), tTitle = $('tut-title'), tText = $('tut-text'), tF = $('tut-f'), tForm = $('tut-formula'), btnTut = $('tut-start');
    const STOP = new Error('tutorial-stop');
    function wait(ms) {
      return new Promise((res, rej) => {
        const t0 = tnow();
        (function chkW() { if (tut.cancel) return rej(STOP); if (tut.skip || tnow() - t0 >= ms) return res(); setTimeout(chkW, 25); })();
      });
    }
    function step(title, text, f) { navStep(); tTitle.textContent = title; tText.textContent = text; tF.innerHTML = f || ''; }
    let hiEls = [];
    function hi(...els) { hiEls.forEach(e => e.classList.remove('tut-hi')); hiEls = els.filter(Boolean); hiEls.forEach(e => e.classList.add('tut-hi')); }
    async function scrollToEl(elm) {
      const r = elm.getBoundingClientRect();
      const y = window.scrollY + r.top - Math.max(60, (window.innerHeight - Math.min(r.height, window.innerHeight - 200)) / 2 - 70);
      tScroll(Math.max(0, y));
      await wait(800);
    }
    async function typeInto(inp, value, perChar) {
      inp.focus({ preventScroll: true });
      inp.value = '';
      for (const ch of String(value)) { inp.value += ch; inp.dispatchEvent(new Event('input', { bubbles: true })); await wait(perChar || 110); }
      inp.blur();
    }
    async function turnTo(target, ms) {
      const v0 = st.v, t0 = tnow();
      hiSvg('thimble');
      for (;;) {
        if (tut.cancel) throw STOP;
        let k = Math.min(1, (tnow() - t0) / ms); if (tut.skip) k = 1;
        const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        st.v = v0 + (target - v0) * e; apply(); hiSvg('thimble');
        if (k >= 1) break;
        await sleep(16);
      }
    }
    async function ratchetIn(n) {
      hiSvg('ratchet');
      const c = contact();
      let t = tnow();
      while (st.v > c + 1e-9) {
        if (tut.cancel) throw STOP;
        const n = tnow(), dt = n - t; t = n;
        if (dt > 0 || tut.skip) { st.v = Math.max(c, st.v - (tut.skip ? 1 : .000375 * dt)); apply(); } hiSvg('ratchet');
        await sleep(16);
      }
      for (let i = 0; i < n; i++) { st.gest = true; click(); await wait(320); }
    }
    async function tutorial(target) {
      tut.on = true; tut.cancel = false; navBegin(target); document.body.classList.add('tut-on'); bar.hidden = false; btnTut.disabled = true;
      try {
        resetAll();
        const rig = $('rig-frame'), mag = $('mag-panel'), tbl = $('tbl-panel'), calc = $('calc-panel');
        const b = BALLS[0];
        await scrollToEl(rig);
        step('Check the zero', 'With nothing between the jaws, spin the thimble until the spindle is close to the anvil.', '');
        hi(rig); await wait(900);
        await turnTo(.6, 1800);
        step('Finish with the ratchet', 'The ratchet turns the spindle gently and slips with a click once it touches the anvil.', '');
        await wait(700); await ratchetIn(3); hiSvg(null);
        await scrollToEl(mag); hi(mag);
        step('Zero error nil', 'The sleeve shows 0 and the thimble 0 sits on the datum line.', 'zero error = nil');
        await wait(2600);
        await scrollToEl(rig); hi(rig);
        step('Open the jaws', 'Turn the thimble back until the gap is a little wider than the ball.', '');
        await turnTo(13.4, 2000);
        step('Place ball 1', 'Ball 1, a steel ball, goes between the anvil and the spindle.', '');
        st.force = [12.700, 12.710, 12.690, 12.720, 12.700];
        b.loc = 'anim'; freeState();
        await tween(b, b.x, 300, 500); await tween(b, AX + 12.7 / 2 * S, CY, 700);
        newOrientation(b); putInJaws(b);
        await wait(900);
        for (let t = 1; t <= 5; t++) {
          if (t > 1) {
            await scrollToEl(rig); hi(rig);
            step(`Trial ${t}: turn the ball`, 'Release the lock, open the jaws slightly and turn the ball to a new position.', '');
            hiSvg('lock'); setLock(false); await wait(800);
            await turnTo(st.v + .5, 800);
            turnBall(true); await wait(1000);
          }
          step('Close with the thimble', t === 1 ? 'Spin the thimble to bring the spindle close to the ball, without forcing it.' : 'Close the gap with the thimble.', '');
          await turnTo(b.dt + .12, t === 1 ? 1200 : 700);
          step('Ratchet until it clicks', 'Two or three clicks mean the spindle touches the ball with the right light pressure.', '');
          await ratchetIn(3);
          step('Lock', 'The lock holds the spindle still while the scales are read.', '');
          hiSvg('lock'); setLock(true); await wait(t === 1 ? 1200 : 700); hiSvg(null);
          const tr = trueReading(st.x);
          await scrollToEl(mag); hi(mag);
          step('Read the PSR', t === 1 ? 'Last whole-mm mark above the line: 12. A half-mm mark below the line is also showing, so add 0.5 mm.' : 'The same marks are showing on the sleeve.', `PSR = ${tr.psr.toFixed(1)} mm`);
          MG.hi('psr'); await wait(t === 1 ? 3600 : 1700);
          step('Read the HSR', t === 1 ? 'The thimble division lying on the datum line.' : 'The division on the datum line has changed a little with the new position.', `HSR = ${tr.hsr} div`);
          MG.hi('hsr'); await wait(t === 1 ? 3000 : 1700);
          MG.hi(null);
          await scrollToEl(tbl); hi($('rec-row'));
          step('Record the trial', 'Type PSR and HSR, then Record. The table works out HSR × L.C and d.', `d = ${tr.psr.toFixed(1)} + ${tr.hsr} × 0.01 = ${(tr.psr + tr.hsr * LC).toFixed(2)} mm`);
          tForm.hidden = false; tForm.innerHTML = `PSR = <b>${tr.psr.toFixed(1)} mm</b> · HSR = <b>${tr.hsr}</b>`;
          await typeInto(inPsr, tr.psr.toFixed(1)); await wait(250);
          await typeInto(inHsr, String(tr.hsr)); await wait(400);
          hi($('btn-rec')); await wait(500); record(); hi(tbl); await wait(t === 1 ? 1600 : 1000);
        }
        tForm.hidden = true;
        const mean = meanD();
        step('Mean diameter', 'Add the five diameters and divide by 5.', `(${rows.map(r => r.d.toFixed(2)).join(' + ')}) ÷ 5 = ${mean.toFixed(3)} mm`);
        hi(meanBox); await wait(3200);
        await scrollToEl(rig); hi(rig);
        step('Weigh the ball', 'Release the lock, open the jaws a little and move ball 1 onto the pan of the tared balance.', '');
        hiSvg('lock'); setLock(false); await wait(700);
        await turnTo(st.v + .6, 700);
        st.jaw = null; b.loc = 'anim'; apply();
        hiSvg('pan');
        await tween(b, b.x + 40, 300, 500); await tween(b, PAN_X, BAL.panY - b.r, 900);
        putOnPan(b); await wait(1300);
        step('Read the balance', 'The display settles on the mass in grams.', `m = ${b.m.toFixed(2)} g`);
        await wait(2000); hiSvg(null);
        await scrollToEl(calc);
        const dcm = +(mean / 10).toFixed(4), r = +(dcm / 2).toFixed(4), V = +vol(r).toFixed(3), rho = +(b.m / V).toFixed(2);
        step('Mean diameter', 'Carried over from the table, in mm.', `d = ${mean.toFixed(3)} mm`);
        hi($('cr-mean')); await wait(1600);
        step('Millimetres to centimetres', 'Divide by 10, since 10 mm = 1 cm.', `d = ${mean.toFixed(3)} ÷ 10 = ${dcm} cm`);
        hi($('cr-dcm')); $('w-dcm').textContent = `= ${mean.toFixed(3)} ÷ 10 = ${dcm}`;
        await typeInto(inDcm, String(dcm)); await wait(900);
        step('Radius', 'Half of the diameter.', `r = ${dcm} ÷ 2 = ${r} cm`);
        hi($('cr-r')); $('w-r').textContent = `= ${dcm} ÷ 2 = ${r}`;
        await typeInto(inR, String(r)); await wait(900);
        step('Volume', 'V = (4/3) π r³, with r in cm.', `V = 4.1888 × ${r}³ = 4.1888 × ${(r ** 3).toFixed(5)} = ${V} cm³`);
        hi($('cr-v')); $('w-v').textContent = `= (4/3) × π × ${r}³ = 4.1888 × ${(r ** 3).toFixed(5)} = ${V}`;
        await typeInto(inV, String(V)); await wait(900);
        step('Mass', 'The balance reading for ball 1.', `m = ${b.m.toFixed(2)} g`);
        hi($('cr-m')); $('w-m').textContent = `balance: ${b.m.toFixed(2)} g`;
        await typeInto(inM, b.m.toFixed(2)); await wait(800);
        step('Density', 'Mass divided by volume.', `ρ = ${b.m.toFixed(2)} ÷ ${V} = ${rho.toFixed(2)} g/cm³`);
        hi($('cr-rho')); $('w-rho').textContent = `= ${b.m.toFixed(2)} ÷ ${V} = ${rho.toFixed(2)}`;
        await typeInto(inRho, rho.toFixed(2)); await wait(900);
        hi($('btn-check')); await wait(700); check(); hi(chk);
        step('Done', `ρ ≈ ${rho.toFixed(2)} g/cm³, close to steel. Start over to take readings by hand.`, '');
        await wait(4500);
      } catch (e) {
        if (e !== STOP) throw e;
      } finally {
        const again = tut.restartTo; tut.restartTo = null; tut.gen++; tut.ff = false; document.body.classList.remove('tut-ff');
        tut.on = false; tut.skip = false; if (again == null) resetPlayback(); hi(); hiSvg(null); MG.hi(null); tForm.hidden = true; st.force = [];
        BALLS.forEach(bb => { if (bb.loc === 'anim') { bb.loc = 'dish'; bb.x = bb.hx; bb.y = bb.hy; placeBall(bb); } });
        freeState();
        if (again == null) { document.body.classList.remove('tut-on'); bar.hidden = true; btnTut.disabled = false; tut.plan = null; }
        updNav();
        if (again != null) setTimeout(() => tutorial(again), 0);
      }
    }
    btnTut.addEventListener('click', () => { if (!tut.on) tutorial(); });
    $('tut-stop').addEventListener('click', () => { tut.restartTo = null; tut.cancel = true; tut.gen++; });
    /* ---------- step navigation: Previous re-runs the tutorial instantly up to the step before, Next finishes the current step ---------- */
    const btnPrevS = document.getElementById('tut-prev'), btnNextS = document.getElementById('tut-next');
    function updNav() { bar.dataset.step = tut.idx; if (btnPrevS) btnPrevS.disabled = !tut.on || (tut.restartTo != null ? tut.restartTo : tut.ff ? tut.target : tut.idx) <= 0; }
    function freezeNew() {                    // keep animations created by a jump frozen while paused
      const more = document.getAnimations().filter(a => a.playState === 'running');
      more.forEach(a => a.pause()); pausedAnims.push(...more);
    }
    function navBegin(target) {
      const prac = document.getElementById('view-practical');
      if (target === undefined) {                // remember the status messages as they were when the run started
        tut.live = Array.from(prac.querySelectorAll('[aria-live="polite"]')).filter(e => !bar.contains(e) && !e.querySelector('svg, canvas, input, button, select')).map(e => [e, e.innerHTML, e.className]);
      } else if (tut.live) tut.live.forEach(([e, h, c]) => { e.innerHTML = h; e.className = c; });
      if (target !== undefined) {                // short effects frozen by a pause belong to the cancelled run: let them end now
        pausedAnims = pausedAnims.filter(a => {
          let finite = false; try { finite = a.effect && a.effect.getComputedTiming().endTime !== Infinity; } catch (_) { /* ignore */ }
          if (finite) { try { a.finish(); } catch (_) { /* ignore */ } }
          return !finite;
        });
      }
      tut.idx = -1; tut.target = target || 0; tut.ff = tut.target > 0; tut.skip = tut.ff; tut.restartTo = null;
      document.body.classList.toggle('tut-ff', tut.ff); updNav();
    }
    function navStep() {
      tut.idx++;
      if (tut.ff && tut.idx >= tut.target) { tut.ff = false; document.body.classList.remove('tut-ff'); }
      tut.skip = tut.ff;
      if (TC.paused && !tut.ff) requestAnimationFrame(freezeNew);
      updNav();
    }
    function navPrev() {
      if (!tut.on && tut.restartTo == null) return;
      if (tut.restartTo != null) tut.restartTo = Math.max(0, tut.restartTo - 1);
      else if (tut.ff) tut.target = Math.max(0, tut.target - 1);
      else { if (tut.idx <= 0) return; tut.restartTo = tut.idx - 1; tut.cancel = true; tut.gen++; }
      updNav();
    }
    function navNext() {
      if (!tut.on && tut.restartTo == null) return;
      if (tut.restartTo != null) tut.restartTo++;
      else if (tut.ff) tut.target++;
      else tut.skip = true;
      updNav();
    }
    if (btnPrevS) btnPrevS.addEventListener('click', navPrev);
    if (btnNextS) btnNextS.addEventListener('click', navNext);
    document.addEventListener('keydown', e => {
      if (!tut.on || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const t = e.target;
      if (t.closest && t.closest('select, textarea, [contenteditable], input[type="range"], [role="slider"], [role="spinbutton"], [tabindex]:not(button):not(a):not(input)')) return;   // instrument controls keep their arrow keys
      e.preventDefault(); if (e.key === 'ArrowLeft') navPrev(); else navNext();
    });

    BALLS.forEach(placeBall);
    apply(); updZero(); renderTable();
  })();

  /* =====================================================================
     12. OPTIONAL EXTRAS — opens upward, closes ~500 ms after the pointer leaves
     ===================================================================== */
  (function extras() {
    const box = $('extras'), btn = $('extras-toggle');
    let t = null, openedAt = 0;
    const open = () => { clearTimeout(t); if (!box.classList.contains('open')) openedAt = Date.now(); box.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); };
    const close = () => { clearTimeout(t); box.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    const later = () => { clearTimeout(t); t = setTimeout(close, 500); };
    box.addEventListener('mouseenter', open);
    box.addEventListener('mouseleave', later);
    btn.addEventListener('click', () => {
      if (!box.classList.contains('open')) open();
      else if (Date.now() - openedAt > 350) close();
    });
    box.addEventListener('focusin', open);
    box.addEventListener('focusout', e => { if (!box.contains(e.relatedTarget)) later(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  })();

  goTo(fromHash(), false);
})();
