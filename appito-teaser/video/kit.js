// Shared helpers. Every value on screen is a pure function of the time t (seconds):
// no CSS transitions/animations, no Math.random, no state carried between frames.

export const W = 1080, H = 1920, FPS = 60, BEAT = 0.5;

export const C = {
  ink: '#0b0a24', brand: '#7a4dff', brandDeep: '#5a32d6', lilac: '#a488ff', lilacSoft: '#cdbfff',
  deep: '#4a2fb5', navy: '#131443', ground: '#f6f4ff', green: '#01c457', orange: '#fd9d0f',
  cyan: '#01dffb', gold: '#f6c453', white: '#ffffff', text: '#0b0a24', muted: '#6f6c80',
};

// Job accents (appito-landing/components/assistant-data.ts)
export const JOB = {
  products: '#2563eb', design: '#7c3aed', images: '#db2777', blog: '#0891b2', sales: '#059669', support: '#d97706',
};

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const prog = (t, a, b) => (b === a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const mix = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));

export const E = {
  lin: (x) => x,
  inQuad: (x) => x * x,
  outQuad: (x) => 1 - (1 - x) * (1 - x),
  inOutQuad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  inCubic: (x) => x * x * x,
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuart: (x) => 1 - Math.pow(1 - x, 4),
  outQuint: (x) => 1 - Math.pow(1 - x, 5),
  inQuart: (x) => x * x * x * x,
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  inOutExpo: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outBack: (x) => { const s = 1.70158; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); },
  outBackSoft: (x) => { const s = 1.0; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); },
  inBack: (x) => { const s = 1.70158; return (s + 1) * x * x * x - s * x * x; },
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  outSine: (x) => Math.sin((x * Math.PI) / 2),
};

/** eased progress of a move that starts at t0 and lasts dur */
export const k = (t, t0, dur, ease = E.outCubic) => ease(prog(t, t0, t0 + dur));

/** Closed-form damped spring 0→1, dt seconds after its start. f = natural frequency (Hz), z = damping ratio. */
export function spring(dt, f = 2.4, z = 0.45) {
  if (dt <= 0) return 0;
  const w = 2 * Math.PI * f;
  if (z >= 1) return 1 - Math.exp(-w * dt) * (1 + w * dt);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * dt) * (Math.cos(wd * dt) + ((z * w) / wd) * Math.sin(wd * dt));
}

/** Decaying shake: offset in px, dt seconds after the hit. */
export function shake(dt, amp = 18, freq = 26, decay = 9, seed = 1) {
  if (dt < 0 || dt > 1.2) return [0, 0];
  const e = Math.exp(-decay * dt) * amp;
  return [Math.sin(dt * freq * 6.283 + seed) * e, Math.cos(dt * freq * 5.1 + seed * 2.3) * e * 0.7];
}

/** Deterministic hash noise in [0,1). */
export const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };
export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// ── DOM ───────────────────────────────────────────────────────────────────
export function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

/** Style setter that skips unchanged values (keeps frames cheap). */
export function S(e, o) {
  const c = e.__c || (e.__c = {});
  for (const key in o) {
    const v = o[key];
    if (c[key] !== v) { c[key] = v; e.style[key] = v; }
  }
}

