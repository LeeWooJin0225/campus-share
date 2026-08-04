"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import TagChip, { TagType } from "@/components/common/TagChip";
import { supabase } from "@/lib/supabase";

/* post_likes 테이블이 생기면 true 로 바꾸세요. */
const LIKES_ENABLED = false;

type DocInfo = {
  id: string;
  title: string;
  tag: TagType;
  author: string;
  timeAgo: string;
  content: string;
  courseOfferingId: string;
};

type CourseInfo = {
  id: string;
  name: string;
  professor: string;
  semester: string;
};

type CommentItem = {
  id: string;
  author: string;
  initial: string;
  anon: boolean;
  time: string;
  text: string;
};

type CourseRelation = {
  id: string;
  subjects:
    | { name: string }
    | { name: string }[]
    | null;
  professors:
    | { name: string }
    | { name: string }[]
    | null;
  semesters:
    | { year: number; term: number }
    | { year: number; term: number }[]
    | null;
};

type PostRow = {
  id: string;
  title: string;
  post_type: TagType;
  content: string | null;
  created_at: string;
  course_offering_id: string;
  profiles:
    | { nickname: string | null }
    | { nickname: string | null }[]
    | null;
  course_offerings:
    | CourseRelation
    | CourseRelation[]
    | null;
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  is_anonymous: boolean | null;
  profiles:
    | { nickname: string | null }
    | { nickname: string | null }[]
    | null;
};

function pickOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function formatRelativeDate(dateString: string) {
  const createdAt = new Date(dateString);
  const now = new Date();

  const difference = Math.max(
    0,
    now.getTime() - createdAt.getTime(),
  );

  const minutes = Math.floor(difference / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(createdAt)
    .replace(/\.$/, "");
}

/* DB 의 content 한 덩어리를 Figma 의 body 배열 형태로 변환 */
function splitParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

export default function DocumentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const docId = params.id;

  const [comment, setComment] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [bookmarked, setBookmarked] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>([])

  const [doc, setDoc] = useState<DocInfo | null>(null);
  const [subject, setSubject] = useState<CourseInfo | null>(null);
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        setUserId(session.user.id);

        const { data: postData, error: postError } =
          await supabase
            .from("posts")
            .select(`
              id,
              title,
              post_type,
              content,
              created_at,
              course_offering_id,
              profiles:author_id (
                nickname
              ),
              course_offerings (
                id,
                subjects (
                  name
                ),
                professors (
                  name
                ),
                semesters (
                  year,
                  term
                )
              )
            `)
            .eq("id", docId)
            .single();

        if (postError) {
          throw postError;
        }

        const row = postData as unknown as PostRow;

        const profile = pickOne(row.profiles);
        const course = pickOne(row.course_offerings);
        const courseSubject = course
          ? pickOne(course.subjects)
          : null;
        const courseProfessor = course
          ? pickOne(course.professors)
          : null;
        const courseSemester = course
          ? pickOne(course.semesters)
          : null;

        setDoc({
          id: row.id,
          title: row.title,
          tag: row.post_type,
          author: profile?.nickname ?? "익명",
          timeAgo: formatRelativeDate(row.created_at),
          content: row.content ?? "",
          courseOfferingId: row.course_offering_id,
        });

        setSubject({
          id: course?.id ?? row.course_offering_id,
          name: courseSubject?.name ?? "과목명 없음",
          professor: courseProfessor?.name ?? "교수 미정",
          semester: courseSemester
            ? `${courseSemester.year}-${courseSemester.term}`
            : "",
        });

        /* 댓글 */
        const { data: commentData, error: commentError } =
          await supabase
            .from("comments")
            .select(`
              id,
              content,
              created_at,
              is_anonymous,
              profiles:author_id (
                nickname
              )
            `)
            .eq("post_id", docId)
            .order("created_at", { ascending: true });

        if (commentError) {
          console.error("댓글 조회 실패:", commentError);
        } else {
          const commentRows =
            (commentData ?? []) as unknown as CommentRow[];

          setComments(
            commentRows.map((c): CommentItem => {
              const anon = c.is_anonymous ?? false;
              const nickname =
                pickOne(c.profiles)?.nickname ?? "익명";
              const author = anon ? "익명" : nickname;

              return {
                id: c.id,
                author,
                initial: author.slice(0, 1),
                anon,
                time: formatRelativeDate(c.created_at),
                text: c.content,
              };
            }),
          );
        }

        /* 좋아요 */
        if (LIKES_ENABLED) {
          const { data: likeData, error: likeError } =
            await supabase
              .from("post_likes")
              .select("user_id")
              .eq("post_id", docId);

          if (likeError) {
            console.error("좋아요 조회 실패:", likeError);
          } else {
            const rows =
              (likeData ?? []) as { user_id: string }[];

            setLikeCount(rows.length);
            setLiked(
              rows.some((r) => r.user_id === session.user.id),
            );
          }
        }

        /* 북마크 */
        const { data: bookmarkData, error: bookmarkError } =
          await supabase
            .from("bookmarks")
            .select("id")
            .eq("post_id", docId)
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (bookmarkError) {
          console.error("북마크 조회 실패:", bookmarkError);
        } else {
          setBookmarked(Boolean(bookmarkData));
        }
      } catch (error) {
        console.error("노트 상세 조회 실패:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "노트를 불러오지 못했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (docId) {
      void loadDocument();
    }
  }, [docId, router]);

  const addComment = async () => {
    if (!comment.trim() || !userId) return

    const text = comment;
    setComment('')

    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: docId,
        author_id: userId,
        content: text,
        is_anonymous: anonymous,
      })
      .select(`
        id,
        content,
        created_at,
        is_anonymous,
        profiles:author_id (
          nickname
        )
      `)
      .single();

    if (error) {
      console.error("댓글 등록 실패:", error);
      setComment(text);
      return;
    }

    const c = data as unknown as CommentRow;
    const anon = c.is_anonymous ?? false;
    const nickname = pickOne(c.profiles)?.nickname ?? "익명";
    const author = anon ? "익명" : nickname;

    setComments(prev => [...prev, {
      id: c.id,
      author,
      initial: author.slice(0, 1),
      anon,
      time: formatRelativeDate(c.created_at),
      text: c.content,
    }]);
  }

  const toggleLike = async () => {
    const nextLiked = !liked;

    setLikeCount(prev => nextLiked ? prev + 1 : prev - 1)
    setLiked(nextLiked)

    if (!LIKES_ENABLED || !userId) return;

    if (nextLiked) {
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: docId, user_id: userId });

      if (error) console.error("좋아요 등록 실패:", error);
    } else {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", docId)
        .eq("user_id", userId);

      if (error) console.error("좋아요 취소 실패:", error);
    }
  }

  const toggleBookmark = async () => {
    if (!userId) return;

    const nextBookmarked = !bookmarked;

    setBookmarked(nextBookmarked);

    if (nextBookmarked) {
      const { error } = await supabase
        .from("bookmarks")
        .insert({ post_id: docId, user_id: userId });

      if (error) {
        console.error("북마크 등록 실패:", error);
        setBookmarked(false);
      }
    } else {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("post_id", docId)
        .eq("user_id", userId);

      if (error) {
        console.error("북마크 해제 실패:", error);
        setBookmarked(true);
      }
    }
  }

  const renderPara = (text: string, i: number) => {
    const lines = text.split('\n')
    return (
      <div key={i}>
        {lines.map((line, j) => {
          if (line.startsWith('## ')) return (
            <h3 key={j} style={{ fontSize: 16, fontWeight: 600, margin: '30px 0 13px', color: 'var(--cs-ink)', letterSpacing: '-0.01em' }}>
              {line.slice(3)}
            </h3>
          )
          if (line.startsWith('- ')) return (
            <li key={j} style={{ fontSize: 15.5, lineHeight: 1.85, color: 'var(--cs-ink-body)', marginLeft: 20 }}
              dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
            />
          )
          if (line === '') return <div key={j} style={{ height: 10 }} />
          return <p key={j} style={{ fontSize: 15.5, lineHeight: 1.85, margin: '0 0 20px', color: 'var(--cs-ink-body)' }}
            dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
          />
        })}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}>
        <div style={{ padding: '40px 26px', textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>
          불러오는 중이에요
        </div>
      </div>
    );
  }

  if (!doc || !subject) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}>
        <div style={{ padding: '40px 26px', textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>
          {errorMessage || '노트를 불러오지 못했습니다.'}
        </div>
      </div>
    );
  }

  const body = splitParagraphs(doc.content);

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}>
      <div style={{ maxWidth: 660, margin: '0 auto', padding: '24px 26px 80px' }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: 'var(--cs-ink-faint)', marginBottom: 14 }}>
          <span style={{ cursor: 'pointer' }}
            onClick={() => router.push('/')}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--cs-ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--cs-ink-faint)')}
          >내 과목</span>
          {' / '}
          <span style={{ cursor: 'pointer' }}
            onClick={() => router.push(`/courses/${doc.courseOfferingId}`)}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--cs-ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--cs-ink-faint)')}
          >{subject.name}</span>
          {' / '}
          <span style={{ color: 'var(--cs-ink)' }}>노트</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.45, letterSpacing: '-0.02em', margin: '14px 0 0', color: 'var(--cs-ink)' }}>
          {doc.title}
        </h1>

        {/* Byline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 13, fontSize: 12.5, color: 'var(--cs-ink-faint)', paddingBottom: 20, borderBottom: '1px solid var(--cs-border)' }}>
          <TagChip tag={doc.tag} size="md" />
          <span>{doc.author} · {doc.timeAgo} · {subject.professor} 교수님 {subject.semester}학기</span>
          <button
            onClick={toggleBookmark}
            style={{
              marginLeft: 'auto',
              fontSize: 12.5, color: bookmarked ? 'var(--cs-purple-dark)' : 'var(--cs-ink-soft)',
              background: bookmarked ? 'var(--cs-purple-bg)' : 'var(--cs-surface)',
              border: `1px solid ${bookmarked ? 'var(--cs-purple-border)' : 'var(--cs-border-str)'}`,
              padding: '5px 11px', borderRadius: 'var(--cs-radius-md)',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            ★ 북마크
          </button>
        </div>

        {/* Body */}
        <div style={{ fontSize: 15.5, lineHeight: 1.85, color: 'var(--cs-ink-body)' }}>
          {body.map((para, i) => renderPara(para, i))}
        </div>

        {/* Comments */}
        <div style={{ borderTop: '1px solid var(--cs-border)', marginTop: 32, paddingTop: 20 }}>
          {/* Like + Share above comment input */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
            <button
              onClick={toggleLike}
              style={{
                fontSize: 12.5, color: liked ? 'var(--cs-purple-dark)' : 'var(--cs-ink-soft)',
                background: liked ? 'var(--cs-purple-bg)' : 'var(--cs-surface)',
                border: `1px solid ${liked ? 'var(--cs-purple-border)' : 'var(--cs-border-str)'}`,
                padding: '6px 11px', borderRadius: 'var(--cs-radius-md)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              {liked ? '♥' : '♡'} 좋아요 {likeCount}
            </button>
            <button style={{
              fontSize: 12.5, color: 'var(--cs-ink-soft)',
              background: 'var(--cs-surface)', border: '1px solid var(--cs-border-str)',
              padding: '6px 11px', borderRadius: 'var(--cs-radius-md)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              공유
            </button>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--cs-ink-soft)', fontWeight: 500, marginBottom: 16 }}>
            댓글 {comments.length}
          </div>

          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <div
                style={{
                  width: 26, height: 26, borderRadius: 'var(--cs-radius-full)', flexShrink: 0,
                  background: c.anon ? 'var(--cs-sunk)' : 'var(--cs-purple-bg)',
                  color: c.anon ? 'var(--cs-ink-faint)' : 'var(--cs-purple-dark)',
                  fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 500,
                }}
              >
                {c.initial}
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cs-ink)' }}>
                  {c.author} · <span style={{ fontWeight: 400, color: 'var(--cs-ink-faint)' }}>{c.time}</span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.7, marginTop: 4, color: 'var(--cs-ink-body)' }}>
                  {c.text}
                </div>
              </div>
            </div>
          ))}

          {/* Comment input */}
          <div style={{
            border: '1px solid var(--cs-border-str)', borderRadius: 'var(--cs-radius-lg)', padding: '11px 13px',
            fontSize: 13, color: 'var(--cs-ink-faint)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--cs-surface)',
          }}>
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addComment() }}
              placeholder="댓글을 남겨보세요..."
              style={{
                border: 'none', outline: 'none', background: 'none',
                fontSize: 13, fontFamily: 'inherit', color: 'var(--cs-ink)', flex: 1,
              }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--cs-ink-soft)', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
              <input
                type="checkbox"
                checked={anonymous}
                onChange={e => setAnonymous(e.target.checked)}
                style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--cs-purple)' }}
              />
              익명으로 쓰기
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}