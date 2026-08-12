"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import styles from "./reset-password.module.css";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] =
    useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const [isCheckingSession, setIsCheckingSession] =
    useState(true);
  const [isRecoverySession, setIsRecoverySession] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkRecoverySession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        console.error("복구 세션 확인 오류:", error);
        setIsCheckingSession(false);
        return;
      }

      if (session) {
        setIsRecoverySession(true);
      }

      setIsCheckingSession(false);
    };

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setIsRecoverySession(true);
        setIsCheckingSession(false);
      }

      if (event === "SIGNED_OUT") {
        setIsRecoverySession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (!isRecoverySession) {
      setMessage(
        "비밀번호 재설정 링크가 만료되었거나 올바르지 않습니다.",
      );
      setMessageType("error");
      return;
    }

    if (password.length < 8) {
      setMessage("비밀번호는 8자 이상 입력해주세요.");
      setMessageType("error");
      return;
    }

    if (password !== passwordConfirm) {
      setMessage("비밀번호가 서로 일치하지 않습니다.");
      setMessageType("error");
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error("비밀번호 변경 오류:", error);

        setMessage(
          "비밀번호를 변경하지 못했습니다. 재설정 메일을 다시 요청해주세요.",
        );
        setMessageType("error");
        return;
      }

      setMessage("비밀번호가 변경되었습니다.");
      setMessageType("success");

      await supabase.auth.signOut();

      window.setTimeout(() => {
        router.replace("/login?passwordChanged=true");
        router.refresh();
      }, 900);
    } catch (error) {
      console.error("비밀번호 변경 예외:", error);

      setMessage(
        "비밀번호 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main className={styles.page}>
        <section className={styles.leftSection}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon} aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M7 3.75H14.2L19 8.55V20.25H7C5.9 20.25 5 19.35 5 18.25V5.75C5 4.65 5.9 3.75 7 3.75Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 4V9H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 12H15.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M8.5 15.5H14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>CampusShare</span>
          </Link>

          <div className={styles.introArea}>
            <h1 className={styles.introTitle}>
              비밀번호를
              <br />
              새로 설정합니다.
            </h1>

            <p className={styles.introDescription}>
              재설정 링크가 유효한지 확인하고 있어요.
              <br />
              잠시만 기다려주세요.
            </p>
          </div>

          <p className={styles.leftFooter}>
            학교 이메일 인증 · 재학생·졸업생 전용
          </p>
        </section>

        <section className={styles.rightSection}>
          <div className={styles.formContainer}>
            <div className={styles.loadingBox}>
              <span className={styles.loadingSpinner} />
              <p>비밀번호 재설정 링크를 확인하고 있어요.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.leftSection}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon} aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M7 3.75H14.2L19 8.55V20.25H7C5.9 20.25 5 19.35 5 18.25V5.75C5 4.65 5.9 3.75 7 3.75Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M14 4V9H19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 12H15.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M8.5 15.5H14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>CampusShare</span>
        </Link>

        <div className={styles.introArea}>
          <h1 className={styles.introTitle}>
            사용할 비밀번호를
            <br />
            새로 설정해주세요.
          </h1>

          <p className={styles.introDescription}>
            다른 곳에서 사용하지 않는 비밀번호로 변경하는 것이 좋아요.
            <br />
            새 비밀번호를 설정한 뒤에는 로그인 화면으로 이동합니다.
          </p>

          <div className={styles.guideArea}>
            <p className={styles.guideLabel}>
              비밀번호 설정 안내
            </p>

            <div className={styles.guideRow}>
              <span className={styles.guideNumber}>1</span>
              <p className={styles.guideText}>
                <strong>8자 이상 입력해주세요.</strong>
                너무 짧은 비밀번호는 사용할 수 없어요.
              </p>
            </div>

            <div className={styles.guideRow}>
              <span className={styles.guideNumber}>2</span>
              <p className={styles.guideText}>
                <strong>새 비밀번호를 한 번 더 확인해요.</strong>
                두 입력값이 같아야 변경할 수 있어요.
              </p>
            </div>

            <div className={styles.guideRow}>
              <span className={styles.guideNumber}>3</span>
              <p className={styles.guideText}>
                <strong>변경 후 다시 로그인해요.</strong>
                완료되면 로그인 화면으로 이동합니다.
              </p>
            </div>
          </div>
        </div>

        <p className={styles.leftFooter}>
          학교 이메일 인증 · 재학생·졸업생 전용
        </p>
      </section>

      <section className={styles.rightSection}>
        <div className={styles.formContainer}>
          {isRecoverySession ? (
            <>
              <header className={styles.formHeader}>
                <h2>새 비밀번호 설정</h2>
                <p>앞으로 사용할 비밀번호를 입력해주세요</p>
              </header>

              <form
                className={styles.form}
                onSubmit={handleResetPassword}
                noValidate
              >
                <div className={styles.formGroup}>
                  <label htmlFor="password">새 비밀번호</label>

                  <div className={styles.passwordField}>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="8자 이상 입력해주세요."
                      autoComplete="new-password"
                      disabled={isLoading}
                    />

                    <button
                      type="button"
                      className={styles.showButton}
                      onClick={() =>
                        setShowPassword((prev) => !prev)
                      }
                      aria-label={
                        showPassword
                          ? "비밀번호 숨기기"
                          : "비밀번호 보기"
                      }
                    >
                      {showPassword ? "숨김" : "보기"}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="passwordConfirm">
                    새 비밀번호 확인
                  </label>

                  <div className={styles.passwordField}>
                    <input
                      id="passwordConfirm"
                      name="passwordConfirm"
                      type={
                        showPasswordConfirm
                          ? "text"
                          : "password"
                      }
                      value={passwordConfirm}
                      onChange={(event) =>
                        setPasswordConfirm(event.target.value)
                      }
                      placeholder="비밀번호를 다시 입력해주세요."
                      autoComplete="new-password"
                      disabled={isLoading}
                    />

                    <button
                      type="button"
                      className={styles.showButton}
                      onClick={() =>
                        setShowPasswordConfirm((prev) => !prev)
                      }
                      aria-label={
                        showPasswordConfirm
                          ? "비밀번호 숨기기"
                          : "비밀번호 보기"
                      }
                    >
                      {showPasswordConfirm ? "숨김" : "보기"}
                    </button>
                  </div>
                </div>

                <div className={styles.passwordRule}>
                  <span
                    className={
                      password.length >= 8 ? styles.rulePassed : ""
                    }
                  >
                    {password.length >= 8 ? "✓" : "○"} 8자 이상
                  </span>

                  <span
                    className={
                      password.length > 0 &&
                      password === passwordConfirm
                        ? styles.rulePassed
                        : ""
                    }
                  >
                    {password.length > 0 &&
                    password === passwordConfirm
                      ? "✓"
                      : "○"}{" "}
                    비밀번호 일치
                  </span>
                </div>

                {message && (
                  <div
                    className={`${styles.message} ${
                      messageType === "success"
                        ? styles.successMessage
                        : styles.errorMessage
                    }`}
                    role="alert"
                    aria-live="polite"
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  {isLoading
                    ? "변경하는 중..."
                    : "비밀번호 변경하기"}
                </button>
              </form>

              <Link href="/login" className={styles.loginLink}>
                로그인 화면으로 돌아가기
              </Link>
            </>
          ) : (
            <section className={styles.invalidSection}>
              <div className={styles.invalidIcon}>!</div>

              <h2>재설정 링크를 사용할 수 없어요.</h2>

              <p>
                링크가 만료되었거나 이미 사용된 링크일 수 있습니다.
                <br />
                비밀번호 재설정 메일을 다시 요청해주세요.
              </p>

              <Link
                href="/forgot-password"
                className={styles.requestAgainButton}
              >
                재설정 메일 다시 받기
              </Link>

              <Link
                href="/login"
                className={styles.invalidLoginLink}
              >
                로그인으로 돌아가기
              </Link>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}