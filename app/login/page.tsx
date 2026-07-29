"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        router.replace("/");
      }
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          router.replace("/");
        }
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "error" | "success" | ""
  >("");

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] =
    useState(false);

  useEffect(() => {
    const passwordChanged =
      searchParams.get("passwordChanged") === "true";

    if (passwordChanged) {
      setMessage(
        "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요."
      );
      setMessageType("success");
    }
  }, [searchParams]);

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");
    setNeedsEmailConfirmation(false);

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setMessage("학교 이메일을 입력해주세요.");
      setMessageType("error");
      return;
    }

    // if (!trimmedEmail.endsWith("@sungshin.ac.kr")) {
    //   setMessage(
    //     "@sungshin.ac.kr 형식의 학교 이메일을 입력해주세요."
    //   );
    //   setMessageType("error");
    //   return;
    // }

    if (!password) {
      setMessage("비밀번호를 입력해주세요.");
      setMessageType("error");
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

      if (error) {
        if (error.code === "email_not_confirmed") {
          setMessage(
            "이메일 인증이 완료되지 않았습니다. 인증 메일을 확인해주세요."
          );
          setMessageType("error");
          setNeedsEmailConfirmation(true);
          return;
        }

        if (error.code === "invalid_credentials") {
          setMessage(
            "이메일 또는 비밀번호가 올바르지 않습니다."
          );
          setMessageType("error");
          return;
        }

        setMessage(
          "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        );
        setMessageType("error");
        return;
      }

      if (!data.session) {
        setMessage(
          "로그인 세션을 생성하지 못했습니다. 다시 시도해주세요."
        );
        setMessageType("error");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("로그인 예외 발생:", error);

      setMessage("로그인 중 오류가 발생했습니다.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setMessage("인증 메일을 받을 이메일을 입력해주세요.");
      setMessageType("error");
      return;
    }

    // 성신 이메일 체크
    // if (!trimmedEmail.endsWith("@sungshin.ac.kr")) {
    //   setMessage("성신여대 학교 이메일을 입력해주세요.");
    //   setMessageType("error");
    //   return;
    // }

    try {
      setIsResending(true);

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: trimmedEmail,
      });

      if (error) {
        console.error("인증 메일 재전송 오류:", error);

        setMessage(
          "인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요."
        );
        setMessageType("error");
        return;
      }

      setMessage(
        "인증 메일을 다시 보냈습니다. 학교 이메일을 확인해주세요."
      );
      setMessageType("success");
    } catch (error) {
      console.error("인증 메일 재전송 예외:", error);

      setMessage(
        "인증 메일 재전송 중 오류가 발생했습니다."
      );
      setMessageType("error");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.loginCard}>
        <div className={styles.leftSection}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark}>C</span>
            <span>CampusShare</span>
          </Link>

          <div className={styles.introArea}>
            <h1 className={styles.introTitle}>
              수업이 끝나도
              <br />
              자료는 남습니다.
            </h1>

            <p className={styles.introDescription}>
              같은 수업을 듣는 학생들의 필기와 확장 학습이
              과목 단위로 쌓이는 학습 아카이브예요. 학교
              이메일로 인증한 재학생·졸업생만 볼 수 있어요.
            </p>

            <ul className={styles.materialExamples}>
              <li>
                <span
                  className={`${styles.dot} ${styles.greenDot}`}
                />
                <strong>자료구조</strong>
                <span>· 중간고사 필기 정리</span>
              </li>

              <li>
                <span
                  className={`${styles.dot} ${styles.purpleDot}`}
                />
                <strong>데이터베이스</strong>
                <span>· 정규화 배우고 회사 사례까지</span>
              </li>

              <li>
                <span
                  className={`${styles.dot} ${styles.brownDot}`}
                />
                <strong>운영체제</strong>
                <span>· 프로세스 스케줄링 완벽 정리</span>
              </li>
            </ul>
          </div>

          <p className={styles.leftFooter}>
            학교 이메일 인증 · 재학생·졸업생 전용
          </p>
        </div>

        <div className={styles.rightSection}>
          <div className={styles.formContainer}>
            <header className={styles.formHeader}>
              <h2>학교 이메일로 시작하기</h2>
              <p>재학생·졸업생만 가입할 수 있어요</p>
            </header>

            <form onSubmit={handleLogin} noValidate>
              <div className={styles.formGroup}>
                <label htmlFor="email">학교 이메일</label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="student@sungshin.ac.kr"
                  autoComplete="email"
                  disabled={isLoading}
                />

                <p className={styles.helperText}>
                  @sungshin.ac.kr 도메인만 인증 가능
                </p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">비밀번호</label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>

              {message && (
                <p
                  className={`${styles.message} ${messageType === "success"
                      ? styles.successMessage
                      : styles.errorMessage
                    }`}
                  role="alert"
                  aria-live="polite"
                >
                  {message}
                </p>
              )}

              {needsEmailConfirmation && (
                <button
                  type="button"
                  className={styles.resendButton}
                  onClick={handleResendConfirmation}
                  disabled={isResending}
                >
                  {isResending
                    ? "메일 전송 중..."
                    : "인증 메일 다시 받기"}
                </button>
              )}

              <button
                className={styles.loginButton}
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </button>
            </form>

            <div className={styles.divider}>
              <span />
              <p>또는</p>
              <span />
            </div>

            <p className={styles.signupText}>
              계정이 없으신가요?
              <Link href="/signup">회원가입</Link>
            </p>

            <Link
              href="/forgot-password"
              className={styles.forgotPassword}
            >
              비밀번호를 잊으셨나요?
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}