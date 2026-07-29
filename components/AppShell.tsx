"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

// 이 경로들에서는 사이드바를 안 보여줌 (로그인 전 화면들)
const NO_SIDEBAR_ROUTES = ["/login", "/signup", "/reset-password", "/forgot-password"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = NO_SIDEBAR_ROUTES.some((route) => pathname?.startsWith(route));

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}