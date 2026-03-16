import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VoteDapp } from "../target/types/vote_dapp";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { expect } from "chai";

const SEEDS = {
  TREASURY_CONFIG: "treasury-config",
  SOL_VAULT: "sol-vault",
  X_MINT: "x-mint",
  MINT_AUTHORITY: "mint-authority"
};

const findPDA = (programId: anchor.web3.PublicKey, seeds: (Buffer | Uint8Array)[]): anchor.web3.PublicKey => {
  const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
};

describe("vote_dapp", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.voteDapp as Program<VoteDapp>;
  const adminWallet = (program.provider.wallet as NodeWallet).payer;
  let treasuryConfigPDA: anchor.web3.PublicKey;
  let xMintPDA: anchor.web3.PublicKey;
  let solVaultPDA: anchor.web3.PublicKey;
  let minAuthorityPDA: anchor.web3.PublicKey;

  beforeEach(async () => {
    treasuryConfigPDA = findPDA(program.programId, [Buffer.from(SEEDS.TREASURY_CONFIG)]);
    xMintPDA = findPDA(program.programId, [Buffer.from(SEEDS.X_MINT)]);
    solVaultPDA = findPDA(program.programId, [Buffer.from(SEEDS.SOL_VAULT)]);
    minAuthorityPDA = findPDA(program.programId, [Buffer.from(SEEDS.MINT_AUTHORITY)]);
  });

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
  });
});
