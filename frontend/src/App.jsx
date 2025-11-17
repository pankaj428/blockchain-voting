import { useEffect, useState } from "react";
import { initSmartAccount, getContract } from "./contract";
import { ethers } from "ethers";

export default function App() {
  const [account, setAccount] = useState("");
  const [smartAccount, setSmartAccount] = useState(null);
  const [signer, setSigner] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [name, setName] = useState("");

  const adminAddress = import.meta.env.VITE_ADMIN_ADDRESS;

  //  Connect Wallet + Create Smart Account
  const connect = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    const acc = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    setAccount(acc[0]);

    const { smartAccount, signer } = await initSmartAccount();

    setSmartAccount(smartAccount);
    setSigner(signer);

    if (acc[0].toLowerCase() === adminAddress.toLowerCase()) {
      setIsAdmin(true);
    }

    setTimeout(() => {
      loadCandidates(signer);
    }, 1500);
  };

  // Load candidates
  const loadCandidates = async (signer) => {
    try {
      const contract = getContract(signer);

      const count = await contract.candidatesCount();
      const list = [];

      for (let i = 0; i < Number(count); i++) {
        const c = await contract.candidates(i);
        list.push({
          id: Number(c.id),
          name: c.name,
          voteCount: Number(c.voteCount),
        });
      }

      setCandidates(list);
    } catch (err) {
      console.error("Error loading candidates:", err);
    }
  };

  // Add candidate (ADMIN)
  const addCandidate = async () => {
    if (!isAdmin) {
      alert("Only admin can add candidates!");
      return;
    }

    if (!name.trim()) return;

    const contract = getContract(signer);
    const txData = await contract.addCandidate.populateTransaction(name);

    const tx = {
      to: contract.target,
      data: txData.data,
    };

    const userOpResponse = await smartAccount.sendTransaction(tx);
    await userOpResponse.wait();

    alert("Candidate added!");
    setName("");
    loadCandidates(signer);
  };

  // Vote function
  const vote = async (id) => {
    try {
      const contract = getContract(signer);
      const txData = await contract.vote.populateTransaction(id);

      const tx = {
        to: contract.target,
        data: txData.data,
      };

      const userOp = await smartAccount.sendTransaction(tx);
      await userOp.wait();

      alert("Voted successfully!");

      loadCandidates(signer);
    } catch (err) {
      console.error(err);
      alert("You already voted or error occurred.");
    }
  };

  return (
    <div style={{ padding: "20px", color: "white", background: "#111", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "10px" }}>
        🗳️ Blockchain Voting System
      </h1>

      {account ? (
        <p>Connected as: {account}</p>
      ) : (
        <button
          onClick={connect}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            background: "#4CAF50",
            border: "none",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer",
          }}
        >
          Connect Wallet
        </button>
      )}

      <hr style={{ margin: "20px 0" }} />

      {/* ADMIN SECTION */}
      {isAdmin && (
        <div>
          <h2>Add Candidate (Admin Only)</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Candidate Name"
            style={{
              padding: "8px",
              marginRight: "10px",
              borderRadius: "6px",
              border: "1px solid #555",
            }}
          />
          <button
            onClick={addCandidate}
            style={{
              padding: "8px 16px",
              background: "#2196F3",
              color: "white",
              borderRadius: "6px",
              border: "none",
            }}
          >
            Add
          </button>
        </div>
      )}

      <h2 style={{ marginTop: "30px" }}>Vote Candidates</h2>

      {candidates.length === 0 ? (
        <p>No candidates available.</p>
      ) : (
        candidates.map((c) => (
          <div
            key={c.id}
            style={{
              padding: "15px",
              margin: "10px 0",
              background: "#1c1c1c",
              borderRadius: "10px",
              border: "1px solid #333",
            }}
          >
            <h3>{c.name}</h3>
            <p>Votes: {c.voteCount}</p>
            <button
              onClick={() => vote(c.id)}
              style={{
                padding: "8px 16px",
                background: "#FF9800",
                color: "white",
                border: "none",
                borderRadius: "6px",
              }}
            >
              Vote
            </button>
          </div>
        ))
      )}
    </div>
  );
}
