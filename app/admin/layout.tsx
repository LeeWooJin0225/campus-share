"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { supabase } from "@/lib/supabase";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";

  const [checking, setChecking] = useState(!isLoginPage);

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false);
      return;
    }

    let cancelled = false;

    async function checkAdmin() {
      setChecking(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin/login");
        return;
      }

      const response = await fetch("/api/admin/me", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      if (!cancelled) {
        setChecking(false);
      }
    }

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [isLoginPage, pathname, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--cs-bg)",
          color: "var(--cs-ink-faint)",
          fontSize: 13.5,
        }}
      >
        관리자 권한을 확인하고 있어요
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--cs-bg)",
      }}
    >
      {/* 관리자 구분 띠 */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 30,
          padding: "0 16px",
          background: "var(--cs-ink)",
          color: "var(--cs-surface)",
          fontSize: 11.5,
          letterSpacing: "0.02em",
        }}
      >
        
        <span>관리자 콘솔</span>
        <a
          href="/"
          style={{
            color: "var(--cs-surface)",
            opacity: 0.65,
            textDecoration: "none",
          }}
        >
          CampusShare로 →
        </a>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <AdminSidebar />

        <div style={{ minWidth: 0, flex: 1, overflowY: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}