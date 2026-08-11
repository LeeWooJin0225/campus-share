"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AccountStatusResponse = {
  account_status: "active" | "suspended" | "banned";
  suspended_until: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default function AccountSuspendedPage() {
  const router = useRouter();

  const [status, setStatus] =
    useState<AccountStatusResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

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

        const body = await response.json();

        if (response.status === 401) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            body.error ?? "계정 상태를 불러오지 못했습니다.",
          );
        }

        if (body.account_status === "active") {
          router.replace("/");
          return;
        }

        setStatus(body);
      } catch (error) {
        console.error("계정 정지 상태 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadStatus();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f8f8fb",
          color: "#8e8897",
          fontSize: 13,
        }}
      >
        계정 상태를 확인하는 중이에요
      </main>
    );
  }

  if (!status) {
    return null;
  }

  const isBanned =
    status.account_status === "banned";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f8f8fb",
        fontFamily:
          'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: "#292431",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#fff",
          border: "1px solid #e8e4ed",
          borderRadius: 16,
          padding: "28px 26px 24px",
          boxShadow:
            "0 18px 55px rgba(40, 31, 54, 0.08)",
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            display: "grid",
            placeItems: "center",
            borderRadius: 13,
            background: "#fff2f3",
            color: "#b94d5e",
            fontWeight: 900,
            fontSize: 21,
          }}
        >
          !
        </div>

        <h1
          style={{
            margin: "17px 0 8px",
            fontSize: 22,
            letterSpacing: "-0.5px",
          }}
        >
          {isBanned
            ? "계정 이용이 영구 정지되었습니다."
            : "계정 이용이 일시 정지되었습니다."}
        </h1>

        <p
          style={{
            margin: 0,
            color: "#817a89",
            fontSize: 12.5,
            lineHeight: 1.75,
          }}
        >
          운영 정책에 따른 관리자 조치로
          현재 CampusShare를 이용할 수 없습니다.
        </p>

        <div
          style={{
            marginTop: 20,
            padding: "14px 15px",
            borderRadius: 11,
            background: "#faf9fc",
            border: "1px solid #efedf3",
          }}
        >
          <div
            style={{
              color: "#9a94a0",
              fontSize: 10,
            }}
          >
            상태
          </div>

          <div
            style={{
              marginTop: 4,
              color: "#4b4452",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {isBanned
              ? "영구 이용 정지"
              : "일시 이용 정지"}
          </div>

          {!isBanned && (
            <>
              <div
                style={{
                  marginTop: 14,
                  color: "#9a94a0",
                  fontSize: 10,
                }}
              >
                이용 가능 예정
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: "#4b4452",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {formatDate(status.suspended_until)}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          style={{
            width: "100%",
            height: 42,
            marginTop: 20,
            border: "1px solid #ddd7e6",
            borderRadius: 9,
            background: "#fff",
            color: "#665f6d",
            font: "inherit",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          로그아웃
        </button>
      </section>
    </main>
  );
}
