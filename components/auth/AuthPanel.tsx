"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import TagChip, { TagType } from "@/components/common/TagChip";
import { supabase } from "@/lib/supabase";

const TYPE_ROWS: { tag: TagType; desc: string }[] = [
  { tag: "notes", desc: "강의 중 정리한 필기" },
  { tag: "exam", desc: "시험 범위 정리와 대비 자료" },
  { tag: "reference", desc: "수업 이해에 도움이 된 책·영상·문서" },
  { tag: "study_trail", desc: "수업에서 출발해 혼자 더 파고든 기록" },
];

const ALLOWED_DOMAIN = "@sungshin.ac.kr";

type AuthPanelProps = {
  mode: "login" | "signup";
};

export default function AuthPanel({ mode }: AuthPanelProps) {
  const router = useRouter();

  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMessage("");
    setInfoMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail.endsWith(ALLOWED_DOMAIN)) {
      setErrorMessage(`${ALLOWED_DOMAIN} 도메인만 사용할 수 있어요`);
      return;
    }

    if (isSignup && !nickname.trim()) {
      setErrorMessage("닉네임을 입력해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { nickname: nickname.trim() },
          },
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          setInfoMessage(
            "가입 확인 메일을 보냈어요. 메일함을 확인해주세요.",
          );
          return;
        }

        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              nickname: nickname.trim(),
            });

          if (profileError) {
            console.error("프로필 생성 실패:", profileError);
          }
        }

        router.replace("/");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        throw error;
      }

      router.replace("/");
    } catch (error) {
      console.error("인증 실패:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "처리 중 문제가 발생했어요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--cs-surface)",
      }}
    >
      {/* Left panel */}
      <div
        style={{
          flex: "0 0 44%",
          maxWidth: 560,
          minWidth: 360,
          background: "var(--cs-bg)",
          padding: "40px 44px",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--cs-border)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 34,
          }}
        >
          <svg
            width="19"
            height="24"
            viewBox="10.86 23.74 12.83 16.47"
            fill="currentColor"
            style={{
              color: "var(--cs-purple)",
              flexShrink: 0,
              display: "block",
            }}
            role="img"
            aria-label="CampusShare"
          >
            <path
              d="
                M 15.227016 25.90125
                L 15.222996 27.769785
                C 14.555674268 27.778559571 13.545180483 27.551224933 13.027344105 28.103333643
                C 12.507864951 28.657193853 12.759215512 29.982146788 12.760035 30.682551
                L 12.766543 36.244844
                C 12.767176994 36.786709158 12.605506672 37.643139401 13.026445 38.062383
                C 13.487522376 38.521604044 14.411832389 38.347987398 15.004914908 38.348003945
                L 19.343672 38.348125
                C 19.752322013 38.348136402 20.285578282 38.423145418 20.58601993 38.074237892
                C 21.046438879 37.539546254 20.79165078 36.346757433 20.790813 35.700703
                L 20.785835 31.861914
                L 18.20401256 31.875774288
                C 17.758590529 31.878165497 16.890340715 32.000747691 16.593041007 31.565509064
                A 1.714347071 1.714347071 0 0 1 16.48711466 30.709830698
                L 16.483518617 27.231822499
                A 1.504614293 1.504614293 0 0 1 16.536618 26.5572
                C 16.823524547 26.099383849 17.45660319 26.920259323 17.657492 27.116543
                L 22.648246 31.99289
                L 22.660608927 35.62494374
                A 19.779379542 19.779379542 0 0 1 22.611466059 37.878166277
                A 3.029821588 3.029821588 0 0 1 20.298608587 40.137616066
                A 26.736259366 26.736259366 0 0 1 18.966793 40.177422
                L 14.66625 40.19875
                A 17.486112975 17.486112975 0 0 1 13.00579646 40.128003707
                A 3.006860871 3.006860871 0 0 1 11.030469079 38.207000459
                C 10.789564684 37.488214764 10.889781531 36.651045759 10.890023 35.904415
                L 10.89191 30.06975
                C 10.892423132 28.483129031 10.998659266 26.888180241 12.661547377 26.164194185
                C 13.48020987 25.807765978 14.357097037 25.897770514 15.227016 25.90125
                Z

                M 23.231105 29.7428
                C 22.645977454 29.791876421 22.22285552 29.161247728 21.843406667 28.785715574
                L 18.562113609 25.538292272
                C 18.285272245 25.264308485 17.819715018 24.962774404 17.698522527 24.582005146
                A 0.60594694 0.60594694 0 0 1 18.161768245 23.803130631
                L 22.058003 23.784324
                C 22.477098067 23.782301081 23.227238095 23.631073468 23.519321 24.013471519
                C 23.733421549 24.293774238 23.676796842 24.73580561 23.67596302 25.069153727
                L 23.667887826 28.29748349
                C 23.666563762 28.826822366 23.788614746 29.471035582 23.231105 29.7428
                Z

                M 19.20698 37.382617
                C 18.212457643 37.439636881 17.202220535 37.399326615 16.205980095 37.399700388
                C 15.629327442 37.399916738 14.903252803 37.506192835 14.347091696 37.341644258
                C 13.38742692 37.057713091 13.660766709 35.844177821 14.495707 35.614844
                C 15.50151893 35.567151596 16.519028354 35.606201019 17.526045808 35.605928985
                C 18.110770619 35.605771028 18.837163037 35.494846204 19.39885912 35.675500792
                C 20.323845153 35.972997918 19.988886146 37.179479768 19.20698 37.382617
                Z

                M 19.137145 34.863438
                L 16.119707 34.865352
                C 15.563442683 34.865704846 14.701636614 35.03483636 14.197168 34.750234
                C 13.393495323 34.296831878 13.744659181 33.261299277 14.530652 33.070234
                C 15.501282824 33.01817064 16.482508784 33.067422583 17.45459681 33.063956347
                C 18.021500869 33.061934901 18.75011822 32.945191083 19.295373047 33.111348211
                C 20.264746186 33.406748175 19.949240148 34.617105498 19.137145 34.863438
                Z
              "
              fill="currentColor"
              fillRule="nonzero"
            />
          </svg>

          <span
            style={{
              fontWeight: 600,
              fontSize: 15,
              color: "var(--cs-ink)",
              letterSpacing: "-0.01em",
            }}
          >
            CampusShare
          </span>
        </div>

        <h1
          style={{
            fontSize: 27,
            fontWeight: 600,
            lineHeight: 1.42,
            letterSpacing: "-0.02em",
            color: "var(--cs-ink)",
            margin: 0,
          }}
        >
          수업이 끝나도
          <br />
          노트는 남습니다.
        </h1>

        <p
          style={{
            fontSize: 13,
            lineHeight: 1.75,
            color: "var(--cs-ink-soft)",
            marginTop: 16,
          }}
        >
          같은 수업을 듣는 학생들의 필기와 확장 학습이 과목 단위로 쌓이는
          학습 아카이브예요.
          <br />
          학교 이메일로 인증한 재학생·졸업생만 볼 수 있어요.
        </p>

        {/* Type guide */}
        <div style={{ marginTop: 30 }}>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--cs-ink-faint)",
              marginBottom: 10,
              letterSpacing: "0.02em",
            }}
          >
            노트를 올릴 때 네 가지 중 하나를 골라요
          </div>

          {TYPE_ROWS.map((row) => (
            <div
              key={row.tag}
              style={{
                display: "flex",
                gap: 9,
                alignItems: "flex-start",
                marginBottom: 9,
              }}
            >
              <TagChip tag={row.tag} />

              <p
                style={{
                  fontSize: 12,
                  color: "var(--cs-ink-soft)",
                  lineHeight: 1.55,
                  paddingTop: 2,
                  margin: 0,
                }}
              >
                {row.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Rules */}
        <div style={{ marginTop: 30 }}>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--cs-ink-faint)",
              marginBottom: 10,
              letterSpacing: "0.02em",
            }}
          >
            시작하기 전에
          </div>

          <div
            style={{
              display: "flex",
              gap: 9,
              marginBottom: 11,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--cs-ink-faint)",
                flexShrink: 0,
                paddingTop: 2,
                width: 12,
              }}
            >
              1
            </span>

            <p
              style={{
                fontSize: 12,
                color: "var(--cs-ink-soft)",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              <strong
                style={{
                  color: "var(--cs-ink)",
                  fontWeight: 500,
                }}
              >
                노트를 읽을 때 1포인트가 쓰여요.
              </strong>{" "}
              가입하면 50포인트를 드리고, 노트를 하나 올리면 30포인트가
              쌓여요. 한 번 연 노트를 다시 볼 때는 차감되지 않아요.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 9,
              marginBottom: 11,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--cs-ink-faint)",
                flexShrink: 0,
                paddingTop: 2,
                width: 12,
              }}
            >
              2
            </span>

            <p
              style={{
                fontSize: 12,
                color: "var(--cs-ink-soft)",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              <strong
                style={{
                  color: "var(--cs-ink)",
                  fontWeight: 500,
                }}
              >
                교수님 강의안 원본과 시험지는 올릴 수 없어요.
              </strong>{" "}
              저작권 문제로 삭제됩니다. 직접 정리한 내용을 올려주세요.
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            fontSize: 11,
            color: "var(--cs-ink-faint)",
            paddingTop: 26,
          }}
        >
          학교 이메일 인증 · 재학생·졸업생 전용
        </div>
      </div>

      {/* Right panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--cs-surface)",
        }}
      >
        <div style={{ width: 300 }}>
          <h2
            style={{
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              margin: "0 0 7px",
              color: "var(--cs-ink)",
            }}
          >
            학교 이메일로 시작하기
          </h2>

          <div
            style={{
              fontSize: 12.5,
              color: "var(--cs-ink-faint)",
              marginBottom: 26,
            }}
          >
            재학생·졸업생만 가입할 수 있어요
          </div>

          <form onSubmit={handleSubmit}>
            <FieldLabel>학교 이메일</FieldLabel>

            <input
              style={inputStyle}
              type="email"
              placeholder="student@sungshin.ac.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div
              style={{
                fontSize: 11,
                color: "var(--cs-ink-faint)",
                marginBottom: 16,
                marginTop: -4,
              }}
            >
              @sungshin.ac.kr 도메인만 인증 가능
            </div>

            {isSignup && (
              <>
                <FieldLabel>닉네임</FieldLabel>

                <input
                  style={inputStyle}
                  type="text"
                  placeholder="댓글과 노트에 표시될 이름이에요"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </>
            )}

            <FieldLabel>비밀번호</FieldLabel>

            <input
              style={inputStyle}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {errorMessage && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--cs-error)",
                  marginTop: 8,
                  lineHeight: 1.6,
                }}
              >
                {errorMessage}
              </div>
            )}

            {infoMessage && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--cs-purple-dark)",
                  marginTop: 8,
                  lineHeight: 1.6,
                }}
              >
                {infoMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "10px",
                background: "var(--cs-purple)",
                color: "var(--cs-surface)",
                border: "none",
                borderRadius: "var(--cs-radius-lg)",
                fontSize: 13.5,
                fontWeight: 500,
                fontFamily: "inherit",
                cursor: isSubmitting ? "default" : "pointer",
                marginTop: 8,
                transition: "background 0.15s",
                textAlign: "center",
                opacity: isSubmitting ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background =
                    "var(--cs-purple-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = "var(--cs-purple)";
                }
              }}
            >
              {isSignup ? "가입하기" : "로그인"}
            </button>
          </form>

          <div
            style={{
              textAlign: "center",
              fontSize: 12.5,
              color: "var(--cs-ink-soft)",
              marginTop: 20,
            }}
          >
            {isSignup ? (
              <>
                계정이 있으신가요?{" "}
                <button
                  onClick={() => router.push("/login")}
                  style={linkBtn}
                >
                  로그인
                </button>
              </>
            ) : (
              <>
                계정이 없으신가요?{" "}
                <button
                  onClick={() => router.push("/signup")}
                  style={linkBtn}
                >
                  회원가입
                </button>
              </>
            )}
          </div>

          <div
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "var(--cs-ink-faint)",
              marginTop: 9,
            }}
          >
            <button
              onClick={() => router.push("/forgot-password")}
              style={{
                ...linkBtn,
                color: "var(--cs-ink-faint)",
                fontWeight: 400,
                fontSize: 12,
              }}
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 12.5,
        fontWeight: 500,
        color: "var(--cs-ink)",
        marginBottom: 7,
      }}
    >
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid var(--cs-border-str)",
  borderRadius: "var(--cs-radius-lg)",
  background: "var(--cs-surface)",
  fontSize: 13,
  fontFamily: "inherit",
  color: "var(--cs-ink)",
  marginBottom: 6,
  outline: "none",
  display: "block",
};

const linkBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--cs-purple-dark)",
  fontWeight: 500,
  fontFamily: "inherit",
  fontSize: 12.5,
  cursor: "pointer",
  padding: 0,
};