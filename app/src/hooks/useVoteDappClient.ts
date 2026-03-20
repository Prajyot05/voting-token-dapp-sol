"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { pdaService } from "@/services/pdaService";
import { getProgram } from "@/services/programService";
import type { ProposalItem, TimelineEvent, TreasuryConfig, WinnerItem } from "@/types/voting";
import { useTxStore } from "@/stores/txStore";

type VoterState = {
  voterId: string;
  currentElectionId: bigint;
  proposalVoted: number;
};

type ElectionResultState = {
  electionId: bigint;
  winningProposalId: number;
  numberOfVotes: number;
};

type TreasuryConfigAccount = {
  authority: PublicKey;
  xMint: PublicKey;
  solPrice: BN;
  tokensPerPurchase: BN;
};

type ProposalCounterAccount = {
  proposalCount: number;
};

type ElectionRoundAccount = {
  electionId: BN;
};

type ElectionResultAccount = {
  electionId: BN;
  winningProposalId: number;
  numberOfVotes: number;
};

type WinnerAccount = {
  electionId: BN;
  winningProposalId: number;
  numberOfVotes: number;
  proposalInfo: string;
  declaredAt: BN;
};

type VoterAccount = {
  voterId: PublicKey;
  currentElectionId: BN;
  proposalVoted: number;
};

type ProposalAccount = {
  proposalId: number;
  proposalInfo: string;
  numberOfVotes: number;
  deadline: BN;
  authority: PublicKey;
};

type AccountFetcher = {
  fetch: (address: PublicKey) => Promise<unknown>;
};

type EventProgramApi = {
  addEventListener: (
    eventName: string,
    callback: (event: unknown, slot: number, signature?: string) => void,
  ) => Promise<number>;
  removeEventListener: (listener: number) => Promise<void>;
};

type DashboardState = {
  loading: boolean;
  isReady: boolean;
  streamConnected: boolean;
  electionId: bigint;
  proposalCounter: number;
  treasuryConfig: TreasuryConfig | null;
  electionResult: ElectionResultState | null;
  winner: WinnerItem | null;
  voter: VoterState | null;
  proposals: ProposalItem[];
  timeline: TimelineEvent[];
  walletSol: number;
  walletTokens: number;
  vaultSol: number;
};

const initialState: DashboardState = {
  loading: false,
  isReady: false,
  streamConnected: false,
  electionId: 0n,
  proposalCounter: 0,
  treasuryConfig: null,
  electionResult: null,
  winner: null,
  voter: null,
  proposals: [],
  timeline: [],
  walletSol: 0,
  walletTokens: 0,
  vaultSol: 0,
};

const LAMPORTS_PER_SOL = 1_000_000_000;

