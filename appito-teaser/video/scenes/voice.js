// 40.00–44.00 · A voice note becomes a campaign kit (voice-kit-moment.tsx, its own strings).
//   40.0 recording (the bars move with the score) · 41.0 transcribed · 42.0/42.5/43.0 caption, hashtags,
//   story image · 43.25 «کپی شد»
import { el, S, tf, k, E, prog, lerp, spring, clamp, icon, headline, pointer, hash } from '../kit.js';
import { S as STR } from '../strings.js';

const A = 40.0, B = 44.0;
const REC = 40.0, STOP = 41.0, TXT = 41.25, C1 = 42.0, C2 = 42.5, C3 = 43.0, COPY = 43.25, OUT = 43.75;
const NB = 34;

export default {
  id: 'voice', a: A, b: B,
  build(root, ctx) {
    this.ctx = ctx;
    const st = el('style', null, root);
    st.textContent = `
      .vc { position:absolute; left:120px; top:476px; width:840px; border-radius:42px; background:#fff; color:#0b0a24; direction:rtl; padding:22px 26px;
            box-shadow:0 0 0 3px rgba(219,39,119,.45), 0 26px 60px -18px rgba(8,4,40,.85), 0 0 50px rgba(219,39,119,.25); }
      .vc .row { display:flex; align-items:center; gap:18px; height:76px; }
      .vc .dot { width:22px; height:22px; border-radius:50%; background:#ef2b5b; box-shadow:0 0 16px #ef2b5b; flex-shrink:0; }
      .vc .lab { font-size:30px; font-weight:800; color:#6f6c80; white-space:nowrap; }
      .vc .bars { flex:1; height:70px; display:flex; align-items:center; justify-content:center; gap:6px; }
      .vc .bars i { display:block; width:8px; border-radius:4px; background:linear-gradient(#a488ff,#7a4dff); }
      .vc .mic { width:76px; height:76px; border-radius:50%; background:#ef2b5b; display:grid; place-items:center; flex-shrink:0; }
      .vc .txt { font-size:33px; font-weight:700; line-height:1.6; padding:6px 4px 4px; }
      .vc .tr { font-size:30px; font-weight:800; color:#7a4dff; }
      .kai { position:absolute; left:120px; width:840px; top:700px; direction:rtl; display:flex; flex-wrap:wrap; align-items:center; gap:12px 16px; }
      .kai img { width:58px; height:58px; border-radius:50%; }
      .kai b { font-size:29px; font-weight:900; }
      .kai .tl { display:inline-flex; align-items:center; gap:10px; padding:7px 18px; border-radius:999px; background:rgba(255,255,255,.12); font-size:24px; font-weight:800; color:#efe9ff;
                 box-shadow: inset 0 0 0 2px rgba(164,136,255,.4); }
      .kai .tl em { font-style:normal; color:#cdbfff; font-weight:700; }
      .kc { position:absolute; border-radius:32px; background:#fff; color:#0b0a24; direction:rtl; padding:22px 26px; box-shadow:0 24px 50px -22px rgba(8,4,40,.85); }
      .kc .lb { display:flex; align-items:center; gap:10px; font-size:25px; font-weight:900; color:#db2777; }
      .kc .cap { font-size:31px; font-weight:700; line-height:1.6; margin-top:8px; }
      .kc .cp { display:inline-flex; align-items:center; gap:10px; margin-top:12px; padding:10px 22px; border-radius:16px; font-size:26px; font-weight:800; background:#f2ecff; color:#5a32d6; }
      .kc .tags { display:flex; flex-wrap:wrap; gap:10px; margin-top:12px; }
      .kc .tags span { padding:6px 16px; border-radius:12px; background:#fdf0f6; color:#b0185f; font-size:26px; font-weight:800; direction:rtl; }
      .story { position:absolute; left:744px; top:1060px; width:216px; height:384px; border-radius:26px; overflow:hidden; box-shadow:0 24px 50px -18px rgba(8,4,40,.9), 0 0 0 4px #fff; }
      .story img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
      .story .sh { position:absolute; inset:0; background:linear-gradient(to top, rgba(20,8,4,.85), rgba(20,8,4,0) 60%); }
      .story .st { position:absolute; left:14px; right:14px; bottom:22px; color:#fff; font-size:28px; font-weight:900; text-align:center; direction:rtl; line-height:1.35; }
      .story .rt { position:absolute; left:12px; top:12px; padding:2px 10px; border-radius:8px; background:rgba(0,0,0,.45); color:#fff; font-size:18px; font-weight:800; }
    `;
    this.vc = el('div', 'vc', root);
    this.vc.innerHTML = `<div class="row"><span class="dot"></span><span class="lab"></span><div class="bars">${'<i></i>'.repeat(NB)}</div><span class="mic">${icon('mic', 40, 2.4, '#fff')}</span></div><div class="txt"></div>`;
    this.lab = this.vc.querySelector('.lab');
    this.bars = [...this.vc.querySelectorAll('.bars i')];
    this.barsBox = this.vc.querySelector('.bars');
    this.dot = this.vc.querySelector('.dot');
    this.mic = this.vc.querySelector('.mic');
    this.txt = this.vc.querySelector('.txt');
    this.kai = el('div', 'kai', root, `<img src="assets/brand/agent-disc.svg"><b>${STR.aiName}</b>
      <span class="tl t1">${icon('circle-check', 26, 2.6, '#7dffb4')}${STR.sawItems} <em>${STR.fourItems}</em></span>
      <span class="tl t2">${icon('circle-check', 26, 2.6, '#7dffb4')}${STR.madeStory} <em>${STR.ratio}</em></span>`);
    this.t1 = this.kai.querySelector('.t1'); this.t2 = this.kai.querySelector('.t2');
    this.cap = el('div', 'kc', root, `<div class="lb">${icon('text-cursor-input', 28, 2.4)}${STR.captionLabel}</div><div class="cap">${STR.caption}</div><span class="cp"></span>`);
    Object.assign(this.cap.style, { left: '120px', top: '852px', width: '840px' });
    this.cp = this.cap.querySelector('.cp');
    this.tags = el('div', 'kc', root, `<div class="lb">${icon('hash', 28, 2.4)}${STR.tagsLabel}</div><div class="tags">${STR.tags.map((x) => `<span>${x}</span>`).join('')}</div>`);
    Object.assign(this.tags.style, { left: '120px', top: '1060px', width: '600px' });
    this.story = el('div', 'story', root, `<img src="assets/products/coffee/roastery-story.webp"><div class="sh"></div><div class="st">${STR.storyText}</div><span class="rt">${STR.ratio}</span>`);
    this.hl = headline(root, { l1: STR.kitL1, l2: STR.kitL2.replace('، ', '،<br>'), a: A + 0.05, b: OUT, size2: 64, color1: '#ff9cc8' });
    this.ptr = pointer(root, [{ t: 42.95, x: 1010, y: 1300 }, { t: 43.2, x: 300, y: 1012 }, { t: 43.7, x: 380, y: 1200 }], [COPY], { a: 42.9, b: 43.8 });
  },
  update(t) {
    const out = k(t, OUT, 0.25, E.inCubic);
    const vi = spring(t - REC + 0.05, 2.8, 0.6);
    S(this.vc, { transform: tf({ y: (1 - vi) * 300 - out * 220 }), opacity: (clamp(vi * 2) * (1 - out)).toFixed(3) });
    const rec = t < STOP;
    const lab = rec ? STR.listening : t < TXT ? STR.transcribing : '';
    if (this.lab.__t !== lab) { this.lab.textContent = lab; this.lab.__t = lab; }
    S(this.dot, { display: rec ? 'block' : 'none', opacity: (0.55 + 0.45 * Math.abs(Math.sin(t * 6))).toFixed(3) });
    S(this.mic, { display: rec ? 'grid' : 'none', transform: tf({ s: 1 + Math.abs(Math.sin(t * 8)) * 0.06 }) });
    S(this.barsBox, { display: t < TXT ? 'flex' : 'none' });
    // bars follow the score's envelope when it exists, else a beat-locked pattern
    const env = this.ctx.env;
    const f = Math.round(t * 60);
    this.bars.forEach((b, i) => {
      let a;
      if (rec) {
        const e = env && env.mix ? env.mix[Math.min(env.mix.length - 1, f - (i % 6))] || 0 : 0.5 + 0.5 * Math.sin(t * 9 + i * 0.7);
        a = clamp(0.15 + e * (0.5 + 0.5 * hash(i * 13 + Math.floor(t * 20))) * 1.2);
      } else a = 0.12 + 0.1 * Math.sin(t * 20 + i);
      S(b, { height: (8 + a * 62).toFixed(1) + 'px', opacity: rec ? '1' : '0.5' });
    });
    const txt = t >= TXT ? `<span>${STR.spoken}</span>` : '';
    if (this.txt.__h !== txt) { this.txt.innerHTML = txt; this.txt.__h = txt; }
    S(this.txt, { display: t >= TXT ? 'block' : 'none', opacity: prog(t, TXT, TXT + 0.18).toFixed(3) });
    // AI and its tool rows
    const ai = k(t, 41.6, 0.3);
    S(this.kai, { opacity: (ai * (1 - out)).toFixed(3), transform: tf({ y: (1 - ai) * 24 - out * 200 }) });
    S(this.t1, { opacity: k(t, 41.7, 0.2).toFixed(3) });
    S(this.t2, { opacity: k(t, 41.85, 0.2).toFixed(3) });
    // the three cards
    const pop = (e, at, from) => { const u = spring(t - at, 2.8, 0.55); S(e, { display: t >= at ? 'block' : 'none', transform: tf({ y: (1 - u) * from - out * 220, s: 0.9 + 0.1 * clamp(u) }), opacity: (clamp(u * 2) * (1 - out)).toFixed(3) }); };
    pop(this.cap, C1, 260); pop(this.tags, C2, 260); pop(this.story, C3, 360);
    const copied = t >= COPY + 0.05;
    const cl = copied ? `${icon('check', 28, 3)}${STR.copied}` : `${icon('copy', 28, 2.4)}${STR.copyText}`;
    if (this.cp.__h !== cl) { this.cp.innerHTML = cl; this.cp.__h = cl; }
    S(this.cp, { background: copied ? '#e9fbf1' : '#f2ecff', color: copied ? '#0f8a4a' : '#5a32d6' });
    this.hl.update(t);
    this.ptr.update(t);
  },
};
