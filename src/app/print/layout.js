/**
 * Minimal layout for print-view pages. Sidebar is already hidden for /print in SidebarLayout.
 * Used by /print/work-order/[id], /print/work-order-parts/[id], etc.
 */
export default function PrintLayout({ children }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 print:min-h-0 print:bg-white">
      {children}
    </div>
  );
}