async function fetchNullable<T>(fetcher: () => Promise<T>): Promise<T | null> {
  try {
    return await fetcher();
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return null;
}

function numberFromUnknown(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const record = asRecord(value);
  if (record && typeof record.toNumber === "function") {
    return (record.toNumber as () => number)();
  }
  if (record && typeof record.toString === "function") {
    const parsed = Number((record.toString as () => string)());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function pubkeyFromUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  if (record && typeof record.toBase58 === "function") {
    return (record.toBase58 as () => string)();
  }
  if (record && typeof record.toString === "function") {
    return (record.toString as () => string)();
  }
  return "unknown";
}

function mapEventToTimeline(name: string, payload: unknown, slot: number): TimelineEvent | null {
  const event = asRecord(payload);
  if (!event) return null;

  const timestamp = numberFromUnknown(event.timestamp) || Math.floor(Date.now() / 1000);
  const id = `${name}-${slot}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;

  if (name === "ProposalCreated") {
    return {
      id,
      type: "ProposalCreated",
      title: `Proposal #${numberFromUnknown(event.proposalId)} created`,
      detail: String(event.proposalInfo ?? "New proposal submitted"),
      slot,
      timestamp,
    };
  }

  if (name === "VoteCast") {
    return {
      id,
      type: "VoteCast",
      title: `Vote cast on proposal #${numberFromUnknown(event.proposalId)}`,
      detail: `Voter ${pubkeyFromUnknown(event.voter).slice(0, 8)}... | total votes ${numberFromUnknown(event.totalVotes)}`,
      slot,
      timestamp,
    };
  }

  if (name === "WinnerDeclared") {
    return {
      id,
      type: "WinnerDeclared",
      title: `Winner declared: #${numberFromUnknown(event.winningProposalId)}`,
      detail: `${String(event.proposalInfo ?? "Proposal")} with ${numberFromUnknown(event.totalVotes)} votes`,
      slot,
      timestamp,
    };
  }

  if (name === "TokensPurchased") {
    return {
      id,
      type: "TokensPurchased",
      title: "Tokens purchased",
      detail: `${numberFromUnknown(event.tokensReceived)} tokens for ${numberFromUnknown(event.solPaid)} lamports`,
      slot,
      timestamp,
    };
  }

  if (name === "TreasuryInitialized") {
    return {
      id,
      type: "TreasuryInitialized",
      title: "Treasury initialized",
      detail: `Price ${numberFromUnknown(event.solPrice)} lamports, bundle ${numberFromUnknown(event.tokensPerPurchase)} tokens`,
      slot,
      timestamp,
    };
  }

  if (name === "ProposalClosed") {
    return {
      id,
      type: "ProposalClosed",
      title: `Proposal #${numberFromUnknown(event.proposalId)} closed`,
      detail: `Recovered ${numberFromUnknown(event.rentRecovered)} lamports`,
      slot,
      timestamp,
    };
  }

  if (name === "VoterAccountClosed") {
    return {
      id,
      type: "VoterAccountClosed",
      title: "Voter account closed",
      detail: `Voter ${pubkeyFromUnknown(event.voter).slice(0, 8)}...`,
      slot,
      timestamp,
    };
  }

  if (name === "SolWithdrawn") {
    return {
      id,
      type: "SolWithdrawn",
      title: "SOL withdrawn",
      detail: `${numberFromUnknown(event.amount)} lamports withdrawn`,
      slot,
      timestamp,
    };
  }

  return null;
}

