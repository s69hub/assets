#!/usr/bin/env python3
"""Appito teaser: the score and every sound effect, synthesised from scratch.

    python3 music/compose.py

reads  ../timeline.json   the picture's beat sheet (120 BPM, 56.0 s, every cue)
writes music/score.wav     48 kHz, 24-bit, stereo, exactly 2,688,000 frames, mastered:
                           -14 LUFS integrated, true peak <= -1.5 dBTP, silent from 55.95 s
       music/envelope.json 60 fps RMS (0..1) of the mix, the drums and the santur
       music/qa/spectrogram.png, music/qa/report.txt

Music: dastgah Shur on G with a real koron second (A-koron = G + 150 cents).
Harmony never uses A natural: Gm, Eb, Cm, F5. The lead is a modal-synthesis
santur (four detuned strings per course, slightly inharmonic partials shaped by
the hammer position, a bright hammer click, 32nd-note tremolo on long notes).
Groove: tombak (tom, bak, riz rolls), daf (boom + jingles), kick, clap, shaker,
sub bass and a warm pad, both pumping off the kick; a soft supersaw doubles the
hook an octave down on the feature wall.

The score is cut into segments at 4.0, 11.875, 34.0 and 35.0 s and every
segment is hard-gated at its end, reverb included, so the stops in the picture
are real silence and no tail reappears after a stop. Only the «بله.» slam and
its tick live in an exempt segment that rings through the 34-35 s silence.

No samples, no downloads, no AI services: numpy + scipy only.
"""
import json
import os
import time
import wave

import numpy as np
from scipy import signal
from scipy.ndimage import uniform_filter1d

T_START = time.time()
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
QA = os.path.join(HERE, "qa")
os.makedirs(QA, exist_ok=True)

TL = json.load(open(os.path.join(ROOT, "timeline.json"), encoding="utf-8"))
SR = 48000
BPM = TL["bpm"]
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
S16 = BEAT / 4             # 0.125 s
S32 = S16 / 2              # 0.0625 s
DUR = float(TL["duration"])
N = int(round(DUR * SR))
assert N == 2_688_000, N
FPS = TL["fps"]
F32 = np.float32


# ── basics ───────────────────────────────────────────────────────────────────
def ns(sec):
    return int(round(sec * SR))


def tt(n):
    return np.arange(n, dtype=np.float64) / SR


def noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


def env_exp(n, attack, decay):
    t = tt(n)
    return np.clip(t / max(attack, 1e-5), 0, 1) * np.exp(-t / decay)


def butter(kind, f, order=2):
    if kind == "band":
        lo, hi = f
        return signal.butter(order, [max(lo, 10), min(hi, SR * 0.45)], btype="band", fs=SR, output="sos")
    return signal.butter(order, min(f, SR * 0.45), btype=kind, fs=SR, output="sos")


def lp(x, f, order=2):
    return signal.sosfilt(butter("low", f, order), x, axis=0)


def hp(x, f, order=2):
    return signal.sosfilt(butter("high", f, order), x, axis=0)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(butter("band", (lo, hi), order), x, axis=0)


def sweep(x, f0, f1, kind="low", block=256, bw=0.7, order=2, shape=1.0):
    """Time-varying filter on a mono signal: cutoff (or band centre) glides f0 -> f1 (exponential)."""
    n = len(x)
    y = np.zeros(n)
    zi = None
    for i0 in range(0, n, block):
        i1 = min(n, i0 + block)
        u = ((i0 + i1) / 2 / n) ** shape
        fc = f0 * (f1 / f0) ** u
        if kind == "band":
            sos = butter("band", (fc / (1 + bw), fc * (1 + bw)), order)
        else:
            sos = butter(kind, fc, order)
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        y[i0:i1], zi = signal.sosfilt(sos, x[i0:i1], zi=zi)
    return y


def sat(x, k=1.0):
    return np.tanh(k * x) / np.tanh(k)


def pan(x, p=0.0):
    th = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], axis=1)


def stereo(x, p=0.0):
    return x if x.ndim == 2 else pan(x, p)


def pad_to(x, n):
    if len(x) >= n:
        return x[:n]
    return np.concatenate([x, np.zeros((n - len(x),) + x.shape[1:])])


# ── pitch: Shur on G, with the koron second ──────────────────────────────────
SEMI = {"C": 0, "D": 2, "Eb": 3, "E": 4, "F": 5, "G": 7, "Ak": 8.5, "A": 9, "Bb": 10, "B": 11}


def hz(name):
    i = 0
    while not name[i].isdigit():
        i += 1
    return 440.0 * 2 ** ((SEMI[name[:i]] + 12 * (int(name[i:]) - 4) - 9) / 12)


SHUR = ["G", "Ak", "Bb", "C", "D", "Eb", "F"]


def shur_step(step, g_oct):
    """step 0 = G<g_oct>, then up the Shur scale (Ak, Bb, C, D, Eb, F, G ...)."""
    o, d = divmod(step, 7)
    pc = SHUR[d]
    return hz(f"{pc}{g_oct + o + (1 if pc in ('C', 'D', 'Eb', 'F') else 0)}")


# ── segments: the stops are real ─────────────────────────────────────────────
BUSES = ("kick", "drums", "bass", "pad", "santur", "lead", "sfx")
TAIL = 4.0


class Seg:
    def __init__(self, name, t0, t1, cut=True, verb=2.3):
        self.name, self.t0, self.t1, self.cut, self.verb = name, t0, t1, cut, verb
        self.i0 = ns(t0)
        self.n = ns((t1 if cut else DUR) - t0) + ns(TAIL)
        self.bus = {k: np.zeros((self.n, 2), F32) for k in BUSES}
        self.send = np.zeros((self.n, 2), F32)
        self.kicks = []

    def add(self, bus, x, t, gain=1.0, p=0.0, send=0.0):
        x = (stereo(np.asarray(x, dtype=np.float64), p) * gain).astype(F32)
        i = ns(t) - self.i0
        if i < 0:
            x, i = x[-i:], 0
        j = min(self.n, i + len(x))
        if j <= i:
            return
        self.bus[bus][i:j] += x[: j - i]
        if send:
            self.send[i:j] += x[: j - i] * send


SEGS = {
    "intro": Seg("intro", 0.0, 4.0),            # pings, flood, vacuum: dead stop at 4.0
    "a": Seg("a", 4.0, 11.875),                 # typing, drop 1, pre-drop: stop at 11.875
    "b": Seg("b", 12.0, 34.0),                  # drop 2, photo, breakdown: the music stops at 34.0
    "c": Seg("c", 35.0, DUR),                   # return, drop 3, voice, wall, end card
    "x": Seg("x", 34.0, DUR, cut=False, verb=3.2),  # exempt: the «بله.» slam and its tick
}
QA_CUE = np.zeros(N + ns(TAIL), F32)            # every cue sound, mono, ungated: placement check
QA_PLACED = {}                                  # cue time -> first sound placed there (mono)


def seg_at(t, exempt=False):
    if exempt:
        return SEGS["x"]
    if t < 4.0:
        return SEGS["intro"]
    if t < 11.875:
        return SEGS["a"]
    if 12.0 <= t < 34.0:
        return SEGS["b"]
    if t >= 35.0:
        return SEGS["c"]
    raise ValueError(f"nothing may start in a stop: {t}")


def cue_add(t, x, gain=1.0, p=0.0, send=0.0, bus="sfx", exempt=False):
    """Place a cue sound on its exact sample, in the segment that owns time t."""
    seg = seg_at(t, exempt)
    seg.add(bus, x, t, gain, p, send)
    m = stereo(np.asarray(x, dtype=np.float64), p).mean(axis=1) * gain
    QA_PLACED.setdefault(round(t, 4), m[: ns(0.05)].copy())
    i = ns(t)
    j = min(len(QA_CUE), i + len(m))
    QA_CUE[i:j] += m[: j - i].astype(F32)


# ── instruments ──────────────────────────────────────────────────────────────
_SANTUR = {}


def santur(freq, vel=0.8, dur=2.2, damp=1.0):
    """A santur course: 4 detuned strings x ~30 slightly inharmonic partials, hammer comb, click."""
    want = vel
    vel = max(0.1, round(vel * 10) / 10)
    key = (round(freq, 3), vel, round(dur, 3), round(damp, 2))
    if key in _SANTUR:
        return _SANTUR[key] * (want / vel)
    n = ns(dur)
    t = (np.arange(n, dtype=F32) / SR)[:, None]
    rng = np.random.default_rng(int(freq * 100) % 99991)
    B, x0 = 3.5e-4, 0.125
    tau1 = 0.95 * (392.0 / freq) ** 0.45 / damp
    bright = 0.55 + 0.6 * vel
    kmax = 1
    while kmax < 30 and (kmax + 1) * freq * np.sqrt(1 + B * (kmax + 1) ** 2) < 14000:
        kmax += 1
    k = np.arange(1, kmax + 1, dtype=F32)
    ak = (1.0 / k ** 0.85) * np.abs(np.sin(np.pi * k * x0)) * np.exp(-(k - 1) * 0.11 / bright)
    tauk = (tau1 / (1 + 0.20 * (k - 1) ** 1.3)).astype(F32)
    out = np.zeros((n, 2), F32)
    for det, p, g in ((-4.2, -0.45, 0.85), (-1.4, -0.12, 1.0), (1.5, 0.15, 0.95), (3.9, 0.48, 0.8)):
        f = freq * 2 ** (det / 1200)
        fk = (f * k * np.sqrt(1 + B * k ** 2)).astype(F32)
        ph = rng.uniform(0, 2 * np.pi, kmax).astype(F32)
        s = np.zeros(n, F32)
        for c0 in range(0, n, 24000):
            tc = t[c0:c0 + 24000]
            s[c0:c0 + 24000] = np.sum(ak * np.exp(-tc / tauk) * np.sin(2 * np.pi * fk * tc + ph), axis=1)
        out += pan(s * g, p).astype(F32)
    hn = ns(0.03)
    click = bp(noise(hn, int(freq) + 3), 2200, 9000) * env_exp(hn, 0.0003, 0.0045)
    out[:hn] += pan(click * 0.35 * (0.5 + 0.5 * vel)).astype(F32)
    out *= np.clip(t / 0.0007, 0, 1)
    out /= np.max(np.abs(out)) + 1e-9
    out *= vel
    _SANTUR[key] = out
    return out * (want / vel)


