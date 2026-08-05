"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import TagChip, { TagType } from "@/components/common/TagChip";
import { supabase } from "@/lib/supabase";

type FilterKey = "all" | TagType;

type SubjectInfo = {
  id: string;
  name: string;
  department: string;
};

type DocRow = {
  docId: string;
  tag: TagType;
  title: string;
  author: string;
  time: string;
  comments: number;
};

type Stratum = {
  offeringId: string;
  semester: string;
  professor: string;
  isCurrent: boolean;
  count: number;
  sortKey: number;
  docs: DocRow[];
};

type OfferingRow = {
  id: string;
  subject_id: string;
  subjects:
    | { id: string; name: string; department: string | null }
    | { id: string; name: string; department: string | null }[]
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
  created_at: string;
  comment_count: number | null;
  course_offering_id: string;
  profiles:
    | { nickname: string | null }
    | { nickname: string | null }[]
    | null;
};

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "notes", label: "Notes" },
  { key: "exam", label: "Exam" },
  { key: "reference", label: "Reference" },
  { key: "study_trail", label: "Study Trail" },
];

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

export default function CoursePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [activeTab, setActiveTab] =
    useState<FilterKey>("all");

  const [subject, setSubject] =
    useState<SubjectInfo | null>(null);
  const [strata, setStrata] = useState<Stratum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadCoursePage = async () => {
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

        /* 내 수강 과목인지 확인 */
        const {
          data: enrollment,
          error: enrollmentError,
        } = await supabase
          .from("user_course_offerings")
          .select("course_offering_id")
          .eq("user_id", session.user.id)
          .eq("course_offering_id", courseId)
          .maybeSingle();

        if (enrollmentError) {
          throw enrollmentError;
        }

        if (!enrollment) {
          setErrorMessage(
            "내 수강 과목에 등록되지 않은 수업입니다.",
          );
          setSubject(null);
          setStrata([]);
          return;
        }

        /* 현재 개설 수업 → subject_id 확보 */
        const {
          data: currentData,
          error: currentError,
        } = await supabase
          .from("course_offerings")
          .select(`
            id,
            subject_id,
            subjects (
              id,
              name,
              department
            ),
            professors (
              name
            ),
            semesters (
              year,
              term
            )
          `)
          .eq("id", courseId)
          .single();

        if (currentError) {
          throw currentError;
        }

        const currentRow =
          currentData as unknown as OfferingRow;

        const currentSubject = pickOne(currentRow.subjects);

        setSubject({
          id: currentRow.subject_id,
          name: currentSubject?.name ?? "과목명 없음",
          department:
            currentSubject?.department ?? "학과 미지정",
        });

        /* 같은 과목의 모든 개설 학기 */
        const {
          data: offeringData,
          error: offeringError,
        } = await supabase
          .from("course_offerings")
          .select(`
            id,
            subject_id,
            subjects (
              id,
              name,
              department
            ),
            professors (
              name
            ),
            semesters (
              year,
              term
            )
          `)
          .eq("subject_id", currentRow.subject_id);

        if (offeringError) {
          throw offeringError;
        }

        const offeringRows =
          (offeringData ?? []) as unknown as OfferingRow[];

        const offeringIds = offeringRows.map((row) => row.id);

        /* 해당 개설 수업들의 노트 */
        const { data: postData, error: postError } =
          await supabase
            .from("posts")
            .select(`
              id,
              title,
              post_type,
              created_at,
              comment_count,
              course_offering_id,
              profiles (
                nickname
              )
            `)
            .in("course_offering_id", offeringIds)
            .eq("is_published", true)
            .order("created_at", { ascending: false });

        if (postError) {
          throw postError;
        }

        const postRows =
          (postData ?? []) as unknown as PostRow[];

        const docsByOffering: Record<string, DocRow[]> = {};

        postRows.forEach((row) => {
          const profile = pickOne(row.profiles);

          const doc: DocRow = {
            docId: row.id,
            tag: row.post_type,
            title: row.title,
            author: profile?.nickname ?? "익명",
            time: formatRelativeDate(row.created_at),
            comments: row.comment_count ?? 0,
          };

          if (!docsByOffering[row.course_offering_id]) {
            docsByOffering[row.course_offering_id] = [];
          }

          docsByOffering[row.course_offering_id].push(doc);
        });

        const nextStrata = offeringRows
          .map((row): Stratum => {
            const professor = pickOne(row.professors);
            const semester = pickOne(row.semesters);
            const docs = docsByOffering[row.id] ?? [];

            return {
              offeringId: row.id,
              semester: semester
                ? `${semester.year}-${semester.term}학기`
                : "학기 미지정",
              professor: professor?.name ?? "교수 미정",
              isCurrent: row.id === courseId,
              count: docs.length,
              sortKey: semester
                ? semester.year * 10 + semester.term
                : 0,
              docs,
            };
          })
          .sort((a, b) => b.sortKey - a.sortKey);

        setStrata(nextStrata);
      } catch (error) {
        console.error("과목 상세 화면 조회 실패:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "과목 자료를 불러오지 못했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      void loadCoursePage();
    }
  }, [courseId, router]);

  const filteredStrata = useMemo(() => {
    return strata
      .map((sem) => ({
        ...sem,
        docs: sem.docs.filter(
          (d) => activeTab === "all" || d.tag === activeTab,
        ),
      }))
      .filter((sem) => sem.docs.length > 0);
  }, [activeTab, strata]);

  if (isLoading) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}>
        <div style={{ padding: '40px 26px', textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>
          불러오는 중이에요
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}>
        <div style={{ padding: '40px 26px', textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>
          {errorMessage || '과목을 불러오지 못했습니다.'}
        </div>
      </div>
    );
  }

  const totalCount = strata.reduce((s, e) => s + e.count, 0);

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}>
      <div style={{ padding: '18px 26px 40px' }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: 'var(--cs-ink-faint)', marginBottom: 10 }}>
          <span style={{ cursor: 'pointer' }}
            onClick={() => router.push('/')}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--cs-ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--cs-ink-faint)')}
          >내 과목</span>
          {' / '}
          <span style={{ color: 'var(--cs-ink)' }}>{subject.name}</span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 7px', color: 'var(--cs-ink)' }}>
          {subject.name}
        </h1>
        <div style={{ fontSize: 12, color: 'var(--cs-ink-faint)', marginBottom: 20 }}>
          {subject.department} · {strata.length}개 학기 · 노트 {totalCount}개
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid var(--cs-border)', marginBottom: 0 }}>
          {FILTER_TABS.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: 'none', border: 'none',
                  padding: '0 0 10px', fontSize: 13,
                  color: isActive ? 'var(--cs-purple-dark)' : 'var(--cs-ink-soft)',
                  fontWeight: isActive ? 500 : 400,
                  boxShadow: isActive ? 'inset 0 -2px 0 var(--cs-purple)' : 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Semester strata */}
        {strata.length > 0 ? (
          <div style={{ borderLeft: '1px solid var(--cs-border-str)', paddingLeft: 20, marginLeft: 5, marginTop: 16 }}>
            {(filteredStrata.length > 0 ? filteredStrata : strata).map(sem => (
              <div key={sem.offeringId}>
                {/* Semester header */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    margin: '24px 0 4px', position: 'relative',
                  }}
                >
                  {/* Timeline marker */}
                  <div
                    style={{
                      position: 'absolute', left: -25, width: 9, height: 9, borderRadius: 'var(--cs-radius-full)',
                      background: sem.isCurrent ? 'var(--cs-purple)' : 'var(--cs-surface)',
                      border: sem.isCurrent ? '1px solid var(--cs-purple)' : '1px solid var(--cs-border-str)',
                    }}
                  />
                  <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--cs-ink)' }}>
                    {sem.semester}
                  </h4>
                  <span style={{ fontSize: 12, color: 'var(--cs-ink-soft)' }}>· {sem.professor} 교수님</span>
                  {sem.isCurrent && (
                    <span style={{
                      fontSize: 11, color: 'var(--cs-purple-dark)', background: 'var(--cs-purple-bg)',
                      padding: '2px 7px', borderRadius: 'var(--cs-radius-xs)',
                    }}>
                      이번 학기
                    </span>
                  )}
                  <span style={{ fontSize: 11.5, color: 'var(--cs-ink-faint)' }}>{sem.count}개</span>
                  {/* Sort per semester */}
                  <button style={{
                    marginLeft: 'auto',
                    fontSize: 11.5, color: 'var(--cs-ink-soft)', background: 'var(--cs-surface)',
                    border: '1px solid var(--cs-border)', padding: '3px 8px', borderRadius: 'var(--cs-radius-sm)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    최신순 ▾
                  </button>
                </div>

                {/* Doc rows */}
                <div style={{ borderTop: '1px solid var(--cs-border)' }}>
                  {sem.docs.map((doc) => (
                    <div
                      key={doc.docId}
                      onClick={() => router.push(`/posts/${doc.docId}`)}
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
                        {doc.author}
                        <span style={{ marginLeft: 12 }}>{doc.time}</span>
                        <span style={{ marginLeft: 12 }}>댓글 {doc.comments}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>
            아직 올라온 노트가 없어요.
          </div>
        )}
      </div>
    </div>
  )
}