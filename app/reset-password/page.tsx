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
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (!isRecoverySession) {
      setMessage(
        "비밀번호 재설정 링크가 만료되었거나 올바르지 않습니다."
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
          "비밀번호를 변경하지 못했습니다. 재설정 메일을 다시 요청해주세요."
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
        "비밀번호 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main className={styles.page}>
        <section className={styles.loadingCard}>
          <span className={styles.loadingSpinner} />
          <p>비밀번호 재설정 링크를 확인하고 있어요.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.leftSection}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark}>C</span>
            <span>CampusShare</span>
          </Link>

          <div className={styles.introArea}>
            <p className={styles.eyebrow}>
              NEW PASSWORD
            </p>

            <h1 className={styles.introTitle}>
              사용할 비밀번호를
              <br />
              새로 설정해주세요.
            </h1>

            <p className={styles.introDescription}>
              다른 곳에서 사용하지 않는 비밀번호로
              변경하는 것이 좋아요. 새 비밀번호를 설정한
              뒤에는 로그인 화면으로 이동합니다.
            </p>

            <div className={styles.guideBox}>
              <strong>비밀번호 설정 안내</strong>

              <ul>
                <li>8자 이상 입력해주세요.</li>
                <li>
                  영문, 숫자, 특수문자를 함께 사용하면
                  더 안전해요.
                </li>
                <li>
                  기존 비밀번호와 다른 비밀번호를
                  사용해주세요.
                </li>
              </ul>
            </div>
          </div>

          <p className={styles.leftFooter}>
            학교 이메일 인증 · 재학생·졸업생 전용
          </p>
        </div>

        <div className={styles.rightSection}>
          <div className={styles.formContainer}>
            {isRecoverySession ? (
              <>
                <header className={styles.formHeader}>
                  <div className={styles.lockIcon}>
                    <span />
                  </div>

                  <h2>새 비밀번호 설정</h2>

                  <p>
                    앞으로 사용할 비밀번호를 입력해주세요.
                  </p>
                </header>

                <form
                  className={styles.form}
                  onSubmit={handleResetPassword}
                  noValidate
                >
                  <div className={styles.formGroup}>
                    <label htmlFor="password">
                      새 비밀번호
                    </label>

                    <div className={styles.passwordField}>
                      <input
                        id="password"
                        name="password"
                        type={
                          showPassword ? "text" : "password"
                        }
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
                          setPasswordConfirm(
                            event.target.value
                          )
                        }
                        placeholder="비밀번호를 다시 입력해주세요."
                        autoComplete="new-password"
                        disabled={isLoading}
                      />

                      <button
                        type="button"
                        className={styles.showButton}
                        onClick={() =>
                          setShowPasswordConfirm(
                            (prev) => !prev
                          )
                        }
                        aria-label={
                          showPasswordConfirm
                            ? "비밀번호 숨기기"
                            : "비밀번호 보기"
                        }
                      >
                        {showPasswordConfirm
                          ? "숨김"
                          : "보기"}
                      </button>
                    </div>
                  </div>

                  <div className={styles.passwordRule}>
                    <span
                      className={
                        password.length >= 8
                          ? styles.rulePassed
                          : ""
                      }
                    >
                      {password.length >= 8 ? "✓" : "○"} 8자
                      이상
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

                <Link
                  href="/login"
                  className={styles.loginLink}
                >
                  로그인 화면으로 돌아가기
                </Link>
              </>
            ) : (
              <section className={styles.invalidSection}>
                <div className={styles.invalidIcon}>!</div>

                <h2>재설정 링크를 사용할 수 없어요.</h2>

                <p>
                  링크가 만료되었거나 이미 사용된
                  링크일 수 있습니다.
                  <br />
                  비밀번호 재설정 메일을 다시
                  요청해주세요.
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
        </div>
      </section>
    </main>
  );
}