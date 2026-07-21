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
});
