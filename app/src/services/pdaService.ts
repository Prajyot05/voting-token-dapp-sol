import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, SEEDS } from "@/lib/constants";

const programId = new PublicKey(PROGRAM_ID);
const encoder = new TextEncoder();

const strSeed = (value: string) => encoder.encode(value);

const u64Le = (value: bigint) => {
  const buffer = new Uint8Array(8);
  const view = new DataView(buffer.buffer);
  view.setBigUint64(0, value, true);
  return buffer;
};

export const pdaService = {
  treasuryConfig: () =>
    PublicKey.findProgramAddressSync([strSeed(SEEDS.TREASURY_CONFIG)], programId)[0],

  proposalCounter: () =>
    PublicKey.findProgramAddressSync([strSeed(SEEDS.PROPOSAL_COUNTER)], programId)[0],

  electionRound: () =>
    PublicKey.findProgramAddressSync([strSeed(SEEDS.ELECTION_ROUND)], programId)[0],

  electionResult: (electionId: bigint) =>
    PublicKey.findProgramAddressSync(
      [strSeed(SEEDS.ELECTION_RESULT), u64Le(electionId)],
      programId,
    )[0],

  solVault: () =>
    PublicKey.findProgramAddressSync([strSeed(SEEDS.SOL_VAULT)], programId)[0],

  mintAuthority: () =>
    PublicKey.findProgramAddressSync([strSeed(SEEDS.MINT_AUTHORITY)], programId)[0],

  xMint: () => PublicKey.findProgramAddressSync([strSeed(SEEDS.X_MINT)], programId)[0],

  proposal: (proposalId: number) =>
    PublicKey.findProgramAddressSync(
      [strSeed(SEEDS.PROPOSAL), Uint8Array.of(proposalId)],
      programId,
    )[0],

  voter: (authority: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [strSeed(SEEDS.VOTER), authority.toBytes()],
      programId,
    )[0],

  winner: (electionId: bigint) =>
    PublicKey.findProgramAddressSync([strSeed(SEEDS.WINNER), u64Le(electionId)], programId)[0],
};
