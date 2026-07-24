"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./reset-password.module.css";

type LinkState = "checking" | "valid" | "invalid";
type MessageType = "success" | "error" | "";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [linkState, setLinkState] =
    useState<LinkState>("checking");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<MessageType>("");

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkRecoverySession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("재설정 세션 확인 오류:", error);
        setLinkState("invalid");
        return;
      }

      setLinkState(session ? "valid" : "invalid");
    };

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(
          "비밀번호 재설정 인증 이벤트:",
          event
        );

        if (
          event === "PASSWORD_RECOVERY" &&
          session
        ) {
          setLinkState("valid");
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (linkState !== "valid") {
      setMessage(
        "재설정 링크가 만료되었거나 유효하지 않습니다."
      );
      setMessageType("error");
      return;
    }

    if (password.length < 8) {
      setMessage(
        "비밀번호는 8자 이상 입력해주세요."
      );
      setMessageType("error");
      return;
    }

    if (password !== passwordConfirm) {
      setMessage(
        "입력한 비밀번호가 서로 일치하지 않습니다."
      );
      setMessageType("error");
      return;
    }

    try {
      setIsLoading(true);

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        console.error(
          "비밀번호 변경 오류:",
          error
        );

        setMessage(
          "비밀번호를 변경하지 못했습니다. 재설정 메일을 다시 요청해주세요."
        );
        setMessageType("error");
        return;
      }

      setMessage(
        "비밀번호가 성공적으로 변경되었습니다."
      );
      setMessageType("success");

      await supabase.auth.signOut();

      setTimeout(() => {
        router.replace(
          "/login?passwordChanged=true"
        );
      }, 1200);
    } catch (error) {
      console.error(
        "비밀번호 변경 중 오류:",
        error
      );

      setMessage(
        "비밀번호 변경 중 오류가 발생했습니다."
      );
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.backgroundCircleOne} />
      <div className={styles.backgroundCircleTwo} />

      <section className={styles.card}>
        <Link
          href="/login"
          className={styles.backLink}
        >
          ← 로그인으로
        </Link>

        {linkState === "checking" && (
          <div className={styles.stateArea}>
            <div className={styles.loader} />

            <h1 className={styles.stateTitle}>
              재설정 링크 확인 중
            </h1>

            <p className={styles.stateDescription}>
              잠시만 기다려주세요.
            </p>
          </div>
        )}

        {linkState === "invalid" && (
          <div className={styles.stateArea}>
            <div className={styles.iconWrap}>
              <span className={styles.icon}>
                ⏰
              </span>
            </div>

            <p className={styles.brand}>
              CampusShare
            </p>

            <h1 className={styles.stateTitle}>
              링크가 유효하지 않아요
            </h1>

            <p className={styles.stateDescription}>
              비밀번호 재설정 링크가 만료되었거나
              이미 사용된 링크입니다.
              <br />
              재설정 메일을 다시 요청해주세요.
            </p>

            <Link
              href="/forgot-password"
              className={styles.retryButton}
            >
              재설정 메일 다시 받기
            </Link>
          </div>
        )}

        {linkState === "valid" && (
          <>
            <div className={styles.iconWrap}>
              <span className={styles.icon}>
                🔑
              </span>
            </div>

            <div className={styles.heading}>
              <p className={styles.brand}>
                CampusShare
              </p>

              <h1 className={styles.title}>
                새 비밀번호 설정
              </h1>

              <p className={styles.description}>
                앞으로 사용할 새로운 비밀번호를
                입력해주세요.
                <br />
                안전한 사용을 위해 8자 이상으로
                설정해주세요.
              </p>
            </div>

            <form
              className={styles.form}
              onSubmit={handleUpdatePassword}
              noValidate
            >
              <div className={styles.field}>
                <label
                  htmlFor="password"
                  className={styles.label}
                >
                  새 비밀번호
                </label>

                <div className={styles.inputWrap}>
                  <span
                    className={styles.inputIcon}
                  >
                    🔒
                  </span>

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    placeholder="8자 이상 입력해주세요"
                    className={styles.input}
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    disabled={isLoading}
                  />

                  <button
                    type="button"
                    className={styles.showButton}
                    onClick={() =>
                      setShowPassword(
                        (previous) => !previous
                      )
                    }
                    disabled={isLoading}
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

              <div className={styles.field}>
                <label
                  htmlFor="passwordConfirm"
                  className={styles.label}
                >
                  새 비밀번호 확인
                </label>

                <div className={styles.inputWrap}>
                  <span
                    className={styles.inputIcon}
                  >
                    ✓
                  </span>

                  <input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type={
                      showPasswordConfirm
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    placeholder="비밀번호를 다시 입력해주세요"
                    className={styles.input}
                    value={passwordConfirm}
                    onChange={(event) =>
                      setPasswordConfirm(
                        event.target.value
                      )
                    }
                    disabled={isLoading}
                  />

                  <button
                    type="button"
                    className={styles.showButton}
                    onClick={() =>
                      setShowPasswordConfirm(
                        (previous) => !previous
                      )
                    }
                    disabled={isLoading}
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

              {password &&
                passwordConfirm && (
                  <p
                    className={
                      password ===
                      passwordConfirm
                        ? styles.matchMessage
                        : styles.notMatchMessage
                    }
                  >
                    {password ===
                    passwordConfirm
                      ? "비밀번호가 일치합니다."
                      : "비밀번호가 일치하지 않습니다."}
                  </p>
                )}

              {message && (
                <div
                  className={`${styles.message} ${
                    messageType === "success"
                      ? styles.successMessage
                      : styles.errorMessage
                  }`}
                  role="alert"
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

            <div className={styles.notice}>
              <span
                className={styles.noticeIcon}
              >
                💡
              </span>

              <p>
                다른 사이트에서 사용 중인
                비밀번호는 피해주세요.
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}