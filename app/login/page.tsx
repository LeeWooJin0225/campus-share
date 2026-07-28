"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // 새로 추가된 state (디자인 반영용)
  const [isSignup, setIsSignup] = useState(false);
  // 닉네임: 화면엔 있지만 아직 어디에도 저장되지 않음 (추후 연결 예정)
  const [nickname, setNickname] = useState("");

  const schoolDomain = "@sungshin.ac.kr";

  function checkSchoolEmail() {
    if (!email.toLowerCase().endsWith(schoolDomain)) {
      setMessage(`학교 이메일(${schoolDomain})만 사용할 수 있습니다.`);
      return false;
    }

    return true;
  }

  // ↓↓↓ 아래 두 함수는 기존 코드에서 한 글자도 안 바꿨음 ↓↓↓

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!checkSchoolEmail()) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(`회원가입 실패: ${error.message}`);
    } else {
      setMessage("회원가입 완료! 이메일 인증 메일을 확인해주세요.");
    }

    setLoading(false);
  }

  async function handleLogin() {
    if (!checkSchoolEmail()) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`로그인 실패: ${error.message}`);
    } else {
      setMessage("로그인 성공!");
    }

    setLoading(false);
  }

  // ↑↑↑ 여기까지 기존 코드 그대로 ↑↑↑

  // 새로 추가: 토글 모드에 따라 분기해서 호출
  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSignup) {
      await handleSignUp(event);
    } else {
      await handleLogin();
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* 왼쪽 패널 — 브랜딩 (모바일에서는 숨김) */}
      <div className="hidden md:flex flex-1 items-center border-r border-[#DEDCD6] bg-[#F5F5F5]">
        <div className="w-full max-w-[480px] mx-auto px-14 py-12 flex flex-col gap-9">
          {/* 로고 */}
          <div className="flex items-center gap-2">
            <div className="relative w-5 h-5 rounded-[5px] bg-[#3C3489] shrink-0">
              <div className="absolute inset-[5px] border-[1.5px] border-white rounded-sm" />
            </div>
            <span className="font-bold text-[15px] text-[#3C3489]">
              CampusShare
            </span>
          </div>

          {/* 헤드라인 */}
          <div>
            <h1 className="text-[34px] font-bold leading-tight text-[#37352F] mb-3.5">
              수업이 끝나도
              <br />
              자료는 남습니다.
            </h1>
            <p className="text-sm text-[#6E6D68] leading-relaxed mb-7 max-w-[360px]">
              같은 수업을 듣는 학생들의 필기와 확장 학습이 과목 단위로
              쌓이는 학습 아카이브예요. 학교 이메일로 인증한
              재학생·졸업생만 볼 수 있어요.
            </p>

            {/* 미리보기 카드 */}
            <div className="flex flex-col gap-2">
              {[
                "자료구조 · 중간고사 필기 정리",
                "데이터베이스 · 정규화 배우고 회사 사례까지",
                "운영체제 · 프로세스 스케줄링 완벽 정리",
              ].map((text) => (
                <div
                  key={text}
                  className="px-3.5 py-2.5 border border-[#DEDCD6] rounded-lg text-[13.5px] text-[#37352F] shadow-sm"
                >
                  {text}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-[#8E8C86]">
            학교 이메일 인증 · 재학생·졸업생 전용
          </p>
        </div>
      </div>

      {/* 오른쪽 패널 — 폼 */}
      <div className="w-full md:w-[440px] shrink-0 flex items-center justify-center px-6 md:px-14 py-12">
        <div className="w-full max-w-[300px]">
          <h2 className="text-xl font-bold text-[#37352F] mb-1">
            학교 이메일로 {isSignup ? "시작하기" : "시작하기"}
          </h2>
          <p className="text-[13px] text-[#8E8C86] mb-7">
            재학생·졸업생만 가입할 수 있어요
          </p>

          <form onSubmit={handleFormSubmit}>
            <label
              htmlFor="email"
              className="block text-[12.5px] font-medium text-[#6E6D68] mb-1.5"
            >
              학교 이메일
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@sungshin.ac.kr"
              className="w-full px-3 py-2.5 border border-[#DEDCD6] rounded-lg bg-white text-sm text-[#37352F] outline-none focus:border-[#7F77DD] transition-colors"
            />
            <p className="text-xs text-[#8E8C86] -mt-2.5 mb-4">
              @sungshin.ac.kr 도메인만 인증 가능
            </p>

            {isSignup && (
              <>
                <label
                  htmlFor="nickname"
                  className="block text-[12.5px] font-medium text-[#6E6D68] mb-1.5"
                >
                  닉네임
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="댓글과 노트에 표시될 이름이에요"
                  className="w-full px-3 py-2.5 border border-[#DEDCD6] rounded-lg bg-white text-sm text-[#37352F] outline-none focus:border-[#7F77DD] transition-colors mb-4"
                />
              </>
            )}

            <label
              htmlFor="password"
              className="block text-[12.5px] font-medium text-[#6E6D68] mb-1.5"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상 입력"
              className="w-full px-3 py-2.5 border border-[#DEDCD6] rounded-lg bg-white text-sm text-[#37352F] outline-none focus:border-[#7F77DD] transition-colors mb-4"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-1.5 bg-[#7F77DD] hover:bg-[#6B63CE] text-white text-[15px] font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "처리 중..." : isSignup ? "가입하기" : "로그인"}
            </button>
          </form>

          <div className="flex items-center gap-2.5 my-5 text-xs text-[#8E8C86]">
            <div className="flex-1 h-px bg-[#DEDCD6]" />
            또는
            <div className="flex-1 h-px bg-[#DEDCD6]" />
          </div>

          <div className="text-center text-[13px] text-[#6E6D68]">
            {isSignup ? (
              <>
                계정이 있으신가요?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignup(false)}
                  className="font-semibold text-[#37352F]"
                >
                  로그인
                </button>
              </>
            ) : (
              <>
                계정이 없으신가요?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignup(true)}
                  className="font-semibold text-[#37352F]"
                >
                  회원가입
                </button>
              </>
            )}
            <br />
            <br />
            <button
              type="button"
              className="text-xs font-normal text-[#8E8C86]"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>

          {message && (
            <p className="mt-5 rounded-lg bg-gray-100 p-3 text-sm text-[#37352F]">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}