def kick(punch=1.0, dur=0.45, f_hi=165.0, f_lo=50.0):
    n = ns(dur)
    t = tt(n)
    f = f_lo + (f_hi - f_lo) * np.exp(-t * 30)
    body = sat(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.0015, 0.2) * 1.3, 1.2)
    click = bp(noise(n, 11), 1500, 7000) * env_exp(n, 0.0002, 0.0035) * 0.22
    return (body * 0.92 + click) * punch


def clap(seed=3, tail=0.16, bright=1.0):
    n = ns(0.5)
    x = noise(n, seed)
    x = bp(x, 900, 2800 * bright) + 0.35 * hp(x, 3500)
    e = np.zeros(n)
    for k, d in enumerate((0.0, 0.0085, 0.0175, 0.0285)):
        i = ns(d)
        e[i:] += env_exp(n - i, 0.0006, 0.0055) * 0.85 if k < 3 else env_exp(n - i, 0.0008, tail)
    return x * e * 0.55


def tom(vel=1.0):
    n = ns(0.5)
    t = tt(n)
    f = 92 + 70 * np.exp(-t * 22)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.001, 0.26)
    mode2 = np.sin(2 * np.pi * np.cumsum(f * 1.59) / SR) * env_exp(n, 0.001, 0.09) * 0.35
    thump = lp(noise(n, 21), 700) * env_exp(n, 0.0005, 0.012) * 0.5
    return sat((body + mode2 + thump) * vel, 1.1) * 0.8


def bak(vel=1.0, seed=31):
    n = ns(0.25)
    t = tt(n)
    ring = (np.sin(2 * np.pi * 640 * t) * env_exp(n, 0.0004, 0.055)
            + 0.6 * np.sin(2 * np.pi * 1215 * t) * env_exp(n, 0.0004, 0.035)
            + 0.3 * np.sin(2 * np.pi * 2290 * t) * env_exp(n, 0.0003, 0.02))
    snap = bp(noise(n, seed), 1800, 7500) * env_exp(n, 0.0003, 0.012)
    return (ring * 0.45 + snap * 0.9) * vel * 0.6


def daf_jingle(vel=1.0, seed=51):
    n = ns(0.35)
    t = tt(n)
    rng = np.random.default_rng(seed)
    x = np.zeros(n)
    for f in rng.uniform(3200, 9800, 10):
        x += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * env_exp(n, 0.0008, rng.uniform(0.06, 0.18))
    x *= 1 + 0.6 * lp(noise(n, seed + 9), 60) * 8
    x += hp(noise(n, seed + 5), 6000) * env_exp(n, 0.0005, 0.05) * 2.0
    return x / (np.max(np.abs(x)) + 1e-9) * vel * 0.5


def daf_boom(vel=1.0):
    n = ns(0.8)
    t = tt(n)
    f = 64 + 40 * np.exp(-t * 16)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.002, 0.38)
    skin = lp(noise(n, 41), 1200) * env_exp(n, 0.001, 0.03) * 0.4
    return (body * 0.9 + skin + pad_to(daf_jingle(0.5, 42), n) * 0.6) * vel


def shaker(vel=0.5, seed=61):
    n = ns(0.11)
    t = tt(n)
    e = np.sin(np.clip(t / 0.012, 0, 1) * np.pi / 2) ** 2 * np.exp(-np.maximum(t - 0.01, 0) / 0.028)
    return bp(noise(n, seed), 4500, 12000) * e * vel * 0.45


def ohat(vel=1.0, seed=271):
    n = ns(0.16)
    return hp(noise(n, seed), 7000) * env_exp(n, 0.001, 0.07) * vel * 0.3


def bass_note(freq, dur, vel=1.0):
    n = ns(dur)
    t = tt(n)
    x = np.sin(2 * np.pi * freq * t) + 0.32 * np.sin(2 * np.pi * 2 * freq * t) + 0.12 * np.sin(2 * np.pi * 3 * freq * t)
    x = sat(x * 0.9, 1.8)
    if freq >= 70:
        x += 0.25 * np.sin(2 * np.pi * 0.5 * freq * t)
    x *= np.clip(t / 0.005, 0, 1) * np.clip((dur - t) / 0.03, 0, 1) * (0.75 + 0.25 * np.exp(-t / 0.25))
    return x * vel * 0.5


def additive_saw(f, n, fmax, phase=0.0):
    t = tt(n)
    x = np.zeros(n)
    for k in range(1, max(1, int(fmax // f)) + 1):
        x += np.sin(2 * np.pi * k * f * t + phase * k) / k
    return x * (2 / np.pi)


_PAD = {}


def pad_chord(notes, dur, cutoff=1500.0, attack=0.25, release=0.35):
    key = (tuple(notes), round(dur, 3), cutoff, attack, release)
    if key in _PAD:
        return _PAD[key]
    n = ns(dur + release)
    t = tt(n)
    out = np.zeros((n, 2))
    for j, nm in enumerate(notes):
        for d, p in ((-7, -0.6), (0, 0.0), (7, 0.6)):
            out += pan(additive_saw(hz(nm) * 2 ** (d / 1200), n, min(cutoff * 2.2, 9000), j * 1.7 + d), p) * 0.33
    out = lp(out, cutoff)
    out *= (np.clip(t / attack, 0, 1) * np.clip((dur + release - t) / release, 0, 1))[:, None]
    out /= np.max(np.abs(out)) + 1e-9
    _PAD[key] = out
    return out


def supersaw(freq, dur, vel=1.0, cutoff=5200.0):
    n = ns(dur + 0.12)
    t = tt(n)
    out = np.zeros((n, 2))
    for d, p in ((-16, -0.8), (-7, -0.35), (0, 0.0), (7, 0.35), (16, 0.8)):
        out += pan(additive_saw(freq * 2 ** (d / 1200), n, min(cutoff * 2, 12000), d * 0.3), p)
    out = lp(out, cutoff)
    e = np.clip(t / 0.006, 0, 1) * (0.6 + 0.4 * np.exp(-t / 0.15)) * np.clip((dur + 0.12 - t) / 0.1, 0, 1)
    out *= e[:, None]
    return out / (np.max(np.abs(out)) + 1e-9) * vel


def bell(freq, dur=0.9, vel=1.0, bright=1.0):
    n = ns(dur)
    t = tt(n)
    x = np.zeros(n)
    for r, a, d in ((1.0, 1.0, 0.42), (2.0, 0.5, 0.26), (3.0, 0.28, 0.17), (4.16, 0.2, 0.11),
                    (5.43, 0.12, 0.08), (6.79, 0.07, 0.06)):
        if r * freq < 15500:
            x += a * bright ** (r - 1) * np.sin(2 * np.pi * r * freq * t) * env_exp(n, 0.0008, d * dur / 0.9)
    return x * vel


def glitter(dur=0.5, count=18, lo=3500, hi=9000, seed=71, amp=0.3):
    n = ns(dur + 0.12)
    out = np.zeros((n, 2))
    rng = np.random.default_rng(seed)
    for _ in range(count):
        at = ns(rng.uniform(0, dur))
        m = ns(0.1)
        f = rng.uniform(lo, hi)
        b = np.sin(2 * np.pi * f * tt(m)) * env_exp(m, 0.0005, rng.uniform(0.02, 0.06)) * rng.uniform(0.4, 1.0)
        out[at:at + m] += pan(b, rng.uniform(-0.8, 0.8))[: n - at]
    return out * amp


def noise_sweep(dur, f0, f1, seed, amp=1.0, bw=0.6, env=None):
    n = ns(dur)
    u = np.linspace(0, 1, n)
    x = sweep(noise(n, seed), f0, f1, "band", bw=bw)
    e = np.sin(np.pi * np.clip(u ** 1.6, 0, 1)) if env is None else env(u)
    return x * e * amp


# ── sound design, one per cue type ───────────────────────────────────────────
def snd_ping(step):
    f = shur_step(step, 5)
    x = bell(f, 0.55, 1.0, 0.7)
    x += np.pad(np.sin(2 * np.pi * f * 2 * tt(ns(0.05))) * env_exp(ns(0.05), 0.0004, 0.012), (0, len(x) - ns(0.05))) * 0.4
    return lp(x, 9000) * (0.55 + 0.45 * step / 15)


def snd_tiny_ping(f):
    n = ns(0.09)
    return np.sin(2 * np.pi * f * tt(n)) * env_exp(n, 0.0004, 0.025)


def snd_key(space=False, seed=81, soft=1.0):
    n = ns(0.06)
    t = tt(n)
    click = hp(noise(n, seed), 2500) * env_exp(n, 0.0002, 0.0018) * 0.5
    f = 140 if space else 240 + (seed % 7) * 9
    thock = np.sin(2 * np.pi * f * t) * env_exp(n, 0.0005, 0.03 if space else 0.014) * (0.9 if space else 0.6)
    return (click + thock) * soft


def snd_pop(step):
    notes = ["G5", "Bb5", "D6", "G6", "Bb6", "D7", "F6", "G6"]
    f = hz(notes[step % len(notes)])
    n = ns(0.3)
    t = tt(n)
    fr = f * (0.55 + 0.45 * (1 - np.exp(-t / 0.006)))
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * env_exp(n, 0.0006, 0.09)
    x += np.sin(2 * np.pi * 2 * f * t) * env_exp(n, 0.0004, 0.03) * 0.25
    x += hp(noise(n, 90 + step), 3000) * env_exp(n, 0.0002, 0.002) * 0.2
    return x


def snd_whoosh(dur, seed=101, up=True):
    f0, f1 = (350, 4200) if up else (4200, 350)
    x = noise_sweep(dur, f0, f1, seed, 1.0, 0.8)
    n = len(x)
    out = np.zeros((n, 2))
    pv = np.linspace(-0.6, 0.6, n)
    out[:, 0] = x * np.cos((pv + 1) * np.pi / 4)
    out[:, 1] = x * np.sin((pv + 1) * np.pi / 4)
    return out


def snd_riser(dur, seed=111):
    n = ns(dur)
    t = tt(n)
    u = t / dur
    nz = sweep(noise(n, seed), 300, 7000, "band", bw=0.9)
    f = hz("G3") * (8 ** u)
    tone = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.004 * np.sin(2 * np.pi * 6 * t))) / SR)
    x = (nz * 0.7 + tone * 0.25) * u ** 2.2
    x[-ns(0.025):] *= np.linspace(1, 0, ns(0.025)) ** 2
    return x


