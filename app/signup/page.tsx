"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import styles from "./signup.module.css";

export default function SignupPage() {
  const router = useRouter();

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "error" | "success" | ""
  >("");
  const [isLoading, setIsLoading] = useState(false);

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
  }, [router]);

  const handleSignup = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    const trimmedNickname = nickname.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedNickname) {
      setMessage("닉네임을 입력해주세요.");
      setMessageType("error");
      return;
    }

    if (!trimmedEmail) {
      setMessage("이메일을 입력해주세요.");
      setMessageType("error");
      return;
    }

    if (password.length < 8) {
      setMessage("비밀번호는 8자 이상 입력해주세요.");
      setMessageType("error");
      return;
    }

    if (password !== passwordConfirm) {
      setMessage("비밀번호가 일치하지 않습니다.");
      setMessageType("error");
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            nickname: trimmedNickname,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        setMessage(`회원가입 실패: ${error.message}`);
        setMessageType("error");
        return;
      }

      if (!data.user) {
        setMessage(
          "회원 정보가 생성되지 않았습니다. 다시 시도해주세요.",
        );
        setMessageType("error");
        return;
      }

      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }

      setMessage(
        "회원가입 요청이 완료되었습니다. 입력한 이메일에서 인증 링크를 확인해주세요.",
      );
      setMessageType("success");

      setNickname("");
      setEmail("");
      setPassword("");
      setPasswordConfirm("");
    } catch (error) {
      console.error("회원가입 예외 발생:", error);

      setMessage(
        "회원가입 중 예상하지 못한 오류가 발생했습니다.",
      );
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.brandSection}>
        <div className={styles.brandContent}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark}>C</span>
            <span>CampusShare</span>
          </Link>

          <div className={styles.brandMessage}>
            <p className={styles.eyebrow}>CAMPUS KNOWLEDGE HUB</p>

            <h1>
              흩어진 강의자료를
              <br />
              <strong>한곳에서 함께</strong>
            </h1>

            <p className={styles.brandDescription}>
              같은 강의를 듣는 학생들과 필기, 시험 정보,
              참고자료를 나누고 학습의 흐름을 이어가세요.
            </p>
          </div>

          <div className={styles.featureGrid}>
            <div>
              <span>01</span>
              <p>과목과 교수님별 자료 탐색</p>
            </div>

            <div>
              <span>02</span>
              <p>필기·시험·참고자료 공유</p>
            </div>

            <div>
              <span>03</span>
              <p>인증된 계정으로 안전하게 이용</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.formContainer}>
          <header className={styles.formHeader}>
            <p className={styles.formEyebrow}>CREATE ACCOUNT</p>
            <h2>회원가입</h2>
            <p>
              이메일 인증 후 CampusShare를 시작할 수 있어요.
            </p>
          </header>

          <form
            className={styles.form}
            onSubmit={handleSignup}
            noValidate
          >
            <div className={styles.formGroup}>
              <label htmlFor="nickname">닉네임</label>

              <input
                id="nickname"
                name="nickname"
                type="text"
                value={nickname}
                onChange={(event) =>
                  setNickname(event.target.value)
                }
                placeholder="사용할 닉네임을 입력해주세요."
                autoComplete="nickname"
                disabled={isLoading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">이메일</label>

              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="example@email.com"
                autoComplete="email"
                disabled={isLoading}
              />

              <p className={styles.helperText}>
                인증 메일을 받을 수 있는 이메일을 입력해주세요.
              </p>
            </div>

            <div className={styles.passwordRow}>
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
                  placeholder="8자 이상"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="passwordConfirm">
                  비밀번호 확인
                </label>

                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(event) =>
                    setPasswordConfirm(event.target.value)
                  }
                  placeholder="다시 입력"
                  autoComplete="new-password"
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
                aria-live="polite"
              >
                <span aria-hidden="true">
                  {messageType === "success" ? "✓" : "!"}
                </span>
                <p>{message}</p>
              </div>
            )}

            <button
              className={styles.signupButton}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "가입 처리 중..." : "회원가입"}
            </button>
          </form>

          <div className={styles.divider}>
            <span />
            <p>이미 CampusShare를 사용 중인가요?</p>
            <span />
          </div>

          <Link href="/login" className={styles.loginButton}>
            로그인하러 가기
          </Link>
        </div>
      </section>
    </main>
  );
}
