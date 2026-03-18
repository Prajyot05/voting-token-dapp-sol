import { create } from "zustand";

type WalletStore = {
  walletAddress: string | null;
  isConnected: boolean;
  setWalletAddress: (walletAddress: string | null) => void;
};

export const useWalletStore = create<WalletStore>((set) => ({
  walletAddress: null,
  isConnected: false,
  setWalletAddress: (walletAddress) =>
    set({ walletAddress, isConnected: Boolean(walletAddress) }),
}));
