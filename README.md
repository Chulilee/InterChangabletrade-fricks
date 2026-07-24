# InterChangableTrade-Fricks

> The official frontend for the InterChangableTrade ecosystem built on the Stellar blockchain.

## Overview

InterChangableTrade-Fricks is the user-facing application that enables businesses and individuals to interact with the InterChangableTrade ecosystem. It provides a modern web interface for discovering, issuing, trading, and managing tokenized assets powered by the Stellar network and Soroban smart contracts.

This repository is part of the InterChangableTrade open-source ecosystem.

## Features (MVP)

- Wallet authentication
- Marketplace dashboard
- Asset listings
- Asset details
- Trading interface
- Portfolio overview
- Responsive UI
- Integration with InterChangableTrade-Core APIs

## Technology Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Stellar Wallets Kit

## Project Structure

```
src/
components/
hooks/
services/
types/
public/
```

## Getting Started

```bash
git clone https://github.com/InterChangableTrade/InterChangableTrade-Fricks.git

cd InterChangableTrade-Fricks

npm install

npm run dev
```

## Related Repositories

- InterChangableTrade-Core
- InterChangableTrade-Protocol

## Contributing

We welcome contributions from the community. Please read our Contributing Guide before submitting pull requests.

## API Documentation

The application includes a secure, versioned REST API for trading operations and market data access, following OpenAPI 3.0 specifications.

### Base URL
All API endpoints are prefixed with `/api/v1`

### Authentication
API requests require an API key passed in the `x-api-key` header. Example format: `sk_test_12345` (test key) or `sk_live_<client-id>` (production key).

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/orders` | Submit a new order |
| GET | `/v1/orders/{id}` | Get order status |
| DELETE | `/v1/orders/{id}` | Cancel an order |
| GET | `/v1/markets/{pair}/book` | Get order book snapshot |
| GET | `/v1/markets/{pair}/trades` | Get recent trades (with pagination) |

### Example Usage

```javascript
// Submit an order
const submitOrder = async () => {
  const response = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: {
      'x-api-key': 'sk_test_12345',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pair: 'XLM/USD',
      side: 'buy',
      type: 'limit',
      price: '0.50',
      amount: '100'
    })
  });
  return await response.json();
};

// Get order status
const getOrder = async (orderId) => {
  const response = await fetch(`/api/v1/orders/${orderId}`, {
    headers: { 'x-api-key': 'sk_test_12345' }
  });
  return await response.json();
};

// Get paginated trades
const getTrades = async (page = 1, limit = 50) => {
  const response = await fetch(`/api/v1/markets/XLM/USD/trades?page=${page}&limit=${limit}`, {
    headers: { 'x-api-key': 'sk_test_12345' }
  });
  return await response.json();
};
```

### OpenAPI Documentation
- **Interactive Swagger UI**: Access at `/api/docs` - browse and test all API endpoints directly in your browser
- **Raw OpenAPI Spec**: Download the full specification at `/api/docs/openapi.json`

## License

Apache-2.0