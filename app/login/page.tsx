"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import styles from "./login.module.css";

export default function LoginPage() {
    const router = useRouter();

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

    const handleLogin = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setMessage("");
        setMessageType("");
        setNeedsEmailConfirmation(false);

        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedEmail) {
            setMessage("이메일을 입력해주세요.");
            setMessageType("error");
            return;
        }

        if (!trimmedEmail.endsWith("@sungshin.ac.kr")) {
            setMessage("성신여대 이메일을 입력해주세요.");
            setMessageType("error");
            return;
        }

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

            console.log("로그인 결과:", data);
            console.log("로그인 오류:", error);

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

                setMessage(`로그인 실패: ${error.message}`);
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

            setMessage("로그인되었습니다.");
            setMessageType("success");

            // 로그인 성공 후 메인 페이지로 이동
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

        try {
            setIsResending(true);

            const { error } = await supabase.auth.resend({
                type: "signup",
                email: trimmedEmail,
            });

            if (error) {
                setMessage(`인증 메일 재전송 실패: ${error.message}`);
                setMessageType("error");
                return;
            }

            setMessage(
                "인증 메일을 다시 보냈습니다. 학교 이메일을 확인해주세요."
            );
            setMessageType("success");
        } catch (error) {
            console.error("인증 메일 재전송 오류:", error);

            setMessage("인증 메일 재전송 중 오류가 발생했습니다.");
            setMessageType("error");
        } finally {
            setIsResending(false);
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
                        필요한 강의자료를
                        <br />
                        <strong>더 빠르게 찾아보세요</strong>
                    </h1>

                    <p className={styles.introDescription}>
                        같은 강의를 듣는 학생들과 필기, 시험 정보,
                        참고자료를 나눌 수 있습니다.
                    </p>

                    <ul className={styles.featureList}>
                        <li>✓ 과목과 교수님별 자료 탐색</li>
                        <li>✓ 필기·시험·참고자료 공유</li>
                        <li>✓ 학교 이메일 인증으로 안전하게</li>
                    </ul>
                </div>
            </section>

            <section className={styles.loginSection}>
                <div className={styles.loginContainer}>
                    <header className={styles.loginHeader}>
                        <h2>로그인</h2>
                        <p>CampusShare에 다시 오신 것을 환영합니다.</p>
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
                                placeholder="example@sungshin.ac.kr"
                                autoComplete="email"
                                disabled={isLoading}
                            />

                            <p className={styles.helperText}>
                                @sungshin.ac.kr 이메일을 입력해주세요.
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
                                placeholder="비밀번호를 입력해주세요."
                                autoComplete="current-password"
                                disabled={isLoading}
                            />
                        </div>

                        <div className={styles.passwordHelp}>
                            <Link
                                href="/forgot-password"
                                className={styles.passwordHelpLink}
                            >
                                비밀번호를 잊으셨나요?
                            </Link>
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

                    <p className={styles.signupLink}>
                        아직 계정이 없나요?
                        <Link href="/signup"> 회원가입</Link>
                    </p>
                </div>
            </section>
        </main>
    );
}