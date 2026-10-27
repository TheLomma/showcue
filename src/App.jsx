import { useState, useRef, useEffect } from "react";

const VERSION = "2.1.0";

const uid = () => Math.random().toString(36).slice(2, 9);

const fmt = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
};

const parseYT = (url) => {
  const m = (url || "").match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

const ACTIONS = [
  { id: "next", label: "Vorauswahl: nächster Cue" },
  { id: "prev", label: "Vorauswahl: vorheriger Cue" },
  { id: "go", label: "Ausgewählten Cue abspielen (GO)" },
  { id: "pause", label: "Pause / Weiter" },
  { id: "stop", label: "Stille" },
  { id: "emergency", label: "NOT-STOPP (alles sofort aus)" },
  { id: "duck", label: "Ansage: Musik absenken (Ducking)" },
  { id: "mark", label: "Sprungmarke setzen" },
  { id: "timer", label: "Timer starten / pausieren" },
  { id: "applause", label: "Effekt: Applaus" },
  { id: "drum", label: "Effekt: Trommelwirbel" },
  { id: "bell", label: "Effekt: Glocke" },
  { id: "view", label: "Ansicht wechseln" },
  { id: "seekBack", label: "10 Sekunden zurückspringen" },
  { id: "seekFwd", label: "10 Sekunden vorspulen" },
];

const DEFAULT_KEYMAP = {
  AudioVolumeUp: "next",
  AudioVolumeDown: "prev",
  MediaTrackNext: "next",
  MediaTrackPrevious: "prev",
  ArrowUp: "next",
  ArrowDown: "prev",
  Enter: "go",
  " ": "pause",
  MediaPlayPause: "pause",
  Escape: "emergency",
  s: "stop",
  d: "duck",
  m: "mark",
  t: "timer",
  "1": "applause",
  "2": "drum",
  "3": "bell",
  v: "view",
  j: "seekBack",
  l: "seekFwd",
};

const DEFAULT_SETTINGS = {
  theme: "buehne",
  signal: true,
  targetMin: 60,
  defaultFade: 2,
  defaultVol: 0.9,
  outputId: "",
};

const THEMES = [
  { id: "buehne", label: "Bühne (dunkel, Gold)" },
  { id: "hell", label: "Hell (Papier)" },
  { id: "neon", label: "Neon (Magie, Violett)" },
];

const THEME_CSS = `
.theme-hell .bg-zinc-950{background-color:#f4f1ea!important}
.theme-hell .bg-zinc-900{background-color:#ffffff!important}
.theme-hell .bg-zinc-800{background-color:#e9e4d8!important}
.theme-hell .hover\\:bg-zinc-700:hover{background-color:#d9d2c3!important}
.theme-hell .hover\\:bg-zinc-800:hover{background-color:#ece7db!important}
.theme-hell .text-zinc-100,.theme-hell .text-zinc-300{color:#1c1917!important}
.theme-hell .text-zinc-400{color:#57534e!important}
.theme-hell .text-zinc-500,.theme-hell .text-zinc-600{color:#6b6459!important}
.theme-hell .border-zinc-800,.theme-hell .border-zinc-700{border-color:#d6d0c4!important}
.theme-neon .bg-zinc-950{background-color:#0c0717!important}
.theme-neon .bg-zinc-900{background-color:#161028!important}
.theme-neon .bg-zinc-800{background-color:#261c44!important}
.theme-neon .hover\\:bg-zinc-700:hover{background-color:#352859!important}
.theme-neon .hover\\:bg-zinc-800:hover{background-color:#2e2250!important}
.theme-neon .text-zinc-100,.theme-neon .text-zinc-300{color:#f5f3ff!important}
.theme-neon .text-zinc-400{color:#c4b5fd!important}
.theme-neon .text-zinc-500,.theme-neon .text-zinc-600{color:#a78bfa!important}
.theme-neon .border-zinc-800,.theme-neon .border-zinc-700{border-color:#3b2a66!important}
.theme-neon .bg-amber-400{background-color:#e879f9!important}
.theme-neon .hover\\:bg-amber-300:hover{background-color:#f0abfc!important}
.theme-neon .text-amber-400{color:#67e8f9!important}
.theme-neon .border-amber-400{border-color:#67e8f9!important}
.theme-neon .accent-amber-400{accent-color:#e879f9}
@keyframes sc-flash{0%{opacity:.95}100%{opacity:0}}
`;

const btn =
  "rounded-xl bg-zinc-800 py-3 text-sm font-medium hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400";

const gestureOf = (k) => {
  const i = k.indexOf("#");
  return i < 0 ? "tap" : k.slice(i + 1);
};

const baseOf = (k) => {
  const i = k.indexOf("#");
  return i < 0 ? k : k.slice(0, i);
};

const keyLabel = (k) => {
  if (k.includes("#")) return `${keyLabel(baseOf(k))} (${gestureOf(k) === "double" ? "Doppeltipp" : "Halten"})`;
  const names = {
    " ": "Leertaste",
    AudioVolumeUp: "Lautstärke +",
    AudioVolumeDown: "Lautstärke -",
    MediaPlayPause: "Play/Pause",
    MediaTrackNext: "Nächster Titel",
    MediaTrackPrevious: "Vorheriger Titel",
    ArrowUp: "Pfeil hoch",
    ArrowDown: "Pfeil runter",
    Enter: "Enter",
    Escape: "Esc",
  };
  if (names[k]) return names[k];
  if (k.startsWith("code:")) return `Taste ${k.slice(5)}`;
  return k.length === 1 ? k.toUpperCase() : k;
};

const keyOf = (e) => (!e.key || e.key === "Unidentified" ? `code:${e.keyCode}` : e.key);

const demoWav = (name, kind) => {
  const sr = 22050;
  const secs = 24;
  const n = sr * secs;
  const chordLen = 6;
  const progs = {
    mystery: [[220, 261.6, 329.6], [207.7, 246.9, 311.1], [174.6, 207.7, 261.6], [196, 246.9, 293.7]],
    happy: [[261.6, 329.6, 392], [349.2, 440, 523.3], [392, 493.9, 587.3], [293.7, 370, 440]],
    tension: [[146.8, 174.6, 220], [138.6, 164.8, 207.7], [116.5, 146.8, 174.6], [123.5, 155.6, 185]],
  };
  const prog = progs[kind];
  const samples = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const ci = Math.floor(t / chordLen) % prog.length;
    const tl = t % chordLen;
    const env = Math.min(1, tl / 0.8) * Math.min(1, (chordLen - tl) / 0.8);
    let s = 0;
    for (const f of prog[ci]) s += Math.sin(2 * Math.PI * f * t);
    s = (s / prog[ci].length) * env * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.25 * t));
    samples[i] = Math.round(s * 0.5 * 32767);
  }
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, str) => {
    for (let k = 0; k < str.length; k++) v.setUint8(o + k, str.charCodeAt(k));
  };
  w(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, samples[i], true);
  return new File([new Blob([buf], { type: "audio/wav" })], `${name}.wav`, { type: "audio/wav" });
};

