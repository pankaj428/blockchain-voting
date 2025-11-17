// frontend/src/gasless.js

import { BiconomySmartAccount, ChainId } from "@biconomy/account";
import { ethers } from "ethers";

// 🔥 INITIALIZE BICONOMY SMART ACCOUNT
export async function createSmartAccount(paymasterKey) {
  if (!window.ethereum) throw new Error("Wallet not found");

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const smartAccount = new BiconomySmartAccount({
    signer: signer,
    chainId: ChainId.SEPOLIA,       // 11155111
    paymasterAPIKey: paymasterKey,  // 🔥 YOUR BICONOMY PAYMASTER KEY
  });

  await smartAccount.init();
  return smartAccount;
}

// 🔥 SEND GASLESS TX
export async function gaslessTX(
  smartAccount,
  contractAddress,
  abi,
  functionName,
  params = []
) {
  const iface = new ethers.Interface(abi);
  const data = iface.encodeFunctionData(functionName, params);

  const tx = {
    to: contractAddress,
    data: data,
  };

  const response = await smartAccount.sendTransaction(tx);
  return response;
}
