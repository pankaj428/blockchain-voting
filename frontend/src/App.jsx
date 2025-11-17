import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractABI from "./Voting.json";

// ⭐ Replace with your deployed contract address
const contractAddress = "0x0DAEE4ACC936f76617c58B02F345Ba25B9435CB4";

// ⭐ Replace with your ADMIN address (Hardhat deployer)
const adminAddress = "0x62b1b01eb9cb2bab72f1308fbf307e4ec5326aec";

export default function App() {
  const [account, setAccount] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    connectWallet();
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const user = accounts[0];
      setAccount(user);

      // ⭐ Check admin
      if (user.toLowerCase() === adminAddress.toLowerCase()) {
        setIsAdmin(true);
      }

      loadCandidates();
    } else {
      alert("MetaMask not installed!");
    }
  };

  const getContract = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, contractABI.abi, signer);
  };

  const loadCandidates = async () => {
    try {
      const contract = await getContract();
      const count = await contract.candidatesCount();

      let arr = [];
      for (let i = 1; i <= Number(count); i++) {
        const c = await contract.candidates(i);
        arr.push({
          id: Number(c.id),
          name: c.name,
          votes: Number(c.voteCount),
        });
      }

      setCandidates(arr);
    } catch (error) {
      console.log("Error loading candidates:", error);
    }
  };

  const addCandidate = async () => {
    try {
      const contract = await getContract();
      const tx = await contract.addCandidate(name);
      await tx.wait();

      alert("Candidate added!");
      setName("");
      loadCandidates();
    } catch (e) {
      alert("Only admin can add candidates!");
      console.log(e);
    }
  };

  const vote = async (id) => {
    try {
      const contract = await getContract();
      const tx = await contract.vote(id);
      await tx.wait();

      alert("Vote recorded!");
      loadCandidates();
    } catch (e) {
      alert("You already voted!");
      console.log(e);
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>🗳 Blockchain Voting System</h1>
      <p>Connected as: {account}</p>

      {/* ⭐ ADMIN ONLY UI */}
      {isAdmin && (
        <div style={{ marginBottom: "30px" }}>
          <h2>Add Candidate (Admin Only)</h2>
          <input
            style={{ padding: "10px", width: "300px" }}
            placeholder="Candidate Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            style={{ padding: "10px 20px", marginLeft: "10px" }}
            onClick={addCandidate}
          >
            Add
          </button>
        </div>
      )}

      <h2>Vote Candidates</h2>
      {candidates.length === 0 && <p>No candidates available.</p>}

      {candidates.map((c) => (
        <div
          key={c.id}
          style={{
            border: "1px solid #ccc",
            padding: "15px",
            width: "350px",
            marginTop: "10px",
            borderRadius: "10px",
          }}
        >
          <h3>{c.name}</h3>
          <p>Votes: {c.votes}</p>
          <button
            style={{ padding: "8px 15px" }}
            onClick={() => vote(c.id)}
          >
            Vote
          </button>
        </div>
      ))}
    </div>
  );
}