def snd_swell(dur, seed=121):
    """Reverse cymbal: bright noise, swelling, ending dead on the downbeat."""
    n = ns(dur)
    u = np.linspace(0, 1, n)
    x = hp(noise(n, seed), 3000) + 0.5 * bp(noise(n, seed + 1), 900, 3000)
    x *= u ** 3
    x[-ns(0.004):] *= np.linspace(1, 0, ns(0.004))
    return x


def snd_boom(level=1.0, dur=1.0):
    n = ns(dur)
    t = tt(n)
    f = 34 + 26 * np.exp(-t * 7)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.002, 0.45 + 0.15 * level)


def snd_crash(dur=1.6, seed=131):
    n = ns(dur)
    t = tt(n)
    x = hp(noise(n, seed), 3500) * env_exp(n, 0.002, dur * 0.4)
    for f in (3720, 5110, 6830):
        x += np.sin(2 * np.pi * f * t) * env_exp(n, 0.001, dur * 0.25) * 0.08
    return x


def snd_tap():
    n = ns(0.1)
    t = tt(n)
    return hp(noise(n, 141), 2000) * env_exp(n, 0.0002, 0.0015) * 0.5 + np.sin(2 * np.pi * 1250 * t) * env_exp(n, 0.0005, 0.018) * 0.55


def snd_send():
    n = ns(0.12)
    x = sweep(noise(n, 151), 900, 6000, "band", bw=0.7) * np.sin(np.pi * np.linspace(0, 1, n)) * 0.8
    return x + pad_to(snd_tap(), n) * 0.7


def snd_snap(seed=161):
    n = ns(0.25)
    t = tt(n)
    s = bp(noise(n, seed), 1700, 5200) * env_exp(n, 0.0004, 0.010) + np.sin(2 * np.pi * 2100 * t) * env_exp(n, 0.0004, 0.02) * 0.3
    w = pad_to(noise_sweep(0.15, 2500, 700, seed + 1, 0.15), n)
    return s + w


def snd_shuffle(seed=171):
    n = ns(0.2)
    x = np.zeros(n)
    for i in range(5):
        at = ns(i * 0.012)
        m = ns(0.02)
        x[at:at + m] += bp(noise(m, seed + i), 2500, 8000) * env_exp(m, 0.0003, 0.003) * (1 - i * 0.13)
    x += pad_to(noise_sweep(0.12, 1800, 5000, seed + 9, 0.25), n)
    return x


def snd_success():
    n = ns(1.2)
    x = np.zeros((n, 2))
    x += pan(pad_to(bell(hz("D6"), 0.9, 0.8), n), -0.2)
    x[ns(0.08):] += pan(pad_to(bell(hz("G6"), 0.9, 0.9), n - ns(0.08)), 0.2)
    x += pad_to(glitter(0.45, 12, 4000, 9000, 72, 0.25), n)
    return x


def snd_hit():
    n = ns(0.9)
    return pad_to(clap(5, 0.2), n) * 1.1 + pad_to(snd_crash(0.8, 133), n) * 0.5 + pad_to(snd_boom(1.0, 0.9), n) * 0.6


def snd_shutter(big=False):
    n = ns(0.6)
    x = np.zeros(n)

    def click(at, vel, fres, seed):
        m = ns(0.06)
        tm = tt(m)
        c = bp(noise(m, seed), 1200, 8000) * env_exp(m, 0.0002, 0.005) + np.sin(2 * np.pi * fres * tm) * env_exp(m, 0.0002, 0.012) * 0.4
        x[ns(at):ns(at) + m] += c * vel

    click(0.0, 1.0, 3300, 181)
    m = ns(0.05)
    x[ns(0.006):ns(0.006) + m] += bp(noise(m, 182), 600, 2400) * env_exp(m, 0.004, 0.012) * 0.25
    click(0.052, 0.75, 2700, 183)
    if big:
        t = tt(n)
        f = 55 + 85 * np.exp(-t * 12)
        x += np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.002, 0.2) * 0.6
        x += hp(noise(n, 184), 5000) * env_exp(n, 0.003, 0.18) * 0.35
    return x


def snd_scan(dur, seed=191):
    n = ns(dur)
    t = tt(n)
    u = t / dur
    f = 500 * (4.4 ** u)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * ph) / k for k in range(1, 7))
    x *= 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 55 * t))
    x = bp(x, 400, 5000) * 0.5 + sweep(noise(n, seed), 800, 5000, "band", bw=0.5) * 0.4
    x *= np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.08, 0, 1)
    out = np.zeros((n, 2))
    pv = np.linspace(-0.5, 0.5, n)
    out[:, 0] = x * np.cos((pv + 1) * np.pi / 4)
    out[:, 1] = x * np.sin((pv + 1) * np.pi / 4)
    return out


def snd_tick(seed=0):
    n = ns(0.12)
    t = tt(n)
    return (np.sin(2 * np.pi * 1150 * t) * env_exp(n, 0.0003, 0.025) + 0.6 * np.sin(2 * np.pi * 2750 * t) * env_exp(n, 0.0003, 0.012)
            + hp(noise(n, 201 + seed), 3000) * env_exp(n, 0.0002, 0.0015) * 0.4)


def snd_buzz(dur):
    n = ns(dur)
    t = tt(n)
    x = sum(np.sin(2 * np.pi * 155 * k * t) / k for k in (1, 3, 5, 7, 9))
    x *= 0.7 + 0.3 * np.sin(2 * np.pi * 24 * t)
    g = ((t < 0.22) | ((t > 0.28) & (t < dur - 0.005))).astype(float)
    g = uniform_filter1d(g, ns(0.006))
    return lp(x, 2200) * g * 0.6


def snd_chime():
    n = ns(1.5)
    x = np.zeros((n, 2))
    for i, (nm, p) in enumerate((("G6", -0.3), ("Bb6", 0.0), ("D7", 0.3))):
        at = ns(i * 0.07)
        x[at:] += pan(pad_to(bell(hz(nm), 1.2, 0.85, 0.8), n - at), p)
    return x


def snd_record(up=True):
    n = ns(0.16)
    t = tt(n)
    f0, f1 = (420, 880) if up else (880, 420)
    f = f0 + (f1 - f0) * np.clip(t / 0.07, 0, 1)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.002, 0.06) * 0.8


def snd_copy():
    n = ns(0.2)
    x = np.zeros(n)
    for i, at in enumerate((0.0, 0.06)):
        m = ns(0.08)
        tm = tt(m)
        x[ns(at):ns(at) + m] += np.sin(2 * np.pi * (2600 + 400 * i) * tm) * env_exp(m, 0.0003, 0.012) * 0.6
    return x


def snd_slam():
    """«بله.»: the one huge hit. Sub drop, kick, clap stack, low gong, noise burst."""
    n = ns(2.8)
    t = tt(n)
    f = 28 + 62 * np.exp(-t * 5.5)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.002, 0.9) * 0.9
    x += pad_to(kick(1.4, 0.7), n)
    x += pad_to(clap(5, 0.35), n) * 1.4
    x[ns(0.006):] += pad_to(clap(6, 0.3), n - ns(0.006)) * 1.0
    x += bp(noise(n, 211), 300, 1200) * env_exp(n, 0.001, 0.08) * 0.6
    x += lp(noise(n, 212), 3500) * env_exp(n, 0.001, 0.25) * 0.35
    for fr in (183, 271, 412, 597, 861):
        x += np.sin(2 * np.pi * fr * t) * env_exp(n, 0.002, 0.7) * 0.05
    return sat(x * 0.8, 1.3)


def snd_tile(step):
    n = ns(0.6)
    x = pad_to(snd_snap(221 + step), n) * 0.9
    x += pad_to(lp(bell(shur_step(step, 5), 0.4, 1.0, 1.1), 10000), n) * 0.55
    x += pad_to(snd_boom(0.5, 0.4), n) * 0.35
    return x


def snd_word(big=False):
    n = ns(1.4 if big else 0.4)
    x = pad_to(clap(7, 0.12), n) * 1.1 + pad_to(tom(0.9), n) * 0.6
    x += lp(noise(n, 231), 5000) * env_exp(n, 0.0008, 0.05) * 0.4
    if big:
        x += pad_to(snd_boom(2.0, 1.4), n) * 0.8 + pad_to(snd_crash(1.4, 232), n) * 0.6
    return x


