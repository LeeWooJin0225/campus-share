"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email || !password || loading) return;

    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      setErrorMessage("이메일 또는 비밀번호를 확인해 주세요.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/me", {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      await supabase.auth.signOut();
      setErrorMessage("관리자 권한이 없는 계정입니다.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "45% 55%",
        fontFamily:
          'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: "#faf9fd",
        color: "#211b31",
      }}
    >
      <section
        style={{
          padding: "42px 56px",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            fontSize: 20,
            fontWeight: 850,
            color: "#5f43c5",
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "linear-gradient(145deg, #8267e8, #6547ce)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 22,
            }}
          >
            C
          </span>
          CampusShare
          <span style={{ color: "#292333", fontWeight: 500 }}>Admin</span>
        </div>

        <div style={{ margin: "auto 0", maxWidth: 420 }}>
          <div
            style={{
              color: "#7a63d1",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.2,
            }}
          >
            ADMIN CONSOLE
          </div>

          <h1
            style={{
              margin: "12px 0 8px",
              fontSize: 32,
              letterSpacing: -1,
            }}
          >
            관리자 로그인
          </h1>

          <p
            style={{
              margin: 0,
              color: "#888294",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            관리자 권한이 등록된 CampusShare 계정으로 로그인해 주세요.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{ marginTop: 32, display: "grid", gap: 16 }}
          >
            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 750 }}>이메일</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="admin@sungshin.ac.kr"
                style={{
                  height: 46,
                  border: "1px solid #ded9e8",
                  borderRadius: 10,
                  padding: "0 13px",
                  outline: "none",
                  fontFamily: "inherit",
                  fontSize: 13,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 750 }}>비밀번호</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="비밀번호"
                style={{
                  height: 46,
                  border: "1px solid #ded9e8",
                  borderRadius: 10,
                  padding: "0 13px",
                  outline: "none",
                  fontFamily: "inherit",
                  fontSize: 13,
                }}
              />
            </label>

            {errorMessage && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 9,
                  background: "#fff1f3",
                  color: "#bc4655",
                  fontSize: 11.5,
                }}
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 3,
                height: 47,
                border: 0,
                borderRadius: 10,
                background: loading ? "#aaa0cf" : "#6d50ce",
                color: "#fff",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 800,
                cursor: loading ? "default" : "pointer",
              }}
            >
              {loading ? "확인 중..." : "관리자 로그인"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => router.push("/")}
            style={{
              marginTop: 18,
              padding: 0,
              border: 0,
              background: "transparent",
              color: "#8e8897",
              fontFamily: "inherit",
              fontSize: 11.5,
              cursor: "pointer",
            }}
          >
            ← CampusShare로 돌아가기
          </button>
        </div>

        <div style={{ color: "#aaa4b1", fontSize: 10.5 }}>
          관리자 페이지는 일반 사용자 계정과 동일한 Supabase Auth를 사용하고,
          role로 접근 권한을 구분합니다.
        </div>
      </section>

      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: 60,
          background:
            "radial-gradient(circle at 70% 20%, rgba(255,255,255,.22), transparent 24%), linear-gradient(145deg, #7658dc 0%, #5136b8 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 330,
            height: 330,
            borderRadius: "50%",
            background: "rgba(255,255,255,.07)",
            right: -90,
            top: -60,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,.12)",
            left: 60,
            bottom: -120,
          }}
        />

        <div style={{ position: "relative", maxWidth: 520 }}>
          <div style={{ fontSize: 13, opacity: 0.72 }}>CampusShare Operation</div>
          <h2
            style={{
              margin: "14px 0 16px",
              fontSize: 37,
              lineHeight: 1.28,
              letterSpacing: -1.2,
            }}
          >
            안전한 자료 공유를 위한
            <br />
            운영 공간
          </h2>
          <p style={{ margin: 0, opacity: 0.74, lineHeight: 1.8, fontSize: 13 }}>
            신고 검토, 게시글 관리, 회원 제재와 운영 이력을 한 곳에서
            관리합니다.
          </p>

          <div
            style={{
              marginTop: 34,
              padding: 18,
              border: "1px solid rgba(255,255,255,.18)",
              borderRadius: 14,
              background: "rgba(255,255,255,.08)",
              backdropFilter: "blur(10px)",
              display: "grid",
              gap: 11,
              fontSize: 12,
            }}
          >
            <div>✓ 관리자 권한 서버 검증</div>
            <div>✓ 신고 및 제재 이력 관리</div>
            <div>✓ Service Role Key 브라우저 노출 방지</div>
          </div>
        </div>
      </section>
    </main>
  );
}
