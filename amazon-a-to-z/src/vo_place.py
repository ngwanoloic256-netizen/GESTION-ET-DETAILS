"""Split the chosen VO take at its pauses and place each line at its scripted start time."""
import subprocess, sys, numpy as np, wave
SR = 48000
LINES = [("Anything you can think of…", 0.50), ("…is one search away.", 2.67), ("One tap…", 5.40),
         ("and it's already on its way.", 6.60), ("Right to your door.", 11.20), ("Everything you love…", 13.50),
         ("from A to Z.", 15.10), ("Amazon.", 17.50)]
TOTAL = 21.2
src, out = sys.argv[1], sys.argv[2]
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, np.float32).copy()
# energy envelope (10 ms), find speech runs separated by >= 0.25 s of silence
hop = SR // 100
env = np.sqrt(np.convolve(x**2, np.ones(hop)/hop, "same"))[::hop]
on = env > 10 ** (-40 / 20)
runs, i = [], 0
while i < len(on):
    if on[i]:
        j = i
        while j < len(on) and (on[j] or on[j:j+25].any()): j += 1
        runs.append((i, j)); i = j
    else: i += 1
runs = [r for r in runs if r[1] - r[0] > 15]
print(len(runs), "segments:", [(round(a/100, 2), round(b/100, 2)) for a, b in runs])
assert len(runs) == len(LINES), "segment count does not match the script"
mix = np.zeros(int(TOTAL * SR), np.float32)
for (a, b), (txt, t) in zip(runs, LINES):
    a0, b0 = max(0, a*hop - int(0.04*SR)), min(len(x), b*hop + int(0.08*SR))
    seg = x[a0:b0].copy(); f = int(0.01*SR); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
    s = int((t - 0.04) * SR); mix[s:s+len(seg)] += seg[:len(mix)-s]
    print(f"{t:6.2f}–{t+len(seg)/SR-0.04:6.2f}  {txt}")
with wave.open(out, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
