"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import {
  Calculator,
  Pencil,
  Paperclip,
  Wrench,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navMain = [
  { title: "Home", url: "/home", icon: LayoutDashboard },
  { title: "Accounting", url: "/accounting", icon: Calculator },
  { title: "Work Orders", url: "/work-orders", icon: Pencil },
  { title: "Purchase Orders", url: "/purchase-orders", icon: Paperclip },
  { title: "Parts", url: "/parts", icon: Wrench },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/home">
                <span className="font-semibold text-cyan-600 dark:text-cyan-400">NOVA</span>
                <span className="text-sidebar-foreground"> · Manager</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.url || pathname?.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
