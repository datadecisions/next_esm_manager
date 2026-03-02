"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-cyan-50/30 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/work-orders")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Work Order #{id}
          </h1>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
          <p className="text-slate-500 dark:text-slate-400">
            Full work order detail view coming soon. This will display service details,
            labor, parts, equipment, and all related sections from the legacy manager.
          </p>
        </div>
      </div>
    </div>
  );
}