export function useVoteDappClient() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const txStore = useTxStore();
  const [state, setState] = useState<DashboardState>(initialState);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const program = useMemo(() => {
    if (!anchorWallet) return null;
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    return getProgram(provider);
  }, [anchorWallet, connection]);

  const pdas = useMemo(() => {
    const treasuryConfig = pdaService.treasuryConfig();
    const proposalCounter = pdaService.proposalCounter();
    const electionRound = pdaService.electionRound();
    const solVault = pdaService.solVault();
    const mintAuthority = pdaService.mintAuthority();
    const xMint = pdaService.xMint();
    return { treasuryConfig, proposalCounter, electionRound, solVault, mintAuthority, xMint };
  }, []);

  const fetchAccountByName = useCallback(
    async <T>(name: string, address: PublicKey): Promise<T> => {
      if (!program) throw new Error("Program not ready");
      const namespace = program.account as unknown as Record<string, AccountFetcher>;
      const client = namespace[name];
      if (!client) throw new Error(`Account namespace not found: ${name}`);
      return (await client.fetch(address)) as T;
    },
    [program],
  );

  const ensureAta = useCallback(
    async (owner: PublicKey, mint: PublicKey) => {
      const walletPk = wallet.publicKey;
      if (!walletPk) throw new Error("Wallet not connected");

      const ata = getAssociatedTokenAddressSync(mint, owner);
      const info = await connection.getAccountInfo(ata);

      if (!info) {
        const tx = new Transaction().add(
          createAssociatedTokenAccountInstruction(walletPk, ata, owner, mint),
        );
        const sig = await wallet.sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, "confirmed");
      }

      return ata;
    },
    [connection, wallet],
  );

  const refresh = useCallback(async () => {
    if (!program) {
      setState((prev) => ({ ...prev, isReady: false, streamConnected: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    const treasuryConfig = await fetchNullable<TreasuryConfigAccount>(() =>
      fetchAccountByName<TreasuryConfigAccount>("treasuryConfig", pdas.treasuryConfig),
    );
    const proposalCounter = await fetchNullable<ProposalCounterAccount>(() =>
      fetchAccountByName<ProposalCounterAccount>("proposalCounter", pdas.proposalCounter),
    );
    const electionRound = await fetchNullable<ElectionRoundAccount>(() =>
      fetchAccountByName<ElectionRoundAccount>("electionRound", pdas.electionRound),
    );

    const electionId = electionRound ? BigInt(electionRound.electionId.toString()) : 0n;

    const electionResult =
      electionId > 0n
        ? await fetchNullable<ElectionResultAccount>(() =>
            fetchAccountByName<ElectionResultAccount>(
              "electionResult",
              pdaService.electionResult(electionId),
            ),
          )
        : null;

    const winner =
      electionId > 0n
        ? await fetchNullable<WinnerAccount>(() =>
            fetchAccountByName<WinnerAccount>("winner", pdaService.winner(electionId)),
          )
        : null;

    const walletPublicKey = wallet.publicKey;
    const voter =
      walletPublicKey !== null
        ? await fetchNullable<VoterAccount>(() =>
            fetchAccountByName<VoterAccount>("voter", pdaService.voter(walletPublicKey)),
          )
        : null;

    const count = proposalCounter ? Number(proposalCounter.proposalCount) : 0;
    const proposalFetches: Promise<ProposalAccount | null>[] = [];

    for (let id = 1; id < count; id += 1) {
      proposalFetches.push(
        fetchNullable<ProposalAccount>(
          () => fetchAccountByName<ProposalAccount>("proposal", pdaService.proposal(id)),
        ),
      );
    }

    const proposalsRaw = await Promise.all(proposalFetches);
    const proposals: ProposalItem[] = proposalsRaw
      .filter((item): item is ProposalAccount => item !== null)
      .map((item) => ({
        proposalId: item.proposalId,
        proposalInfo: item.proposalInfo,
        numberOfVotes: item.numberOfVotes,
        deadline: Number(item.deadline.toString()),
        authority: item.authority.toBase58(),
      }));

    const walletSol = wallet.publicKey
      ? (await connection.getBalance(wallet.publicKey)) / LAMPORTS_PER_SOL
      : 0;

    const vaultSol = (await connection.getBalance(pdas.solVault)) / LAMPORTS_PER_SOL;

    let walletTokens = 0;
    if (wallet.publicKey && treasuryConfig) {
      const userAta = getAssociatedTokenAddressSync(pdas.xMint, wallet.publicKey);
      const tokenBalance = await fetchNullable(() => connection.getTokenAccountBalance(userAta));
      walletTokens = Number(tokenBalance?.value.uiAmount ?? 0);
    }

    setState((prev) => ({
      ...prev,
      loading: false,
      isReady: true,
      electionId,
      proposalCounter: count,
      treasuryConfig: treasuryConfig
        ? {
            authority: treasuryConfig.authority.toBase58(),
            xMint: treasuryConfig.xMint.toBase58(),
            solPrice: BigInt(treasuryConfig.solPrice.toString()),
            tokensPerPurchase: BigInt(treasuryConfig.tokensPerPurchase.toString()),
          }
        : null,
      electionResult: electionResult
        ? {
            electionId: BigInt(electionResult.electionId.toString()),
            winningProposalId: electionResult.winningProposalId,
            numberOfVotes: electionResult.numberOfVotes,
          }
        : null,
      winner: winner
        ? {
            electionId: BigInt(winner.electionId.toString()),
            winningProposalId: winner.winningProposalId,
            numberOfVotes: winner.numberOfVotes,
            proposalInfo: winner.proposalInfo,
            declaredAt: Number(winner.declaredAt.toString()),
          }
        : null,
      voter: voter
        ? {
            voterId: voter.voterId.toBase58(),
            currentElectionId: BigInt(voter.currentElectionId.toString()),
            proposalVoted: voter.proposalVoted,
          }
        : null,
      proposals,
      walletSol,
      walletTokens,
      vaultSol,
    }));
  }, [connection, fetchAccountByName, pdas.electionRound, pdas.proposalCounter, pdas.solVault, pdas.treasuryConfig, pdas.xMint, program, wallet.publicKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const queueRefreshFromStream = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(() => {
      void refresh();
    }, 700);
  }, [refresh]);

  useEffect(() => {
    if (!program) return;

    const eventProgram = program as unknown as EventProgramApi;
    const eventNames = [
      "ProposalCreated",
      "VoteCast",
      "WinnerDeclared",
      "TokensPurchased",
      "TreasuryInitialized",
      "ProposalClosed",
      "VoterAccountClosed",
      "SolWithdrawn",
    ];

    let alive = true;
    const listenerIds: number[] = [];

    const attach = async () => {
      for (const eventName of eventNames) {
        try {
          const id = await eventProgram.addEventListener(
            eventName,
            (event: unknown, slot: number) => {
              if (!alive) return;
              const timelineItem = mapEventToTimeline(eventName, event, slot);
              if (!timelineItem) return;

              setState((prev) => ({
                ...prev,
                timeline: [timelineItem, ...prev.timeline].slice(0, 80),
              }));

              queueRefreshFromStream();
            },
          );

          listenerIds.push(id);
        } catch {
          // Ignore optional listener failures to keep app responsive.
        }
      }

      if (alive) {
        setState((prev) => ({ ...prev, streamConnected: listenerIds.length > 0 }));
      }
    };

    void attach();

    return () => {
      alive = false;
      setState((prev) => ({ ...prev, streamConnected: false }));
      for (const id of listenerIds) {
        void eventProgram.removeEventListener(id);
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [program, queueRefreshFromStream]);

  const runTx = useCallback(
    async (label: string, action: () => Promise<string>) => {
      try {
        txStore.setPending(`${label} in progress...`);
        const sig = await action();
        txStore.setSuccess(`${label} successful`, sig);
        toast.success(`${label} successful`);
        await refresh();
        return sig;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Transaction failed";
        txStore.setError(message);
        toast.error(message);
        throw error;
      }
    },
    [refresh, txStore],
  );

  const requireWallet = useCallback(() => {
    if (!program || !wallet.publicKey) {
      throw new Error("Connect wallet to continue");
    }
    return { program, publicKey: wallet.publicKey };
  }, [program, wallet.publicKey]);

  const initializeTreasury = useCallback(
    async (solPriceLamports: number, tokensPerPurchase: number) => {
      const { program, publicKey } = requireWallet();
      const treasuryAta = getAssociatedTokenAddressSync(pdas.xMint, publicKey);

      return runTx("Initialize Treasury", async () =>
        program.methods
          .initializeTreasury(new BN(solPriceLamports), new BN(tokensPerPurchase))
          .accounts({
            authority: publicKey,
            treasuryConfigAccount: pdas.treasuryConfig,
            proposalCounterAccount: pdas.proposalCounter,
            electionRoundAccount: pdas.electionRound,
            xMint: pdas.xMint,
            treasuryTokenAccount: treasuryAta,
            solVault: pdas.solVault,
            mintAuthority: pdas.mintAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc(),
      );
    },
    [pdas.electionRound, pdas.mintAuthority, pdas.proposalCounter, pdas.solVault, pdas.treasuryConfig, pdas.xMint, requireWallet, runTx],
  );

  const purchaseTokens = useCallback(async () => {
    const { program, publicKey } = requireWallet();
    const treasuryConfig = await fetchAccountByName<TreasuryConfigAccount>(
      "treasuryConfig",
      pdas.treasuryConfig,
    );
    const treasuryAta = getAssociatedTokenAddressSync(pdas.xMint, treasuryConfig.authority);
    const buyerAta = await ensureAta(publicKey, pdas.xMint);

    return runTx("Purchase Tokens", async () =>
      program.methods
        .purchaseTokens()
        .accounts({
          buyer: publicKey,
          solVault: pdas.solVault,
          treasuryTokenAccount: treasuryAta,
          buyerTokenAccount: buyerAta,
          xMint: pdas.xMint,
          mintAuthority: pdas.mintAuthority,
          treasuryConfigAccount: pdas.treasuryConfig,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
    );
  }, [ensureAta, fetchAccountByName, pdas.mintAuthority, pdas.solVault, pdas.treasuryConfig, pdas.xMint, requireWallet, runTx]);

  const registerVoter = useCallback(async () => {
    const { program, publicKey } = requireWallet();
    const voterAccount = pdaService.voter(publicKey);

    return runTx("Register Voter", async () =>
      program.methods
        .registerVoter()
        .accounts({
          authority: publicKey,
          voterAccount,
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
    );
  }, [requireWallet, runTx]);

  const registerProposal = useCallback(
    async (proposalInfo: string, deadlineUnix: number, tokenAmount: number) => {
      const { program, publicKey } = requireWallet();

      const proposalCounter = await fetchAccountByName<ProposalCounterAccount>(
        "proposalCounter",
        pdas.proposalCounter,
      );
      const proposalId = Number(proposalCounter.proposalCount);
      const proposalAccount = pdaService.proposal(proposalId);
      const proposalTokenAccount = await ensureAta(publicKey, pdas.xMint);

      const treasuryConfig = await fetchAccountByName<TreasuryConfigAccount>(
        "treasuryConfig",
        pdas.treasuryConfig,
      );
      const treasuryTokenAccount = getAssociatedTokenAddressSync(pdas.xMint, treasuryConfig.authority);

      return runTx("Register Proposal", async () =>
        program.methods
          .registerProposal(proposalInfo, new BN(deadlineUnix), new BN(tokenAmount))
          .accounts({
            authority: publicKey,
            proposalAccount,
            proposalTokenAccount,
            proposalCounterAccount: pdas.proposalCounter,
            xMint: pdas.xMint,
            treasuryTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc(),
      );
    },
    [ensureAta, fetchAccountByName, pdas.proposalCounter, pdas.treasuryConfig, pdas.xMint, requireWallet, runTx],
  );

  const voteProposal = useCallback(
    async (proposalId: number, tokenAmount: number) => {
      const { program, publicKey } = requireWallet();
      const voterAccount = pdaService.voter(publicKey);
      const voterTokenAccount = await ensureAta(publicKey, pdas.xMint);
      const proposalAccount = pdaService.proposal(proposalId);
      const electionRound = await fetchAccountByName<ElectionRoundAccount>(
        "electionRound",
        pdas.electionRound,
      );
      const electionId = BigInt(electionRound.electionId.toString());
      const electionResultAccount = pdaService.electionResult(electionId);
      const treasuryConfig = await fetchAccountByName<TreasuryConfigAccount>(
        "treasuryConfig",
        pdas.treasuryConfig,
      );
      const treasuryTokenAccount = getAssociatedTokenAddressSync(pdas.xMint, treasuryConfig.authority);

      return runTx("Cast Vote", async () =>
        program.methods
          .proposalToVote(proposalId, new BN(tokenAmount))
          .accounts({
            authority: publicKey,
            voterAccount,
            xMint: pdas.xMint,
            voterTokenAccount,
            treasuryTokenAccount,
            proposalAccount,
            electionRoundAccount: pdas.electionRound,
            electionResultAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc(),
      );
    },
    [ensureAta, fetchAccountByName, pdas.electionRound, pdas.treasuryConfig, pdas.xMint, requireWallet, runTx],
  );

  const pickWinner = useCallback(
    async (proposalId: number) => {
      const { program, publicKey } = requireWallet();
      const electionRound = await fetchAccountByName<ElectionRoundAccount>(
        "electionRound",
        pdas.electionRound,
      );
      const electionId = BigInt(electionRound.electionId.toString());
      const winnerAccount = pdaService.winner(electionId);
      const electionResultAccount = pdaService.electionResult(electionId);
      const proposalAccount = pdaService.proposal(proposalId);

      return runTx("Pick Winner", async () =>
        program.methods
          .pickWinner(proposalId)
          .accounts({
            authority: publicKey,
            electionRoundAccount: pdas.electionRound,
            winnerAccount,
            electionResultAccount,
            proposalAccount,
            systemProgram: SystemProgram.programId,
          })
          .rpc(),
      );
    },
    [fetchAccountByName, pdas.electionRound, requireWallet, runTx],
  );

  const closeProposal = useCallback(
    async (proposalId: number) => {
      const { program, publicKey } = requireWallet();
      const proposalAccount = pdaService.proposal(proposalId);

      return runTx("Close Proposal", async () =>
        program.methods
          .closeProposal(proposalId)
          .accounts({
            proposalAccount,
            destination: publicKey,
            authority: publicKey,
          })
          .rpc(),
      );
    },
    [requireWallet, runTx],
  );

  const closeVoter = useCallback(async () => {
    const { program, publicKey } = requireWallet();
    const voterAccount = pdaService.voter(publicKey);

    return runTx("Close Voter Account", async () =>
      program.methods
        .closeVoter()
        .accounts({
          voterAccount,
          authority: publicKey,
        })
        .rpc(),
    );
  }, [requireWallet, runTx]);

  const withdrawSol = useCallback(
    async (amountLamports: number) => {
      const { program, publicKey } = requireWallet();

      return runTx("Withdraw SOL", async () =>
        program.methods
          .withdrawSol(new BN(amountLamports))
          .accounts({
            treasuryConfigAccount: pdas.treasuryConfig,
            solVault: pdas.solVault,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc(),
      );
    },
    [pdas.solVault, pdas.treasuryConfig, requireWallet, runTx],
  );

  const requestAirdrop = useCallback(
    async (solAmount: number) => {
      if (!wallet.publicKey) throw new Error("Connect wallet to use faucet");

      const lamports = Math.max(1, Math.floor(solAmount * LAMPORTS_PER_SOL));

      txStore.setPending("Requesting faucet airdrop...");
      const signature = await connection.requestAirdrop(wallet.publicKey, lamports);
      const latestBlockhash = await connection.getLatestBlockhash();

      await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed",
      );

      txStore.setSuccess("Airdrop successful", signature);
      toast.success("Airdrop successful");
      await refresh();
      return signature;
    },
    [connection, refresh, txStore, wallet.publicKey],
  );

  const runSetupWizard = useCallback(async () => {
    const { publicKey } = requireWallet();

    const existingTreasury = await fetchNullable<TreasuryConfigAccount>(() =>
      fetchAccountByName<TreasuryConfigAccount>("treasuryConfig", pdas.treasuryConfig),
    );

    if (!existingTreasury) {
      await initializeTreasury(LAMPORTS_PER_SOL, 1_000);
    }

    const userAta = getAssociatedTokenAddressSync(pdas.xMint, publicKey);
    const tokenBalance = await fetchNullable(() => connection.getTokenAccountBalance(userAta));
    const hasTokens = Number(tokenBalance?.value.uiAmount ?? 0) > 0;

    if (!hasTokens) {
      await purchaseTokens();
    }

    const existingVoter = await fetchNullable<VoterAccount>(() =>
      fetchAccountByName<VoterAccount>("voter", pdaService.voter(publicKey)),
    );

    if (!existingVoter) {
      await registerVoter();
    }

    toast.success("Setup wizard completed");
    await refresh();
  }, [
    connection,
    fetchAccountByName,
    initializeTreasury,
    pdas.treasuryConfig,
    pdas.xMint,
    purchaseTokens,
    refresh,
    registerVoter,
    requireWallet,
  ]);

  return {
    ...state,
    txStatus: txStore.status,
    txMessage: txStore.message,
    txSignature: txStore.signature,
    connected: Boolean(wallet.publicKey),
    refresh,
    initializeTreasury,
    purchaseTokens,
    registerVoter,
    registerProposal,
    voteProposal,
    pickWinner,
    closeProposal,
    closeVoter,
    withdrawSol,
    requestAirdrop,
    runSetupWizard,
  };
}
