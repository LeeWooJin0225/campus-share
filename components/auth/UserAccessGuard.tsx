"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/admin",
  "/account-suspended",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`),
  );
}

export default function UserAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      if (isPublicPath(pathname)) {
        if (!cancelled) {
          setChecking(false);
        }
        return;
      }

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.access_token) {
          router.replace("/login");
          return;
        }

        const response = await fetch("/api/account/status", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const body = await response.json().catch(() => null);

        if (response.status === 401) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            body?.error ?? "계정 상태를 확인하지 못했습니다.",
          );
        }

        if (
          body.account_status === "suspended" ||
          body.account_status === "banned"
        ) {
          router.replace("/account-suspended");
          return;
        }

        if (!cancelled) {
          setChecking(false);
        }
      } catch (error) {
        console.error("계정 접근 상태 확인 실패:", error);

        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    setChecking(true);
    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (checking && !isPublicPath(pathname)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--cs-surface, #fff)",
          color: "var(--cs-ink-faint, #999)",
          fontSize: 13,
        }}
      >
        계정 상태를 확인하는 중이에요
      </div>
    );
  }

  return <>{children}</>;
}
