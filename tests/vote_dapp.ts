import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VoteDapp } from "../target/types/vote_dapp";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { expect } from "chai";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

const SEEDS = {
  TREASURY_CONFIG: "treasury-config",
  SOL_VAULT: "sol-vault",
  X_MINT: "x-mint",
  MINT_AUTHORITY: "mint-authority",
  VOTER: "voter",
  PROPOSAL: "proposal",
  PROPOSAL_COUNTER: "proposal-counter",
  ELECTION_ROUND: "election-round",
  ELECTION_RESULT: "election-result",
  WINNER: "winner",
};

const PROPOSAL_ID = 1;
const ELECTION_ID = 1;

const findPDA = (programId: anchor.web3.PublicKey, seeds: (Buffer | Uint8Array)[]): anchor.web3.PublicKey => {
  const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
};

const fundWallet = async (
  connection: anchor.web3.Connection,
  from: anchor.web3.Keypair,
  to: anchor.web3.PublicKey,
  amount: number,
) => {
  const transferIx = anchor.web3.SystemProgram.transfer({
    fromPubkey: from.publicKey,
    toPubkey: to,
    lamports: amount,
  });

  const tx = new anchor.web3.Transaction().add(transferIx);
  await anchor.web3.sendAndConfirmTransaction(connection, tx, [from]);
};

const getBlockTime = async (connection: anchor.web3.Connection): Promise<number> => {
  const slot = await connection.getSlot();
  const blockTime = await connection.getBlockTime(slot);
  
  if(blockTime === null) {
    throw new Error("Failed to fetch block time");
  }
  return blockTime;
};

const expectAnchorErrorCode = (err: unknown, expectedCode: string) => {
  const anyErr = err as any;
  const actualCode =
    anyErr?.error?.errorCode?.code ??
    anyErr?.errorCode?.code ??
    anyErr?.code;
  expect(actualCode).to.equal(expectedCode);
};

