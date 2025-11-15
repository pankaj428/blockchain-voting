import { ethers } from "ethers";
import contractABI from "./Voting.json";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const getEthereumContract = async () => {
  if (!window.ethereum) {
    alert("MetaMask not installed!");
    return;
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();   // ⭐ VERY IMPORTANT
  const contract = new ethers.Contract(contractAddress, contractABI.abi, signer);

  return contract;
};
