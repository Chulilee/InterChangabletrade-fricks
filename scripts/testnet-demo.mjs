// @ts-nocheck
/**
 * InterChangableTrade — Stellar Testnet demo.
 *
 * Runs a full, real on-chain tokenized-asset trade using the SAME primitives the
 * app uses (Horizon + Stellar DEX offers) and prints verifiable transaction
 * hashes you can open on stellar.expert.
 *
 *   1. Create an issuer and a trader account, funded via Friendbot.
 *   2. Trader opens a trustline to the issuer's asset (ICT).
 *   3. Issuer distributes ICT to the trader.
 *   4. Trader places a real sell offer (ICT → XLM) on the Stellar DEX.
 *
 * Usage:  npm run demo:testnet
 * Set STELLAR_SECRET_KEY to reuse a funded trader account; otherwise a fresh one
 * is generated each run.
 */
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const EXPLORER = "https://stellar.expert/explorer/testnet";
const PASSPHRASE = Networks.TESTNET;

const server = new Horizon.Server(HORIZON_URL);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fund(publicKey) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`);
    if (res.ok) return;
    const body = await res.text().catch(() => "");
    if (body.includes("already") || res.status === 400) return; // already funded
    if (attempt < 4) await sleep(2000);
    else throw new Error(`Friendbot failed for ${publicKey}: ${res.status} ${body.slice(0, 120)}`);
  }
}

async function submit(label, signer, operations) {
  const account = await server.loadAccount(signer.publicKey());
  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  });
  for (const op of operations) builder.addOperation(op);
  const tx = builder.setTimeout(120).build();
  tx.sign(signer);

  try {
    const res = await server.submitTransaction(tx);
    console.log(`  ✓ ${label}`);
    console.log(`    hash: ${res.hash}`);
    console.log(`    ${EXPLORER}/tx/${res.hash}\n`);
    return res.hash;
  } catch (err) {
    const codes = err?.response?.data?.extras?.result_codes;
    console.error(`  ✗ ${label} failed:`, codes ?? err.message ?? err);
    throw err;
  }
}

async function main() {
  console.log("InterChangableTrade — Stellar Testnet demo\n");

  const issuer = Keypair.random();
  const trader = process.env.STELLAR_SECRET_KEY
    ? Keypair.fromSecret(process.env.STELLAR_SECRET_KEY)
    : Keypair.random();

  console.log(`Issuer:  ${issuer.publicKey()}`);
  console.log(`Trader:  ${trader.publicKey()}`);
  if (!process.env.STELLAR_SECRET_KEY) {
    console.log(`Trader secret (Testnet, ephemeral): ${trader.secret()}`);
  }
  console.log();

  console.log("Funding accounts via Friendbot…");
  await Promise.all([fund(issuer.publicKey()), fund(trader.publicKey())]);
  console.log("  funded\n");

  const ICT = new Asset("ICT", issuer.publicKey());
  const hashes = {};

  console.log("1/3  Trader opens a trustline to ICT");
  hashes.trustline = await submit("changeTrust ICT", trader, [
    Operation.changeTrust({ asset: ICT, limit: "1000000" }),
  ]);

  console.log("2/3  Issuer distributes 1,000 ICT to the trader");
  hashes.distribution = await submit("payment 1000 ICT", issuer, [
    Operation.payment({ destination: trader.publicKey(), asset: ICT, amount: "1000" }),
  ]);

  console.log("3/3  Trader places a sell offer: 100 ICT @ 0.50 XLM on the DEX");
  hashes.offer = await submit("manageSellOffer ICT/XLM", trader, [
    Operation.manageSellOffer({
      selling: ICT,
      buying: Asset.native(),
      amount: "100",
      price: "0.5",
      offerId: "0",
    }),
  ]);

  console.log("Done. Verifiable on-chain results:");
  console.log(`  Trustline:    ${EXPLORER}/tx/${hashes.trustline}`);
  console.log(`  Distribution: ${EXPLORER}/tx/${hashes.distribution}`);
  console.log(`  DEX offer:    ${EXPLORER}/tx/${hashes.offer}`);
  console.log(`  Trader acct:  ${EXPLORER}/account/${trader.publicKey()}`);
}

main().catch((err) => {
  console.error("\nDemo failed:", err?.message ?? err);
  process.exit(1);
});