export const px = (v) => `${v.toFixed ? v.toFixed(2) : v}px`;
/** transform string; x/y are translations in px, s scale, r rotation (deg) */
export function tf({ x = 0, y = 0, s = 1, sx = 1, sy = 1, r = 0, rx = 0, ry = 0, p = 0 } = {}) {
  let out = '';
  if (p) out += `perspective(${p}px) `;
  out += `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
  if (rx) out += ` rotateX(${rx.toFixed(2)}deg)`;
  if (ry) out += ` rotateY(${ry.toFixed(2)}deg)`;
  if (r) out += ` rotate(${r.toFixed(2)}deg)`;
  const ssx = s * sx, ssy = s * sy;
  if (ssx !== 1 || ssy !== 1) out += ` scale(${ssx.toFixed(4)},${ssy.toFixed(4)})`;
  return out;
}

/** Show/hide helper for an element between a and b with fades of length fin/fout. Returns opacity. */
export function window01(t, a, b, fin = 0.25, fout = 0.2) {
  if (t < a || t > b) return 0;
  return Math.min(prog(t, a, a + fin), 1 - prog(t, b - fout, b));
}

// ── Persian ───────────────────────────────────────────────────────────────
const FA = '۰۱۲۳۴۵۶۷۸۹';
/** Persian digits. Codes, links and Latin addresses stay as the product shows them. */
export const fa = (v) => String(v).replace(/[0-9]/g, (d) => FA[Number(d)]);

export const ZWNJ = '‌';
const DUAL = new Set(Array.from('بپتثجچحخسشصضطظعغفقکكگلمنهیيئـ'));
const RIGHT = new Set(Array.from('اآأإؤدذرزژوةۀ'));
const MARK = /[ً-ٰٟ]/;

/**
 * Split Persian text into letter units that can move independently but keep their
 * joined (contextual) shapes: a zero-width joiner is added on each side that joins.
 */
export function splitFa(text) {
  const units = [];
  for (const ch of Array.from(text)) {
    if (MARK.test(ch) && units.length) units[units.length - 1].ch += ch;
    else units.push({ ch });
  }
  const base = (u) => (u ? Array.from(u.ch)[0] : null);
  units.forEach((u, i) => {
    const cur = base(u), prev = base(units[i - 1]), next = base(units[i + 1]);
    const joinPrev = prev && DUAL.has(prev) && (DUAL.has(cur) || RIGHT.has(cur));
    const joinNext = next && DUAL.has(cur) && (DUAL.has(next) || RIGHT.has(next));
    u.html = (joinPrev ? '‍' : '') + u.ch + (joinNext ? '‍' : '');
    u.space = cur === ' ';
  });
  return units;
}

// ── icons ─────────────────────────────────────────────────────────────────
import { ICONS } from './icons.js';
export function icon(name, size = 24, stroke = 2, color = 'currentColor') {
  const inner = ICONS[name];
  if (!inner) throw new Error('missing icon ' + name);
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// ── shared pieces ─────────────────────────────────────────────────────────

/**
 * A two-line headline inside the safe zone (x 140–940). Lines rise in, staggered,
 * with a short blur; leave with a quick lift. Returns { root, update(t) }.
 */
export function headline(parent, { l1 = '', l2 = '', top = 236, a, b, size2 = 74, size1 = 40, color1 = '#cdbfff', shadow = true, stagger = 0.08 }) {
  const root = el('div', 'hl', parent);
  root.style.top = top + 'px';
  const e1 = l1 ? el('div', 'hl1', root, l1) : null;
  const e2 = l2 ? el('div', 'hl2', root, l2) : null;
  if (e1) { e1.style.fontSize = size1 + 'px'; e1.style.color = color1; }
  if (e2) e2.style.fontSize = size2 + 'px';
  if (!shadow) root.classList.add('noshadow');
  const lines = [e1, e2].filter(Boolean);
  return {
    root,
    update(t) {
      const vis = t >= a - 0.01 && t <= b + 0.01;
      S(root, { display: vis ? 'block' : 'none' });
      if (!vis) return;
      lines.forEach((ln, i) => {
        const tin = a + i * stagger;
        const u = k(t, tin, 0.42, E.outQuint);
        const o = k(t, b - 0.22, 0.22, E.inCubic);
        S(ln, {
          opacity: (Math.min(1, prog(t, tin, tin + 0.2)) * (1 - o)).toFixed(3),
          transform: tf({ y: (1 - u) * 46 - o * 30 }),
          filter: `blur(${((1 - u) * 10 + o * 6).toFixed(2)}px)`,
        });
      });
    },
  };
}

/** A pointer arrow with a tap ripple. keys: [{t, x, y}] (ease between); taps: [t...]. */
export function pointer(parent, keys, taps, { a = keys[0].t, b = keys[keys.length - 1].t + 0.6 } = {}) {
  const root = el('div', 'ptr', parent);
  const ring = el('div', 'ptr-ring', parent);
  root.innerHTML = `<svg width="64" height="64" viewBox="0 0 24 24"><path d="M4.5 2.8 L19 12.2 L12.4 13.4 L15.9 20.5 L13 21.9 L9.6 14.8 L4.6 19.2 Z" fill="#fff" stroke="#0b0a24" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
  const posAt = (t) => {
    if (t <= keys[0].t) return [keys[0].x, keys[0].y];
    for (let i = 0; i < keys.length - 1; i++) {
      const p = keys[i], q = keys[i + 1];
      if (t <= q.t) {
        const u = E.inOutCubic(prog(t, p.t, q.t));
        return [lerp(p.x, q.x, u), lerp(p.y, q.y, u)];
      }
    }
    const l = keys[keys.length - 1];
    return [l.x, l.y];
  };
  return {
    update(t) {
      const vis = t >= a && t <= b;
      S(root, { display: vis ? 'block' : 'none' });
      S(ring, { display: vis ? 'block' : 'none' });
      if (!vis) return;
      const [x, y] = posAt(t);
      let press = 0, rip = -1;
      for (const tp of taps) {
        const d = t - tp;
        if (d > -0.08 && d < 0.12) press = Math.max(press, 1 - Math.abs(d) / 0.12);
        if (d >= 0 && d < 0.5) rip = d;
      }
      const o = Math.min(prog(t, a, a + 0.15), 1 - prog(t, b - 0.15, b));
      S(root, { opacity: o.toFixed(3), transform: tf({ x: x - 10, y: y - 6, s: 1 - press * 0.16 }) });
      if (rip >= 0) {
        const u = E.outCubic(rip / 0.5);
        S(ring, { opacity: ((1 - u) * 0.9 * o).toFixed(3), transform: tf({ x: x - 50, y: y - 50, s: 0.3 + u * 1.3 }) });
      } else S(ring, { opacity: '0' });
    },
  };
}

/** Animated sparkle (four-point star) at x,y, born at t0. */
export function sparkleSVG(color = '#fff') {
  return `<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M20 0 C21.5 13 27 18.5 40 20 C27 21.5 21.5 27 20 40 C18.5 27 13 21.5 0 20 C13 18.5 18.5 13 20 0Z" fill="${color}"/></svg>`;
}
