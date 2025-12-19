import { Connection, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey('TrenchRunner111111111111111111111111111111111');

export async function buildSubmitScoreIx(player: PublicKey, score: number) {
  const [pda] = PublicKey.findProgramAddressSync([
    Buffer.from('highscore'),
    player.toBuffer(),
  ], PROGRAM_ID);
  const data = Buffer.alloc(9);
  data.writeUInt8(0, 0); // discriminator for submit_score
  data.writeBigUInt64LE(BigInt(score), 1);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: player, isSigner: true, isWritable: true },
      { pubkey: pda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export async function fetchHighScore(connection: Connection, player: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync([
    Buffer.from('highscore'),
    player.toBuffer(),
  ], PROGRAM_ID);
  const account = await connection.getAccountInfo(pda);
  if (!account) return 0;
  const view = account.data.subarray(8); // skip anchor discriminator
  return Number(view.readBigUInt64LE(0));
}
