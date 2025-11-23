import React, { useEffect, useMemo, useState } from "react";
import { getContract, getSigner } from "./contract.js";

import confetti from "canvas-confetti"; // NEW: Confetti

import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

// ---------- Toast ----------
function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div
      onClick={onClose}
      className="fixed right-5 top-5 z-50 rounded-xl bg-rose-500 px-4 py-2 text-sm text-white shadow-2xl cursor-pointer animate-[toast_0.4s_ease-out]"
    >
      {message}
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
  const [theme, setTheme] = useState("dark");

  const adminAddress = (import.meta.env.VITE_ADMIN_ADDRESS || "").toLowerCase();
  const [isAdmin, setIsAdmin] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  // NEW: Confetti
  const launchConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      scalar: 1.2,
    });
  };

  // ---------- THEME ----------
  useEffect(() => {
    const saved = localStorage.getItem("bv_theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    } else {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("bv_theme", theme);
  }, [theme]);

  // ---------- LOAD CANDIDATES ----------
  const loadCandidates = async () => {
    try {
      const contract = await getContract();
      const count = Number(await contract.candidatesCount());
      const list = [];
      for (let i = 1; i <= count; i++) {
        const c = await contract.candidates(i);
        list.push({
          id: Number(c.id),
          name: String(c.name),
          votes: Number(c.voteCount),
        });
      }
      setCandidates(list);
    } catch (err) {
      console.error(err);
      showToast("Failed to load candidates");
    }
  };

  useEffect(() => {
    loadCandidates().catch(() => {});
  }, []);

  // ---------- CONNECT ----------
  const connect = async () => {
    try {
      setLoading(true);
      const signer = await getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      setIsAdmin(address.toLowerCase() === adminAddress);
      await loadCandidates();
      showToast("Wallet connected");
    } catch (err) {
      console.error(err);
      showToast(err?.message || "Connect failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------- ADD CANDIDATE ----------
  const addCandidate = async () => {
    if (!name.trim()) {
      showToast("Enter candidate name");
      return;
    }
    try {
      setAddPending(true);
      const contract = await getContract();
      const tx = await contract.addCandidate(name);
      await tx.wait();
      setName("");
      await loadCandidates();
      showToast("Candidate added");
    } catch (err) {
      console.error(err);
      showToast("Failed to add candidate");
    } finally {
      setAddPending(false);
    }
  };

  // ---------- VOTE ----------
  const vote = async (id) => {
    try {
      setVotePending((p) => ({ ...p, [id]: true }));
      const contract = await getContract();
      const tx = await contract.vote(id);
      await tx.wait();
      await loadCandidates();

      showToast("Vote successful");
      launchConfetti(); // NEW
      
    } catch (err) {
      console.error(err);
      const message = err?.info?.error?.message || err?.message || "";
      if (message.includes("Already voted")) {
        showToast("You already voted");
      } else {
        showToast("Vote failed");
      }
    } finally {
      setVotePending((p) => {
        const cp = { ...p };
        delete cp[id];
        return cp;
      });
    }
  };

  const shortAccount = (a) =>
    a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "Not connected";

  // ---------- LEADER ----------
  const leader = useMemo(() => {
    if (!candidates.length) return null;
    return candidates.reduce((max, c) => (c.votes > max.votes ? c : max), candidates[0]);
  }, [candidates]);

  const totalVotes = candidates.reduce((s, c) => s + c.votes, 0) || 1;

  // ---------- PIE DATA ----------
  const pieData = useMemo(() => {
    return {
      labels: candidates.map((c) => c.name),
      datasets: [
        {
          data: candidates.map((c) => c.votes || 0),
          backgroundColor: [
            "rgba(129, 140, 248, 0.95)",
            "rgba(236, 72, 153, 0.95)",
            "rgba(45, 212, 191, 0.95)",
            "rgba(251, 191, 36, 0.95)",
            "rgba(248, 113, 113, 0.95)",
            "rgba(56, 189, 248, 0.95)",
          ],
          borderColor: [
            "rgba(76, 81, 191, 1)",
            "rgba(190, 24, 93, 1)",
            "rgba(20, 148, 126, 1)",
            "rgba(180, 83, 9, 1)",
            "rgba(185, 28, 28, 1)",
            "rgba(12, 74, 110, 1)",
          ],
          borderWidth: 4,
          hoverOffset: 16,
        },
      ],
    };
  }, [candidates]);

  const pieOptions = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.raw || 0;
            const pct = ((value / totalVotes) * 100).toFixed(1);
            return `${ctx.label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  // ---------- MAIN UI ----------
  return (
    <div
      className={
        "min-h-screen transition-colors duration-500 " +
        (theme === "dark"
          ? "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100"
          : "bg-gradient-to-br from-[#F7DFFF] via-[#F4E7FF] to-[#FFE3F0] text-[#1B1B1F]") // NEW LIGHT MODE
      }
    >
      <style>{`
        @keyframes toast_0_4s_ease-out {
          0% { opacity: 0; transform: translateY(-8px) scale(.96); }
          60% { opacity: 1; transform: translateY(2px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <Toast message={toast} onClose={() => setToast(null)} />

      {/* HEADER */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Blockchain Voting
          </h1>
          <p
            className={
              "mt-1 text-sm " +
              (theme === "dark" ? "text-slate-400" : "text-slate-600")
            }
          >
          • On-chain votes • One wallet, one vote
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className={
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur " +
              (theme === "dark"
                ? "border-slate-700 bg-slate-900/70 text-amber-300"
                : "border-violet-100 bg-white/60 text-violet-700")
            }
          >
            {theme === "dark" ? "🌙 Dark" : "✨ Light"}
          </button>

          {/* Account badge */}
          <div
            className={
              "rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg backdrop-blur " +
              (theme === "dark"
                ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
                : "bg-indigo-500/10 text-indigo-700 border border-indigo-200")
            }
          >
            {shortAccount(account)}
          </div>

          {/* Connect button */}
          <button
            onClick={connect}
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:bg-indigo-500 active:scale-95"
          >
            {loading ? "Connecting..." : account ? "Reconnect" : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-5 pb-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT: Stats + Pie */}
          <section className="space-y-6 lg:col-span-1">
            <div
              className={
                "rounded-3xl border p-5 shadow-xl backdrop-blur-xl " +
                (theme === "dark"
                  ? "border-white/10 bg-slate-900/60"
                  : "border-white/70 bg-white/60")
              }
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Overview
                  </p>
                  <h2 className="text-lg font-semibold">Live Stats</h2>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
                  {candidates.length} candidates
                </span>
              </div>

              <div className="mt-4 flex gap-4">
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Total Votes</p>
                  <p className="text-2xl font-bold">
                    {totalVotes === 1 && !candidates.some((c) => c.votes > 0)
                      ? 0
                      : totalVotes}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Leading</p>
                  <p className="text-sm font-medium">
                    {leader ? leader.name : "No votes yet"}
                  </p>
                </div>
              </div>
            </div>

            {/* Pie Chart card */}
            <div
              className={
                "rounded-3xl border p-5 shadow-[0_24px_70px_rgba(88,28,135,0.35)] backdrop-blur-2xl " +
                (theme === "dark"
                  ? "border-violet-500/30 bg-slate-950/70"
                  : "border-violet-200/70 bg-white/80")
              }
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Vote Distribution</h3>
                <span className="text-[11px] uppercase tracking-wide text-slate-400">
                  3D Pie View
                </span>

              </div>

              {candidates.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No candidates to visualize yet.
                </div>
              ) : (
                <div className="relative mx-auto flex max-w-xs items-center justify-center">
                  <div
                    className="relative h-52 w-52"
                    style={{
                      transform:
                        "perspective(800px) rotateX(18deg) translateY(10px)",
                    }}
                  >
                    <Pie data={pieData} options={pieOptions} />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: Candidates + Admin */}
          <section className="space-y-6 lg:col-span-2">
            {/* Candidates card */}
            <div
              className={
                "rounded-3xl border p-5 shadow-xl backdrop-blur-xl " +
                (theme === "dark"
                  ? "border-white/10 bg-slate-900/70"
                  : "border-white/80 bg-white/70")
              }
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Candidates</h2>
                <span className="text-xs text-slate-400">
                  Click “Vote” to cast your vote on-chain
                </span>
              </div>

              <div className="space-y-3">
                {candidates.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    No candidates yet. Admin can add from the panel below.
                  </div>
                ) : (
                  candidates.map((c, idx) => {
                    const pct = totalVotes
                      ? ((c.votes / totalVotes) * 100).toFixed(1)
                      : 0;
                    const isLeader = leader && leader.id === c.id;

                    return (
                      <div
                        key={c.id}
                        className={
                          "flex items-center justify-between rounded-2xl border px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md " +
                          (theme === "dark"
                            ? "border-white/6 bg-slate-900/70"
                            : "border-slate-200/80 bg-white/90")
                        }
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-semibold">
                              {c.name}
                            </span>
                            {isLeader && (
                              <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                                LEADING
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                            <span>Votes: {c.votes}</span>
                            <span>•</span>
                            <span>{pct}%</span>
                          </div>
                        </div>

                        <button
                          onClick={() => vote(c.id)}
                          disabled={votePending[c.id]}
                          className={
                            "rounded-xl px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95 " +
                            (votePending[c.id]
                              ? "bg-emerald-600/60 cursor-wait"
                              : "bg-emerald-500 hover:bg-emerald-400")
                          }
                        >
                          {votePending[c.id] ? "Voting..." : "Vote"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Admin panel */}
            <div
              className={
                "rounded-3xl border p-5 shadow-xl backdrop-blur-xl " +
                (theme === "dark"
                  ? "border-fuchsia-500/30 bg-slate-950/70"
                  : "border-fuchsia-200/80 bg-white/80")
              }
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">
                    Admin Panel — Add Candidate
                  </h2>
                  <p className="text-xs text-slate-400">
                    Only the configured admin wallet can add new candidates.
                  </p>
                </div>
                <span className="rounded-full bg-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold text-fuchsia-500">
                  Admin:{" "}
                  {adminAddress
                    ? `${adminAddress.slice(0, 6)}...${adminAddress.slice(-4)}`
                    : "not set"}
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Candidate name"
                  className={
                    "flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400 " +
                    (theme === "dark"
                      ? "border-slate-700 bg-slate-900/80"
                      : "border-slate-200 bg-white/90")
                  }
                />

                <button
                  onClick={addCandidate}
                  disabled={!isAdmin || addPending}
                  className={
                    "rounded-xl px-4 py-2 text-xs font-semibold text-white shadow transition active:scale-95 " +
                    (isAdmin
                      ? "bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:opacity-95"
                      : "bg-slate-400 cursor-not-allowed")
                  }
                >
                  {addPending ? "Adding..." : "Add Candidate"}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Leader summary */}
        {leader && (
          <section className="mt-2">
            <div
              className={
                "mx-auto flex max-w-3xl items-center justify-between rounded-3xl border px-5 py-4 shadow-lg backdrop-blur-xl " +
                (theme === "dark"
                  ? "border-amber-400/40 bg-amber-400/5"
                  : "border-amber-300 bg-amber-50/90")
              }
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">👑</span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-amber-500">
                    Current Leader
                  </p>
                  <p className="text-sm font-semibold">
                    {leader.name} is leading with {leader.votes} votes.
                  </p>
                </div>
              </div>
              <div className="hidden text-xs text-amber-700 sm:block">
                Live leader is calculated directly from on-chain vote counts.
              </div>
            </div>
          </section>
        )}

        <footer className="mt-6 text-center text-xs text-slate-400">
          Built with ❤️. Dedicated to nation. JAI HIND.
        </footer>
      </main>
    </div>
  );
}