describe("vote_dapp", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);

  const program = anchor.workspace.voteDapp as Program<VoteDapp>;
  const adminWallet = (program.provider.wallet as NodeWallet).payer;

  let proposalCreatorWallet = anchor.web3.Keypair.generate();
  let voterWallet = anchor.web3.Keypair.generate();
  let proposalCreatorTokenAccount: anchor.web3.PublicKey;
  let voterTokenAccount: anchor.web3.PublicKey;

  let treasuryConfigPDA: anchor.web3.PublicKey;
  let xMintPDA: anchor.web3.PublicKey;
  let voterPDA: anchor.web3.PublicKey;
  let solVaultPDA: anchor.web3.PublicKey;
  let minAuthorityPDA: anchor.web3.PublicKey;
  let proposalPDA: anchor.web3.PublicKey;
  let proposalCounterPDA: anchor.web3.PublicKey;
  let electionRoundPDA: anchor.web3.PublicKey;
  let electionResultPDA: anchor.web3.PublicKey;
  let winnerPDA: anchor.web3.PublicKey;

  let treasuryTokenAccount: anchor.web3.PublicKey;

  beforeEach(async () => {
    treasuryConfigPDA = findPDA(program.programId, [Buffer.from(SEEDS.TREASURY_CONFIG)]);
    xMintPDA = findPDA(program.programId, [Buffer.from(SEEDS.X_MINT)]);
    voterPDA = findPDA(program.programId, [Buffer.from(SEEDS.VOTER), voterWallet.publicKey.toBuffer()]);
    solVaultPDA = findPDA(program.programId, [Buffer.from(SEEDS.SOL_VAULT)]);
    minAuthorityPDA = findPDA(program.programId, [Buffer.from(SEEDS.MINT_AUTHORITY)]);
    proposalPDA = findPDA(program.programId, [Buffer.from(SEEDS.PROPOSAL), Buffer.from([PROPOSAL_ID])]);
    proposalCounterPDA = findPDA(program.programId, [Buffer.from(SEEDS.PROPOSAL_COUNTER)]);
    electionRoundPDA = findPDA(program.programId, [Buffer.from(SEEDS.ELECTION_ROUND)]);
    electionResultPDA = findPDA(program.programId, [Buffer.from(SEEDS.ELECTION_RESULT), Buffer.from(new anchor.BN(ELECTION_ID).toArray("le", 8))]);
    winnerPDA = findPDA(program.programId, [Buffer.from(SEEDS.WINNER), Buffer.from(new anchor.BN(ELECTION_ID).toArray("le", 8))]);

    console.log("Funding wallets...");
    await Promise.all([
      fundWallet(connection, adminWallet, proposalCreatorWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
      fundWallet(connection, adminWallet, voterWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
    ]);
    console.log("Funding completed.");
  });

  const createTokenAccounts = async () => {
    console.log("Creating Treasury Token Account for Admin...");
    treasuryTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      adminWallet,
      xMintPDA,
      adminWallet.publicKey
    )).address;

    proposalCreatorTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      proposalCreatorWallet,
      xMintPDA,
      proposalCreatorWallet.publicKey
    )).address;

    voterTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      voterWallet,
      xMintPDA,
      voterWallet.publicKey
    )).address;
  };

  describe("1. Initialize", () => {
    it("Initializes Treasury!", async () => {
      const solPrice = new anchor.BN(1000_000_000);
      const tokensPerPurchase = new anchor.BN(1000_000_000);

      console.log("Treasury Config PDA:", treasuryConfigPDA.toBase58());

      await program.methods.initializeTreasury(solPrice, tokensPerPurchase).accounts({
        authority: adminWallet.publicKey,
      }).rpc();

      const treasuryConfigAccount = await program.account.treasuryConfig.fetch(treasuryConfigPDA);
      console.log("Treasury Config Account:", treasuryConfigAccount);

      expect(treasuryConfigAccount.authority.toBase58()).to.be.equal(adminWallet.publicKey.toBase58());
      expect(treasuryConfigAccount.solPrice.toString()).to.be.equal(solPrice.toString());
      expect(treasuryConfigAccount.tokensPerPurchase.toString()).to.be.equal(tokensPerPurchase.toString());

      await createTokenAccounts();
    });
  });

  describe("2. Purchase Tokens", () => {
    it("2.1 Buys tokens for proposal creator!", async () => {
      const tokenBalanceBefore = await connection.getTokenAccountBalance(proposalCreatorTokenAccount);
      console.log("Proposal Creator Token Balance Before:", tokenBalanceBefore.value.uiAmount);
      await program.methods.purchaseTokens().accounts({
        buyer: proposalCreatorWallet.publicKey,
        treasuryTokenAccount: treasuryTokenAccount,
        buyerTokenAccount: proposalCreatorTokenAccount,
        xMint: xMintPDA,
      }).signers([proposalCreatorWallet]).rpc();
      const tokenBalanceAfter = await connection.getTokenAccountBalance(proposalCreatorTokenAccount);
      console.log("Proposal Creator Token Balance After:", tokenBalanceAfter.value.uiAmount);

      expect(tokenBalanceAfter.value.uiAmount).to.be.greaterThan(tokenBalanceBefore.value.uiAmount);
    });

    it("2.2 Buys tokens for voter!", async () => {
      const tokenBalanceBefore = await connection.getTokenAccountBalance(voterTokenAccount);
      console.log("Voter Token Balance Before:", tokenBalanceBefore.value.uiAmount);
      await program.methods.purchaseTokens().accounts({
        buyer: voterWallet.publicKey,
        treasuryTokenAccount: treasuryTokenAccount,
        buyerTokenAccount: voterTokenAccount,
        xMint: xMintPDA,
      }).signers([voterWallet]).rpc();
      const tokenBalanceAfter = await connection.getTokenAccountBalance(voterTokenAccount);
      console.log("Voter Token Balance After:", tokenBalanceAfter.value.uiAmount);

      expect(tokenBalanceAfter.value.uiAmount).to.be.greaterThan(tokenBalanceBefore.value.uiAmount);
    });
  });

  describe("3. Register Voter", () => {
    it("Registers a voter!", async () => {
      await program.methods.registerVoter().accounts({
        authority: voterWallet.publicKey,
      }).signers([voterWallet]).rpc();

      const voterAccount = await program.account.voter.fetch(findPDA(program.programId, [Buffer.from("voter"), voterWallet.publicKey.toBuffer()]));
      console.log("Voter Account:", voterAccount);

      expect(voterAccount.voterId.toBase58()).to.be.equal(voterWallet.publicKey.toBase58());
    });
  });

  describe("4. Register Proposal", () => {
    it("Registers a proposal!", async () => {
      const currentBlockTime = await getBlockTime(connection);
      const proposalInfo = "Proposal 1: Increase Budget for Project X";
      const deadline = new anchor.BN(currentBlockTime).add(new anchor.BN(10));
      const stakeAmount = new anchor.BN(1000);

      await program.methods.registerProposal(proposalInfo, deadline, stakeAmount).accounts({
        authority: proposalCreatorWallet.publicKey,
        proposalCounterAccount: proposalCounterPDA,
        proposalTokenAccount: proposalCreatorTokenAccount,
        xMint: xMintPDA,
        treasuryTokenAccount: treasuryTokenAccount,
      }).signers([proposalCreatorWallet]).rpc();

      const proposalAccount = await program.account.proposal.fetch(proposalPDA);
      console.log("Proposal Account:", proposalAccount);

      expect(proposalAccount.proposalInfo).to.be.equal(proposalInfo);
      expect(proposalAccount.deadline.toNumber()).to.be.equal(deadline.toNumber());
      expect(proposalAccount.authority.toBase58()).to.be.equal(proposalCreatorWallet.publicKey.toBase58());
      expect(proposalAccount.proposalId).to.be.equal(1);
      expect(proposalAccount.numberOfVotes).to.be.equal(0);
    });
  });

  describe("5. Vote on Proposal", () => {
    it("Votes on a proposal!", async () => {
      const tokenAmount = new anchor.BN(100);

      await program.methods.proposalToVote(PROPOSAL_ID, tokenAmount).accounts({
        voterTokenAccount: voterTokenAccount,
        xMint: xMintPDA,
        treasuryTokenAccount: treasuryTokenAccount,
        authority: voterWallet.publicKey,
      }).signers([voterWallet]).rpc();

      const proposalAccount = await program.account.proposal.fetch(proposalPDA);
      console.log("Proposal Account After Vote:", proposalAccount); 

      expect(proposalAccount.numberOfVotes).to.be.equal(1);
    });
  });

  describe("6. Pick Winner", () => {
    it("6.1 Fails to pick a winner before deadline passes!", async () => {
      try{
        await program.methods
          .pickWinner(PROPOSAL_ID)
          .accounts({
            authority: adminWallet.publicKey,
          })
          .rpc();
      }catch(error){
       expectAnchorErrorCode(error,"VotingStillActive")
      }
    });

    it("6.2 Picks a winner after deadline!", async () => {
      await new Promise(resolve => setTimeout(resolve, 11000));

      await program.methods
        .pickWinner(PROPOSAL_ID)
        .accounts({
          authority: adminWallet.publicKey,
        })
        .rpc();

      const winnerAccount = await program.account.winner.fetch(winnerPDA);
      console.log("Winner Account:", winnerAccount);

      expect(winnerAccount.winningProposalId).to.be.equal(PROPOSAL_ID);
      expect(winnerAccount.numberOfVotes).to.be.equal(1);
      expect(winnerAccount.proposalInfo).to.be.equal("Proposal 1: Increase Budget for Project X");
      expect(winnerAccount.electionId.toNumber()).to.be.equal(ELECTION_ID);
    });
  });

  describe("7. Close Proposal Account", () => {
    it("7.1 Should close proposal after deadline and recover rent", async () => {
      const accountInfoBefore = await connection.getAccountInfo(proposalPDA);
      expect(accountInfoBefore).to.not.be.null;

      await program.methods
        .closeProposal(PROPOSAL_ID)
        .accounts({
          destination: proposalCreatorWallet.publicKey,
          authority: proposalCreatorWallet.publicKey,
        })
        .signers([proposalCreatorWallet])
        .rpc();

      const accountInfoAfter = await connection.getAccountInfo(proposalPDA);
      expect(accountInfoAfter).to.be.null;
    });
  });

  describe("8. Close Voter Account", () => {
    it("8.1 Should close voter account and recover rent", async () => {
      const accountInfoBefore = await connection.getAccountInfo(voterPDA);
      expect(accountInfoBefore).to.not.be.null;

      const voterBalanceBefore = await connection.getBalance(voterWallet.publicKey);
      console.log("Voter Balance Before:", voterBalanceBefore);

      await program.methods
        .closeVoter()
        .accounts({
          authority: voterWallet.publicKey,
        })
        .signers([voterWallet])
        .rpc();

      const voterBalanceAfter = await connection.getBalance(voterWallet.publicKey);
      console.log("Voter Balance After:", voterBalanceAfter);

      const accountInfoAfter = await connection.getAccountInfo(voterPDA);
      expect(accountInfoAfter).to.be.null;
      expect(voterBalanceAfter).to.be.greaterThan(voterBalanceBefore - 200000);
    });
  });

  describe("9. SOL Withdrawal", () => {
    it("9.1 Should allow admin to withdraw SOL from treasury", async () => {
      const withdrawAmount = new anchor.BN(100_000);
      const adminBalanceBefore = await connection.getBalance(adminWallet.publicKey);

      const vaultBalance = await connection.getBalance(solVaultPDA);
      if (vaultBalance >= withdrawAmount.toNumber()) {
        await program.methods
          .withdrawSol(withdrawAmount)
          .accounts({
            authority: adminWallet.publicKey,
          })
          .rpc();

        const adminBalanceAfter = await connection.getBalance(adminWallet.publicKey);
        expect(adminBalanceAfter).to.be.greaterThan(adminBalanceBefore - 100000);
      } else {
        console.log("(Insufficient SOL in vault for withdrawal test)");
      }
    });

    it("9.2 Should fail when non-admin tries to withdraw SOL", async () => {
      const withdrawAmount = new anchor.BN(100_000);

      try {
        await program.methods
          .withdrawSol(withdrawAmount)
          .accounts({
            authority: voterWallet.publicKey,
          })
          .signers([voterWallet])
          .rpc();
        expect.fail("Expected withdrawal to fail - unauthorized user");
      } catch (err) {
        expectAnchorErrorCode(err, "UnauthorizedAccess");
      }
    });
  });
});
