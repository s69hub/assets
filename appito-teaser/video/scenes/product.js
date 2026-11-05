// 36.00–40.00 · Products from photos (drop 3). Three handicraft photos and «از این عکس‌ها محصول بساز»;
// three product previews fill one per beat; 38.5 «همه را تأیید کن».
import { el, S, tf, k, E, prog, lerp, spring, clamp, icon, headline, pointer } from '../kit.js';
import { S as STR } from '../strings.js';

const A = 36.0, B = 40.0;
const MSG = 36.0, AI = 36.45, CARDS = [37.0, 37.5, 38.0], APPROVE = 38.5, OUT = 39.75;

export default {
  id: 'product', a: A, b: B,
  build(root) {
    const st = el('style', null, root);
    st.textContent = `
      .um { position:absolute; left:120px; top:478px; width:600px; border-radius:36px; border-end-end-radius:10px; padding:18px; direction:rtl;
            background:linear-gradient(150deg,#8e66ff,#6a3ff0); box-shadow:0 24px 50px -20px rgba(40,10,120,.8); }
      .um .ph { display:flex; gap:12px; }
      .um .ph img { width:178px; height:178px; border-radius:22px; object-fit:cover; box-shadow:0 0 0 3px rgba(255,255,255,.35); }
      .um .tx { margin-top:14px; font-size:36px; font-weight:800; color:#fff; padding:0 6px; }
      .airow { position:absolute; left:120px; width:840px; top:800px; display:flex; align-items:center; gap:16px; direction:rtl; }
      .airow img { width:66px; height:66px; border-radius:50%; }
      .airow b { font-size:31px; font-weight:900; }
      .airow .tool { margin-inline-start:auto; display:inline-flex; align-items:center; gap:10px; padding:10px 22px; border-radius:999px; background:rgba(255,255,255,.12);
                     font-size:27px; font-weight:800; color:#e8e1ff; box-shadow: inset 0 0 0 2px rgba(164,136,255,.45); }
      .pcard { position:absolute; left:120px; width:840px; height:170px; border-radius:32px; background:#fff; direction:rtl; color:#0b0a24; display:flex; gap:22px; padding:18px;
               box-shadow:0 24px 50px -24px rgba(8,4,40,.85); overflow:hidden; }
      .pcard .im { width:134px; height:134px; border-radius:22px; object-fit:cover; flex-shrink:0; }
      .pcard .bd { flex:1; min-width:0; }
      .pcard .r1 { display:flex; align-items:center; gap:14px; }
      .pcard .nm { font-size:34px; font-weight:900; white-space:nowrap; }
      .pcard .pv { margin-inline-start:auto; font-size:22px; font-weight:800; color:#7a4dff; background:#f2ecff; padding:4px 14px; border-radius:999px; white-space:nowrap; }
      .pcard .r2 { display:flex; align-items:center; gap:14px; margin-top:8px; }
      .pcard .pr { font-size:29px; font-weight:800; color:#5a32d6; }
      .pcard .ct { font-size:23px; font-weight:800; color:#0b0a24; background:#f1f0f6; padding:3px 14px; border-radius:10px; }
      .pcard .ds { margin-top:8px; font-size:24px; color:#6f6c80; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .pcard .ok { position:absolute; left:18px; top:18px; width:56px; height:56px; border-radius:50%; background:#01c457; display:grid; place-items:center; box-shadow:0 6px 18px rgba(1,196,87,.55); }
      .pcard .sh { position:absolute; inset:18px 170px 18px 18px; display:grid; gap:14px; align-content:center; }
      .pcard .sh i { display:block; height:26px; border-radius:10px; background:linear-gradient(90deg,#ece8fb,#f8f6ff,#ece8fb); background-size:300% 100%; }
      .apv { position:absolute; left:300px; top:1388px; width:480px; height:96px; border-radius:26px; display:flex; align-items:center; justify-content:center; gap:14px;
             font-size:36px; font-weight:900; color:#fff; background:#7a4dff; box-shadow:0 14px 34px rgba(122,77,255,.55); direction:rtl; }
    `;
    this.um = el('div', 'um', root, `<div class="ph">${STR.products.map((p) => `<img src="${p.img}">`).join('')}</div><div class="tx">${STR.prodAsk}</div>`);
    this.ai = el('div', 'airow', root, `<img src="assets/brand/agent-disc.svg"><b>${STR.aiName}</b><span class="tool"></span>`);
    this.tool = this.ai.querySelector('.tool');
    this.cards = STR.products.map((p, i) => {
      const c = el('div', 'pcard', root);
      c.style.top = 890 + i * 186 + 'px';
      c.innerHTML = `<img class="im" src="${p.img}"><div class="bd"><div class="r1"><span class="nm">${p.name}</span><span class="pv">${STR.preview}</span></div>
        <div class="r2"><span class="pr">${p.price}</span><span class="ct">${p.cat}</span></div><div class="ds">${p.desc}</div></div>
        <div class="sh"><i></i><i style="width:70%"></i><i style="width:85%"></i></div><div class="ok">${icon('check', 34, 3.2, '#fff')}</div>`;
      return { c, bd: c.querySelector('.bd'), sh: c.querySelector('.sh'), ok: c.querySelector('.ok'), im: c.querySelector('.im'), t: CARDS[i] };
    });
    this.apv = el('div', 'apv', root);
    this.hl = headline(root, { l1: STR.prodL1, l2: STR.prodL2.replace('؛ ', '؛<br>'), a: A + 0.05, b: OUT, size2: 64, color1: '#9fbdff' });
    this.ptr = pointer(root, [{ t: 38.1, x: 1010, y: 1600 }, { t: 38.42, x: 560, y: 1440 }, { t: 39.2, x: 640, y: 1600 }], [APPROVE], { a: 38.05, b: 39.4 });
  },
  update(t) {
    const out = k(t, OUT, 0.25, E.inCubic);
    const mi = spring(t - MSG, 2.8, 0.6);
    S(this.um, { transform: tf({ y: (1 - mi) * 300 - out * 200 }), opacity: (clamp(mi * 2) * (1 - out)).toFixed(3) });
    const ai = k(t, AI, 0.3, E.outCubic);
    S(this.ai, { opacity: (ai * (1 - out)).toFixed(3), transform: tf({ y: (1 - ai) * 30 - out * 200 }) });
    const done = t >= 38.0 + 0.2;
    const tool = done ? `${icon('circle-check', 30, 2.6, '#7dffb4')}${STR.prodToolDone}` : `${icon('loader-circle', 30, 2.6)}${STR.prodTool}`;
    if (this.tool.__h !== tool) { this.tool.innerHTML = tool; this.tool.__h = tool; }
    const sp = this.tool.querySelector('svg');
    if (!done && sp) sp.style.transform = `rotate(${(t * 720) % 360}deg)`;
    this.cards.forEach((c, i) => {
      const u = spring(t - c.t, 2.6, 0.62);
      S(c.c, { display: t >= c.t ? 'flex' : 'none', transform: tf({ x: (1 - u) * -900, y: -out * 200, s: 0.96 + 0.04 * clamp(u) }), opacity: (clamp(u * 2) * (1 - out)).toFixed(3) });
      const fill = prog(t, c.t + 0.12, c.t + 0.32);
      S(c.sh, { opacity: (1 - fill).toFixed(3), display: fill < 1 ? 'grid' : 'none' });
      S(c.bd, { opacity: fill.toFixed(3) });
      S(c.im, { transform: tf({ s: 0.6 + 0.4 * E.outBack(prog(t, c.t + 0.05, c.t + 0.3)) }) });
      const okU = spring(t - (APPROVE + 0.12 + i * 0.08), 3.4, 0.45);
      S(c.ok, { display: t >= APPROVE + 0.12 + i * 0.08 ? 'grid' : 'none', transform: tf({ s: okU }) });
      S(c.sh.querySelectorAll('i')[0], { backgroundPosition: `${(-t * 300) % 300}% 0` });
    });
    const ap = spring(t - 38.2, 3, 0.55);
    const press = t >= APPROVE - 0.06 && t < APPROVE + 0.12 ? 1 - Math.abs(t - APPROVE) / 0.12 : 0;
    const apDone = t >= APPROVE + 0.1;
    const lab = apDone ? `${icon('check', 36, 3, '#fff')}${STR.made}` : STR.approveAll;
    if (this.apv.__h !== lab) { this.apv.innerHTML = lab; this.apv.__h = lab; }
    S(this.apv, { display: t >= 38.2 ? 'flex' : 'none', transform: tf({ y: (1 - ap) * 200 - out * 200, s: 1 - press * 0.07 }), opacity: (clamp(ap * 2) * (1 - out)).toFixed(3), background: apDone ? '#01b350' : '#7a4dff' });
    this.hl.update(t);
    this.ptr.update(t);
  },
};
