"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import TagChip, { TagType } from "@/components/common/TagChip";
import { supabase } from "@/lib/supabase";

type SubjectCard = {
  id: string;
  name: string;
  professor: string;
  semester: string;
  docCount: number;
  latestTime: string;
  empty: boolean;
};

type RecentDoc = {
  id: string;
  title: string;
  tag: TagType;
  author: string;
  timeAgo: string;
  comments: number;
  subjectName: string;
};

type MyCourseRow = {
  course_offerings:
  | CourseRelation
  | CourseRelation[]
  | null;
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

type RecentPostRow = {
  id: string;
  title: string;
  post_type: TagType;
  created_at: string;
  comment_count: number | null;
  profiles:
  | { nickname: string | null; is_deleted: boolean | null }
  | { nickname: string | null; is_deleted: boolean | null }[]
  | null;
  course_offerings:
  | CourseRelation
  | CourseRelation[]
  | null;
};


const NOTE_COUNTS_ENABLED = true;

async function fetchNoteCounts(
  offeringIds: string[],
): Promise<Record<string, number>> {
  if (!NOTE_COUNTS_ENABLED || offeringIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("posts")
    .select("course_offering_id")
    .in("course_offering_id", offeringIds)
    .eq("is_published", true);

  if (error) {
    console.error("노트 개수 조회 실패:", error);
    return {};
  }

  const counts: Record<string, number> = {};

  (data ?? []).forEach((row) => {
    const key = (row as { course_offering_id: string })
      .course_offering_id;
    counts[key] = (counts[key] ?? 0) + 1;
  });

  return counts;
}

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
    month: "numeric",
    day: "numeric",
  }).format(createdAt);
}

