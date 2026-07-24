import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
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
      schemas: {
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique order identifier' },
            pair: { type: 'string', description: 'Trading pair' },
            side: { type: 'string', enum: ['buy', 'sell'], description: 'Order side' },
            type: { type: 'string', enum: ['limit', 'market'], description: 'Order type' },
            price: { type: 'number', description: 'Order price' },
            quantity: { type: 'number', description: 'Total quantity' },
            filled: { type: 'number', description: 'Filled quantity' },
            remaining: { type: 'number', description: 'Remaining quantity' },
            status: {
              type: 'string',
              enum: ['pending', 'open', 'partial_fill', 'filled', 'cancelled'],
              description: 'Current order status',
            },
            timestamp: { type: 'number', description: 'Creation timestamp' },
          },
        },
        OrderBook: {
          type: 'object',
          properties: {
            pair: { type: 'string' },
            bids: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderBookLevel' },
            },
            asks: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderBookLevel' },
            },
            lastUpdate: { type: 'number', description: 'Last update timestamp' },
          },
        },
        OrderBookLevel: {
          type: 'object',
          properties: {
            price: { type: 'number' },
            quantity: { type: 'number' },
            orderCount: { type: 'integer' },
          },
        },
        Trade: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            side: { type: 'string', enum: ['buy', 'sell'] },
            price: { type: 'number' },
            quantity: { type: 'number' },
            timestamp: { type: 'number' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                status: { type: 'integer' },
                message: { type: 'string' },
                timestamp: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  apis: ['src/app/api/v1/**/*.ts'], // Path to the API routes
};

export const openapiSpec = swaggerJSDoc(swaggerOptions);