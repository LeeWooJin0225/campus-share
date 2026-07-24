"use client";

import { FormEvent, useState } from "react";
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
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    const trimmedEmail = email.trim().toLowerCase();

    const schoolEmailRegex =
      /^[A-Za-z0-9._%+-]+@sungshin\.ac\.kr$/;

    if (!schoolEmailRegex.test(trimmedEmail)) {
      setMessage("성신여대 이메일을 입력해주세요.");
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
          }
        );

      if (error) {
        console.error("비밀번호 재설정 메일 오류:", error);

        setMessage(
          "메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요."
        );
        setMessageType("error");
        return;
      }

      setMessage(
        "가입된 계정이라면 비밀번호 재설정 메일이 발송됩니다. 메일함을 확인해주세요."
      );
      setMessageType("success");
    } catch (error) {
      console.error("비밀번호 재설정 오류:", error);

      setMessage(
        "메일 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
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

        <div className={styles.iconWrap}>
          <span className={styles.icon}>🔐</span>
        </div>

        <div className={styles.heading}>
          <p className={styles.brand}>CampusShare</p>

          <h1 className={styles.title}>
            비밀번호를 잊으셨나요?
          </h1>

          <p className={styles.description}>
            가입할 때 사용한 성신여대 이메일을
            입력해주세요.
            <br />
            새 비밀번호를 설정할 수 있는 링크를
            보내드릴게요.
          </p>
        </div>

        <form
          className={styles.form}
          onSubmit={handleResetPassword}
          noValidate
        >
          <div className={styles.field}>
            <label
              htmlFor="email"
              className={styles.label}
            >
              학교 이메일
            </label>

            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>✉</span>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="example@sungshin.ac.kr"
                className={styles.input}
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                disabled={isLoading}
              />
            </div>
          </div>

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
              ? "메일 보내는 중..."
              : "비밀번호 재설정 메일 받기"}
          </button>
        </form>

        <div className={styles.notice}>
          <span className={styles.noticeIcon}>💡</span>

          <p>
            메일이 보이지 않는다면 스팸 메일함도
            확인해주세요.
          </p>
        </div>

        <p className={styles.bottomText}>
          비밀번호가 기억났나요?
          <Link
            href="/login"
            className={styles.loginLink}
          >
            로그인
          </Link>
        </p>
      </section>
    </main>
  );
}