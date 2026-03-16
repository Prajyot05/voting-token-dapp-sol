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
  VOTER: "voter"
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

describe("vote_dapp", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);

  const program = anchor.workspace.voteDapp as Program<VoteDapp>;
  const adminWallet = (program.provider.wallet as NodeWallet).payer;

  let proposalCreatorWallet = anchor.web3.Keypair.generate();
  let voterWallet = anchor.web3.Keypair.generate();
  let proposalCreatorTokenAccount: anchor.web3.PublicKey;

  let treasuryConfigPDA: anchor.web3.PublicKey;
  let xMintPDA: anchor.web3.PublicKey;
  let voterPDA: anchor.web3.PublicKey;
  let solVaultPDA: anchor.web3.PublicKey;
  let minAuthorityPDA: anchor.web3.PublicKey;

  let treasuryTokenAccount: anchor.web3.PublicKey;

  beforeEach(async () => {
    treasuryConfigPDA = findPDA(program.programId, [Buffer.from(SEEDS.TREASURY_CONFIG)]);
    xMintPDA = findPDA(program.programId, [Buffer.from(SEEDS.X_MINT)]);
    voterPDA = findPDA(program.programId, [Buffer.from(SEEDS.VOTER), voterWallet.publicKey.toBuffer()]);
    solVaultPDA = findPDA(program.programId, [Buffer.from(SEEDS.SOL_VAULT)]);
    minAuthorityPDA = findPDA(program.programId, [Buffer.from(SEEDS.MINT_AUTHORITY)]);

    console.log("Airdropping SOL to Proposal Creator...");
    await airDropSol(connection, proposalCreatorWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    console.log("Proposal Creator SOL Balance:", (await connection.getBalance(proposalCreatorWallet.publicKey)) / anchor.web3.LAMPORTS_PER_SOL, "SOL");

    console.log("Airdropping SOL to Voter...");
    await airDropSol(connection, voterWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    console.log("Voter SOL Balance:", (await connection.getBalance(voterWallet.publicKey)) / anchor.web3.LAMPORTS_PER_SOL, "SOL");
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
    it("Buys tokens!", async () => {
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
});
