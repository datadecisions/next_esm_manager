"use client";

import { usePathname } from "next/navigation";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";

const HIDE_SIDEBAR_PATHS = ["/sign-in", "/"];

export function SidebarLayout({ children }) {
  const pathname = usePathname();
  const hideSidebar =
    HIDE_SIDEBAR_PATHS.includes(pathname) ||
    pathname?.startsWith("/docs") ||
    pathname?.startsWith("/print");

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
