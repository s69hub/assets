# Appito — «تو فقط بگو، اپیتو می‌سازدش» (Instagram reel teaser)

A 56-second, 1080×1920, 60 fps commercial teaser for Appito, with an original score and every sound
effect synthesised from scratch in code. Built for Instagram Reels (Persian, RTL, Vazirmatn) and
following the series rules in `appito-dev-workspace/Videos/Reels/Ads/REMOTION.md`:
Instagram safe zones, no third-party logos or UI, no offers, no «رایگان»/«دستیار»/«اپلیکیشن»,
−14 LUFS, and a score written for the cut.

**Deliverables**
- `out/appito-teaser-reel.mp4` — the reel (H.264 High + AAC, faststart)
- `out/cover.png` / `out/cover.jpg` — the Reel cover (series cover kit)
- `out/appito-teaser-music.mp3` and `music/score.wav` (48 kHz / 24-bit master) — the score

## The idea

The hero's promise, «تو فقط بگو، اپیتو می‌سازدش», told as one merchant's escape from the DMs.

| Time | Scene | What happens |
| :--- | :--- | :--- |
| 0–4 | **Hook** | «هنوز توی دایرکت می‌فروشی؟» on the series' glass plate. The customers' «قیمت؟» messages land on an accelerating grid, and the score's pings land with them as a pitched riser in Persian Shur. At 3.75 the whole flood is sucked into one point. |
| 4–6 | **Silence** | A caret types «تو فقط بگو…» into the dark, one key per 16th note. |
| 6–10 | **One AI** | Drop 1. The mascot rises on ad 1's glowing disc. The six jobs land in orbit one per beat, under «یک گفت‌وگو، همه‌ی کارها». |
| 10–20 | **Design Studio** | The studio's real starter, «یک طرح تازه برای فروشگاهم بساز», is typed over a plain default store and sent on drop 2. Its letters fly into the phone, and each band becomes ad 9's saffron storefront, one band per beat. A slot-machine roll lands on other shops (ترمه، لالجین، اسنیکر) on the shuffle hits. Tap «انتشار» → «منتشر شد», and the address bar draws. |
| 20–28 | **Photo Studio** | The mascot takes the shot. A teapot set on the living-room rug, crooked and warm («قبل»), is scanned to transparency, then to a clean card («بعد»). Nine messy shots snap into identical cards, one row per shutter, and their backgrounds change together. |
| 28–36 | **Bale bot** | The order arrives, then two taps: «تأیید واریز», then «بله، تأیید». The music stops, and a giant «بله.» slams in, because بله is both the messenger and the answer. Then the confirmation and the panel's «از بله» log. |
| 36–40 | **Products from photos** | «از این عکس‌ها محصول بساز» → three product cards, one per beat → «همه را تأیید کن». |
| 40–44 | **Voice → campaign kit** | A voice note (its bars move with the score) → caption, hashtags and a 9:16 story. |
| 44–50 | **The wall** | Nine more features land one per beat, then hold to be read. |
| 50–56 | **End card** | «تو فقط بگو، اپیتو می‌سازدش» word by word, the glowing disc and mascot, `appito`, «ساخت فروشگاه», myappito.com. The last frame cuts cleanly back to frame 0. |

**Score:** "santur meets modern Persian groove", 120 BPM in dastgah Shur on G, with a real quarter-tone
A-koron. The lead is a modal-synthesis santur (four detuned strings per course and tremolo) over
tombak, daf, sub bass and pads. Drops, stops and risers are placed on the picture's hits, and every
UI sound (pings, keys, taps, shutters, the slam) sits within a few milliseconds of its frame.

## Sources

- **Strings:** copied from `appito-landing` (PRODUCT.md, `lib/features.ts`,
  `components/assistant-data.ts`, `AiDay.tsx`, and the bale and voice-kit moments) and ad 9's
  `storekit/shops.json`. They live in `video/strings.js`, with every ZWNJ written as `‌`.
- **Storefronts, banners and product shots:** the "Ai Studio advertisement reel 1" session (ad 9,
  branch `claude/ad-9-magicwords` of appito-dev-workspace).
- **Mascot and brand:** ad 1's 1254 px poses, and the landing's logo and wordmark.
- **Cutouts:** made locally with `rembg` (`tools/rembg_cut.py`). No AI image generation and no
  OpenRouter calls were used anywhere.

## Rebuild

All steps assume the repo root `appito-teaser/` and the pre-installed Chromium/Playwright.

```bash
python3 music/compose.py                    # score.wav, envelope.json, qa/ (≈30 s; numpy + scipy)
node render/render.mjs frames 0 3360 4      # 60 fps PNG frames → out/picture.mp4 (4 parallel browsers)
bash tools/master.sh                        # mux + final encode → out/appito-teaser-reel.mp4, music mp3
node render/cover.mjs                       # out/cover.png / cover.jpg
node render/render.mjs still 12.5 34.05     # spot-check any moment → out/probe/
```

`timeline.json` is the single source of timing: change a cue there, then update the scene that draws
it (`video/scenes/*.js`) and rerun `compose.py`. Every pixel is a pure function of the time
(`window.__seek(ms)`), so frames can render in any order and in parallel.
