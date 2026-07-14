export default function Loading() {
  return (
    <div className="flex items-center justify-center py-32">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-brand-muted/30 border-t-brand-accent"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
