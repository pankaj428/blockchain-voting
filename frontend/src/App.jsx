// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { getContract, getSigner } from "./contract.js";

/*
  Premium UI App.jsx
  - Uses your getContract/getSigner
  - Lightweight SVG graph (no Chart.js)
  - Lazy-loads canvas-confetti (avoid Vite import-time errors)
  - Single AudioContext instance, throttled clicks (no continuous beep)
  - Light (pure white) and Dark theme support
*/

function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div
      role="status"
      onClick={onClose}
      className="fixed right-6 top-6 z-50 transform-gpu rounded-lg px-4 py-2 shadow-xl bg-red-600 text-white cursor-pointer select-none"
    >
      {message}
    </div>
  );
}

function Crown({ className = "" }) {
  return (
    <div className={`inline-block ${className}`} aria-hidden>
      <svg viewBox="0 0 64 64" width="28" height="28" className="inline-block">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ffd54a" />
            <stop offset="1" stopColor="#ffb300" />
          </linearGradient>
        </defs>
        <path fill="url(#g)" d="M6 50 L10 18 L24 30 L32 12 L40 30 L54 18 L58 50 Z" />
      </svg>
    </div>
  );
}

export default function App() {
  const [account, setAccount] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [votePending, setVotePending] = useState({});
  const [addPending, setAddPending] = useState(false);
  const [toast, setToast] = useState(null);
  const [name, setName] = useState("");
  const adminAddress = (import.meta.env.VITE_ADMIN_ADDRESS || "").toLowerCase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setTheme] = useState("dark");

  // audio context (single global)
  const audioCtxRef = useRef(null);
  const lastSoundRef = useRef(0);

  const ensureAudioCtx = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      try {
        audioCtxRef.current = new AudioContext();
      } catch (e) {
        audioCtxRef.current = null;
      }
    }
    return audioCtxRef.current;
  };

  // play short click beep, throttled (min delta 60ms)
  const playClick = (opts = { freq: 900, len: 0.06, vol: 0.03, type: "sine" }) => {
    const now = Date.now();
    if (now - lastSoundRef.current < 60) return;
    lastSoundRef.current = now;

    const ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = opts.type;
      o.frequency.value = opts.freq;
      g.gain.value = opts.vol;
      o.connect(g);
      g.connect(ctx.destination);
      const start = ctx.currentTime;
      o.start(start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + opts.len);
      setTimeout(() => {
        try {
          o.stop();
          // don't close ctx so future sounds are instant
        } catch (e) {}
      }, opts.len * 1000 + 30);
    } catch (e) {
      // ignore audio errors
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Theme init
  useEffect(() => {
    const saved = localStorage.getItem("bv_theme");
    const initial = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setTheme(initial);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("bv_theme", theme);
  }, [theme]);

  // Load candidates from contract
  const loadCandidates = async () => {
    try {
      const contract = await getContract();
      const countBN = await contract.candidatesCount();
      const count = Number(countBN);
      const list = [];
      for (let i = 1; i <= count; i++) {
        const c = await contract.candidates(i);
        list.push({ id: Number(c.id), name: String(c.name), votes: Number(c.voteCount) });
      }
      setCandidates(list);
    } catch (err) {
      console.error("loadCandidates:", err);
      showToast("Failed to load candidates");
    }
  };

  useEffect(() => {
    // attempt load candidates on mount
    loadCandidates().catch(() => {});
  }, []);

  // Connect wallet
  const connect = async () => {
    try {
      setLoading(true);
      const signer = await getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      setIsAdmin(address.toLowerCase() === adminAddress);
      await loadCandidates();
      playClick({ freq: 1100, len: 0.07, vol: 0.04 });
      showToast("Wallet connected");
    } catch (err) {
      console.error("connect:", err);
      showToast(err?.message || "Connect failed");
    } finally {
      setLoading(false);
    }
  };

  // Add candidate (admin)
  const addCandidate = async () => {
    if (!name.trim()) {
      showToast("Enter candidate name");
      return;
    }
    try {
      setAddPending(true);
      playClick({ freq: 700, len: 0.06, vol: 0.04 });
      const contract = await getContract();
      const tx = await contract.addCandidate(name);
      await tx.wait();
      setName("");
      await loadCandidates();
      showToast("Candidate added");
    } catch (err) {
      console.error("addCandidate:", err);
      showToast("Failed to add candidate");
    } finally {
      setAddPending(false);
    }
  };

  // lazy confetti
  const triggerConfetti = async (x = 0.5, y = 0.3) => {
    try {
      const module = await import("canvas-confetti");
      const confetti = module.default || module;
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { x, y },
      });
    } catch (e) {
      // not installed or failed -> ignore
      // If not installed, user can run: npm i canvas-confetti
    }
  };

  // Vote
  const vote = async (id) => {
    try {
      setVotePending((p) => ({ ...p, [id]: true }));
      playClick({ freq: 1200, len: 0.06, vol: 0.05 });
      const contract = await getContract();
      const tx = await contract.vote(id);
      await tx.wait();
      // small confetti from center-right
      triggerConfetti(0.8, 0.25);
      await loadCandidates();
      showToast("Vote successful");
    } catch (err) {
      console.error("vote:", err);
      const message = err?.info?.error?.message || err?.message || "";
      if (message.includes("Already voted")) showToast("You already voted");
      else showToast("Vote failed");
    } finally {
      setVotePending((p) => {
        const cp = { ...p };
        delete cp[id];
        return cp;
      });
    }
  };

  // helper short account
  const shortAccount = (a) => (a ? a.slice(0, 6) + "..." + a.slice(-4) : "Not connected");

  // determine leader
  const leader = React.useMemo(() => {
    if (!candidates || candidates.length === 0) return null;
    let top = candidates[0];
    for (let c of candidates) {
      if (c.votes > top.votes) top = c;
    }
    return top;
  }, [candidates]);

  // Graph data: compute max votes
  const totalVotes = candidates.reduce((s, c) => s + c.votes, 0);
  const maxVotes = candidates.reduce((m, c) => Math.max(m, c.votes), 1);

  // inline styles for crown + confetti animations
  const crownAnimStyle = {
    animation: "float 1.8s ease-in-out infinite",
  };

  return (
    <div className={`min-h-screen transition-colors ${theme === "dark" ? "bg-gradient-to-b from-gray-900 to-gray-800 text-gray-200" : "bg-white text-gray-900"}`}>
      <style>{`
        /* small keyframes + glass */
        @keyframes float {
          0% { transform: translateY(0) rotate(-3deg) }
          50% { transform: translateY(-6px) rotate(3deg) }
          100% { transform: translateY(0) rotate(-3deg) }
        }
        .glass {
          background: ${theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)"};
          backdrop-filter: blur(6px);
        }
        .card-border {
          border: 1px solid ${theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)"};
        }
        .crown-glow {
          filter: drop-shadow(0 6px 18px rgba(255,180,0,0.15));
        }
        .winner-badge {
          animation: pop 0.9s cubic-bezier(.2,.9,.3,1);
        }
        @keyframes pop {
          0% { transform: scale(.9); opacity: 0 }
          60% { transform: scale(1.03); opacity: 1 }
          100% { transform: scale(1); opacity: 1 }
        }
      `}</style>

      <Toast message={toast} onClose={() => setToast(null)} />

      <header className={`max-w-7xl mx-auto px-6 py-6 flex items-center justify-between`}>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Blockchain Voting</h1>
          <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Simple on-chain voting — gas paid by user</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setTheme((t) => (t === "dark" ? "light" : "dark")); playClick({ freq: 550, len: 0.04 }); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${theme === "dark" ? "bg-gray-800 text-yellow-300" : "bg-gray-100 text-gray-700"} border border-transparent hover:opacity-95 transition`}
            title="Toggle theme"
          >
            <span className="sr-only">Toggle theme</span>
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>

          <div className={`px-4 py-2 rounded-full ${theme === "dark" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white" : "bg-indigo-50 text-indigo-700"}`}>
            {shortAccount(account)}
          </div>

          <button
            onClick={connect}
            className={`px-3 py-2 rounded-lg ${theme === "dark" ? "bg-indigo-600 text-white" : "bg-indigo-600 text-white"} transition shadow`}
            disabled={loading}
          >
            {loading ? "Connecting..." : account ? "Reconnect / Switch" : "Connect Wallet"}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Admin */}
          <div className="lg:col-span-1">
            <div className="glass card-border rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Admin — Add Candidate</h3>
              <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Admin only. Connect admin wallet to enable.</p>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Candidate name"
                className={`w-full px-4 py-3 rounded-lg ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3`}
              />

              <button
                onClick={addCandidate}
                disabled={!isAdmin || addPending}
                className={`w-full py-3 rounded-lg font-medium text-white transition transform active:scale-95 shadow-lg ${isAdmin ? "bg-gradient-to-r from-purple-600 to-indigo-600" : "bg-gray-400 cursor-not-allowed"}`}
              >
                {addPending ? "Adding..." : "Add Candidate"}
              </button>

              <div className="mt-5 text-xs text-gray-400">
                <div><strong>Admin:</strong></div>
                <div className="break-words mt-1 text-sm">{adminAddress || <span className="text-gray-500">not set</span>}</div>
              </div>
            </div>
          </div>

          {/* Candidates list + graph */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl card-border p-6 shadow-lg glass">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold">Candidates</h2>
                <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Total: <span className="font-medium">{candidates.length}</span></div>
              </div>

              <div className="space-y-4 mb-6">
                {candidates.length === 0 ? (
                  <div className="text-gray-400 py-8 text-center">No candidates found</div>
                ) : (
                  candidates.map((c, idx) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl p-4 border shadow-sm transform transition hover:scale-[1.01]" style={{ borderColor: theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.06)", background: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.9)" }}>
                      <div>
                        <div className="text-sm text-gray-400">#{idx + 1} • <span className={`${theme === "dark" ? "text-white" : "text-gray-900"} font-medium`}>{c.name}</span></div>
                        <div className="text-xs text-gray-500 mt-1">Votes: <span className="font-medium">{c.votes}</span></div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => vote(c.id)}
                          disabled={votePending[c.id]}
                          className={`px-4 py-2 rounded-lg font-medium text-white transition ${votePending[c.id] ? "bg-emerald-600/60 cursor-wait" : "bg-emerald-600 hover:bg-emerald-500"}`}
                        >
                          {votePending[c.id] ? "Voting..." : "Vote"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* simple SVG horizontal bar graph */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-2">Results (graph)</h3>
                <div className={`p-4 rounded-xl ${theme === "dark" ? "bg-black/20" : "bg-gray-50"} border`} style={{ borderColor: theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.06)" }}>
                  {candidates.length === 0 ? (
                    <div className="text-sm text-gray-500 py-6 text-center">No data</div>
                  ) : (
                    <div className="space-y-3">
                      {candidates.map((c) => {
                        const pct = totalVotes > 0 ? Math.round((c.votes / totalVotes) * 100) : 0;
                        const widthPct = totalVotes > 0 ? (c.votes / maxVotes) * 100 : 6;
                        return (
                          <div key={c.id} className="flex items-center gap-4">
                            <div className="w-32 text-sm font-medium" style={{ color: theme === "dark" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)" }}>
                              {c.name}
                            </div>
                            <div className="flex-1">
                              <div className="h-6 rounded-md overflow-hidden" style={{ background: theme === "dark" ? "rgba(255,255,255,0.03)" : "#f0f0f0" }}>
                                <div className="h-6 rounded-md" style={{ width: `${widthPct}%`, background: "linear-gradient(90deg,#10b981,#06b6d4)" }} />
                              </div>
                            </div>
                            <div className="w-14 text-right text-sm">{c.votes} • {pct}%</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 text-xs text-gray-500">Tip: Voting will prompt MetaMask to pay gas. Make sure wallet is unlocked.</div>
            </div>
          </div>
        </div>

        {/* Leader / Winner */}
        {leader && (
          <div className="mt-8 max-w-7xl mx-auto">
            <div className="rounded-2xl p-5 shadow-lg glass card-border flex items-center gap-4">
              <div className="text-2xl">🏆</div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-semibold">Current Leader</div>
                  <div className="px-3 py-1 rounded-full winner-badge" style={{ background: theme === "dark" ? "#fff6e0" : "#fffbeb", color: "#78350f" }}>
                    {leader.votes} votes
                  </div>
                </div>
                <div className="mt-1 text-sm" style={{ color: theme === "dark" ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.7)" }}>
                  <span className="font-medium">{leader.name}</span> is leading with <span className="font-medium">{leader.votes}</span> votes!
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div style={crownAnimStyle} className="crown-glow">
                  <Crown />
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8 text-center text-sm text-gray-500">
          Built with ❤️ — connect to interact
        </footer>
      </main>
    </div>
  );
}
