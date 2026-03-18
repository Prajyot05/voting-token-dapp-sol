"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { ProposalItem, TreasuryConfig, WinnerItem } from "@/types/voting";
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

type DashboardState = {
  loading: boolean;
  isReady: boolean;
  electionId: bigint;
  proposalCounter: number;
  treasuryConfig: TreasuryConfig | null;
  electionResult: ElectionResultState | null;
  winner: WinnerItem | null;
  voter: VoterState | null;
  proposals: ProposalItem[];
  walletSol: number;
  walletTokens: number;
  vaultSol: number;
};

const initialState: DashboardState = {
  loading: false,
  isReady: false,
  electionId: 0n,
  proposalCounter: 0,
  treasuryConfig: null,
  electionResult: null,
  winner: null,
  voter: null,
  proposals: [],
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

export function useVoteDappClient() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const txStore = useTxStore();
  const [state, setState] = useState<DashboardState>(initialState);

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
      setState((prev) => ({ ...prev, isReady: false }));
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

    setState({
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
    });
  }, [connection, fetchAccountByName, pdas.electionRound, pdas.proposalCounter, pdas.solVault, pdas.treasuryConfig, pdas.xMint, program, wallet.publicKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
  };
}
