"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import styles from "./signup.module.css";

export default function SignupPage() {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    // 이 알림이 뜨면 form과 함수 연결은 정상
    alert("회원가입 버튼 작동함");
    console.log("1. handleSignup 함수 실행됨");

    setMessage("");

    const trimmedNickname = nickname.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const schoolEmailPattern =
      /^[A-Za-z0-9._%+-]+@sungshin\.ac\.kr$/;

    // 입력값 검사
    if (!trimmedNickname) {
      setMessage("닉네임을 입력해주세요.");
      return;
    }

    if (!schoolEmailPattern.test(trimmedEmail)) {
      setMessage(
        "@sungshin.ac.kr 형식의 학교 이메일을 입력해주세요."
      );
      return;
    }

    if (password.length < 8) {
      setMessage("비밀번호는 8자 이상 입력해주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      setMessage("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setIsLoading(true);

      console.log("2. Supabase 회원가입 요청 시작");

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            nickname: trimmedNickname,
          },
        },
      });

      console.log("3. 회원가입 결과 data:", data);
      console.log("4. 회원가입 결과 error:", error);

      if (error) {
        setMessage(`회원가입 실패: ${error.message}`);
        alert(`회원가입 실패: ${error.message}`);
        return;
      }

      if (!data.user) {
        setMessage(
          "회원 정보가 생성되지 않았습니다. 다시 시도해주세요."
        );
        alert("회원 정보가 생성되지 않았습니다.");
        return;
      }

      setMessage(
        "회원가입 요청이 완료되었습니다. 인증 메일을 확인해주세요."
      );

      alert(
        "회원가입 요청 성공! 학교 이메일에서 인증 메일을 확인해주세요."
      );

      // 성공 후 입력창 초기화
      setNickname("");
      setEmail("");
      setPassword("");
      setPasswordConfirm("");
    } catch (error) {
      console.error("회원가입 예외 발생:", error);

      setMessage("회원가입 중 예상하지 못한 오류가 발생했습니다.");
      alert("회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.introSection}>
        <div className={styles.introContent}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark}>C</span>
            <span>CampusShare</span>
          </Link>

          <h1 className={styles.introTitle}>
            흩어진 강의자료를
            <br />
            <strong>한곳에서 함께</strong>
          </h1>

          <p className={styles.introDescription}>
            같은 강의를 듣는 학생들과 필기, 시험 정보,
            참고자료를 공유해보세요.
          </p>

          <ul className={styles.featureList}>
            <li>✓ 과목과 교수님별 자료 탐색</li>
            <li>✓ 필기·시험·참고자료 공유</li>
            <li>✓ 학교 이메일을 통한 인증</li>
          </ul>
        </div>
      </section>

      <section className={styles.signupSection}>
        <div className={styles.signupContainer}>
          <header className={styles.signupHeader}>
            <h2>회원가입</h2>
            <p>
              학교 이메일로 CampusShare를 시작해보세요.
            </p>
          </header>

          {/*
            noValidate:
            브라우저 기본 이메일 검사가 제출을 막지 않도록 하고,
            위의 handleSignup 함수에서 직접 검사함
          */}
          <form onSubmit={handleSignup} noValidate>
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
              <label htmlFor="email">학교 이메일</label>

              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="example@sungshin.ac.kr"
                autoComplete="email"
                disabled={isLoading}
              />

              <p className={styles.helperText}>
                @sungshin.ac.kr 이메일만 가입할 수 있습니다.
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
                placeholder="8자 이상 입력해주세요."
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
                placeholder="비밀번호를 다시 입력해주세요."
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>

            {message && (
              <p
                className={styles.message}
                role="alert"
                aria-live="polite"
              >
                {message}
              </p>
            )}

            <button
              className={styles.signupButton}
              type="submit"
              disabled={isLoading}
            >
              {isLoading
                ? "가입 처리 중..."
                : "회원가입"}
            </button>
          </form>

          <p className={styles.loginLink}>
            이미 계정이 있나요?
            <Link href="/login"> 로그인</Link>
          </p>
        </div>
      </section>
    </main>
  );
}