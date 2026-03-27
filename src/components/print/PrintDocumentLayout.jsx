/**
 * Shared wrapper for all print documents: paper area, optional title and footer.
 * Use for work order, work order parts, and future document types.
 */
export function PrintDocumentLayout({ title, children, footer }) {
  return (
    <div className="min-h-full flex flex-col">
      {title && (
        <header className="mb-4 border-b border-slate-200 pb-2">
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        </header>
      )}
      <main className="flex-1">{children}</main>
      {footer && (
        <footer className="mt-6 pt-2 border-t border-slate-200 text-xs text-slate-500">
          {footer}
        </footer>
      )}
    </div>
  );
}
