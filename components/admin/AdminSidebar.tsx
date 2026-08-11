"use client";

import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const navItems = [
  { icon: "⌂", label: "대시보드", href: "/admin" },
  { icon: "⚑", label: "신고 관리", href: "/admin/reports" },
  { icon: "▤", label: "게시글 관리", href: "/admin/posts" },
  { icon: "◯", label: "회원 관리", href: "/admin/users" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <aside
      style={{
        width: 224,
        flex: "0 0 224px",
        height: "100vh",
        position: "sticky",
        top: 0,
        padding: "20px 14px 18px",
        background: "#ffffff",
        borderRight: "1px solid #ece9f2",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <button
        type="button"
        onClick={() => router.push("/admin")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "0 8px 22px",
          border: 0,
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            display: "grid",
            placeItems: "center",
            borderRadius: 10,
            background: "linear-gradient(145deg, #8166e7, #6547cf)",
            color: "#ffffff",
            fontSize: 19,
            fontWeight: 850,
          }}
        >
          C
        </span>

        <span
          style={{
            color: "#6447cc",
            fontSize: 14,
            fontWeight: 850,
            letterSpacing: "-0.4px",
          }}
        >
          CampusShare
          <span style={{ color: "#2e2936", fontWeight: 500 }}> Admin</span>
        </span>
      </button>

      <nav style={{ display: "grid", gap: 5 }}>
        {navItems.map((item) => {
          const active = isActive(item.href);

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              style={{
                width: "100%",
                border: 0,
                borderRadius: 9,
                padding: "10px 11px",
                display: "flex",
                gap: 10,
                alignItems: "center",
                background: active ? "#f1edff" : "transparent",
                color: active ? "#6749cc" : "#686274",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 12.5,
                fontWeight: active ? 800 : 500,
                fontFamily: "inherit",
              }}
            >
              <span style={{ width: 20, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: "15px 8px 0",
          borderTop: "1px solid #efedf3",
        }}
      >
        <div
          style={{
            padding: 13,
            border: "1px solid #e8e3f3",
            borderRadius: 11,
            background: "#fbfaff",
          }}
        >
          <div style={{ color: "#6549c8", fontSize: 11, fontWeight: 800 }}>
            CampusShare
          </div>
          <div style={{ marginTop: 4, color: "#9b96a5", fontSize: 9.5 }}>
            SUNGSHIN UNIVERSITY
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            style={{
              width: "100%",
              marginTop: 9,
              padding: "8px 9px",
              border: "1px solid #ddd4f3",
              borderRadius: 8,
              background: "#ffffff",
              color: "#674dc3",
              fontSize: 10.5,
              fontWeight: 750,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            사이트 바로가기 ↗
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          style={{
            width: "100%",
            marginTop: 10,
            padding: "8px 9px",
            border: 0,
            borderRadius: 8,
            background: "transparent",
            color: "#9a94a1",
            fontSize: 10.5,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