export default function App() {
  const [view, setView] = useState("show");
  const [cues, setCues] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [pausedId, setPausedId] = useState(null);
  const [lastId, setLastId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [masterVol, setMasterVol] = useState(0.8);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [scrub, setScrub] = useState(null);
  const [status, setStatus] = useState("Bereit. Lade Musik hoch, nutze den Demo-Modus oder füge YouTube-Links hinzu.");
  const [ytUrl, setYtUrl] = useState("");
  const [keymap, setKeymap] = useState(DEFAULT_KEYMAP);
  const [learning, setLearning] = useState(null);
  const [timer, setTimer] = useState({ total: 600, left: 600, running: false, done: false });
  const [duck, setDuck] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [devices, setDevices] = useState([]);
  const [previewId, setPreviewId] = useState(null);

  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const fxRef = useRef(null);
  const noiseRef = useRef(null);
  const playersRef = useRef({});
  const ytRef = useRef({});
  const ytFadeRef = useRef({});
  const previewRef = useRef(null);
  const cuesRef = useRef(cues);
  const activeRef = useRef(null);
  const keymapRef = useRef(keymap);
  const learningRef = useRef(learning);
  const runRef = useRef(null);
  const timersRef = useRef([]);
  const playingRef = useRef(null);
  const tapRef = useRef({});
  cuesRef.current = cues;
  activeRef.current = activeId || pausedId;
  keymapRef.current = keymap;
  learningRef.current = learning;
  playingRef.current = activeId;

  const nextIdx = cues.findIndex((c) => c.id === lastId);
  const nextCue = cues[nextIdx + 1] ?? (nextIdx === -1 ? cues[0] : undefined);
  const selCue = cues.find((c) => c.id === selectedId) ?? nextCue;
  const shownCue = cues.find((c) => c.id === (activeId || pausedId));
  const duration = shownCue ? shownCue.duration || 0 : 0;
  const totalRuntime = cues.reduce((sum, c) => sum + (c.duration || 0), 0);
  const targetSec = settings.targetMin * 60;
  const diffSec = totalRuntime - targetSec;
  const markCue = shownCue || selCue;

  // ---------- Audio engine ----------
  const getCtx = () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      const fx = ctx.createGain();
      fx.gain.value = 0.9;
      fx.connect(master);
      const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      ctxRef.current = ctx;
      masterRef.current = master;
      fxRef.current = fx;
      noiseRef.current = noise;
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const levelOf = (c) => c.volume * masterVol * (duck ? 0.25 : 1);

  useEffect(() => {
    const ctx = ctxRef.current;
    const f = duck ? 0.25 : 1;
    if (ctx && masterRef.current) {
      masterRef.current.gain.setTargetAtTime(masterVol * f, ctx.currentTime, 0.05);
    }
    const aid = activeRef.current;
    const c = cuesRef.current.find((x) => x.id === aid);
    if (c && c.type === "youtube" && ytRef.current[aid]) {
      try {
        ytRef.current[aid].setVolume(Math.round(c.volume * masterVol * f * 100));
      } catch (e) {}
    }
  }, [masterVol, duck]);

  const registerCue = (cue) => {
    const audio = new Audio(cue.url);
    audio.preload = "auto";
    audio.loop = !!cue.loop;
    audio.onloadedmetadata = () => {
      setCues((prev) => prev.map((c) => (c.id === cue.id ? { ...c, duration: audio.duration } : c)));
    };
    audio.onended = () => {
      setActiveId((prev) => (prev === cue.id ? null : prev));
      if (!audio.loop) followNext(cue.id);
    };
    playersRef.current[cue.id] = { audio, gain: null, source: null, token: 0 };
  };

  const getPlayer = (cue) => {
    const p = playersRef.current[cue.id];
    if (!p) return null;
    if (!p.gain) {
      const ctx = getCtx();
      p.source = ctx.createMediaElementSource(p.audio);
      p.gain = ctx.createGain();
      p.gain.gain.value = 0;
      p.source.connect(p.gain);
      p.gain.connect(masterRef.current);
    }
    return p;
  };

  // ---------- YouTube ----------
  const loadYT = () =>
    new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        resolve(window.YT);
      };
      if (!document.getElementById("yt-api")) {
        const s = document.createElement("script");
        s.id = "yt-api";
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
    });

  const destroyYT = (id) => {
    clearInterval(ytFadeRef.current[id]);
    if (ytRef.current[id]) {
      try {
        ytRef.current[id].destroy();
      } catch (e) {}
      delete ytRef.current[id];
    }
  };

  const rampYT = (id, target, dur, done) => {
    const yp = ytRef.current[id];
    if (!yp || !yp.setVolume) return;
    clearInterval(ytFadeRef.current[id]);
    const start = yp.getVolume ? yp.getVolume() : 0;
    const tgt = target * 100;
    const steps = Math.max(1, Math.round(dur * 20));
    let i = 0;
    ytFadeRef.current[id] = setInterval(() => {
      i++;
      const v = start + (tgt - start) * (i / steps);
      yp.setVolume(Math.round(Math.max(0, Math.min(100, v))));
      if (i >= steps) {
        clearInterval(ytFadeRef.current[id]);
        if (done) done();
      }
    }, 50);
  };

  const fadeOut = (id, dur) => {
    const fc = cuesRef.current.find((c) => c.id === id);
    if (fc && fc.type === "youtube") {
      rampYT(id, 0, dur, () => {
        const yp = ytRef.current[id];
        if (yp) yp.pauseVideo();
      });
      return;
    }
    const p = playersRef.current[id];
    if (!p || !p.gain || !ctxRef.current) return;
    const now = ctxRef.current.currentTime;
    const token = ++p.token;
    const current = p.gain.gain.value;
    p.gain.gain.cancelScheduledValues(now);
    p.gain.gain.setValueAtTime(current, now);
    p.gain.gain.linearRampToValueAtTime(0, now + Math.max(0.05, dur));
    setTimeout(() => {
      if (p.token === token) p.audio.pause();
    }, Math.max(50, dur * 1000 + 50));
  };

  const playYT = async (cue, { resume = false } = {}) => {
    if (!cue.videoId) {
      setStatus(`Kein YouTube-Link bei „${cue.title}“.`);
      return;
    }
    if (playingRef.current && playingRef.current !== cue.id) {
      const out = cuesRef.current.find((c) => c.id === playingRef.current);
      fadeOut(playingRef.current, out ? out.fadeOut : 1);
    }
    let yt;
    try {
      yt = await Promise.race([
        loadYT(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
      ]);
    } catch (err) {
      setStatus("YouTube konnte nicht geladen werden. Prüfe die Internetverbindung.");
      return;
    }
    if (!ytRef.current[cue.id]) {
      await new Promise((resolve) => {
        const player = new yt.Player(`yt-${cue.id}`, {
          videoId: cue.videoId,
          width: 2,
          height: 2,
          playerVars: { playsinline: 1, controls: 0, rel: 0 },
          events: {
            onError: (e) => {
              destroyYT(cue.id);
              setStatus(`YouTube-Video nicht abspielbar (Code ${e.data}). Anderen Link wählen.`);
              resolve();
            },
            onReady: () => resolve(),
            onStateChange: (e) => {
              if (e.data !== 0) return;
              const c = cuesRef.current.find((x) => x.id === cue.id);
              if (c && c.loop && ytRef.current[cue.id]) {
                ytRef.current[cue.id].seekTo(0, true);
                ytRef.current[cue.id].playVideo();
              } else {
                setActiveId((prev) => (prev === cue.id ? null : prev));
                followNext(cue.id);
              }
            },
          },
        });
        ytRef.current[cue.id] = player;
      });
    }
    const yp = ytRef.current[cue.id];
    if (!yp) return;
    if (!resume) yp.seekTo(0, true);
    yp.setVolume(0);
    yp.playVideo();
    rampYT(cue.id, levelOf(cue), cue.fadeIn);
    setActiveId(cue.id);
    setPausedId(null);
    setLastId(cue.id);
    setStatus(`Läuft: ${cue.title}`);
  };

  // ---------- Playback ----------
  const signal = () => {
    if (settings.signal) setFlashKey((k) => k + 1);
  };

  const playCue = (cue, { resume = false } = {}) => {
    setSelectedId(null);
    signal();
    if (cue.type === "youtube") return playYT(cue, { resume });
    if (!cue.url) {
      setStatus(`Datei fehlt bei „${cue.title}“. Bitte unter „Bearbeiten“ neu zuordnen.`);
      return;
    }
    const ctx = getCtx();
    const p = getPlayer(cue);
    if (!p) {
      setStatus(`Datei für „${cue.title}“ nicht verfügbar.`);
      return;
    }
    const now = ctx.currentTime;
    if (playingRef.current && playingRef.current !== cue.id) {
      const out = cuesRef.current.find((c) => c.id === playingRef.current);
      fadeOut(playingRef.current, out ? out.fadeOut : 1);
    }
    p.token++;
    if (!resume) p.audio.currentTime = 0;
    const from = resume ? p.gain.gain.value : 0;
    p.gain.gain.cancelScheduledValues(now);
    p.gain.gain.setValueAtTime(from, now);
    p.gain.gain.linearRampToValueAtTime(cue.volume, now + Math.max(0.05, cue.fadeIn));
    p.audio.play().catch(() => setStatus("Wiedergabe blockiert. Bitte erneut tippen."));
    setActiveId(cue.id);
    setPausedId(null);
    setLastId(cue.id);
    setStatus(`Läuft: ${cue.title}`);
  };

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const startWithWait = (cue) => {
    const w = Number(cue.preWait) || 0;
    if (w <= 0) return playCue(cue);
    setStatus(`Startet in ${w} s: ${cue.title}`);
    const t = setTimeout(() => {
      const fresh = cuesRef.current.find((c) => c.id === cue.id);
      if (fresh) playCue(fresh);
    }, w * 1000);
    timersRef.current.push(t);
  };

  const startCueWithChain = (cue) => {
    startWithWait(cue);
    (cue.chain || []).forEach((link) => {
      const t = setTimeout(() => {
        const fresh = cuesRef.current.find((c) => c.id === link.id);
        if (fresh) startWithWait(fresh);
      }, (Number(link.delay) || 0) * 1000);
      timersRef.current.push(t);
    });
  };

  const followNext = (id) => {
    const list = cuesRef.current;
    const i = list.findIndex((c) => c.id === id);
    const c = list[i];
    if (!c || !c.autoFollow) return;
    const next = list[i + 1];
    if (next) startWithWait(next);
  };

  const togglePause = () => {
    if (activeId) {
      fadeOut(activeId, 0.6);
      setPausedId(activeId);
      setActiveId(null);
      setStatus("Pausiert.");
    } else if (pausedId) {
      const c = cuesRef.current.find((x) => x.id === pausedId);
      if (c) playCue(c, { resume: true });
    } else {
      goSelected();
    }
  };

  const stopMusic = (dur = 1.5) => {
    clearTimers();
    if (activeId) fadeOut(activeId, dur);
    setActiveId(null);
    setPausedId(null);
    setStatus("Stille.");
  };

  const emergency = () => {
    clearTimers();
    const now = ctxRef.current ? ctxRef.current.currentTime : 0;
    Object.keys(playersRef.current).forEach((id) => {
      const p = playersRef.current[id];
      p.token++;
      p.audio.pause();
      if (p.gain && ctxRef.current) {
        p.gain.gain.cancelScheduledValues(now);
        p.gain.gain.setValueAtTime(0, now);
      }
    });
    Object.keys(ytRef.current).forEach((id) => {
      clearInterval(ytFadeRef.current[id]);
      try {
        ytRef.current[id].setVolume(0);
        ytRef.current[id].pauseVideo();
      } catch (e) {}
    });
    if (fxRef.current && ctxRef.current) {
      fxRef.current.gain.cancelScheduledValues(now);
      fxRef.current.gain.setValueAtTime(0, now);
      setTimeout(() => {
        if (fxRef.current && ctxRef.current) fxRef.current.gain.setValueAtTime(0.9, ctxRef.current.currentTime);
      }, 3000);
    }
    if (previewRef.current) {
      previewRef.current.audio.pause();
      previewRef.current = null;
      setPreviewId(null);
    }
    setTimer((t) => ({ ...t, running: false }));
    setActiveId(null);
    setPausedId(null);
    setStatus("NOT-STOPP ausgelöst. Alles gestoppt.");
  };

  const goSelected = () => {
    if (!selCue) {
      setStatus("Keine weiteren Cues.");
      return;
    }
    startCueWithChain(selCue);
  };

  const selectBy = (dir) => {
    if (!cues.length) return;
    const idx = selCue ? cues.findIndex((c) => c.id === selCue.id) : -1;
    const j = Math.min(cues.length - 1, Math.max(0, idx + dir));
    setSelectedId(cues[j].id);
    setStatus(`Vorauswahl: ${cues[j].title}`);
  };

  const seekAbs = (sec) => {
    const id = activeRef.current;
    if (!id) return;
    const c = cuesRef.current.find((x) => x.id === id);
    if (!c) return;
    const dur = c.duration || 0;
    const t = Math.max(0, dur ? Math.min(sec, dur - 0.5) : sec);
    if (c.type === "youtube") {
      const yp = ytRef.current[id];
      if (yp && yp.seekTo) yp.seekTo(t, true);
    } else {
      const p = playersRef.current[id];
      if (p) p.audio.currentTime = t;
    }
    setElapsed(t);
  };

  const currentPos = () => {
    const id = activeRef.current;
    if (!id) return 0;
    const c = cuesRef.current.find((x) => x.id === id);
    if (c && c.type === "youtube") {
      const yp = ytRef.current[id];
      return yp && yp.getCurrentTime ? yp.getCurrentTime() || 0 : 0;
    }
    const p = playersRef.current[id];
    return p ? p.audio.currentTime || 0 : 0;
  };

  const seekBy = (d) => seekAbs(currentPos() + d);

  const addMark = () => {
    const id = activeRef.current;
    if (!id) {
      setStatus("Starte einen Cue, um eine Sprungmarke zu setzen.");
      return;
    }
    const c = cuesRef.current.find((x) => x.id === id);
    if (!c) return;
    const t = currentPos();
    const marks = [...(c.marks || []), { t, label: `Marke ${(c.marks || []).length + 1}` }].sort((a, b) => a.t - b.t);
    updateCue(id, { marks });
    setStatus(`Sprungmarke bei ${fmt(t)} gesetzt.`);
  };

  const cycleView = () => {
    const order = ["show", "stage", "edit", "settings"];
    setView((v) => order[(order.indexOf(v) + 1) % order.length]);
  };

  // ---------- Preview (Vorhören, Musikdateien only) ----------
  const togglePreview = (c) => {
    if (previewRef.current) {
      previewRef.current.audio.pause();
      const same = previewRef.current.id === c.id;
      previewRef.current = null;
      setPreviewId(null);
      if (same) return;
    }
    if (!c.url) {
      setStatus("Vorhören ist nur bei Musikdateien möglich.");
      return;
    }
    const a = new Audio(c.url);
    if (settings.outputId && a.setSinkId) a.setSinkId(settings.outputId).catch(() => {});
    a.onended = () => {
      if (previewRef.current && previewRef.current.audio === a) {
        previewRef.current = null;
        setPreviewId(null);
      }
    };
    a.play().catch(() => setStatus("Vorhören blockiert. Bitte erneut tippen."));
    previewRef.current = { audio: a, id: c.id };
    setPreviewId(c.id);
  };

  // ---------- Sound effects ----------
  const hit = (ctx, t, freq, vol, len) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseRef.current;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(bp).connect(g).connect(fxRef.current);
    src.start(t, Math.random() * 0.8, len + 0.05);
  };

  const playFx = (type) => {
    const ctx = getCtx();
    const t0 = ctx.currentTime + 0.02;
    if (type === "applause") {
      const dur = 3.2;
      for (let i = 0; i < 140; i++) {
        const t = t0 + dur * Math.pow(Math.random(), 1.6);
        hit(ctx, t, 1200 + Math.random() * 2000, 0.25 + Math.random() * 0.25, 0.05 + Math.random() * 0.05);
      }
      setStatus("Applaus");
    } else if (type === "drum") {
      const dur = 2.5;
      let t = 0;
      let gap = 0.12;
      while (t < dur) {
        hit(ctx, t0 + t, 2500, 0.5, 0.06);
        t += gap;
        gap = Math.max(0.025, gap * 0.94);
      }
      hit(ctx, t0 + dur, 900, 0.9, 0.35);
      setStatus("Trommelwirbel");
    } else if (type === "bell") {
      [1046.5, 2093, 3136].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = f;
        const v = [0.5, 0.2, 0.08][i];
        g.gain.setValueAtTime(v, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3);
        o.connect(g).connect(fxRef.current);
        o.start(t0);
        o.stop(t0 + 3.1);
      });
      setStatus("Glocke");
    }
  };

  // ---------- Remote / keyboard dispatcher ----------
  const run = (a) => {
    switch (a) {
      case "next":
        return selectBy(1);
      case "prev":
        return selectBy(-1);
      case "go":
        return goSelected();
      case "pause":
        return togglePause();
      case "stop":
        return stopMusic(1.5);
      case "emergency":
        return emergency();
      case "duck":
        return setDuck((d) => !d);
      case "mark":
        return addMark();
      case "timer":
        return setTimer((t) => ({ ...t, running: !t.running, done: false }));
      case "applause":
      case "drum":
      case "bell":
        return playFx(a);
      case "view":
        return cycleView();
      case "seekBack":
        return seekBy(-10);
      case "seekFwd":
        return seekBy(10);
      default:
        return;
    }
  };
  runRef.current = run;

  useEffect(() => {
    const finish = (a) => runRef.current(a);
    const tapped = (base) => {
      const km = keymapRef.current;
      if (km[base + "#double"]) {
        const pending = tapRef.current[base];
        if (pending) {
          clearTimeout(pending);
          delete tapRef.current[base];
          finish(km[base + "#double"]);
          return;
        }
        tapRef.current[base] = setTimeout(() => {
          delete tapRef.current[base];
          if (km[base]) finish(km[base]);
        }, 400);
        return;
      }
      if (km[base]) finish(km[base]);
    };
    const holdTimers = {};
    const holdFired = {};
    const onDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = keyOf(e);
      if (learningRef.current) {
        e.preventDefault();
        if (e.repeat) return;
        if (key === "Escape") {
          setLearning(null);
          setStatus("Belegung abgebrochen.");
          return;
        }
        const [action, gesture] = learningRef.current.split("|");
        const full = gesture === "tap" ? key : `${key}#${gesture}`;
        setKeymap((prev) => {
          const n = {};
          Object.keys(prev).forEach((k) => {
            if (k === full) return;
            if (prev[k] === action && gestureOf(k) === gesture) return;
            n[k] = prev[k];
          });
          n[full] = action;
          return n;
        });
        setLearning(null);
        setStatus(`${keyLabel(full)} belegt.`);
        return;
      }
      const km = keymapRef.current;
      if (!km[key] && !km[key + "#double"] && !km[key + "#hold"]) return;
      e.preventDefault();
      if (e.repeat) return;
      if (km[key + "#hold"]) {
        holdFired[key] = false;
        holdTimers[key] = setTimeout(() => {
          holdFired[key] = true;
          finish(keymapRef.current[key + "#hold"]);
        }, 600);
        return;
      }
      tapped(key);
    };
    const onUp = (e) => {
      const key = keyOf(e);
      if (!keymapRef.current[key + "#hold"]) return;
      clearTimeout(holdTimers[key]);
      if (holdFired[key]) {
        holdFired[key] = false;
        return;
      }
      tapped(key);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const map = { play: "pause", pause: "pause", nexttrack: "next", previoustrack: "prev" };
    Object.keys(map).forEach((k) => {
      try {
        navigator.mediaSession.setActionHandler(k, () => runRef.current(map[k]));
      } catch (e) {}
    });
  }, []);

  useEffect(() => {
    if (view !== "settings" || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((list) => setDevices(list.filter((d) => d.kind === "audiooutput")))
      .catch(() => {});
  }, [view]);

  // ---------- Timer ----------
  useEffect(() => {
    if (!timer.running) return;
    const id = setInterval(() => {
      setTimer((t) => (t.left <= 1 ? { ...t, left: 0, running: false, done: true } : { ...t, left: t.left - 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [timer.running]);

  useEffect(() => {
    if (timer.done) {
      playFx("bell");
      setTimer((t) => ({ ...t, done: false }));
    }
  }, [timer.done]);

  const setPreset = (min) => setTimer({ total: min * 60, left: min * 60, running: false, done: false });

  // ---------- Progress ----------
  useEffect(() => {
    const id = setInterval(() => {
      const aid = activeRef.current;
      const yp = aid && ytRef.current[aid];
      if (yp && yp.getDuration) {
        const d = yp.getDuration() || 0;
        const ct = yp.getCurrentTime() || 0;
        setElapsed(ct);
        setProgress(d ? ct / d : 0);
        const yc = cuesRef.current.find((c) => c.id === aid);
        if (d && yc && !yc.duration) updateCue(aid, { duration: d });
      }
      const p = aid && playersRef.current[aid];
      if (p) {
        setElapsed(p.audio.currentTime);
        setProgress(p.audio.duration ? p.audio.currentTime / p.audio.duration : 0);
      }
    }, 200);
    return () => clearInterval(id);
  }, []);

  // ---------- Cue management ----------
  const newCue = (over) => ({
    id: uid(),
    type: "file",
    title: "Cue",
    note: "",
    section: "",
    url: null,
    fileName: "",
    videoId: "",
    duration: 0,
    fadeIn: settings.defaultFade,
    fadeOut: settings.defaultFade,
    volume: settings.defaultVol,
    loop: false,
    marks: [],
    preWait: 0,
    autoFollow: false,
    chain: [],
    ...over,
  });

  const addFiles = (files) => {
    const list = Array.from(files).filter(
      (f) => f.type.startsWith("audio") || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f.name)
    );
    if (!list.length) {
      setStatus("Keine Audiodatei erkannt.");
      return;
    }
    const newCues = list.map((f) => {
      const cue = newCue({
        title: f.name.replace(/\.[^.]+$/, ""),
        fileName: f.name,
        url: URL.createObjectURL(f),
      });
      registerCue(cue);
      return cue;
    });
    setCues((prev) => [...prev, ...newCues]);
    setStatus(`${newCues.length} Datei(en) hinzugefügt.`);
  };

  const loadDemos = () =>
    addFiles([
      demoWav("Demo - Mysteriös", "mystery"),
      demoWav("Demo - Heiter", "happy"),
      demoWav("Demo - Spannung", "tension"),
    ]);

  const assignFile = (id, file) => {
    const c = cuesRef.current.find((x) => x.id === id);
    if (!c) return;
    const url = URL.createObjectURL(file);
    registerCue({ ...c, url });
    updateCue(id, { url, fileName: file.name });
    setStatus(`Datei zugeordnet: ${file.name}`);
  };

  const addYouTube = (url) => {
    const vid = parseYT(url);
    if (!vid) {
      setStatus("Kein gültiger YouTube-Link.");
      return false;
    }
    setCues((prev) => [...prev, newCue({ type: "youtube", videoId: vid, title: `YouTube ${vid}` })]);
    setStatus("YouTube-Link hinzugefügt. Benenne den Cue in der Bearbeitung um.");
    return true;
  };

  const addExampleSlots = () => {
    const names = ["Beispiel 1: Mysteriös", "Beispiel 2: Heiter", "Beispiel 3: Spannung"];
    setCues((prev) => [...prev, ...names.map((n) => newCue({ type: "youtube", title: n }))]);
    setStatus("YouTube-Platzhalter angelegt. Füge pro Cue einen Link ein.");
  };

  const setYtLink = (id, url) => {
    const vid = parseYT(url);
    if (!vid) {
      setStatus("Kein gültiger YouTube-Link.");
      return;
    }
    destroyYT(id);
    setCues((prev) => prev.map((c) => (c.id === id ? { ...c, videoId: vid, duration: 0 } : c)));
    setStatus("YouTube-Link gespeichert.");
  };

  const updateCue = (id, patch) => {
    if (patch.loop !== undefined && playersRef.current[id]) {
      playersRef.current[id].audio.loop = !!patch.loop;
    }
    setCues((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const moveCue = (id, dir) =>
    setCues((prev) => {
      const i = prev.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const n = [...prev];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const removeCue = (id) => {
    const p = playersRef.current[id];
    if (p) {
      p.audio.pause();
      try {
        p.source && p.source.disconnect();
        p.gain && p.gain.disconnect();
      } catch (e) {}
      if (p.audio.src && p.audio.src.startsWith("blob:")) URL.revokeObjectURL(p.audio.src);
      delete playersRef.current[id];
    }
    destroyYT(id);
    if (activeId === id) setActiveId(null);
    if (pausedId === id) setPausedId(null);
    if (selectedId === id) setSelectedId(null);
    setCues((prev) => prev.filter((c) => c.id !== id));
  };

  const removeMark = (id, idx) => {
    const c = cuesRef.current.find((x) => x.id === id);
    if (!c) return;
    updateCue(id, { marks: (c.marks || []).filter((_, i) => i !== idx) });
  };

  // ---------- Setup save / load ----------
  const exportSetup = () => {
    const data = {
      app: "Showcue",
      version: VERSION,
      savedAt: new Date().toISOString(),
      settings,
      keymap,
      cues: cues.map((c) => ({
        title: c.title,
        type: c.type,
        videoId: c.videoId || "",
        fileName: c.fileName || "",
        section: c.section || "",
        note: c.note || "",
        fadeIn: c.fadeIn,
        fadeOut: c.fadeOut,
        volume: c.volume,
        loop: !!c.loop,
        marks: c.marks || [],
        preWait: c.preWait || 0,
        autoFollow: !!c.autoFollow,
        chain: (c.chain || [])
          .map((l) => ({ index: cues.findIndex((x) => x.id === l.id), delay: l.delay || 0 }))
          .filter((l) => l.index >= 0),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "showcue-setup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus("Setup exportiert.");
  };

  const importSetup = async (file) => {
    try {
      const d = JSON.parse(await file.text());
      if (!d || !Array.isArray(d.cues)) throw new Error("format");
      const imported = d.cues.map((c) =>
        newCue({
          title: c.title || "Cue",
          type: c.type === "youtube" ? "youtube" : "file",
          videoId: c.videoId || "",
          fileName: c.fileName || "",
          section: c.section || "",
          note: c.note || "",
          fadeIn: c.fadeIn ?? 2,
          fadeOut: c.fadeOut ?? 2,
          volume: c.volume ?? 0.9,
          loop: !!c.loop,
          marks: Array.isArray(c.marks) ? c.marks : [],
          preWait: Number(c.preWait) || 0,
          autoFollow: !!c.autoFollow,
        })
      );
      d.cues.forEach((c, i) => {
        imported[i].chain = (c.chain || [])
          .filter((l) => imported[l.index])
          .map((l) => ({ id: imported[l.index].id, delay: Number(l.delay) || 0 }));
      });
      setCues((prev) => [...prev, ...imported]);
      if (d.settings) setSettings((s) => ({ ...s, ...d.settings }));
      if (d.keymap) setKeymap(d.keymap);
      setStatus(`Setup geladen: ${imported.length} Cues. Musikdateien bitte erneut zuordnen.`);
    } catch (e) {
      setStatus("Die Datei konnte nicht gelesen werden.");
    }
  };

  const startLearn = (actionId, gesture = "tap") => {
    const v = `${actionId}|${gesture}`;
    if (learning === v) {
      setLearning(null);
      setStatus("Belegung abgebrochen.");
      return;
    }
    setLearning(v);
    setStatus("Jetzt die Taste drücken (Esc bricht ab).");
  };

  const timerPct = timer.total ? ((timer.total - timer.left) / timer.total) * 100 : 0;
  const timerWarn = timer.running && timer.left <= 60;

  // ---------- Blocks ----------
  const starts = [];
  let acc = 0;
  cues.forEach((c, i) => {
    starts[i] = acc;
    acc += c.duration || 0;
  });

  const renderCues = (editable) => {
    let lastSection = null;
    return (
      <ol className="space-y-2">
        {cues.map((c, i) => {
          const isActive = activeId === c.id;
          const isSel = selCue && selCue.id === c.id;
          const header =
            c.section && c.section !== lastSection ? (
              <li key={`sec-${c.id}`} className="pt-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
                {c.section}
              </li>
            ) : null;
          lastSection = c.section || lastSection;
          const needsFile = c.type === "file" && !c.url;
          return [
            header,
            <li
              key={c.id}
              onClick={() => !editable && setSelectedId(c.id)}
              className={`rounded-xl border p-3 transition ${
                isActive
                  ? "border-amber-400 bg-amber-400/10"
                  : isSel
                  ? "border-amber-400/60 bg-zinc-800/70"
                  : "border-zinc-800 bg-zinc-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-xs text-zinc-500">{i + 1}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isActive) togglePause();
                    else startCueWithChain(c);
                  }}
                  aria-label={isActive ? `${c.title} pausieren` : `${c.title} abspielen`}
                  className="h-9 w-9 shrink-0 rounded-full bg-zinc-800 text-sm hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  {isActive ? "❚❚" : "▶"}
                </button>
                <div className="min-w-0 flex-1">
                  {editable ? (
                    <input
                      value={c.title}
                      onChange={(e) => updateCue(c.id, { title: e.target.value })}
                      aria-label="Cue-Titel"
                      className="w-full bg-transparent text-sm font-medium outline-none focus:text-amber-300"
                    />
                  ) : (
                    <div className="truncate text-sm font-medium">{c.title}</div>
                  )}
                  <div className="text-xs text-zinc-500">
                    {c.type === "youtube" ? (c.videoId ? "YouTube" : "Link fehlt") : needsFile ? "Datei fehlt" : "Datei"}
                    {" · "}
                    {c.duration ? fmt(c.duration) : "--:--"}
                    {" · ab "}
                    {fmt(starts[i])}
                    {c.preWait > 0 && <span className="ml-2">⏱ {c.preWait} s</span>}
                    {c.autoFollow && <span className="ml-2">→ Auto</span>}
                    {c.loop && <span className="ml-2 text-amber-400">↻ Schleife</span>}
                    {isSel && !isActive && <span className="ml-2 text-amber-400">ausgewählt</span>}
                    {isActive && <span className="ml-2 text-amber-400">läuft</span>}
                  </div>
                </div>
                {editable && (
                  <>
                    <button onClick={() => moveCue(c.id, -1)} aria-label="Nach oben" className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800">▲</button>
                    <button onClick={() => moveCue(c.id, 1)} aria-label="Nach unten" className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800">▼</button>
                    <button onClick={() => removeCue(c.id)} aria-label="Cue entfernen" className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-red-400">✕</button>
                  </>
                )}
              </div>

              {editable && (
                <div className="mt-2 space-y-2">
                  {c.type === "youtube" && (
                    <input
                      defaultValue=""
                      placeholder={c.videoId ? `Link ändern (aktuell: ${c.videoId})` : "YouTube-Link einfügen und Enter drücken"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.currentTarget.value) {
                          setYtLink(c.id, e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                      className="w-full rounded-lg bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  )}
                  {needsFile && (
                    <label className="block rounded-lg bg-zinc-950/60 px-3 py-2 text-xs text-amber-400">
                      Datei zuordnen ({c.fileName || "unbekannt"})
                      <input
                        type="file"
                        accept="audio/*"
                        className="mt-1 block w-full text-xs"
                        onChange={(e) => e.target.files[0] && assignFile(c.id, e.target.files[0])}
                      />
                    </label>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={c.section}
                      onChange={(e) => updateCue(c.id, { section: e.target.value })}
                      placeholder="Abschnitt, z. B. Eröffnung"
                      className="w-full rounded-lg bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <label className="flex items-center gap-2 text-xs text-zinc-300">
                      <input type="checkbox" checked={!!c.loop} onChange={(e) => updateCue(c.id, { loop: e.target.checked })} className="accent-amber-400" />
                      Schleifenmodus
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
                    <label>
                      Vorlaufzeit (s)
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={c.preWait || 0}
                        onChange={(e) => updateCue(c.id, { preWait: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="mt-1 w-full rounded-lg bg-zinc-950/60 px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="flex items-end gap-2 pb-1">
                      <input type="checkbox" checked={!!c.autoFollow} onChange={(e) => updateCue(c.id, { autoFollow: e.target.checked })} className="accent-amber-400" />
                      Auto-Follow (nach dem Ende nächster Cue)
                    </label>
                  </div>
                  <div className="text-xs">
                    <span className="text-zinc-500">Zusätzlich starten (Chain):</span>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {(c.chain || []).map((l, li) => {
                        const t = cues.find((x) => x.id === l.id);
                        return (
                          <span key={li} className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-zinc-200">
                            {t ? t.title : "(gelöscht)"} +
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={l.delay || 0}
                              aria-label="Verzögerung in Sekunden"
                              onChange={(e) =>
                                updateCue(c.id, {
                                  chain: (c.chain || []).map((x, k) =>
                                    k === li ? { ...x, delay: Math.max(0, parseFloat(e.target.value) || 0) } : x
                                  ),
                                })
                              }
                              className="w-14 rounded bg-zinc-950/60 px-1 text-xs"
                            />
                            s
                            <button
                              onClick={() => updateCue(c.id, { chain: (c.chain || []).filter((_, k) => k !== li) })}
                              aria-label="Verknüpfung entfernen"
                              className="text-zinc-500 hover:text-red-400"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          updateCue(c.id, { chain: [...(c.chain || []), { id: e.target.value, delay: 0 }] });
                        }}
                        className="rounded-lg bg-zinc-800 px-2 py-1 text-xs"
                      >
                        <option value="">+ Cue hinzufügen</option>
                        {cues
                          .filter((x) => x.id !== c.id)
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.title}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <textarea
                    value={c.note}
                    onChange={(e) => updateCue(c.id, { note: e.target.value })}
                    placeholder="Stichwort-Skript, z. B. „Ring kommt aus der Tasche“"
                    rows={2}
                    className="w-full rounded-lg bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <div className="grid grid-cols-3 gap-3 text-xs text-zinc-400">
                    <label>
                      Einblenden {c.fadeIn} s
                      <input type="range" min="0" max="10" step="0.5" value={c.fadeIn} onChange={(e) => updateCue(c.id, { fadeIn: parseFloat(e.target.value) })} className="w-full accent-amber-400" />
                    </label>
                    <label>
                      Ausblenden {c.fadeOut} s
                      <input type="range" min="0" max="10" step="0.5" value={c.fadeOut} onChange={(e) => updateCue(c.id, { fadeOut: parseFloat(e.target.value) })} className="w-full accent-amber-400" />
                    </label>
                    <label>
                      Lautstärke {Math.round(c.volume * 100)} %
                      <input type="range" min="0" max="1" step="0.01" value={c.volume} onChange={(e) => updateCue(c.id, { volume: parseFloat(e.target.value) })} className="w-full accent-amber-400" />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-zinc-500">Sprungmarken:</span>
                    {(c.marks || []).map((m, mi) => (
                      <span key={mi} className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1">
                        <button onClick={() => { setSelectedId(c.id); if (activeRef.current === c.id) seekAbs(m.t); else setStatus(`Marke ${fmt(m.t)} – starte den Cue, dann springen.`); }} className="text-zinc-200">
                          {fmt(m.t)}
                        </button>
                        <button onClick={() => removeMark(c.id, mi)} aria-label="Marke entfernen" className="text-zinc-500 hover:text-red-400">✕</button>
                      </span>
                    ))}
                    {!(c.marks || []).length && <span className="text-zinc-600">keine</span>}
                  </div>
                  {c.type === "file" && c.url && (
                    <button onClick={() => togglePreview(c)} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs hover:bg-zinc-700">
                      {previewId === c.id ? "Vorhören stoppen" : "Vorhören (ohne Publikum)"}
                    </button>
                  )}
                </div>
              )}
            </li>,
          ];
        })}
      </ol>
    );
  };

  const renderMarks = (c) => {
    if (!c) return null;
    const marks = c.marks || [];
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <button onClick={addMark} className="rounded-lg bg-zinc-800 px-3 py-2 hover:bg-zinc-700">+ Sprungmarke (M)</button>
        {marks.map((m, i) => (
          <button key={i} onClick={() => (activeRef.current === c.id ? seekAbs(m.t) : setStatus("Cue starten, dann zur Marke springen."))} className="rounded-lg bg-zinc-800 px-3 py-2 text-zinc-200 hover:bg-zinc-700">
            {fmt(m.t)}
          </button>
        ))}
      </div>
    );
  };

  const seekControls = (big) => (
    <div className="mt-3">
      <input
        type="range"
        min="0"
        max={duration || 0}
        step="0.1"
        value={Math.min(scrub ?? elapsed, duration || 0)}
        disabled={!shownCue || !duration}
        aria-label="Position im Titel"
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setScrub(v);
          seekAbs(v);
        }}
        onPointerUp={() => setScrub(null)}
        onTouchEnd={() => setScrub(null)}
        onKeyUp={() => setScrub(null)}
        className="w-full accent-amber-400 disabled:opacity-40"
      />
      <div className="mt-2 grid grid-cols-4 gap-2">
        {[[-15, "-15 s"], [-5, "-5 s"], [5, "+5 s"], [15, "+15 s"]].map(([d, l]) => (
          <button
            key={d}
            disabled={!shownCue}
            onClick={() => seekBy(d)}
            className={`rounded-lg bg-zinc-800 font-medium hover:bg-zinc-700 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${big ? "py-4 text-base" : "py-2 text-xs"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );

  const emergencyButton = (
    <button
      onClick={emergency}
      className="w-full rounded-xl bg-red-600 py-4 text-base font-black uppercase tracking-wider text-white shadow-lg shadow-red-600/20 hover:bg-red-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
    >
      NOT-STOPP <span className="text-xs font-medium normal-case opacity-80">(Esc)</span>
    </button>
  );

  const performanceCard = (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs uppercase tracking-widest text-zinc-500">Jetzt</p>
      <p className="mt-1 truncate text-lg font-semibold">{shownCue ? shownCue.title : "Nichts läuft"}</p>
      {shownCue && shownCue.note && <p className="mt-1 text-sm text-amber-300">{shownCue.note}</p>}
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-amber-400 transition-[width] duration-200" style={{ width: `${Math.min(100, progress * 100)}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-zinc-400">
        <span>{fmt(elapsed)}</span>
        <span>{duration ? fmt(duration) : "--:--"}</span>
      </div>
      {seekControls(false)}
      <button
        onClick={goSelected}
        disabled={!selCue}
        className="mt-4 w-full rounded-xl bg-amber-400 py-5 text-lg font-bold text-zinc-950 shadow-lg shadow-amber-400/10 transition hover:bg-amber-300 disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
      >
        GO
        <span className="block truncate text-xs font-medium opacity-80">
          {selCue ? `Ausgewählt: ${selCue.title}` : "Keine weiteren Cues"}
        </span>
      </button>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button onClick={togglePause} className={btn}>{activeId ? "Pause" : "Weiter"}</button>
        <button onClick={() => stopMusic(1.5)} className={btn}>Stille</button>
        <button onClick={() => setDuck((d) => !d)} className={`${btn} ${duck ? "ring-2 ring-amber-400" : ""}`}>
          {duck ? "Ansage aus" : "Ansage"}
        </button>
      </div>
      {renderMarks(markCue)}
      <div className="mt-4">{emergencyButton}</div>
      <label className="mt-4 block text-xs text-zinc-400">
        Gesamtlautstärke der App: {Math.round(masterVol * 100)} %
        <input type="range" min="0" max="1" step="0.01" value={masterVol} onChange={(e) => setMasterVol(parseFloat(e.target.value))} className="mt-1 w-full accent-amber-400" />
      </label>
    </div>
  );

  const timerCard = (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Timer</p>
        <span className={`text-3xl font-bold tabular-nums ${timerWarn ? "text-red-400" : "text-zinc-100"}`}>{fmt(timer.left)}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-amber-400" style={{ width: `${timerPct}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[5, 10, 15, 20].map((m) => (
          <button key={m} onClick={() => setPreset(m)} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs hover:bg-zinc-700">{m} min</button>
        ))}
        <button onClick={() => setTimer((t) => ({ ...t, running: !t.running, done: false }))} className="ml-auto rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-300">
          {timer.running ? "Pause" : "Start"}
        </button>
        <button onClick={() => setTimer((t) => ({ ...t, left: t.total, running: false, done: false }))} className="rounded-lg bg-zinc-800 px-4 py-2 text-xs hover:bg-zinc-700">Reset</button>
      </div>
    </div>
  );

  const effectsCard = (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs uppercase tracking-widest text-zinc-500">Effekte</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {[["applause", "Applaus", "1"], ["drum", "Trommelwirbel", "2"], ["bell", "Glocke", "3"]].map(([type, label, key]) => (
          <button key={type} onClick={() => playFx(type)} className="rounded-xl bg-zinc-800 py-4 text-sm font-medium hover:bg-zinc-700">
            {label}
            <span className="block text-xs text-zinc-500">{key}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const runtimeCard = (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-300">
      <p className="text-xs uppercase tracking-widest text-zinc-500">Zeitplan</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div><div className="text-lg font-semibold tabular-nums">{fmt(totalRuntime)}</div><div className="text-zinc-500">Laufzeit</div></div>
        <div><div className="text-lg font-semibold tabular-nums">{settings.targetMin} min</div><div className="text-zinc-500">Ziel</div></div>
        <div>
          <div className={`text-lg font-semibold tabular-nums ${diffSec > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {diffSec > 0 ? "+" : "-"}{fmt(Math.abs(diffSec))}
          </div>
          <div className="text-zinc-500">{diffSec > 0 ? "über Ziel" : "unter Ziel"}</div>
        </div>
      </div>
    </div>
  );

  const uploadBlock = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium hover:bg-zinc-700 focus-within:ring-2 focus-within:ring-amber-400">
          + Musikdateien
          <input type="file" accept="audio/*" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </label>
        <button onClick={loadDemos} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-300">
          Demo-Modus: 3 Demo-Tracks
        </button>
        <button onClick={addExampleSlots} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs hover:bg-zinc-700">
          + 3 YouTube-Platzhalter
        </button>
      </div>
      <div className="flex gap-2">
        <input
          value={ytUrl}
          onChange={(e) => setYtUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && addYouTube(ytUrl)) setYtUrl("");
          }}
          placeholder="YouTube-Link einfügen"
          aria-label="YouTube-Link"
          className="min-w-0 flex-1 rounded-lg bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button onClick={() => { if (addYouTube(ytUrl)) setYtUrl(""); }} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs hover:bg-zinc-700">
          Hinzufügen
        </button>
      </div>
    </div>
  );

  const renderRemoteMapping = () => (
    <div className="divide-y divide-zinc-800">
      <p className="pb-2 text-[10px] uppercase tracking-widest text-zinc-500">Tippen · Doppeltipp · Halten</p>
      {ACTIONS.map((a) => (
        <div key={a.id} className="py-2 text-xs">
          <div className="text-zinc-300">{a.label}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {[["tap", "Tippen"], ["double", "Doppeltipp"], ["hold", "Halten"]].map(([g, gl]) => {
              const key = Object.keys(keymap).find((k) => keymap[k] === a.id && gestureOf(k) === g);
              const v = `${a.id}|${g}`;
              return (
                <button
                  key={g}
                  onClick={() => startLearn(a.id, g)}
                  className={`rounded-lg px-2 py-1.5 ${learning === v ? "bg-amber-400 font-bold text-zinc-950" : "bg-zinc-800 hover:bg-zinc-700"}`}
                >
                  {gl}: {learning === v ? "Taste drücken…" : key ? keyLabel(key) : "frei"}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button onClick={() => setKeymap(DEFAULT_KEYMAP)} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300">
        Standardbelegung wiederherstellen
      </button>
    </div>
  );

  // ---------- Views ----------
  const tabs = (
    <div className="flex flex-wrap rounded-xl bg-zinc-900 p-1 text-xs">
      {[["show", "Show"], ["stage", "Übersicht"], ["edit", "Bearbeiten"], ["settings", "Einstellungen"]].map(([id, label]) => (
        <button
          key={id}
          onClick={() => setView(id)}
          aria-pressed={view === id}
          className={`rounded-lg px-4 py-3 font-semibold ${view === id ? "bg-amber-400 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const header = (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Show<span className="text-amber-400">cue</span>{" "}
          <span className="align-middle text-xs font-normal text-zinc-500">v{VERSION}</span>
        </h1>
        <p role="status" aria-live="polite" className="text-xs text-zinc-400">{status}</p>
      </div>
      {tabs}
    </header>
  );

  let body;
  if (view === "stage") {
    body = (
      <div className="flex min-h-[72vh] flex-col justify-between gap-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-zinc-500">Jetzt</p>
          <p className="mt-2 text-4xl font-bold leading-tight md:text-6xl">{shownCue ? shownCue.title : "—"}</p>
          <p className="mt-4 text-6xl font-semibold tabular-nums md:text-8xl">
            {shownCue && duration ? `-${fmt(Math.max(0, duration - elapsed))}` : fmt(elapsed)}
          </p>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-amber-400 transition-[width] duration-200" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
          {seekControls(true)}
          {shownCue && shownCue.note && <p className="mt-4 text-xl text-amber-300">{shownCue.note}</p>}
        </div>
        <div>
          <p className="text-sm uppercase tracking-widest text-zinc-500">Als Nächstes</p>
          <p className="mt-1 text-2xl font-semibold md:text-3xl">{selCue ? selCue.title : "Ende der Liste"}</p>
          {selCue && selCue.note && <p className="mt-1 text-sm text-zinc-400">{selCue.note}</p>}
        </div>
        <button
          onClick={goSelected}
          disabled={!selCue}
          className="w-full rounded-2xl bg-amber-400 py-10 text-4xl font-black text-zinc-950 disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
        >
          GO
        </button>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={togglePause} className="rounded-xl bg-zinc-800 py-5 text-lg font-semibold hover:bg-zinc-700">{activeId ? "Pause" : "Weiter"}</button>
          <button onClick={() => stopMusic(1.5)} className="rounded-xl bg-zinc-800 py-5 text-lg font-semibold hover:bg-zinc-700">Stille</button>
          <button onClick={() => setDuck((d) => !d)} className={`rounded-xl bg-zinc-800 py-5 text-lg font-semibold hover:bg-zinc-700 ${duck ? "ring-2 ring-amber-400" : ""}`}>
            {duck ? "Ansage aus" : "Ansage"}
          </button>
        </div>
        {renderMarks(markCue)}
        {emergencyButton}
        <button onClick={cycleView} className="w-full rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800">
          Ansicht wechseln
        </button>
      </div>
    );
  } else if (view === "edit") {
    body = (
      <div className="grid gap-5 md:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Musik hinzufügen</p>
          {uploadBlock}
          <p className="pt-2 text-xs uppercase tracking-widest text-zinc-500">Fernbedienung belegen</p>
          {renderRemoteMapping()}
        </section>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="mb-3 text-xs uppercase tracking-widest text-zinc-500">Cues bearbeiten ({cues.length})</p>
          {cues.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">Noch keine Cues.</p>
          ) : (
            renderCues(true)
          )}
        </section>
      </div>
    );
  } else if (view === "settings") {
    body = (
      <div className="grid gap-5 md:grid-cols-2">
        <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Optik</p>
            <div className="mt-2 grid gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSettings((s) => ({ ...s, theme: t.id }))}
                  aria-pressed={settings.theme === t.id}
                  className={`rounded-xl px-4 py-3 text-left text-sm ${settings.theme === t.id ? "bg-amber-400 font-bold text-zinc-950" : "bg-zinc-800 hover:bg-zinc-700"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm">
            Visuelles Signal bei Cue-Start
            <input type="checkbox" checked={settings.signal} onChange={(e) => setSettings((s) => ({ ...s, signal: e.target.checked }))} className="h-5 w-5 accent-amber-400" />
          </label>
          <label className="block text-sm">
            Ziel-Laufzeit der Show: {settings.targetMin} min
            <input type="range" min="10" max="180" step="5" value={settings.targetMin} onChange={(e) => setSettings((s) => ({ ...s, targetMin: parseInt(e.target.value, 10) }))} className="mt-1 w-full accent-amber-400" />
          </label>
          <label className="block text-sm">
            Standard-Ein-/Ausblendung für neue Cues: {settings.defaultFade} s
            <input type="range" min="0" max="10" step="0.5" value={settings.defaultFade} onChange={(e) => setSettings((s) => ({ ...s, defaultFade: parseFloat(e.target.value) }))} className="mt-1 w-full accent-amber-400" />
          </label>
          <label className="block text-sm">
            Standard-Lautstärke für neue Cues: {Math.round(settings.defaultVol * 100)} %
            <input type="range" min="0" max="1" step="0.01" value={settings.defaultVol} onChange={(e) => setSettings((s) => ({ ...s, defaultVol: parseFloat(e.target.value) }))} className="mt-1 w-full accent-amber-400" />
          </label>
          <label className="block text-sm">
            Ausgabegerät für Vorhören
            <select value={settings.outputId} onChange={(e) => setSettings((s) => ({ ...s, outputId: e.target.value }))} className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm">
              <option value="">Standardgerät</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || "Ausgabegerät"}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-zinc-500">
              {devices.length ? "Nur in Chrome am Laptop wählbar." : "Geräteauswahl ist im Browser nicht verfügbar."}
            </span>
          </label>
        </section>
        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Setup sichern</p>
            <p className="mt-1 text-xs text-zinc-500">Speichert Cues, Abschnitte, Notizen, Marken und Belegung. Musikdateien müssen beim Laden erneut zugeordnet werden.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={exportSetup} className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-300">Setup exportieren</button>
              <label className="cursor-pointer rounded-lg bg-zinc-800 px-4 py-2 text-xs hover:bg-zinc-700">
                Setup importieren
                <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { if (e.target.files[0]) importSetup(e.target.files[0]); e.target.value = ""; }} />
              </label>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-4 text-xs text-zinc-500">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Über</p>
            <p className="mt-2">Showcue Version {VERSION}</p>
            <p className="mt-1">Lokale Musik bleibt auf deinem Gerät. YouTube wird über den offiziellen Player geladen.</p>
          </div>
        </section>
      </div>
    );
  } else {
    body = (
      <div className="space-y-5">
        {runtimeCard}
        <div className="grid gap-5 md:grid-cols-[1fr_1.3fr]">
          <section className="space-y-4">
            {performanceCard}
            {effectsCard}
            {timerCard}
          </section>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="mb-3 text-xs uppercase tracking-widest text-zinc-500">Cue-Liste ({cues.length})</p>
            {cues.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
                Noch keine Cues. Wechsle zu „Bearbeiten“ oder nutze den Demo-Modus.
              </p>
            ) : (
              renderCues(false)
            )}
            <p className="mt-4 text-xs text-zinc-600">
              Fernbedienung: Lautstärke + / − wählt den nächsten bzw. vorherigen Cue, Enter startet ihn. Esc ist NOT-STOPP.
            </p>
          </section>
        </div>
      </div>
    );
  }

  const themeClass = settings.theme === "buehne" ? "" : `theme-${settings.theme}`;

  return (
    <div className={`min-h-screen bg-zinc-950 p-4 font-sans text-zinc-100 md:p-6 ${themeClass}`}>
      <style>{THEME_CSS}</style>
      {header}
      {body}
      {flashKey > 0 && settings.signal && (
        <div
          key={flashKey}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 border-[14px] border-amber-400"
          style={{ animation: "sc-flash 0.7s ease-out forwards" }}
        />
      )}
      {cues
        .filter((c) => c.type === "youtube")
        .map((c) => (
          <div key={c.id} aria-hidden="true" className="pointer-events-none fixed bottom-0 right-0 h-px w-px overflow-hidden opacity-0">
            <div id={`yt-${c.id}`} />
          </div>
        ))}
    </div>
  );
}
