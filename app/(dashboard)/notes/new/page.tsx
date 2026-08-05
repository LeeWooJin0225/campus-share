"use client";

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase";

type TagType =
  | "notes"
  | "exam"
  | "reference"
  | "study_trail";

type ToolAction = 'bold' | 'list' | 'quote' | 'attach'

type SubjectOption = {
  id: string;
  name: string;
};

type CourseRelation = {
  id: string;
  subjects:
    | { name: string }
    | { name: string }[]
    | null;
};

type MyCourseRow = {
  course_offerings:
    | CourseRelation
    | CourseRelation[]
    | null;
};

const TAG_OPTIONS: { key: TagType; label: string }[] = [
  { key: 'notes',        label: 'Notes' },
  { key: 'exam',         label: 'Exam' },
  { key: 'reference',    label: 'Reference' },
  { key: 'study_trail',  label: 'Study Trail' },
]

function pickOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export default function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSubjectId = searchParams.get("course") ?? "";

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [userId, setUserId] = useState("");

  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId)
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [tagError, setTagError] = useState(false)
  const [subjectError, setSubjectError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const titleRef = useRef<HTMLTextAreaElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  useEffect(() => {
    const loadMyCourses = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        setUserId(session.user.id);

        const { data, error } = await supabase
          .from("user_course_offerings")
          .select(`
            course_offerings (
              id,
              subjects (
                name
              )
            )
          `)
          .eq("user_id", session.user.id);

        if (error) {
          throw error;
        }

        const rows = (data ?? []) as unknown as MyCourseRow[];

        setSubjects(
          rows
            .map((row): SubjectOption | null => {
              const course = pickOne(row.course_offerings);

              if (!course) {
                return null;
              }

              const subject = pickOne(course.subjects);

              return {
                id: course.id,
                name: subject?.name ?? "과목명 없음",
              };
            })
            .filter(
              (s): s is SubjectOption => s !== null,
            )
            .sort((a, b) =>
              a.name.localeCompare(b.name, "ko"),
            ),
        );
      } catch (error) {
        console.error("에디터 과목 조회 실패:", error);
      }
    };

    void loadMyCourses();
  }, [router]);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)

  const insertAtCursor = useCallback((prefix: string, suffix = '') => {
    const ta = bodyRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = body.slice(start, end)
    const before = body.slice(0, start)
    const after = body.slice(end)
    const newVal = before + prefix + selected + suffix + after
    setBody(newVal)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      )
    })
  }, [body])

  const handleTool = (action: ToolAction) => {
    if (action === 'bold') insertAtCursor('**', '**')
    if (action === 'list') insertAtCursor('\n- ')
    if (action === 'quote') insertAtCursor('\n> ')
    if (action === 'attach') fileRef.current?.click()
  }

  const handleTitleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      bodyRef.current?.focus()
    }
  }

  const handlePublish = async () => {
    if (!selectedTag) { setTagError(true); return }
    if (!selectedSubjectId) { setSubjectError(true); return }
    if (!userId) return

    setErrorMessage("")
    setIsPublished(true)

    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: userId,
        course_offering_id: selectedSubjectId,
        post_type: selectedTag,
        title: title.trim() || "제목 없음",
        content: body,
        is_published: true,
      })
      .select("id")
      .single();

    if (error) {
      console.error("노트 게시 실패:", error);

      setIsPublished(false);
      setErrorMessage(error.message);
      return;
    }

    const created = data as { id: string };

    setTimeout(() => {
      router.push(`/posts/${created.id}`)
    }, 900)
  }

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0

  const tagStyle = (key: TagType): React.CSSProperties => {
    const isSelected = selectedTag === key
    if (key === 'study_trail') {
      return {
        background: isSelected ? 'var(--cs-purple-bg)' : 'transparent',
        color: isSelected ? 'var(--cs-purple-dark)' : 'var(--cs-ink-soft)',
        border: `1px solid ${isSelected ? 'var(--cs-purple)' : 'var(--cs-border-str)'}`,
      }
    }
    return {
      background: isSelected ? 'var(--cs-bg)' : 'transparent',
      color: isSelected ? 'var(--cs-ink)' : 'var(--cs-ink-soft)',
      border: `1px solid ${isSelected ? 'var(--cs-border-str)' : 'var(--cs-border-str)'}`,
    }
  }

  const goBack = () => {
    if (selectedSubjectId) {
      router.push(`/courses/${selectedSubjectId}`)
    } else {
      router.push('/')
    }
  }

  return (
    <div
      style={{
        height: '100%', overflowY: 'auto',
        background: 'var(--cs-surface)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Editor topbar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: '1px solid var(--cs-border)',
          background: 'var(--cs-surface)',
          flexShrink: 0,
          gap: 12,
        }}
      >
        {/* Left: back + breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <button
            onClick={goBack}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--cs-ink-faint)', fontSize: 13, fontFamily: 'inherit',
              padding: '4px 6px', borderRadius: 'var(--cs-radius-sm)',
              transition: 'background 0.1s, color 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cs-bg)'; e.currentTarget.style.color = 'var(--cs-ink)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--cs-ink-faint)' }}
          >
            ← 뒤로
          </button>

          <span style={{ color: 'var(--cs-border-str)', fontSize: 13 }}>/</span>

          {/* Subject selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                color: selectedSubject ? 'var(--cs-ink)' : 'var(--cs-ink-faint)',
                padding: '4px 8px', borderRadius: 'var(--cs-radius-sm)',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--cs-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {selectedSubject && (
                <span style={{ width: 7, height: 7, borderRadius: 'var(--cs-radius-full)', background: 'var(--cs-purple)', flexShrink: 0 }} />
              )}
              {selectedSubject ? selectedSubject.name : '과목 선택'}
              <span style={{ fontSize: 10, opacity: 0.45 }}>▾</span>
            </button>

            {showSubjectDropdown && (
              <div
                style={{
                  position: 'absolute', top: '110%', left: 0, zIndex: 50,
                  background: 'var(--cs-surface)', border: '1px solid var(--cs-border)',
                  borderRadius: 'var(--cs-radius-dropdown)', padding: '6px',
                  boxShadow: 'var(--cs-shadow-dropdown)',
                  minWidth: 200,
                }}
              >
                {subjects.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setSelectedSubjectId(s.id); setSubjectError(false); setShowSubjectDropdown(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 'var(--cs-radius-md)', cursor: 'pointer',
                      fontSize: 13.5, color: 'var(--cs-ink)',
                      background: s.id === selectedSubjectId ? 'var(--cs-purple-bg)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = s.id === selectedSubjectId ? 'var(--cs-purple-bg)' : 'var(--cs-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = s.id === selectedSubjectId ? 'var(--cs-purple-bg)' : 'transparent')}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: 'var(--cs-radius-full)', background: s.id === selectedSubjectId ? 'var(--cs-purple)' : 'var(--cs-border-str)', flexShrink: 0 }} />
                    {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <span style={{ color: 'var(--cs-border-str)', fontSize: 13 }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--cs-ink-faint)' }}>새 노트</span>
        </div>

        {/* Right: word count + publish */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {body.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--cs-ink-faint)' }}>
              {wordCount}단어
            </span>
          )}
          {/* 게시하기 — the single filled CTA in this app */}
          <button
            onClick={handlePublish}
            disabled={isPublished}
            style={{
              background: isPublished ? 'var(--cs-purple-bg)' : 'var(--cs-purple)',
              color: isPublished ? 'var(--cs-purple-dark)' : 'var(--cs-surface)',
              border: 'none', borderRadius: 'var(--cs-radius-tag)',
              padding: '8px 18px', fontSize: 13.5, fontWeight: 600,
              fontFamily: 'inherit', cursor: isPublished ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!isPublished) e.currentTarget.style.background = 'var(--cs-purple-hover)' }}
            onMouseLeave={e => { if (!isPublished) e.currentTarget.style.background = 'var(--cs-purple)' }}
          >
            {isPublished ? '✓ 게시됨' : '게시하기'}
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div
        style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 24px 80px' }}
        onClick={() => setShowSubjectDropdown(false)}
      >
        <div style={{ width: '100%', maxWidth: 720, paddingTop: 48 }}>

          {errorMessage && (
            <div style={{ marginBottom: 20, fontSize: 12.5, color: 'var(--cs-error)' }}>
              게시 실패: {errorMessage}
            </div>
          )}

          {/* Tag type selector */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--cs-ink-faint)', marginBottom: 10 }}>
              자료 유형
              {tagError && !selectedTag && (
                <span style={{ color: 'var(--cs-error)', marginLeft: 8, fontWeight: 400 }}>
                  — 유형을 선택해주세요
                </span>
              )}
              {subjectError && !selectedSubjectId && (
                <span style={{ color: 'var(--cs-error)', marginLeft: 8, fontWeight: 400 }}>
                  — 과목을 선택해주세요
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {TAG_OPTIONS.map(opt => {
                const isSelected = selectedTag === opt.key
                const s = tagStyle(opt.key)
                return (
                  <button
                    key={opt.key}
                    onClick={() => { setSelectedTag(opt.key); setTagError(false) }}
                    style={{
                      ...s,
                      borderRadius: 'var(--cs-radius-md)', padding: '5px 12px',
                      fontSize: 13, fontWeight: isSelected ? 600 : 400,
                      fontFamily: 'inherit', cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title input */}
          <textarea
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={handleTitleKey}
            placeholder="제목을 입력하세요"
            rows={1}
            style={{
              width: '100%', border: 'none', outline: 'none',
              background: 'transparent', resize: 'none',
              fontSize: 34, fontWeight: 700, lineHeight: 1.25,
              fontFamily: 'inherit', color: 'var(--cs-ink)',
              marginBottom: 6,
              overflow: 'hidden',
            }}
            onInput={e => {
              const ta = e.currentTarget
              ta.style.height = 'auto'
              ta.style.height = ta.scrollHeight + 'px'
            }}
          />

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--cs-border)', marginBottom: 24 }} />

          {/* Toolbar */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 2,
              marginBottom: 14,
              padding: '4px 6px',
              background: 'var(--cs-surface)',
              border: '1px solid var(--cs-border)',
              borderRadius: 'var(--cs-radius-tag)',
              width: 'fit-content',
            }}
          >
            <ToolBtn onClick={() => handleTool('bold')} title="굵게 (Ctrl+B)">
              <strong style={{ fontSize: 13 }}>B</strong>
            </ToolBtn>
            <ToolDivider />
            <ToolBtn onClick={() => handleTool('list')} title="목록">
              <span style={{ fontSize: 13, letterSpacing: -1 }}>≡</span>
            </ToolBtn>
            <ToolBtn onClick={() => handleTool('quote')} title="인용">
              <span style={{ fontSize: 14 }}>&quot;</span>
            </ToolBtn>
            <ToolDivider />
            <ToolBtn onClick={() => handleTool('attach')} title="파일 첨부">
              <span style={{ fontSize: 13 }}>📎</span>
            </ToolBtn>
            <input
              ref={fileRef}
              type="file"
              style={{ display: 'none' }}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            />
          </div>

          {/* Body textarea */}
          <textarea
            ref={bodyRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={"여기에 내용을 입력하세요\n\n마크다운을 지원합니다: **굵게**, - 목록, > 인용"}
            style={{
              width: '100%', border: 'none', outline: 'none',
              background: 'transparent', resize: 'none',
              fontSize: 15.5, lineHeight: 1.8,
              fontFamily: 'inherit', color: 'var(--cs-ink)',
              minHeight: 360,
            }}
            onKeyDown={e => {
              if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleTool('bold')
              }
            }}
          />

          {/* Help text */}
          {!body && (
            <div style={{ marginTop: 32, fontSize: 12.5, color: 'var(--cs-ink-faint)', lineHeight: 1.7 }}>
              Ctrl+B 굵게 · Enter로 줄 바꿈 · 게시 후에도 수정할 수 있어요
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px 8px', borderRadius: 'var(--cs-radius-sm)', color: 'var(--cs-ink-soft)',
        fontFamily: 'inherit', lineHeight: 1,
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--cs-bg)'; e.currentTarget.style.color = 'var(--cs-ink)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--cs-ink-soft)' }}
    >
      {children}
    </button>
  )
}

function ToolDivider() {
  return <div style={{ width: 1, height: 16, background: 'var(--cs-border)', margin: '0 2px' }} />
}