def snd_impact():
    n = ns(2.4)
    x = pad_to(snd_boom(3.0, 2.0), n) * 1.0
    x += pad_to(snd_crash(2.4, 241), n) * 0.7
    x += pad_to(clap(8, 0.3), n) * 1.2
    x += lp(noise(n, 242), 2500) * env_exp(n, 0.001, 0.18) * 0.4
    return x


def snd_shimmer():
    n = ns(2.2)
    p = pad_chord(["G3", "Bb3", "D4", "G4"], 1.6, 6000, 0.6, 0.6)
    p = pad_to(p, n)
    p[:, 0] = sweep(p[:, 0], 500, 4500, "low", shape=0.7)
    p[:, 1] = sweep(p[:, 1], 500, 4500, "low", shape=0.7)
    return p * 0.6 + pad_to(glitter(1.2, 30, 3500, 9500, 251, 0.3), n) + pan(pad_to(bell(hz("D7"), 1.6, 0.25, 0.6), n), 0.3)


# ── the cues, straight from timeline.json ────────────────────────────────────
def place_cues():
    for c in TL["cues"]:
        t, ty = c["t"], c["type"]
        end = c.get("end")
        if ty == "ping":
            cue_add(t, snd_ping(c["step"]), 0.36, p=(-0.25 if c["step"] % 2 else 0.25), send=0.25)
        elif ty == "flood":
            rng = np.random.default_rng(301)
            k = 0
            for i, tm in enumerate(np.arange(t, end - 1e-6, S32 / 2)):
                cue_add(tm, snd_tiny_ping(shur_step(12 + i, 4)), 0.16, p=rng.uniform(-0.7, 0.7), send=0.2)
                k += 1
            for _ in range(36):
                tm = rng.uniform(t, end - 0.02)
                u = (tm - t) / (end - t)
                cue_add(tm, snd_tiny_ping(1600 * 2.6 ** u * rng.uniform(0.9, 1.1)), 0.07 + 0.06 * u, p=rng.uniform(-0.9, 0.9))
            cue_add(t, noise_sweep(end - t, 2000, 7000, 302, 0.25, 0.6, env=lambda u: u ** 1.5))
        elif ty == "vacuum":
            cue_add(t, noise_sweep(end - t, 400, 6500, 311, 0.55, 0.9, env=lambda u: u ** 2.5))
        elif ty in ("key", "keySpace"):
            cue_add(t, snd_key(ty == "keySpace", 81 + int(t * 8)), 0.5)
        elif ty == "swell":
            cue_add(t, snd_swell(end - t, 121 + int(t)), 0.32, send=0.1)
        elif ty == "drop":
            lv = c.get("level", 1)
            seg = seg_at(t)
            seg.add("kick", snd_boom(lv, 1.4), t, 0.4 + 0.06 * lv)
            seg.add("drums", snd_crash(1.2 + 0.3 * lv, 130 + lv), t, 0.45 + 0.08 * lv, send=0.2)
            cue_add(t, lp(noise(ns(0.3), 140 + lv), 2500) * env_exp(ns(0.3), 0.001, 0.07), 0.25 * lv)
        elif ty == "pop":
            cue_add(t, snd_pop(c["step"]), 0.46, p=(-0.2 + 0.08 * c["step"]), send=0.15)
        elif ty == "whoosh":
            cue_add(t, snd_whoosh(end - t, 101 + int(t)), 0.42, send=0.12)
        elif ty == "typing":
            for i, tm in enumerate(np.arange(t, end + 1e-6, c["every"])):
                cue_add(tm, snd_key(False, 400 + i, 0.55), 0.38, p=((i % 3) - 1) * 0.15)
        elif ty == "riser":
            cue_add(t, snd_riser(end - t, 111 + int(t)), 0.34, send=0.15)
        elif ty in ("stop", "silence", "end"):
            pass  # segment gates make these silent
        elif ty == "send":
            cue_add(t, snd_send(), 0.45)
        elif ty == "snap":
            cue_add(t, snd_snap(161 + int(t * 4)), 0.95, send=0.1)
        elif ty == "shuffle":
            cue_add(t, snd_shuffle(171 + int(t * 4)), 1.1, p=0.2 * np.sin(t * 7))
        elif ty == "tap":
            cue_add(t, snd_tap(), 0.72 if c.get("note") else 0.5)
        elif ty == "success":
            cue_add(t, snd_success(), 0.42, send=0.3)
        elif ty == "hit":
            cue_add(t, snd_hit(), 0.75, send=0.2)
        elif ty == "shutter":
            cue_add(t, snd_shutter(c.get("big", False)), 0.8 if c.get("big") else 0.62, send=0.12)
        elif ty == "scan":
            cue_add(t, snd_scan(end - t), 0.3, send=0.1)
        elif ty == "sparkle":
            cue_add(t, glitter(0.5, 20, 3500, 9500, 260, 1.0), 0.5, send=0.25)
        elif ty == "tick":
            cue_add(t, snd_tick(int(t)), 0.62, exempt=(34.0 <= t < 35.0))
        elif ty == "buzz":
            cue_add(t, snd_buzz(end - t), 0.5)
        elif ty == "chime":
            cue_add(t, snd_chime(), 0.5, send=0.35)
        elif ty == "pulse":
            times = [t, t + 0.25, t + 0.375, t + 0.5, t + 0.5625, t + 0.625, t + 0.6875]
            for i, tm in enumerate(times):
                f = shur_step(i * 2, 3)
                n = ns(0.12)
                x = np.sin(2 * np.pi * f * tt(n)) * env_exp(n, 0.001, 0.05) + pad_to(snd_boom(0.3, 0.12), n) * 0.5
                cue_add(tm, x, 0.35 + 0.08 * i)
        elif ty == "slam":
            cue_add(t, snd_slam(), 1.0, send=0.45, exempt=True)
        elif ty in ("record", "recordStop"):
            cue_add(t, snd_record(ty == "record"), 0.62)
        elif ty == "copy":
            cue_add(t, snd_copy(), 1.0)
        elif ty == "tile":
            cue_add(t, snd_tile(c["step"]), 0.55, p=((c["step"] % 3) - 1) * 0.25, send=0.15)
        elif ty == "impact":
            cue_add(t, snd_impact(), 0.9, send=0.3)
        elif ty == "word":
            cue_add(t, snd_word(c.get("big", False)), 0.85 if c.get("big") else 0.72, send=0.15)
        elif ty == "shimmer":
            cue_add(t, snd_shimmer(), 0.9, send=0.35)
        else:
            raise ValueError(f"unknown cue type {ty}")


# ── the music ────────────────────────────────────────────────────────────────
HOOK_A = [(0, "D5", 2), (2, "D5", 1), (3, "Eb5", 1), (4, "D5", 2), (6, "C5", 1), (7, "Bb4", 1),
          (8, "C5", 2), (10, "Bb4", 1), (11, "Ak4", 1), (12, "G4", 4, "trem")]
HOOK_B = [(0, "G4", 1), (1, "Ak4", 1), (2, "Bb4", 2), (4, "C5", 1), (5, "D5", 1), (6, "Eb5", 2),
          (8, "D5", 1), (9, "C5", 1), (10, "Bb4", 1), (11, "C5", 1), (12, "Ak4", 2), (14, "G4", 2)]
ANS_C = [(0, "G5", 2), (2, "F5", 1), (3, "Eb5", 1), (4, "D5", 2), (6, "Eb5", 1), (7, "D5", 1),
         (8, "C5", 2), (10, "D5", 1), (11, "Eb5", 1), (12, "C5", 4, "trem")]
ANS_D = [(0, "F4", 1), (1, "G4", 1), (2, "Ak4", 1), (3, "Bb4", 1), (4, "C5", 2), (6, "Bb4", 1),
         (7, "C5", 1), (8, "D5", 2), (10, "C5", 1), (11, "Bb4", 1), (12, "Ak4", 2), (14, "Bb4", 1), (15, "Ak4", 1)]

CHORD = {
    "Gm": (["G3", "Bb3", "D4"], "G2"),
    "Eb": (["G3", "Bb3", "Eb4"], "Eb2"),
    "Cm": (["G3", "C4", "Eb4"], "C2"),
    "F5": (["F3", "C4", "F4"], "F2"),
}
HUMAN = np.random.default_rng(1405)


def bt(bar, step=0.0):
    return bar * BAR + step * S16


def santur_trem(seg, t0, freq, dur, vel=0.72, send=0.28, end_vel=None, ring=True, gain=1.0, t_end=None):
    times = np.arange(t0, t0 + dur - 1e-6, S32)
    m = len(times)
    for i, tm in enumerate(times):
        if t_end is not None and tm >= t_end:
            break
        v = vel * (1.0 if i % 2 == 0 else 0.86)
        if end_vel is not None:
            v *= 1 + (end_vel / vel - 1) * i / max(1, m - 1)
        last = i == m - 1
        x = santur(freq, min(v, 1.0), 2.4 if (last and ring) else 0.45, 1.0 if (last and ring) else 4.5)
        seg.add("santur", x, tm, gain, send=send)


def phrase(seg, bar, notes, vel=0.74, gain=1.0, send=0.28, octave=0, t_end=None, lead=0.0, lead_gain=0.0):
    for item in notes:
        step, name, length = item[:3]
        t = bt(bar, step)
        if t_end is not None and t >= t_end:
            continue
        f = hz(name) * 2 ** octave
        v = vel * (1.12 if step == 0 else 1.0) * HUMAN.uniform(0.93, 1.05)
        if len(item) > 3:
            santur_trem(seg, t, f, length * S16, min(v, 1.0), send, gain=gain, t_end=t_end)
        else:
            seg.add("santur", santur(f, min(v, 1.0)), t, gain, send=send)
        if lead_gain:
            seg.add("lead", supersaw(f / 2, max(length * S16 - 0.02, 0.1), 1.0), t, lead_gain, send=0.12)


