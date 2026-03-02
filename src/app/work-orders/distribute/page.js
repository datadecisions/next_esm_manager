import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DistributeOrdersPage() {
  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-cyan-50/30 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/work-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Close / Distribute Orders
          </h1>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
          <p className="text-slate-500 dark:text-slate-400">
            Centralized closing and distribution – coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
