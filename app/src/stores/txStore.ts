import { create } from "zustand";
import type { TxStatus } from "@/types/voting";

type TxStore = {
  status: TxStatus;
  message: string;
  signature: string | null;
  setPending: (message: string) => void;
  setSuccess: (message: string, signature?: string) => void;
  setError: (message: string) => void;
  reset: () => void;
};

export const useTxStore = create<TxStore>((set) => ({
  status: "idle",
  message: "",
  signature: null,
  setPending: (message) => set({ status: "pending", message, signature: null }),
  setSuccess: (message, signature) =>
    set({ status: "success", message, signature: signature ?? null }),
  setError: (message) => set({ status: "error", message, signature: null }),
  reset: () => set({ status: "idle", message: "", signature: null }),
}));
