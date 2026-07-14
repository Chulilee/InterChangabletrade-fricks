export function Footer() {
  return (
    <footer className="border-t border-brand-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-brand-muted sm:flex-row">
        <p>© {new Date().getFullYear()} InterChangableTrade. Apache-2.0 licensed.</p>
        <p>Built on the Stellar network.</p>
      </div>
    </footer>
  );
}
