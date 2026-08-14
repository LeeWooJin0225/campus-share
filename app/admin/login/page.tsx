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
        display: "flex",
        background: "var(--cs-surface)",
        color: "var(--cs-ink)",
      }}
    >
      {/* 왼쪽 — 폼 */}
      <section
        style={{
          flex: "0 0 46%",
          maxWidth: 620,
          minWidth: 360,
          padding: "40px 44px",
          display: "flex",
          flexDirection: "column",
          background: "var(--cs-bg)",
          borderRight: "1px solid var(--cs-border)",
        }}
      >
        {/* 로고 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg
            width="15"
            height="19"
            viewBox="10.86 23.74 12.83 16.47"
            fill="currentColor"
            style={{ color: "var(--cs-purple)", flexShrink: 0, display: "block" }}
            aria-hidden="true"
          >
            <path d="M 15.227016 25.90125 L 15.222996 27.769785 C 14.555674268 27.778559571 13.545180483 27.551224933 13.027344105 28.103333643 C 12.507864951 28.657193853 12.759215512 29.982146788 12.760035 30.682551 L 12.766543 36.244844 C 12.767176994 36.786709158 12.605506672 37.643139401 13.026445 38.062383 C 13.487522376 38.521604044 14.411832389 38.347987398 15.004914908 38.348003945 L 19.343672 38.348125 C 19.752322013 38.348136402 20.285578282 38.423145418 20.58601993 38.074237892 C 21.046438879 37.539546254 20.79165078 36.346757433 20.790813 35.700703 L 20.785835 31.861914 L 18.20401256 31.875774288 C 17.758590529 31.878165497 16.890340715 32.000747691 16.593041007 31.565509064 A 1.714347071 1.714347071 0 0 1 16.48711466 30.709830698 L 16.483518617 27.231822499 A 1.504614293 1.504614293 0 0 1 16.536618 26.5572 C 16.823524547 26.099383849 17.45660319 26.920259323 17.657492 27.116543 L 22.648246 31.99289 L 22.660608927 35.62494374 A 19.779379542 19.779379542 0 0 1 22.611466059 37.878166277 A 3.029821588 3.029821588 0 0 1 20.298608587 40.137616066 A 26.736259366 26.736259366 0 0 1 18.966793 40.177422 L 14.66625 40.19875 A 17.486112975 17.486112975 0 0 1 13.00579646 40.128003707 A 3.006860871 3.006860871 0 0 1 11.030469079 38.207000459 C 10.789564684 37.488214764 10.889781531 36.651045759 10.890023 35.904415 L 10.89191 30.06975 C 10.892423132 28.483129031 10.998659266 26.888180241 12.661547377 26.164194185 C 13.48020987 25.807765978 14.357097037 25.897770514 15.227016 25.90125 Z M 23.231105 29.7428 C 22.645977454 29.791876421 22.22285552 29.161247728 21.843406667 28.785715574 L 18.562113609 25.538292272 C 18.285272245 25.264308485 17.819715018 24.962774404 17.698522527 24.582005146 A 0.60594694 0.60594694 0 0 1 18.161768245 23.803130631 L 22.058003 23.784324 C 22.477098067 23.782301081 23.227238095 23.631073468 23.519321 24.013471519 C 23.733421549 24.293774238 23.676796842 24.73580561 23.67596302 25.069153727 L 23.667887826 28.29748349 C 23.666563762 28.826822366 23.788614746 29.471035582 23.231105 29.7428 Z M 19.20698 37.382617 C 18.212457643 37.439636881 17.202220535 37.399326615 16.205980095 37.399700388 C 15.629327442 37.399916738 14.903252803 37.506192835 14.347091696 37.341644258 C 13.38742692 37.057713091 13.660766709 35.844177821 14.495707 35.614844 C 15.50151893 35.567151596 16.519028354 35.606201019 17.526045808 35.605928985 C 18.110770619 35.605771028 18.837163037 35.494846204 19.39885912 35.675500792 C 20.323845153 35.972997918 19.988886146 37.179479768 19.20698 37.382617 Z M 19.137145 34.863438 L 16.119707 34.865352 C 15.563442683 34.865704846 14.701636614 35.03483636 14.197168 34.750234 C 13.393495323 34.296831878 13.744659181 33.261299277 14.530652 33.070234 C 15.501282824 33.01817064 16.482508784 33.067422583 17.45459681 33.063956347 C 18.021500869 33.061934901 18.75011822 32.945191083 19.295373047 33.111348211 C 20.264746186 33.406748175 19.949240148 34.617105498 19.137145 34.863438 Z" />
          </svg>

          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--cs-ink)",
              letterSpacing: "-0.01em",
            }}
          >
            CampusShare
            <span style={{ color: "var(--cs-ink-faint)", fontWeight: 400 }}>
              {" "}Admin
            </span>
          </span>
        </div>

        <div style={{ margin: "auto 0", maxWidth: 420, width: "100%" }}>
          <h1
            style={{
              margin: 0,
              fontSize: 27,
              fontWeight: 600,
              lineHeight: 1.42,
              letterSpacing: "-0.02em",
              color: "var(--cs-ink)",
            }}
          >
            관리자 로그인
          </h1>

          <p
            style={{
              margin: "16px 0 0",
              color: "var(--cs-ink-soft)",
              fontSize: 13,
              lineHeight: 1.75,
            }}
          >
            관리자 권한이 등록된 CampusShare 계정으로 로그인해 주세요.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{ marginTop: 30, display: "grid", gap: 18 }}
          >
            <label style={{ display: "grid", gap: 7 }}>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "var(--cs-ink)",
                }}
              >
                이메일
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="admin@sungshin.ac.kr"
                style={{
                  width: "100%",
                  padding: "9px 11px",
                  border: "1px solid var(--cs-border-str)",
                  borderRadius: "var(--cs-radius-lg)",
                  background: "var(--cs-surface)",
                  color: "var(--cs-ink)",
                  outline: "none",
                  fontFamily: "inherit",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 7 }}>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "var(--cs-ink)",
                }}
              >
                비밀번호
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "9px 11px",
                  border: "1px solid var(--cs-border-str)",
                  borderRadius: "var(--cs-radius-lg)",
                  background: "var(--cs-surface)",
                  color: "var(--cs-ink)",
                  outline: "none",
                  fontFamily: "inherit",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </label>

            {errorMessage && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--cs-error)",
                  lineHeight: 1.6,
                }}
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: 4,
                border: 0,
                borderRadius: "var(--cs-radius-lg)",
                background: "var(--cs-purple)",
                color: "var(--cs-surface)",
                fontFamily: "inherit",
                fontSize: 13.5,
                fontWeight: 500,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  e.currentTarget.style.background = "var(--cs-purple-hover)";
              }}
              onMouseLeave={(e) => {
                if (!loading)
                  e.currentTarget.style.background = "var(--cs-purple)";
              }}
            >
              {loading ? "확인 중" : "관리자 로그인"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button
              type="button"
              onClick={() => router.push("/")}
              style={{
                padding: 0,
                border: 0,
                background: "transparent",
                color: "var(--cs-ink-faint)",
                fontFamily: "inherit",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ← CampusShare로 돌아가기
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            paddingTop: 26,
            color: "var(--cs-ink-faint)",
            fontSize: 11,
            lineHeight: 1.7,
          }}
        >
          관리자 페이지는 일반 사용자 계정과 동일한 Supabase Auth를 사용하고,
          role로 접근 권한을 구분합니다.
        </div>
      </section>

      {/* 오른쪽 — 소개 */}
      <section
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 48px",
          background: "var(--cs-surface)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--cs-ink-faint)",
              letterSpacing: "0.02em",
              marginBottom: 10,
            }}
          >
            CampusShare Operation
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1.45,
              letterSpacing: "-0.02em",
              color: "var(--cs-ink)",
            }}
          >
            안전한 자료 공유를 위한
            <br />
            운영 공간
          </h2>

          <p
            style={{
              margin: "14px 0 0",
              color: "var(--cs-ink-soft)",
              fontSize: 13,
              lineHeight: 1.75,
              wordBreak: "keep-all",
            }}
          >
            신고 검토, 게시글 관리, 회원 제재와 운영 이력을 한 곳에서 관리합니다.
          </p>

          <div style={{ marginTop: 30 }}>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--cs-ink-faint)",
                letterSpacing: "0.02em",
                marginBottom: 10,
              }}
            >
              운영 원칙
            </div>

            {[
              "관리자 권한을 서버에서 검증합니다",
              "신고와 제재 이력을 모두 기록합니다",
              "Service Role Key는 브라우저에 노출하지 않습니다",
            ].map((text, index) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  gap: 9,
                  marginBottom: 11,
                }}
              >
                <span
                  style={{
                    width: 12,
                    flexShrink: 0,
                    paddingTop: 2,
                    color: "var(--cs-ink-faint)",
                    fontSize: 11,
                  }}
                >
                  {index + 1}
                </span>
                <p
                  style={{
                    margin: 0,
                    color: "var(--cs-ink-soft)",
                    fontSize: 12,
                    lineHeight: 1.65,
                  }}
                >
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}