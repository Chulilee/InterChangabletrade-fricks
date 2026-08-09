# InterChangableTrade-Fricks

> Web frontend for trading tokenized assets on the **Stellar** network. Wallet
> connection, balances, funding, and order placement run against **Stellar
> Testnet** today — not mocks.

## What works today

- **Real wallet auth** via [Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit) — connect Freighter, xBull, or Albedo and the app uses your real `G…` account.
- **Real balances & funding** — native XLM balance is read from Horizon; a new Testnet account can be topped up in one click via Friendbot.
- **Real on-chain trading** — placing an order builds a Stellar DEX `manageBuyOffer` / `manageSellOffer`, signs it with your wallet, and submits it to Horizon. Buys open the required trustline first. Settlement lands on the ledger's native order book — no custody, no intermediary.
- **Off-chain routing simulator** — an in-memory matching engine and a versioned REST API (OpenAPI 3.0) used for order-routing experiments and integration tests.

Seed data, clearly scoped: the marketplace catalogue and portfolio holdings are
illustrative until the InterChangableTrade-Core API is wired in. Everything under
**wallet** and **trade** is live Stellar.

## Verifiable on-chain proof

`npm run demo:testnet` runs a full tokenized-asset trade on Stellar Testnet using
the same primitives the app uses. A recent run (Testnet, ledgers 4048292–4048294):

| Step | Transaction |
|------|-------------|
| Trustline (ICT) | [`a9fed75c…7ec2c5`](https://stellar.expert/explorer/testnet/tx/a9fed75c9974db95657f5516a6ef426fd1da7a3b98910d7ff282b4bbad7ec2c5) |
| Asset distribution | [`dc001019…11e208`](https://stellar.expert/explorer/testnet/tx/dc0010193ca55b1ec5b48409370821bbc150e7222fc9d5d728e69c78ed11e208) |
| DEX sell offer | [`72168e09…be5f15`](https://stellar.expert/explorer/testnet/tx/72168e0937e87abf96ee156f8e4078c8c58f04f6bbc74c9252681e7faebe5f15) |

Each hash resolves on stellar.expert and returns `successful: true` from Horizon.

## Technology stack

- Next.js 15 · React 19 · TypeScript · Tailwind CSS
- [@stellar/stellar-sdk](https://www.npmjs.com/package/@stellar/stellar-sdk) — Horizon client, transaction building, DEX operations
- [@creit.tech/stellar-wallets-kit](https://www.npmjs.com/package/@creit.tech/stellar-wallets-kit) — multi-wallet connection & signing

## Architecture

```
src/lib/stellar/
  config.ts    network config (Testnet/Public, endpoints, explorer)
  horizon.ts   Horizon client: accounts, balances, Friendbot funding, submit
  dex.ts       build trustline + manageBuy/SellOffer transactions
  wallet.ts    Stellar Wallets Kit wrapper (connect / sign / submit)
src/services/
  tradeService.ts   client-only: place a real DEX order end-to-end
  assetService.ts   read-only catalogue/portfolio (seed data)
src/hooks/useWallet.ts   React wallet state (address, balance, fund)
```

The Stellar layer is shared: in the browser the user signs through a wallet
extension, while `scripts/testnet-demo.mjs` signs with a keypair — both exercise
the same Horizon and DEX code paths.

## Getting started

```bash
git clone https://github.com/InterChangableTrade/InterChangableTrade-Fricks.git
cd InterChangableTrade-Fricks
npm install
cp .env.example .env.local   # defaults to Stellar Testnet
npm run dev
```

To trade in the UI, install a Stellar wallet (e.g. Freighter) set to **Testnet**.
Connect, click **Fund (Testnet)** if the account is new, then place an order from
any asset page and follow the transaction link to stellar.expert.

## Testnet demo (no browser needed)

```bash
npm run demo:testnet
```

Generates an issuer + trader, funds them via Friendbot, opens a trustline,
distributes a token, and places a real DEX offer — printing every transaction
hash with a stellar.expert link. Set `STELLAR_SECRET_KEY` to reuse a funded
Testnet account instead of generating a fresh one.

## REST API (order-routing simulator)

A versioned REST API backs the off-chain matching/routing experiments. It follows
OpenAPI 3.0 and is independent of the on-chain DEX path above.

- **Interactive Swagger UI**: `/api/docs`
- **Raw spec**: `/api/docs/openapi.json`
- **Base URL**: all endpoints are prefixed with `/api/v1`
- **Auth**: `x-api-key` header (e.g. `sk_test_12345`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/orders` | Submit a new order |
| GET | `/v1/orders/{id}` | Get order status |
| DELETE | `/v1/orders/{id}` | Cancel an order |
| GET | `/v1/markets/{pair}/book` | Order book snapshot |
| GET | `/v1/markets/{pair}/trades` | Recent trades (paginated) |

```javascript
await fetch('/api/v1/orders', {
  method: 'POST',
  headers: { 'x-api-key': 'sk_test_12345', 'Content-Type': 'application/json' },
  body: JSON.stringify({ pair: 'XLM/USD', side: 'buy', type: 'limit', price: '0.50', amount: '100' }),
});
```

## Roadmap

Planned, and honestly **not built yet**:

- Soroban smart-contract settlement for asset issuance and escrow (no contract exists in this repo today).
- Live market data and portfolio backed by the InterChangableTrade-Core API, replacing seed data.
- Path-payment order types and multi-hop routing across the Stellar DEX.
- Public-network (mainnet) support hardening.

## Testing

```bash
npm run type-check   # tsc --noEmit
npm test             # Jest unit tests (trading engine, API, order router)
npm run test:e2e     # Playwright end-to-end
```

## Related repositories

- InterChangableTrade-Core — market data & account API (in progress)
- InterChangableTrade-Protocol — asset/issuance specifications (in progress)

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0 — see [LICENSE](LICENSE).
