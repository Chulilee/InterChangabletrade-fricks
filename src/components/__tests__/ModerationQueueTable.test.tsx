import { render, screen, fireEvent } from '@testing-library/react';
import { ModerationQueueTable } from '@/components/ModerationQueueTable';
import type { ModerationListing } from '@/types/admin';

const LISTINGS: ModerationListing[] = [
  {
    id: 'lst_001',
    title: 'Fractional Warehouse Unit A-12',
    sellerAddress: 'GTRADER22222222222222222222222222222222222222222222222222222222',
    status: 'pending',
    reportCount: 0,
    createdAt: Date.parse('2025-06-20T10:00:00Z'),
  },
  {
    id: 'lst_002',
    title: "Guaranteed 40% weekly returns!!!",
    sellerAddress: 'GSPAMMER33333333333333333333333333333333333333333333333333333333',
    status: 'pending',
    reportCount: 11,
    createdAt: Date.parse('2025-07-01T16:45:00Z'),
  },
];

describe('ModerationQueueTable', () => {
  it('renders every queued listing with its report count', () => {
    render(
      <ModerationQueueTable listings={LISTINGS} onRemove={() => {}} />
    );

    expect(screen.getByText('Fractional Warehouse Unit A-12')).toBeInTheDocument();
    expect(screen.getByText('Guaranteed 40% weekly returns!!!')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
  });

  it('shows the empty state when the queue is clear', () => {
    render(<ModerationQueueTable listings={[]} onRemove={() => {}} />);
    expect(screen.getByText(/moderation queue is empty/i)).toBeInTheDocument();
  });

  it('invokes onRemove with the clicked listing', () => {
    const onRemove = jest.fn();
    render(
      <ModerationQueueTable listings={LISTINGS} onRemove={onRemove} />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[1]);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(LISTINGS[1]);
  });
});
