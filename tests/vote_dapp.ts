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
};

const PROPOSAL_ID = 1;

const findPDA = (programId: anchor.web3.PublicKey, seeds: (Buffer | Uint8Array)[]): anchor.web3.PublicKey => {
  const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
};

const airDropSol = async (connection: anchor.web3.Connection, publicKey: anchor.web3.PublicKey, amount: number) => {
  const signature = await connection.requestAirdrop(publicKey, amount);

  const latestBlockHash = await connection.getLatestBlockhash();

  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: signature,
  });
}

const getBlockTime = async (connection: anchor.web3.Connection): Promise<number> => {
  const slot = await connection.getSlot();
  const blockTime = await connection.getBlockTime(slot);
  
  if(blockTime === null) {
    throw new Error("Failed to fetch block time");
  }
  return blockTime;
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

  let treasuryTokenAccount: anchor.web3.PublicKey;

  beforeEach(async () => {
    treasuryConfigPDA = findPDA(program.programId, [Buffer.from(SEEDS.TREASURY_CONFIG)]);
    xMintPDA = findPDA(program.programId, [Buffer.from(SEEDS.X_MINT)]);
    voterPDA = findPDA(program.programId, [Buffer.from(SEEDS.VOTER), voterWallet.publicKey.toBuffer()]);
    solVaultPDA = findPDA(program.programId, [Buffer.from(SEEDS.SOL_VAULT)]);
    minAuthorityPDA = findPDA(program.programId, [Buffer.from(SEEDS.MINT_AUTHORITY)]);
    // On-chain seed uses ProposalCounter.proposal_count (u8), so this seed must be 1 byte.
    proposalPDA = findPDA(program.programId, [Buffer.from(SEEDS.PROPOSAL), Buffer.from([PROPOSAL_ID])]);
    proposalCounterPDA = findPDA(program.programId, [Buffer.from(SEEDS.PROPOSAL_COUNTER)]);

    console.log("Airdropping SOL...");
    await Promise.all([
      airDropSol(connection, proposalCreatorWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
      airDropSol(connection, voterWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
    ]);
    console.log("Airdrop completed.");
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
      const solPrice = new anchor.BN(1000_000_000); // 1 SOL = 1000 USDC (6 decimals)
      const tokensPerPurchase = new anchor.BN(1000_000_000); // 100 xTokens per purchase

      // Here only the address is generated, the account is not created on-chain until the instruction is executed. So we can log the PDAs before the transaction to verify they are derived correctly.
      console.log("Treasury Config PDA:", treasuryConfigPDA.toBase58());

      await program.methods.initializeTreasury(solPrice, tokensPerPurchase).accounts({
        authority: adminWallet.publicKey,
      }).rpc();

      // Now those addresses are now actual accounts on the blockchain, we can fetch them to verify their data.
      const treasuryConfigAccount = await program.account.treasuryConfig.fetch(treasuryConfigPDA);
      console.log("Treasury Config Account:", treasuryConfigAccount);

      // Assertions
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

      // Assertions
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

      // Assertions
      expect(tokenBalanceAfter.value.uiAmount).to.be.greaterThan(tokenBalanceBefore.value.uiAmount);
    });
  });

  describe("3. Register Voter", () => {
    it("Registers a voter!", async () => {
      await program.methods.registerVoter().accounts({
        authority: voterWallet.publicKey,
      }).signers([voterWallet]).rpc();

      // Fetch the voter account to verify
      const voterAccount = await program.account.voter.fetch(findPDA(program.programId, [Buffer.from("voter"), voterWallet.publicKey.toBuffer()]));
      console.log("Voter Account:", voterAccount);

      // Assertions
      expect(voterAccount.voterId.toBase58()).to.be.equal(voterWallet.publicKey.toBase58());
    });
  });

  describe("4. Register Proposal", () => {
    it("Registers a proposal!", async () => {
      const currentBlockTime = await getBlockTime(connection);
      const proposalInfo = "Proposal 1: Increase Budget for Project X";
      const deadline = new anchor.BN(currentBlockTime).add(new anchor.BN(10)); // Deadline set to 10 seconds from now
      const stakeAmount = new anchor.BN(1000); // Stake 1000 tokens to create proposal

      await program.methods.registerProposal(proposalInfo, deadline, stakeAmount).accounts({
        authority: proposalCreatorWallet.publicKey,
        proposalCounterAccount: proposalCounterPDA,
        proposalTokenAccount: proposalCreatorTokenAccount,
        xMint: xMintPDA,
        treasuryTokenAccount: treasuryTokenAccount,
      }).signers([proposalCreatorWallet]).rpc();

      // Fetch the proposal account to verify
      const proposalAccount = await program.account.proposal.fetch(proposalPDA);
      console.log("Proposal Account:", proposalAccount);

      // Assertions
      expect(proposalAccount.proposalInfo).to.be.equal(proposalInfo);
      expect(proposalAccount.deadline.toNumber()).to.be.equal(deadline.toNumber());
      expect(proposalAccount.authority.toBase58()).to.be.equal(proposalCreatorWallet.publicKey.toBase58());
      expect(proposalAccount.proposalId).to.be.equal(1); // First proposal should have ID 1
      expect(proposalAccount.numberOfVotes).to.be.equal(0); // No votes yet
    });
  });

  describe("5. Vote on Proposal", () => {
    it("Votes on a proposal!", async () => {
      const tokenAmount = new anchor.BN(100); // Stake 100 tokens to vote

      await program.methods.proposalToVote(PROPOSAL_ID, tokenAmount).accounts({
        voterTokenAccount: voterTokenAccount, // Using proposal creator's token account for voting in this test
        xMint: xMintPDA,
        treasuryTokenAccount: treasuryTokenAccount,
        authority: voterWallet.publicKey,
      }).signers([voterWallet]).rpc();

      // Fetch the proposal account to verify the vote count
      const proposalAccount = await program.account.proposal.fetch(proposalPDA);
      console.log("Proposal Account After Vote:", proposalAccount); 

      // Assertions
      expect(proposalAccount.numberOfVotes).to.be.equal(1); // Should have 1 vote now
    });
  });
});
