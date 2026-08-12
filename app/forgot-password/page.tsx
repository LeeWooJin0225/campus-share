"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import styles from "./forgot-password.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    const trimmedEmail = email.trim().toLowerCase();

    const schoolEmailRegex =
      /^[A-Za-z0-9._%+-]+@sungshin\.ac\.kr$/;

    if (!trimmedEmail) {
      setMessage("학교 이메일을 입력해주세요.");
      setMessageType("error");
      return;
    }

    if (!schoolEmailRegex.test(trimmedEmail)) {
      setMessage(
        "@sungshin.ac.kr 형식의 학교 이메일을 입력해주세요.",
      );
      setMessageType("error");
      return;
    }

    try {
      setIsLoading(true);

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          trimmedEmail,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          },
        );

      if (error) {
        console.error("비밀번호 재설정 메일 오류:", error);

        setMessage(
          "메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
        );
        setMessageType("error");
        return;
      }

      setMessage(
        "가입된 계정이라면 비밀번호 재설정 메일이 발송됩니다. 메일함을 확인해주세요.",
      );
      setMessageType("success");
    } catch (error) {
      console.error("비밀번호 재설정 오류:", error);

      setMessage(
        "메일 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

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
            비밀번호를 잊어도
            <br />
            다시 시작할 수 있어요.
          </h1>

          <p className={styles.introDescription}>
            가입할 때 사용한 학교 이메일로 비밀번호 재설정 링크를
            보내드려요.
            <br />
            메일을 확인한 뒤 새로운 비밀번호를 설정해주세요.
          </p>

          <div className={styles.guideArea}>
            <p className={styles.guideLabel}>
              재설정은 이렇게 진행돼요
            </p>

            <div className={styles.guideRow}>
              <span className={styles.guideNumber}>1</span>
              <p className={styles.guideText}>
                <strong>학교 이메일을 입력해요.</strong>
                가입할 때 사용한 @sungshin.ac.kr 메일을 입력해주세요.
              </p>
            </div>

            <div className={styles.guideRow}>
              <span className={styles.guideNumber}>2</span>
              <p className={styles.guideText}>
                <strong>메일함에서 링크를 확인해요.</strong>
                스팸 메일함이나 프로모션 메일함도 함께 확인해주세요.
              </p>
            </div>

            <div className={styles.guideRow}>
              <span className={styles.guideNumber}>3</span>
              <p className={styles.guideText}>
                <strong>새 비밀번호로 다시 로그인해요.</strong>
                재설정이 끝나면 새 비밀번호로 로그인할 수 있어요.
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
          <header className={styles.formHeader}>
            <h2>비밀번호 찾기</h2>
            <p>가입한 학교 이메일을 입력해주세요</p>
          </header>

          <form
            className={styles.form}
            onSubmit={handleResetPassword}
            noValidate
          >
            <div className={styles.formGroup}>
              <label htmlFor="email">학교 이메일</label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="student@sungshin.ac.kr"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                disabled={isLoading}
              />

              <p className={styles.helperText}>
                @sungshin.ac.kr 도메인만 인증 가능
              </p>
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
                ? "메일 보내는 중..."
                : "재설정 메일 받기"}
            </button>
          </form>

          <p className={styles.signupText}>
            비밀번호가 기억났나요?
            <Link href="/login">로그인</Link>
          </p>

          <Link href="/login" className={styles.forgotPassword}>
            로그인 화면으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}