export default function HomePage() {
  const router = useRouter();

  const [subjects, setSubjects] = useState<SubjectCard[]>([]);
  const [recent, setRecent] = useState<RecentDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadHome = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        /* 내 과목 */
        const { data: myCourseData, error: myCourseError } =
          await supabase
            .from("user_course_offerings")
            .select(`
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
            .eq("user_id", session.user.id);

        if (myCourseError) {
          throw myCourseError;
        }

        const myRows =
          (myCourseData ?? []) as unknown as MyCourseRow[];

        const courses = myRows
          .map((row) => pickOne(row.course_offerings))
          .filter(
            (course): course is CourseRelation =>
              course !== null,
          );

        const counts = await fetchNoteCounts(
          courses.map((course) => course.id),
        );

        setSubjects(
          courses.map((course): SubjectCard => {
            const subject = pickOne(course.subjects);
            const professor = pickOne(course.professors);
            const semester = pickOne(course.semesters);
            const docCount = counts[course.id] ?? 0;

            return {
              id: course.id,
              name: subject?.name ?? "이름 없음",
              professor: professor?.name ?? "교수 미정",
              semester: semester
                ? `${semester.year}-${semester.term}`
                : "",
              docCount,
              latestTime: "",
              empty: docCount === 0,
            };
          }),
        );

        /* 최근 올라온 노트 */
        const { data: recentData, error: recentError } =
          await supabase
            .from("posts")
            .select(`
              id,
              title,
              post_type,
              created_at,
              comment_count,
              profiles!posts_author_id_fkey (
                nickname,
                is_deleted
              ),
              course_offerings (
                id,
                subjects (
                  name
                )
              )
            `)
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(4);

        if (recentError) {
          throw recentError;
        }

        const recentRows =
          (recentData ?? []) as unknown as RecentPostRow[];

        setRecent(
          recentRows.map((row): RecentDoc => {
            const profile = pickOne(row.profiles);
            const course = pickOne(row.course_offerings);
            const subject = course
              ? pickOne(course.subjects)
              : null;

            return {
              id: row.id,
              title: row.title,
              tag: row.post_type,
              author: profile?.is_deleted
                ? "탈퇴한 사용자"
                : profile?.nickname ?? "익명",
              timeAgo: formatRelativeDate(row.created_at),
              comments: row.comment_count ?? 0,
              subjectName: subject?.name ?? "",
            };
          }),
        );
      } catch (error) {
        const err = error as {
          message?: string;
          code?: string;
          details?: string;
          hint?: string;
        };

        console.error("======= 홈 조회 에러 =======");
        console.error("message:", err?.message);
        console.error("code:", err?.code);
        console.error("details:", err?.details);
        console.error("hint:", err?.hint);
        console.error("raw:", error);
        console.error("==========================");

        setErrorMessage(
          err?.message || "홈 화면을 불러오지 못했습니다.",
        );
      } finally {
      setIsLoading(false);
    }
  };

  void loadHome();
}, [router]);

return (
  <div style={{ padding: '24px 26px 34px', overflowY: 'auto', height: '100%', background: 'var(--cs-surface)' }}>

    {/* Subject cards */}
    <SectionLabel>내 과목</SectionLabel>

    {isLoading ? (
      <div style={{ fontSize: 12.5, color: 'var(--cs-ink-faint)', marginBottom: 30 }}>
        불러오는 중이에요
      </div>
    ) : errorMessage ? (
      <div style={{ fontSize: 12.5, color: 'var(--cs-error)', marginBottom: 30 }}>
        {errorMessage}
      </div>
    ) : subjects.length === 0 ? (
      <div style={{ fontSize: 12.5, color: 'var(--cs-ink-faint)', marginBottom: 30 }}>
        담은 과목이 없어요 · 전체 과목 검색에서 추가해보세요
      </div>
    ) : (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 30,
        }}
      >
        {subjects.map(subject => (
          <div
            key={subject.id}
            onClick={() => router.push(`/courses/${subject.id}`)}
            style={{
              padding: '14px 15px',
              background: 'var(--cs-surface)',
              border: subject.empty ? '1px dashed var(--cs-border-str)' : '1px solid var(--cs-border)',
              borderRadius: 'var(--cs-radius-xl)',
              cursor: 'pointer',
              transition: 'border-color 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--cs-border-str)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = subject.empty ? 'var(--cs-border-str)' : 'var(--cs-border)')}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, letterSpacing: '-0.01em', color: 'var(--cs-ink)' }}>
              {subject.name}
            </h3>

            <div style={{ fontSize: 12, color: 'var(--cs-ink-faint)', marginTop: 3 }}>
              {subject.professor} 교수님 · {subject.semester}학기
            </div>

            <div style={{
              fontSize: 11.5, marginTop: 14,
              color: subject.empty ? 'var(--cs-purple)' : 'var(--cs-ink-faint)',
            }}>
              {subject.empty
                ? '아직 노트가 없어요 · 첫 노트 쓰기'
                : `노트 ${subject.docCount}개 · ${subject.latestTime}`
              }
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Recent notes */}
    <SectionLabel>최근 올라온 노트</SectionLabel>

    <div style={{ borderTop: '1px solid var(--cs-border)' }}>
      {recent.length === 0 && !isLoading ? (
        <div style={{ padding: '11px 4px', fontSize: 12.5, color: 'var(--cs-ink-faint)' }}>
          아직 올라온 노트가 없어요
        </div>
      ) : (
        recent.map(doc => (
          <div
            key={doc.id}
            onClick={() => router.push(`/posts/${doc.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '11px 4px',
              borderBottom: '1px solid var(--cs-border)',
              cursor: 'pointer', transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--cs-hover-row)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <TagChip tag={doc.tag} />

            <span style={{ fontSize: 13.5, color: 'var(--cs-ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.title}
            </span>

            <span style={{ fontSize: 12, color: 'var(--cs-ink-faint)', flexShrink: 0 }}>
              {doc.subjectName}
              <span style={{ marginLeft: 12 }}>{doc.author}</span>
              <span style={{ marginLeft: 12 }}>{doc.timeAgo}</span>
              <span style={{ marginLeft: 12 }}>댓글 {doc.comments}</span>
            </span>
          </div>
        ))
      )}
    </div>
  </div>
)
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12.5, color: 'var(--cs-ink-soft)', fontWeight: 500, marginBottom: 12 }}>
      {children}
    </div>
  );
}