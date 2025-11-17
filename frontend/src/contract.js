import { ethers } from "ethers";
import contractABI from "./Voting.json";

const contractAddress = "0x0DAEE4ACC936f76617c58B02F345Ba25B9435CB4";

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
