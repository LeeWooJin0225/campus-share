"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import TagChip, { TagType } from "@/components/common/TagChip";
import { supabase } from "@/lib/supabase";

const TYPE_ROWS: { tag: TagType; desc: string }[] = [
  { tag: 'notes',        desc: '강의 중 정리한 필기' },
  { tag: 'exam',         desc: '시험 범위 정리와 대비 자료' },
  { tag: 'reference',    desc: '수업 이해에 도움이 된 책·영상·문서' },
  { tag: 'study_trail',  desc: '수업에서 출발해 혼자 더 파고든 기록' },
]

const ALLOWED_DOMAIN = "@sungshin.ac.kr";

type AuthPanelProps = {
  mode: "login" | "signup";
};

export default function AuthPanel({ mode }: AuthPanelProps) {
  const router = useRouter();

  const isSignup = mode === "signup";

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setErrorMessage('')
    setInfoMessage('')

    const trimmedEmail = email.trim();

    if (!trimmedEmail.endsWith(ALLOWED_DOMAIN)) {
      setErrorMessage(`${ALLOWED_DOMAIN} 도메인만 사용할 수 있어요`);
      return;
    }

    if (isSignup && !nickname.trim()) {
      setErrorMessage("닉네임을 입력해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { nickname: nickname.trim() },
          },
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          setInfoMessage(
            "가입 확인 메일을 보냈어요. 메일함을 확인해주세요.",
          );
          return;
        }

        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              nickname: nickname.trim(),
            });

          if (profileError) {
            console.error("프로필 생성 실패:", profileError);
          }
        }

        router.replace("/");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        throw error;
      }

      router.replace("/");
    } catch (error) {
      console.error("인증 실패:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "처리 중 문제가 발생했어요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--cs-surface)' }}>

      {/* Left panel */}
      <div
        style={{
          flex: '0 0 44%',
          maxWidth: 560,
          minWidth: 360,
          background: 'var(--cs-bg)',
          padding: '40px 44px',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--cs-border)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 34 }}>
          <div style={{ width: 19, height: 19, borderRadius: 'var(--cs-radius-sm)', background: 'var(--cs-purple)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--cs-ink)', letterSpacing: '-0.01em' }}>CampusShare</span>
        </div>

        <h1 style={{ fontSize: 27, fontWeight: 600, lineHeight: 1.42, letterSpacing: '-0.02em', color: 'var(--cs-ink)', margin: 0 }}>
          수업이 끝나도<br />노트는 남습니다.
        </h1>

        <p style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--cs-ink-soft)', marginTop: 16 }}>
          같은 수업을 듣는 학생들의 필기와 확장 학습이 과목 단위로 쌓이는 학습 아카이브예요.<br />
          학교 이메일로 인증한 재학생·졸업생만 볼 수 있어요.
        </p>

        {/* Type guide */}
        <div style={{ marginTop: 30 }}>
          <div style={{ fontSize: 11.5, color: 'var(--cs-ink-faint)', marginBottom: 10, letterSpacing: '0.02em' }}>
            노트를 올릴 때 네 가지 중 하나를 골라요
          </div>
          {TYPE_ROWS.map(row => (
            <div key={row.tag} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 9 }}>
              <TagChip tag={row.tag} />
              <p style={{ fontSize: 12, color: 'var(--cs-ink-soft)', lineHeight: 1.55, paddingTop: 2, margin: 0 }}>
                {row.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Rules */}
        <div style={{ marginTop: 30 }}>
          <div style={{ fontSize: 11.5, color: 'var(--cs-ink-faint)', marginBottom: 10, letterSpacing: '0.02em' }}>
            시작하기 전에
          </div>
          <div style={{ display: 'flex', gap: 9, marginBottom: 11 }}>
            <span style={{ fontSize: 11, color: 'var(--cs-ink-faint)', flexShrink: 0, paddingTop: 2, width: 12 }}>1</span>
            <p style={{ fontSize: 12, color: 'var(--cs-ink-soft)', lineHeight: 1.65, margin: 0 }}>
              <strong style={{ color: 'var(--cs-ink)', fontWeight: 500 }}>노트를 읽을 때 1포인트가 쓰여요.</strong>{' '}
              가입하면 50포인트를 드리고, 노트를 하나 올리면 30포인트가 쌓여요. 한 번 연 노트를 다시 볼 때는 차감되지 않아요.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 9, marginBottom: 11 }}>
            <span style={{ fontSize: 11, color: 'var(--cs-ink-faint)', flexShrink: 0, paddingTop: 2, width: 12 }}>2</span>
            <p style={{ fontSize: 12, color: 'var(--cs-ink-soft)', lineHeight: 1.65, margin: 0 }}>
              <strong style={{ color: 'var(--cs-ink)', fontWeight: 500 }}>교수님 강의안 원본과 시험지는 올릴 수 없어요.</strong>{' '}
              저작권 문제로 삭제됩니다. 직접 정리한 내용을 올려주세요.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--cs-ink-faint)', paddingTop: 26 }}>
          학교 이메일 인증 · 재학생·졸업생 전용
        </div>
      </div>

      {/* Right panel */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--cs-surface)',
        }}
      >
        <div style={{ width: 300 }}>
          <h2 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 7px', color: 'var(--cs-ink)' }}>
            학교 이메일로 시작하기
          </h2>
          <div style={{ fontSize: 12.5, color: 'var(--cs-ink-faint)', marginBottom: 26 }}>
            재학생·졸업생만 가입할 수 있어요
          </div>

          <form onSubmit={handleSubmit}>
            <FieldLabel>학교 이메일</FieldLabel>
            <input
              style={inputStyle}
              type="email"
              placeholder="student@sungshin.ac.kr"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <div style={{ fontSize: 11, color: 'var(--cs-ink-faint)', marginBottom: 16, marginTop: -4 }}>
              @sungshin.ac.kr 도메인만 인증 가능
            </div>

            {isSignup && (
              <>
                <FieldLabel>닉네임</FieldLabel>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="댓글과 노트에 표시될 이름이에요"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                />
              </>
            )}

            <FieldLabel>비밀번호</FieldLabel>
            <input
              style={inputStyle}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            {errorMessage && (
              <div style={{ fontSize: 12, color: 'var(--cs-error)', marginTop: 8, lineHeight: 1.6 }}>
                {errorMessage}
              </div>
            )}

            {infoMessage && (
              <div style={{ fontSize: 12, color: 'var(--cs-purple-dark)', marginTop: 8, lineHeight: 1.6 }}>
                {infoMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%', padding: '10px',
                background: 'var(--cs-purple)', color: 'var(--cs-surface)',
                border: 'none', borderRadius: 'var(--cs-radius-lg)',
                fontSize: 13.5, fontWeight: 500,
                fontFamily: 'inherit', cursor: isSubmitting ? 'default' : 'pointer',
                marginTop: 8, transition: 'background 0.15s',
                textAlign: 'center',
                opacity: isSubmitting ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.background = 'var(--cs-purple-hover)' }}
              onMouseLeave={e => { if (!isSubmitting) e.currentTarget.style.background = 'var(--cs-purple)' }}
            >
              {isSignup ? '가입하기' : '로그인'}
            </button>
          </form>

          <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--cs-ink-soft)', marginTop: 20 }}>
            {isSignup ? (
              <>계정이 있으신가요?{' '}
                <button onClick={() => router.push('/login')} style={linkBtn}>로그인</button>
              </>
            ) : (
              <>계정이 없으신가요?{' '}
                <button onClick={() => router.push('/signup')} style={linkBtn}>회원가입</button>
              </>
            )}
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--cs-ink-faint)', marginTop: 9 }}>
            <button
              onClick={() => router.push('/forgot-password')}
              style={{ ...linkBtn, color: 'var(--cs-ink-faint)', fontWeight: 400, fontSize: 12 }}
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--cs-ink)', marginBottom: 7 }}>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px',
  border: '1px solid var(--cs-border-str)', borderRadius: 'var(--cs-radius-lg)',
  background: 'var(--cs-surface)', fontSize: 13,
  fontFamily: 'inherit', color: 'var(--cs-ink)',
  marginBottom: 6, outline: 'none',
  display: 'block',
}

const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none',
  color: 'var(--cs-purple-dark)', fontWeight: 500,
  fontFamily: 'inherit', fontSize: 12.5,
  cursor: 'pointer', padding: 0,
}