def drums_bar(seg, bar, kick_s=(), clap_s=(), tom_s=(), bak_s=(), daf_s=(), shk=0.0, riz=None,
              punch=1.0, t_end=None, t_from=None, ghost=(), level=1.0):
    def ok(t):
        return (t_end is None or t < t_end - 1e-9) and (t_from is None or t >= t_from - 1e-9)

    for s in kick_s:
        t = bt(bar, s)
        if ok(t):
            seg.add("kick", kick(punch), t, 0.85 * level)
            seg.kicks.append(t)
    for s in clap_s:
        t = bt(bar, s)
        if ok(t):
            seg.add("drums", clap(3 + s), t, 0.55 * level, p=0.05, send=0.18)
    for s in tom_s:
        t = bt(bar, s)
        if ok(t):
            seg.add("drums", tom(0.95 if s % 8 == 0 else 0.8), t, 0.5 * level, p=-0.15, send=0.06)
    for s in bak_s:
        t = bt(bar, s)
        if ok(t):
            v = 0.55 if s in ghost else 0.9
            seg.add("drums", bak(v, 31 + s), t, 0.55 * level, p=0.2, send=0.08)
    for s in daf_s:
        t = bt(bar, s)
        if ok(t):
            seg.add("drums", daf_jingle(0.8, 51 + s), t, 0.38 * level, p=-0.35, send=0.1)
    if shk:
        for s in range(16):
            t = bt(bar, s) + (0.012 if s % 2 else 0.0)
            if ok(t):
                v = (0.55, 0.3, 0.85, 0.35)[s % 4] * shk
                seg.add("drums", shaker(v, 61 + s), t, 0.75 * level, p=0.4)
    if riz is not None:
        a, b = riz
        for i, s in enumerate(np.arange(a, b, 0.5)):
            t = bt(bar, s)
            if ok(t):
                seg.add("drums", bak(0.35 + 0.5 * i / max(1, (b - a) * 2 - 1), 33 + i), t, 0.5 * level, p=0.25, send=0.08)


BASS_DROP = [(0, 2, 1.0), (3, 1, 1.0), (6, 2, 1.0), (8, 2, 1.0), (11, 1, 1.0), (14, 2, 2.0)]
BASS_PHOTO = [(0, 3, 1.0), (3, 2, 1.0), (7, 2, 1.0), (10, 2, 1.0), (13, 2, 1.5)]
BASS_HALF = [(0, 6, 1.0), (10, 4, 1.0)]


def bass_bar(seg, bar, chord, pattern, vel=1.0, t_end=None, t_from=None):
    root = hz(CHORD[chord][1])
    for s, ln, mul in pattern:
        t = bt(bar, s)
        if (t_end is not None and t >= t_end) or (t_from is not None and t < t_from):
            continue
        d = ln * S16 - 0.01
        if t_end is not None:
            d = min(d, t_end - t)
        seg.add("bass", bass_note(root * mul, d, vel), t, 0.75)


def pad_bar(seg, t, chord, dur, level=0.12, cutoff=1500.0, attack=0.25):
    seg.add("pad", pad_chord(CHORD[chord][0], dur, cutoff, attack), t, level, send=0.15)


def drone_intro(seg):
    """0-3.75: low G drone opening up; 3.75-4.0: tape-stop to nothing."""
    n = ns(4.0)
    t = tt(n)
    r = np.where(t < 3.75, 1.0, np.clip(1 - (t - 3.75) / 0.25, 0, 1) ** 1.5 * 0.85 + 0.15)
    out = np.zeros(n)
    for nm, a in (("G2", 1.0), ("D3", 0.6), ("G3", 0.45)):
        ph = 2 * np.pi * np.cumsum(hz(nm) * r) / SR
        out += a * sum(np.sin(k * ph) / k for k in range(1, 12))
    out = sweep(out, 260, 1300, "low", shape=0.8)
    amp = 0.10 + 0.08 * np.clip(t / 3.75, 0, 1)
    amp *= np.where(t < 3.75, 1.0, np.clip(1 - (t - 3.75) / 0.25, 0, 1))
    out *= amp * np.clip(t / 0.03, 0, 1)
    seg.add("pad", pan(out) * 1.0 + pan(np.roll(out, ns(0.011)), 0.6) * 0.25, 0.0, 0.9, send=0.1)
    # rising noise under the pings from 2.0
    seg.add("sfx", noise_sweep(1.75, 500, 5000, 321, 0.18, 0.8, env=lambda u: u ** 2), 2.0, 1.0)


