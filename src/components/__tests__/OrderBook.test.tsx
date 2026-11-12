import { render, screen } from '@testing-library/react';
import { OrderBook } from '../OrderBook';

describe('OrderBook Component', () => {
  it('renders correctly with given bids and asks', () => {
    const mockBids = [
      { price: 40000, size: 0.5, total: 0.5 },
      { price: 39990, size: 1.0, total: 1.5 },
    ];
    const mockAsks = [
      { price: 40010, size: 0.2, total: 0.2 },
      { price: 40020, size: 0.8, total: 1.0 },
    ];

    render(<OrderBook bids={mockBids} asks={mockAsks} />);

    expect(screen.getByText('Order Book')).toBeInTheDocument();
    
    // Check specific prices
    expect(screen.getByText('40000.00')).toBeInTheDocument();
    expect(screen.getByText('39990.00')).toBeInTheDocument();
    expect(screen.getByText('40010.00')).toBeInTheDocument();
    expect(screen.getByText('40020.00')).toBeInTheDocument();
  });

  it('calculates and displays spread and spread percentage visually', () => {
    const mockBids = [{ price: 100, size: 1, total: 1 }];
    const mockAsks = [{ price: 102, size: 1, total: 1 }];

    render(<OrderBook bids={mockBids} asks={mockAsks} />);

    // Mid price = (100 + 102) / 2 = 101.00
    expect(screen.getByText('101.00')).toBeInTheDocument();
    
    // Spread = 102 - 100 = 2.00, Spread % = (2 / 101) * 100 = 1.98%
    const spreadElement = screen.getByTestId('order-book-spread');
    expect(spreadElement).toBeInTheDocument();
    expect(spreadElement).toHaveTextContent('2.00');
    expect(spreadElement).toHaveTextContent('(1.98%)');
  });

  it('marks best bid and best ask rows with highlight attributes', () => {
    const mockBids = [
      { price: 100, size: 1, total: 1 },
      { price: 99, size: 2, total: 3 },
    ];
    const mockAsks = [
      { price: 101, size: 1, total: 1 },
      { price: 102, size: 2, total: 3 },
    ];

    render(<OrderBook bids={mockBids} asks={mockAsks} />);

    const bestBidRow = screen.getByTestId('book-row-bid-100.00');
    const bestAskRow = screen.getByTestId('book-row-ask-101.00');
    const normalBidRow = screen.getByTestId('book-row-bid-99.00');

    expect(bestBidRow).toHaveAttribute('data-is-best', 'true');
    expect(bestAskRow).toHaveAttribute('data-is-best', 'true');
    expect(normalBidRow).not.toHaveAttribute('data-is-best');
  });
});
