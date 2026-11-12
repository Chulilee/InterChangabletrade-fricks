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
        PaginationLinks: {
          type: 'object',
          description: 'RFC 8288-style navigation links for a paginated list. Nulls at the boundaries.',
          properties: {
            first: { type: 'string', nullable: true, description: 'Absolute URL of the first page' },
            prev: { type: 'string', nullable: true, description: 'Absolute URL of the previous page, null on the first page' },
            next: { type: 'string', nullable: true, description: 'Absolute URL of the next page, null on the last page' },
            last: { type: 'string', nullable: true, description: 'Absolute URL of the last page, null when there are no results' },
          },
        },
        Pagination: {
          type: 'object',
          description: 'Standard v1 offset-pagination metadata (see src/lib/pagination.ts)',
          properties: {
            total: { type: 'integer', description: 'Total number of items across all pages' },
            page: { type: 'integer', minimum: 1, description: 'Current page, 1-indexed' },
            limit: { type: 'integer', minimum: 1, description: 'Items per page' },
            totalPages: { type: 'integer', description: 'Number of pages needed to cover total (0 when total is 0)' },
            hasPreviousPage: { type: 'boolean', description: 'True when page > 1' },
            hasNextPage: { type: 'boolean', description: 'True when page < totalPages' },
            links: { $ref: '#/components/schemas/PaginationLinks' },
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