def arrange():
    # intro 0-4: drone (the pings, flood and vacuum are cues)
    drone_intro(SEGS["intro"])

    a = SEGS["a"]
    # 4-6: near silence: a soft sub and a dark G/D pad under the typing
    a.add("bass", np.sin(2 * np.pi * hz("G1") * tt(ns(2.0))) * np.clip(tt(ns(2.0)) / 0.6, 0, 1) * 0.12, 4.0, 1.0)
    pad_bar(a, 4.0, "Gm", 2.0, 0.05, 600, 0.6)

    # 6-10: drop 1, light and half-time; the hook's first statement
    phrase(a, 3, HOOK_A, 0.76)
    phrase(a, 4, HOOK_B, 0.74)
    for bar, ch in ((3, "Gm"), (4, "Eb")):
        drums_bar(a, bar, kick_s=(0, 10), clap_s=(8,), tom_s=(0, 3, 11), bak_s=(6, 7, 14, 15), ghost=(7, 15),
                  daf_s=(2, 6, 10, 14), shk=0.6, riz=(12, 16) if bar == 4 else None, level=0.9)
        bass_bar(a, bar, ch, BASS_HALF, 0.9)
        pad_bar(a, bt(bar), ch, BAR, 0.1)

    # 10-11.875: pre-drop, filtered groove under the typing; quarter notes climbing
    tmp = Seg("tmp", 10.0, 11.875)
    drums_bar(tmp, 5, tom_s=(0, 8), bak_s=(4, 12, 14, 15), ghost=(14, 15), shk=0.7, t_end=11.875)
    gr = tmp.bus["drums"]
    for ch in range(2):
        gr[:, ch] = sweep(gr[:, ch].astype(np.float64), 450, 5000, "low", shape=1.3).astype(F32)
    a.add("drums", gr, 10.0, 1.0)
    bass_bar(a, 5, "Gm", [(0, 2, 1.0), (4, 2, 1.0), (8, 2, 1.0), (12, 2, 1.0)], 0.55, t_end=11.875)
    pad_bar(a, 10.0, "Cm", 1.0, 0.08, 900)
    pad_bar(a, 11.0, "F5", 0.875, 0.09, 1200)
    for i, nm in enumerate(("G4", "Bb4", "C5", "D5")):
        a.add("santur", santur(hz(nm), 0.5 + 0.08 * i), 10.0 + 0.5 * i, 0.85, send=0.3)

    b = SEGS["b"]
    # 12-20: drop 2 on the send
    phrase(b, 6, HOOK_A, 0.8)
    phrase(b, 7, HOOK_B, 0.78)
    phrase(b, 8, ANS_C, 0.76)
    phrase(b, 9, ANS_D, 0.74)
    for bar, ch in ((6, "Gm"), (7, "Eb"), (8, "Cm"), (9, "F5")):
        if bar < 9:
            drums_bar(b, bar, kick_s=(0, 4, 8, 12), clap_s=(4, 12), tom_s=(0, 3, 8, 11), bak_s=(2, 6, 7, 10, 14, 15),
                      ghost=(7, 15), daf_s=(2, 6, 10, 14), shk=1.0, riz=(12, 16) if bar == 7 else None)
        else:  # 18-20 publish: lighter, a roll into the photo scene
            drums_bar(b, bar, kick_s=(0, 8), clap_s=(4, 12), tom_s=(0, 3, 11), bak_s=(2, 6, 10), daf_s=(2, 6, 10),
                      shk=0.8, riz=(12, 16))
        bass_bar(b, bar, ch, BASS_DROP if bar < 9 else BASS_HALF)
        pad_bar(b, bt(bar), ch, BAR, 0.11)

    # 20-27.5: photo groove, broken afro feel; santur chaharmezrab ostinato over a G drone
    melody = [["D5", "Eb5", "D5", "C5", "Bb4", "C5", "Bb4", "Ak4"],
              ["Bb4", "C5", "D5", "Eb5", "D5", "C5", "Bb4", "C5"],
              ["D5", "Eb5", "F5", "Eb5", "D5", "C5", "Bb4", "C5"],
              ["Bb4", "Ak4", "Bb4", "C5", "Ak4", "Bb4", "Ak4", "G4"]]
    for k, (bar, ch) in enumerate(((10, "Gm"), (11, "Eb"), (12, "Cm"), (13, "F5"))):
        for s in range(16):
            t = bt(bar, s)
            if t >= 27.5:
                break
            if s % 2 == 0:
                b.add("santur", santur(hz("G4"), 0.32 if s % 4 else 0.4), t, 0.85, send=0.2)
            else:
                b.add("santur", santur(hz(melody[k][s // 2]), 0.7 * HUMAN.uniform(0.94, 1.04)), t, 0.85, send=0.25)
        drums_bar(b, bar, kick_s=(0, 7, 10), clap_s=(4, 12), tom_s=(3, 6, 11, 14), bak_s=(2, 5, 9, 13, 15), ghost=(5, 15),
                  daf_s=(2, 10), shk=0.9, t_end=27.5)
        bass_bar(b, bar, ch, BASS_PHOTO, t_end=27.5)
        pad_bar(b, bt(bar), ch, BAR if bar < 13 else 1.5, 0.11)

    # 28-33.75: breakdown, no kick: pad, daf, tremolo santur climbing into the slam
    pad_bar(b, 28.0, "Gm", 2.0, 0.17, 1800, 0.4)
    pad_bar(b, 30.0, "Eb", 2.0, 0.17, 2000, 0.4)
    pad_bar(b, 32.0, "Cm", 1.75, 0.19, 2600, 0.4)
    for t in (28.0, 30.0, 32.0):
        b.add("drums", daf_boom(0.7), t, 0.55, send=0.15)
    drums_bar(b, 15, shk=0.45)
    drums_bar(b, 16, shk=0.6, riz=(8, 14), t_end=33.75)
    for t, nm in ((28.5, "Bb4"), (28.75, "C5")):
        b.add("santur", santur(hz(nm), 0.62), t, 0.9, send=0.35)
    santur_trem(b, 29.0, hz("D5"), 1.0, 0.62, 0.35)
    for i, nm in enumerate(("Eb5", "C5", "D5", "Bb4")):
        b.add("santur", santur(hz(nm), 0.64), 30.0 + 0.25 * i, 0.9, send=0.35)
    santur_trem(b, 31.0, hz("C5"), 1.0, 0.64, 0.35)
    for i, nm in enumerate(("Ak4", "Bb4", "C5", "D5")):
        b.add("santur", santur(hz(nm), 0.66 + 0.04 * i), 32.0 + 0.25 * i, 0.9, send=0.35)
    santur_trem(b, 33.0, hz("Eb5"), 0.75, 0.55, 0.3, end_vel=0.95, ring=False)
    b.add("bass", bass_note(hz("G2"), 3.7, 0.7) * np.linspace(0.3, 1.0, ns(3.7)), 30.0, 0.6)

    c = SEGS["c"]
    # 35-36: the return: a soft forud (Bb C Ak G) after the silence
    for i, nm in enumerate(("Bb4", "C5", "Ak4", "G4")):
        c.add("santur", santur(hz(nm), 0.55 - 0.03 * i), 35.0 + 0.25 * i, 0.9, send=0.4)
    pad_bar(c, 35.0, "Gm", 1.0, 0.08, 1200, 0.3)

    # 36-44: drop 3: products, then the voice note
    phrase(c, 18, HOOK_A, 0.82)
    phrase(c, 19, HOOK_B, 0.8)
    phrase(c, 20, ANS_C, 0.76)
    phrase(c, 21, ANS_D, 0.76)
    full = dict(kick_s=(0, 4, 8, 12), clap_s=(4, 12), tom_s=(0, 3, 8, 11), bak_s=(2, 6, 7, 10, 14, 15), ghost=(7, 15),
                daf_s=(2, 6, 10, 14), shk=1.0)
    drums_bar(c, 18, **full)
    drums_bar(c, 19, **full)
    # 40.0: one beat of drum stop for the record blip, then a broken groove
    drums_bar(c, 20, kick_s=(6, 8, 11), clap_s=(12,), tom_s=(8, 11), bak_s=(6, 10, 14, 15), ghost=(15,), daf_s=(6, 10, 14),
              shk=0.9, t_from=40.5)
    drums_bar(c, 21, kick_s=(0, 6, 8, 11), clap_s=(4, 12), tom_s=(0, 3, 8, 11), bak_s=(2, 6, 10, 14), daf_s=(2, 6, 10, 14),
              shk=1.0, riz=(12, 16))
    for bar, ch in ((18, "Gm"), (19, "Eb"), (20, "Cm"), (21, "F5")):
        bass_bar(c, bar, ch, BASS_DROP, t_from=(40.5 if bar == 20 else None))
        pad_bar(c, bt(bar), ch, BAR, 0.11)

    # 44-49.5: the wall, everything; supersaw doubles the hook an octave down
    phrase(c, 22, HOOK_A, 0.86, lead_gain=0.16)
    phrase(c, 23, HOOK_B, 0.84, lead_gain=0.16)
    phrase(c, 24, HOOK_A, 0.88, lead_gain=0.17, t_end=49.5)
    for bar, ch in ((22, "Gm"), (23, "Eb"), (24, "Cm")):
        drums_bar(c, bar, kick_s=(0, 4, 8, 12, 14), clap_s=(4, 12), tom_s=(0, 3, 8, 11), bak_s=(2, 6, 7, 10, 14, 15),
                  ghost=(7,), daf_s=(2, 6, 10, 14), shk=1.1, punch=1.05, t_end=49.0 if bar == 24 else None)
        bass_bar(c, bar, ch, BASS_DROP, t_end=49.5)
        pad_bar(c, bt(bar), ch, BAR if bar < 24 else 1.5, 0.13)
    for bar in (22, 23, 24):                                        # open hats: the wall is the brightest place
        for s_ in (2, 6, 10, 14):
            t = bt(bar, s_)
            if t < 49.0:
                c.add("drums", ohat(0.9, 271 + s_), t, 0.8, p=0.3, send=0.05)
    for i, t in enumerate(np.arange(49.0, 49.5 - 1e-6, S32)):     # snare roll into the end card
        c.add("drums", clap(90 + i, 0.05), t, 0.25 + 0.05 * i, send=0.1)
    c.add("sfx", snd_swell(0.5, 129), 49.5, 0.3)

    # 50-54: end card: the hook at full energy, then the cadence home to G
    phrase(c, 25, HOOK_A, 0.88)
    drums_bar(c, 25, kick_s=(0, 4, 8, 12), clap_s=(4, 12), tom_s=(0, 3, 8, 11), bak_s=(2, 6, 10, 14),
              daf_s=(2, 6, 10, 14), shk=1.0)
    drums_bar(c, 26, kick_s=(0, 8), clap_s=(12,), tom_s=(0, 6, 11), bak_s=(3, 10, 14), daf_s=(2, 10), shk=0.7,
              riz=(12, 16))
    bass_bar(c, 25, "Gm", BASS_DROP)
    c.add("bass", bass_note(hz("Eb2"), 0.98, 0.9), 52.0, 0.75)
    c.add("bass", bass_note(hz("F2"), 0.98, 0.9), 53.0, 0.75)
    pad_bar(c, 50.0, "Gm", 2.0, 0.12)
    pad_bar(c, 52.0, "Eb", 1.0, 0.12)
    pad_bar(c, 53.0, "F5", 1.0, 0.12)
    for i, nm in enumerate(("D5", "Eb5", "D5", "C5", "Bb4", "C5")):
        c.add("santur", santur(hz(nm), 0.8 - 0.02 * i), 52.0 + 0.25 * i, 0.95, send=0.3)
    santur_trem(c, 53.5, hz("Ak4"), 0.5, 0.7, 0.3, ring=False)
    # 54.0: home. G4 tremolo, low G octave strike, the last boom; drums out
    santur_trem(c, 54.0, hz("G4"), 1.0, 0.72, 0.4, end_vel=0.45)
    c.add("santur", santur(hz("G3"), 0.85, 2.4), 54.0, 0.9, send=0.4)
    c.add("santur", santur(hz("G2"), 0.8, 2.4), 54.0, 0.8, send=0.4)
    c.add("drums", daf_boom(0.9), 54.0, 0.6, send=0.2)
    c.add("bass", bass_note(hz("G2"), 1.6, 0.9) * np.exp(-tt(ns(1.6)) / 0.6), 54.0, 0.75)
    pad_bar(c, 54.0, "Gm", 1.2, 0.1, 1400, 0.05)


# ── mix ──────────────────────────────────────────────────────────────────────
BUS_GAIN = {"kick": 1.0, "drums": 0.95, "bass": 0.85, "pad": 0.75, "santur": 0.62, "lead": 0.6, "sfx": 0.9}


def make_ir(seconds, seed=7, predelay=0.018):
    n = ns(seconds)
    t = tt(n)
    ir = np.zeros((n, 2))
    for ch in range(2):
        x = noise(n, seed + ch)
        y = (lp(x, 400) * np.exp(-6.91 * t / seconds) + bp(x, 400, 3000) * np.exp(-6.91 * t / (seconds * 0.85))
             + hp(x, 3000) * np.exp(-6.91 * t / (seconds * 0.45)))
        ir[:, ch] = y * np.clip(t / 0.012, 0, 1)
    ir = np.concatenate([np.zeros((ns(predelay), 2)), ir])
    return ir / np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True))


def duck_env(seg, depth=0.5, rel=0.16):
    n = seg.n
    idx = np.zeros(n, dtype=bool)
    for t in seg.kicks:
        i = ns(t) - seg.i0
        if 0 <= i < n:
            idx[i] = True
    pos = np.where(idx, np.arange(n), -10 ** 9)
    pos = np.maximum.accumulate(pos)
    since = (np.arange(n) - pos) / SR
    e = 1 - depth * np.exp(-since / rel) * np.clip(since / 0.004, 0, 1)
    e[pos < 0] = 1.0
    return e.astype(F32)


UI_TYPES = {"pop", "tap", "snap", "shuffle", "tick", "record", "recordStop", "copy", "success", "chime", "word",
            "send", "sparkle", "shutter", "tile", "ping"}


def cue_dip(seg, depth=0.4, rel=0.12):
    n = seg.n
    e = np.ones(n)
    tl = np.arange(n) / SR + seg.t0
    for c in TL["cues"]:
        if c["type"] not in UI_TYPES or not (seg.t0 - 0.01 <= c["t"] < seg.t0 + n / SR):
            continue
        a = ns(c["t"] - seg.t0 - 0.006)
        b_ = min(n, a + ns(0.6))
        if b_ <= max(a, 0):
            continue
        u = tl[max(a, 0):b_] - c["t"]
        d = 1 - depth * np.where(u < 0, np.clip(1 + u / 0.006, 0, 1), np.exp(-u / rel))
        e[max(a, 0):b_] = np.minimum(e[max(a, 0):b_], d)
    return e.astype(F32)


def render_segments():
    mix = np.zeros((N + ns(TAIL), 2))
    stems = {k: np.zeros((N + ns(TAIL), 2)) for k in ("drums", "santur", "sfx", "music")}
    for name, seg in SEGS.items():
        if name == "tmp":
            continue
        d = duck_env(seg)
        for bname in ("bass", "pad", "lead"):
            seg.bus[bname] *= d[:, None]
        dip = cue_dip(seg)
        for bname in ("santur", "pad", "lead"):
            seg.bus[bname] *= dip[:, None]
        ir = make_ir(seg.verb, 7 + len(name))
        wet = np.stack([signal.fftconvolve(seg.send[:, ch], ir[:, ch])[: seg.n] for ch in range(2)], axis=1) * 0.55
        dry = {k: seg.bus[k].astype(np.float64) * BUS_GAIN[k] for k in BUSES}
        gate = np.ones(seg.n)
        if seg.cut:
            k = ns(seg.t1 - seg.t0)
            f = ns(0.004)
            gate[k - f:k] = np.linspace(1, 0, f)
            gate[k:] = 0
        out = sum(dry.values()) + wet
        out = shelf(shelf(hp(out, 32), 70, -2.5, "low"), 8500, 3.0, "high")   # EQ inside the gate: no tail leaks into a stop
        out *= gate[:, None]
        i0 = seg.i0
        j = min(len(mix), i0 + seg.n)
        mix[i0:j] += out[: j - i0]
        stems["drums"][i0:j] += ((dry["kick"] + dry["drums"]) * gate[:, None])[: j - i0]
        stems["santur"][i0:j] += (dry["santur"] * gate[:, None])[: j - i0]
        stems["sfx"][i0:j] += (dry["sfx"] * gate[:, None])[: j - i0]
        if name != "x":
            stems["music"][i0:j] += out[: j - i0]
    return mix[:N], {k: v[:N] for k, v in stems.items()}


def shelf(x, f, gain_db, kind):
    """RBJ shelving biquad, both channels."""
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f / SR
    alpha = np.sin(w0) / 2 * np.sqrt(2)
    cw = np.cos(w0)
    if kind == "low":
        b = [A * ((A + 1) - (A - 1) * cw + 2 * np.sqrt(A) * alpha), 2 * A * ((A - 1) - (A + 1) * cw),
             A * ((A + 1) - (A - 1) * cw - 2 * np.sqrt(A) * alpha)]
        a = [(A + 1) + (A - 1) * cw + 2 * np.sqrt(A) * alpha, -2 * ((A - 1) + (A + 1) * cw),
             (A + 1) + (A - 1) * cw - 2 * np.sqrt(A) * alpha]
    else:
        b = [A * ((A + 1) + (A - 1) * cw + 2 * np.sqrt(A) * alpha), -2 * A * ((A - 1) + (A + 1) * cw),
             A * ((A + 1) + (A - 1) * cw - 2 * np.sqrt(A) * alpha)]
        a = [(A + 1) - (A - 1) * cw + 2 * np.sqrt(A) * alpha, 2 * ((A - 1) - (A + 1) * cw),
             (A + 1) - (A - 1) * cw - 2 * np.sqrt(A) * alpha]
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


def glue(x, thr_db=-18.0, ratio=2.0, win=0.05):
    m = np.mean(x ** 2, axis=1)
    rms = np.sqrt(uniform_filter1d(m, ns(win)) + 1e-12)
    lvl = 20 * np.log10(rms)
    over = np.maximum(lvl - thr_db, 0)
    g_db = -over * (1 - 1 / ratio)
    g_db = uniform_filter1d(g_db, ns(0.03))
    return x * (10 ** (g_db / 20))[:, None]


def limiter(x, ceiling_db, look=0.002):
    c = 10 ** (ceiling_db / 20)
    a = np.max(np.abs(x), axis=1)
    L = ns(look)
    from scipy.ndimage import maximum_filter1d
    pk = maximum_filter1d(a, size=2 * L + 1)
    g = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    g = uniform_filter1d(g, L + 1)
    g = np.minimum(g, np.minimum(1.0, c / np.maximum(a, 1e-9)))  # hard guarantee on the sample
    return x * g[:, None]


def true_peak_db(x):
    up = signal.resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)


def master(mix):
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    x = glue(mix)
    # the loop point: fade from 55.55 to 55.90, nothing from 55.95
    t = tt(N)
    fade = np.clip((55.90 - t) / 0.35, 0, 1) ** 2
    x *= fade[:, None]
    gain_db = 0.0
    ceiling = -1.8
    for _ in range(14):
        y = limiter(x * 10 ** (gain_db / 20), ceiling)
        lufs = meter.integrated_loudness(y)
        tp = true_peak_db(y)
        if -1.75 <= tp <= -1.55 and abs(lufs + 14.0) < 0.05:
            break
        if not (-1.75 <= tp <= -1.55):
            ceiling = min(-1.0, ceiling + (-1.65 - tp))
        gain_db += -14.0 - lufs
    y[t >= 55.95] = 0.0
    return y, meter.integrated_loudness(y), true_peak_db(y), gain_db, ceiling


def write_wav24(path, x):
    d = np.clip(x, -1, 1)
    dz = (np.random.default_rng(9).random(d.shape) - np.random.default_rng(10).random(d.shape)) / (2 ** 23)
    d = np.where(d != 0, d + dz, 0.0)
    q = np.clip(np.round(d * 8388607), -8388608, 8388607).astype("<i4")
    b = q.reshape(-1).view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(b)


# ── QA ───────────────────────────────────────────────────────────────────────
def frame_rms(x):
    m = np.mean(np.atleast_2d(x.T).T ** 2, axis=1) if x.ndim == 2 else x ** 2
    hop = SR // FPS
    nf = int(round(DUR * FPS))
    m = m[: nf * hop].reshape(nf, hop)
    return np.sqrt(m.mean(axis=1))


def stem_onset(x, t, win=0.015):
    """Onset of the cue sound in the isolated cue stem: largest 0.5 ms energy rise within +-win."""
    i0 = max(0, ns(t - win - 0.01))
    seg = hp(x[i0:ns(t + win + 0.01)].astype(np.float64), 300)
    hop = ns(0.0005)
    m = len(seg) // hop
    e = (seg[: m * hop] ** 2).reshape(m, hop).mean(axis=1)
    c = np.concatenate([[0.0], np.cumsum(e)])
    w6 = 6
    lo, hi = max(w6, ns(0.01) // hop), min(m - w6, m - ns(0.01) // hop)
    ks = np.arange(lo, hi)
    after = (c[ks + w6] - c[ks]) / w6
    before = (c[ks] - c[ks - w6]) / w6
    d = 10 * np.log10((after + 1e-16) / (before + 1e-16))
    k = int(ks[int(np.argmax(d))])
    return ((i0 + k * hop) / SR - t) * 1000


def xcorr_lag(stem, t, max_lag=0.02):
    """Lag (ms) at which the cue's own sound best matches the cue stem around t."""
    ref = QA_PLACED.get(round(t, 4))
    if ref is None or not np.any(ref):
        return None
    L = ns(max_lag)
    a = max(0, ns(t) - L)
    w = stem[a:ns(t) + L + len(ref)].astype(np.float64)
    cc = signal.correlate(w, ref, mode="valid")
    k = int(np.argmax(np.abs(cc)))
    return ((a + k) - ns(t)) / SR * 1000


def cue_to_music(cue, music, t, dur=0.04):
    """Energy of the cue sound over the music in 500 Hz-8 kHz, first 40 ms after the cue (dB)."""
    a, b_ = ns(t), ns(t + dur)
    sos = butter("band", (500, 8000), 2)
    pre = ns(0.02)
    cu = signal.sosfilt(sos, cue[max(0, a - pre):b_].astype(np.float64))[pre:]
    mu = signal.sosfilt(sos, music[max(0, a - pre):b_])[pre:]
    return 10 * np.log10((np.mean(cu ** 2) + 1e-16) / (np.mean(mu ** 2) + 1e-16))


def rise_at(x, t):
    """dB jump of >1.5 kHz energy exactly at t: [t, t+6 ms] against [t-10 ms, t-2 ms]."""
    i0 = max(0, ns(t - 0.05))
    seg = hp(x[i0:ns(t + 0.02)], 1500)
    o = ns(t) - i0
    after = np.mean(seg[o:o + ns(0.006)] ** 2)
    before = np.mean(seg[max(0, o - ns(0.010)):max(1, o - ns(0.002))] ** 2) if o > ns(0.002) else 0.0
    return 10 * np.log10((after + 1e-16) / (before + 1e-16))


def santur_pitch(name):
    s = santur(hz(name), 0.8, 2.2).mean(axis=1)
    w = s[ns(0.1):ns(0.6)] * np.hanning(ns(0.5))
    nfft = 1 << 21
    sp = np.abs(np.fft.rfft(w, nfft))
    fr = np.fft.rfftfreq(nfft, 1 / SR)
    f0 = hz(name)
    band = (fr > f0 * 0.9) & (fr < f0 * 1.1)
    i = np.argmax(np.where(band, sp, 0))
    a, b, c = np.log(sp[i - 1:i + 2] + 1e-12)
    p = 0.5 * (a - c) / (a - 2 * b + c)
    f = fr[i] + p * (fr[1] - fr[0])
    return f, f0


def spectrogram(y, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    mono = y.mean(axis=1)
    f, t, Z = signal.stft(mono, SR, nperseg=2048, noverlap=1536)
    mag = 20 * np.log10(np.abs(Z) + 1e-9)
    logf = np.geomspace(35, 16000, 320)
    img = np.empty((len(logf), mag.shape[1]))
    for j in range(mag.shape[1]):
        img[:, j] = np.interp(logf, f, mag[:, j])
    fig, (ax0, ax1) = plt.subplots(2, 1, figsize=(30, 10), dpi=72, gridspec_kw={"height_ratios": [1, 3]}, sharex=True)
    tf = np.arange(int(DUR * FPS)) / FPS
    for k, col in (("mix", "white"), ("drums", "orange"), ("santur", "cyan"), ("sfx", "magenta")):
        ax0.plot(tf, 20 * np.log10(QA_STEMS[k] + 1e-6), color=col, lw=0.8, label=k)
    ax0.set_facecolor("#111")
    ax0.set_ylim(-70, 0)
    ax0.legend(loc="upper left", ncol=4, fontsize=9)
    ax0.set_ylabel("RMS dBFS")
    ax1.imshow(img, origin="lower", aspect="auto", extent=[0, DUR, 0, len(logf)], cmap="magma",
               vmin=mag.max() - 90, vmax=mag.max())
    ticks = [50, 100, 200, 500, 1000, 2000, 5000, 10000]
    ax1.set_yticks([np.searchsorted(logf, v) for v in ticks])
    ax1.set_yticklabels([str(v) for v in ticks])
    for c in TL["cues"]:
        ax1.axvline(c["t"], color="cyan", lw=0.5, alpha=0.45)
    for s in TL["sections"]:
        for ax in (ax0, ax1):
            ax.axvline(s["start"], color="white", lw=0.9, alpha=0.8)
        ax1.text(s["start"] + 0.05, len(logf) - 8, s["id"], color="white", fontsize=9, va="top", rotation=90)
    ax1.set_xticks(np.arange(0, DUR + 0.01, 2))
    ax1.set_xlabel("seconds (bars of 2 s)")
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


def santur_roll(santur_stem, path, spans=((6.0, 10.0), (44.0, 50.0), (50.0, 55.0))):
    """Santur stem around the hook, with the written notes overlaid: does the melody land where written?"""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    written = []
    for bar, ph in ((3, HOOK_A), (4, HOOK_B), (22, HOOK_A), (23, HOOK_B), (24, HOOK_A), (25, HOOK_A)):
        for it in ph:
            written.append((bt(bar, it[0]), it[2] * S16, hz(it[1])))
    for i, nm in enumerate(("D5", "Eb5", "D5", "C5", "Bb4", "C5")):
        written.append((52.0 + 0.25 * i, 0.25, hz(nm)))
    written += [(53.5, 0.5, hz("Ak4")), (54.0, 1.0, hz("G4"))]
    mono = santur_stem.mean(axis=1)
    fig, axs = plt.subplots(1, len(spans), figsize=(24, 6), dpi=72)
    for ax, (a, b_) in zip(axs, spans):
        f, t, Z = signal.stft(mono[ns(a):ns(b_)], SR, nperseg=8192, noverlap=8192 - 256)
        sel = (f > 330) & (f < 700)
        ax.imshow(20 * np.log10(np.abs(Z[sel]) + 1e-9), origin="lower", aspect="auto", cmap="magma",
                  extent=[a, b_, f[sel][0], f[sel][-1]], vmin=-90, vmax=-10)
        for t0, d, fr in written:
            if a <= t0 < b_:
                ax.plot([t0, t0 + d], [fr, fr], color="cyan", lw=1.2, alpha=0.8)
        for nm in ("G4", "Ak4", "Bb4", "C5", "D5", "Eb5", "F5"):
            ax.axhline(hz(nm), color="white", lw=0.3, alpha=0.3)
            ax.text(a + 0.02, hz(nm) + 2, nm, color="white", fontsize=8)
        ax.set_title(f"santur {a:.0f}-{b_:.0f} s (cyan = written)")
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


QA_STEMS = {}


def main():
    place_cues()
    arrange()
    mix, stems = render_segments()
    y, lufs, tp, gain_db, ceiling = master(mix)
    g = 10 ** (gain_db / 20)
    write_wav24(os.path.join(HERE, "score.wav"), y)

    # envelope.json for the picture
    env = {}
    for k, x in (("mix", y), ("drums", stems["drums"] * g), ("santur", stems["santur"] * g)):
        r = frame_rms(x)
        QA_STEMS[k] = r
        ref = np.percentile(r, 99.5) + 1e-9
        env[k] = [round(float(v), 3) for v in np.clip(r / ref, 0, 1)]
    QA_STEMS["sfx"] = frame_rms(stems["sfx"] * g)
    json.dump({"fps": FPS, "frames": len(env["mix"]), **env}, open(os.path.join(HERE, "envelope.json"), "w"))

    spectrogram(y, os.path.join(QA, "spectrogram.png"))
    santur_roll(stems["santur"], os.path.join(QA, "santur.png"))

    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    mono = y.mean(axis=1)
    music_mono = (stems["music"] * g).mean(axis=1) - (stems["sfx"] * g).mean(axis=1)
    lines = []
    w = lines.append
    w("Appito teaser score: QA")
    w(f"file: music/score.wav  {SR} Hz 24-bit stereo, {len(y)} frames = {len(y) / SR:.4f} s")
    w(f"integrated loudness: {lufs:.2f} LUFS (target -14.0)")
    w(f"true peak (4x oversampled): {tp:.2f} dBTP (limit -1.5)")
    w(f"sample peak: {20 * np.log10(np.max(np.abs(y))):.2f} dBFS; DC: {np.mean(y, axis=0)}")
    w(f"master gain {gain_db:+.2f} dB, limiter ceiling {ceiling:.2f} dBFS")
    w("")
    w("per section: integrated LUFS (if >= 0.4 s) | RMS dBFS | peak dBFS")
    for s in TL["sections"]:
        a, b_ = ns(s["start"]), ns(s["end"])
        part = y[a:b_]
        li = meter.integrated_loudness(part) if (b_ - a) >= ns(0.4) else float("nan")
        rms = 20 * np.log10(np.sqrt(np.mean(part ** 2)) + 1e-12)
        pk = 20 * np.log10(np.max(np.abs(part)) + 1e-12)
        w(f"  {s['id']:14s} {s['start']:6.3f}-{s['end']:6.3f}  {li:7.2f} LUFS  {rms:7.2f}  {pk:7.2f}   (energy {s['energy']})")
    w("")
    w("stops (should be digital silence apart from what the timeline names):")
    for a, b_, what in ((11.876, 11.999, "stop before drop 2"), (34.0, 35.0, "the «بله.» silence: music only")):
        part = (stems["music"][ns(a):ns(b_)] * g) if a == 34.0 else y[ns(a):ns(b_)]
        pk = np.max(np.abs(part))
        w(f"  {a:.3f}-{b_:.3f} {what}: peak {20 * np.log10(pk + 1e-15):.1f} dBFS")
    pk = np.max(np.abs(y[ns(55.95):]))
    w(f"  55.950-56.000 loop point: peak {20 * np.log10(pk + 1e-15):.1f} dBFS")
    pk = np.max(np.abs(y[ns(34.0):ns(35.0)]))
    w(f"  34.000-35.000 full mix (slam tail + tick): peak {20 * np.log10(pk + 1e-15):.1f} dBFS")
    w("")
    w("santur pitch (FFT of an isolated note):")
    for nm in ("G4", "Ak4", "Bb4", "D5"):
        f, f0 = santur_pitch(nm)
        w(f"  {nm:4s} measured {f:8.2f} Hz  expected {f0:8.2f} Hz  ({1200 * np.log2(f / f0):+.2f} cents)")
    w("")
    w("cues: placed = cross-correlation lag of the cue's own sound in the cue stem (exact placement);")
    w("onset = largest 3 ms-vs-3 ms energy rise in the cue stem within +-15 ms (attack check, overlaps can fool it);")
    w("mix jump = >1.5 kHz energy jump exactly at the cue in the final mix; cue/music = cue energy over the")
    w("music's (500 Hz-8 kHz, first 40 ms; pre-master): above -6 dB reads clearly.")
    continuous = {"flood", "vacuum", "swell", "whoosh", "typing", "riser", "stop", "silence", "end", "scan", "buzz", "pulse"}
    worst = 0.0
    for c in TL["cues"]:
        t, ty = c["t"], c["type"]
        if ty in continuous:
            extra = ""
            if ty in ("stop", "silence"):
                extra = "(gated silence, see above)"
            w(f"  {t:8.4f} {ty:10s} continuous {extra}")
            continue
        lag = xcorr_lag(QA_CUE, t)
        fs_ = stem_onset(QA_CUE, t) if t > 0.03 else 0.0
        r = rise_at(mono, t)
        cm = cue_to_music(QA_CUE * g, music_mono, t)
        flag = "  <-- OFF GRID" if (lag is None or abs(lag) > 10) else ("  (quiet against the music)" if cm < -6 else "")
        worst = max(worst, abs(lag) if lag is not None else 99)
        w(f"  {t:8.4f} {ty:10s} placed {lag:+6.2f} ms | onset {fs_:+6.2f} ms | mix jump {r:+6.1f} dB | cue/music {cm:+6.1f} dB{flag}")
    w(f"worst placement lag: {worst:.2f} ms (tolerance 10 ms)")
    w("")
    w(f"render time: {time.time() - T_START:.1f} s")
    open(os.path.join(QA, "report.txt"), "w").write("\n".join(lines) + "\n")
    print("\n".join(lines[:8]))
    print(f"done in {time.time() - T_START:.1f} s")


if __name__ == "__main__":
    main()
