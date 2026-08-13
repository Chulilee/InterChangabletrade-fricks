import { NextResponse } from 'next/server';

// Manually created OpenAPI specification since we couldn't install swagger-jsdoc
const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'InterChangableTrade API',
    version: '1.0.0',
    description: 'REST API for trading operations and market data access',
    license: {
      name: 'Apache-2.0',
      url: 'https://www.apache.org/licenses/LICENSE-2.0',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 server',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API key for authentication',
      },
    },
  },
  paths: {
    '/orders': {
      post: {
        summary: 'Submit a new order',
        description: 'Creates and submits a new trading order to the exchange',
        tags: ['Orders'],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['pair', 'side', 'type', 'price', 'quantity'],
                properties: {
                  pair: {
                    type: 'string',
                    example: 'BTC/USDT',
                    description: 'Trading pair symbol',
                  },
                  side: {
                    type: 'string',
                    enum: ['buy', 'sell'],
                    example: 'buy',
                    description: 'Order side (buy or sell)',
                  },
                  type: {
                    type: 'string',
                    enum: ['limit', 'market'],
                    example: 'limit',
                    description: 'Order type (limit or market)',
                  },
                  price: {
                    type: 'number',
                    example: 50000.0,
                    description: 'Order price (required for limit orders)',
                  },
                  quantity: {
                    type: 'number',
                    example: 0.1,
                    description: 'Order quantity to trade',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Order created successfully',
          },
          '400': {
            description: 'Invalid request parameters',
          },
          '401': {
            description: 'Unauthorized - Invalid or missing API key',
          },
          '429': {
            description: 'Rate limit exceeded',
          },
        },
      },
    },
    '/orders/{id}': {
      get: {
        summary: 'Get order status',
        description: 'Retrieves the current status and details of a specific order',
        tags: ['Orders'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'The unique identifier of the order',
            schema: {
              type: 'string',
              example: 'ord_1234567890_abc123def',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Order status retrieved successfully',
          },
          '404': {
            description: 'Order not found',
          },
          '401': {
            description: 'Unauthorized - Invalid or missing API key',
          },
        },
      },
      delete: {
        summary: 'Cancel an order',
        description: 'Cancels a pending or open order',
        tags: ['Orders'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'The unique identifier of the order to cancel',
            schema: {
              type: 'string',
              example: 'ord_1234567890_abc123def',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Order cancelled successfully',
          },
          '400': {
            description: 'Order cannot be cancelled (already filled or cancelled)',
          },
          '404': {
            description: 'Order not found',
          },
          '401': {
            description: 'Unauthorized - Invalid or missing API key',
          },
        },
      },
    },
    '/markets/{pair}/book': {
      get: {
        summary: 'Get order book snapshot',
        description: 'Retrieves the current order book snapshot for a trading pair',
        tags: ['Market Data'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'pair',
            in: 'path',
            required: true,
            description: 'Trading pair symbol',
            schema: {
              type: 'string',
              example: 'BTC/USDT',
            },
          },
          {
            name: 'depth',
            in: 'query',
            required: false,
            description: 'Number of order levels to return (default: 20, max: 100)',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Order book snapshot retrieved successfully',
          },
          '400': {
            description: 'Invalid request parameters',
          },
          '401': {
            description: 'Unauthorized - Invalid or missing API key',
          },
        },
      },
    },
    '/markets/{pair}/trades': {
      get: {
        summary: 'Get recent trades',
        description: 'Retrieves paginated list of executed trades for a trading pair',
        tags: ['Market Data'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'pair',
            in: 'path',
            required: true,
            description: 'Trading pair symbol',
            schema: {
              type: 'string',
              example: 'BTC/USDT',
            },
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            description: 'Page number for pagination (default: 1)',
            schema: {
              type: 'integer',
              minimum: 1,
              default: 1,
            },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Number of trades per page (default: 50, max: 200)',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 200,
              default: 50,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Trades retrieved successfully',
          },
          '400': {
            description: 'Invalid request parameters',
          },
          '401': {
            description: 'Unauthorized - Invalid or missing API key',
          },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openapiSpec);
}