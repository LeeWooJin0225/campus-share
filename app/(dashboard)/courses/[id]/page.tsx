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

type Group = {
  groupKey: string;
  offeringIds: string[];
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
    | { id: string; name: string }
    | { id: string; name: string }[]
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [userId, setUserId] = useState("");
  const [addedIds, setAddedIds] = useState<Set<string>>(
    new Set(),
  );
  const [isPending, setIsPending] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [sectionChoice, setSectionChoice] = useState <
    Record<number, string>
  >({});

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

        const uid = session.user.id;
        setUserId(uid);

        /* 내가 담은 분반 전체 */
        const { data: enrollments } = await supabase
          .from("user_course_offerings")
          .select("course_offering_id")
          .eq("user_id", uid);

        setAddedIds(
          new Set(
            ((enrollments ?? []) as {
              course_offering_id: string;
            }[]).map((r) => r.course_offering_id),
          ),
        );

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
              id,
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
              id,
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
              profiles:author_id (
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

        const groupMap = new Map<string, Group>();

        offeringRows.forEach((row) => {
          const professor = pickOne(row.professors);
          const semester = pickOne(row.semesters);

          const semesterKey = semester
            ? `${semester.year}-${semester.term}`
            : "unknown";
          const professorKey = professor?.id ?? "unknown";
          const groupKey = `${semesterKey}__${professorKey}`;

          const docs = docsByOffering[row.id] ?? [];

          const existing = groupMap.get(groupKey);

          if (existing) {
            existing.offeringIds.push(row.id);
            existing.docs.push(...docs);
            existing.count += docs.length;
            if (row.id === courseId) {
              existing.isCurrent = true;
            }
            return;
          }

          groupMap.set(groupKey, {
            groupKey,
            offeringIds: [row.id],
            semester: semester
              ? `${semester.year}-${semester.term}학기`
              : "학기 미지정",
            professor: professor?.name ?? "교수 미정",
            isCurrent: row.id === courseId,
            count: docs.length,
            sortKey: semester
              ? semester.year * 10 + semester.term
              : 0,
            docs: [...docs],
          });
        });

        const nextGroups = Array.from(groupMap.values()).sort(
          (a, b) => b.sortKey - a.sortKey,
        );

        setGroups(nextGroups);

        const initialChoice: Record<number, string> = {};

        nextGroups.forEach((g) => {
          if (!(g.sortKey in initialChoice) || g.isCurrent) {
            initialChoice[g.sortKey] = g.groupKey;
          }
        });

        setSectionChoice(initialChoice);
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

  const semesterEntries = useMemo(() => {
    const bySemester = new Map<number, Group[]>();

    groups.forEach((g) => {
      const list = bySemester.get(g.sortKey) ?? [];
      list.push(g);
      bySemester.set(g.sortKey, list);
    });

    return Array.from(bySemester.entries())
      .map(([sortKey, list]) => {
        const chosenKey = sectionChoice[sortKey];
        const chosen =
          list.find((g) => g.groupKey === chosenKey) ??
          list[0];

        return {
          sortKey,
          hasMultiple: list.length > 1,
          options: list,
          chosen,
        };
      })
      .sort((a, b) => b.sortKey - a.sortKey);
  }, [groups, sectionChoice]);

  /* 이번 학기(가장 최근) 그룹들 — 담기 대상 */
  const currentSemesterGroups = useMemo(() => {
    if (groups.length === 0) return [];

    const maxSortKey = Math.max(...groups.map((g) => g.sortKey));

    return groups.filter((g) => g.sortKey === maxSortKey);
  }, [groups]);

  /* 담은 그룹 찾기 */
  const addedGroup = currentSemesterGroups.find((g) =>
    g.offeringIds.some((id) => addedIds.has(id)),
  );

  const addCourse = async (group: Group) => {
    if (!userId || isPending) return;

    setIsPending(true);
    setShowAddPicker(false);

    const { error } = await supabase
      .from("user_course_offerings")
      .insert({
        user_id: userId,
        course_offering_id: group.offeringIds[0],
      });

    if (error) {
      console.error("내 과목 담기 실패:", error);
    } else {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.add(group.offeringIds[0]);
        return next;
      });
    }

    setIsPending(false);
  };

  const removeCourse = async (group: Group) => {
    if (!userId || isPending) return;

    setIsPending(true);

    const { error } = await supabase
      .from("user_course_offerings")
      .delete()
      .eq("user_id", userId)
      .in("course_offering_id", group.offeringIds);

    if (error) {
      console.error("내 과목 빼기 실패:", error);
    } else {
      setAddedIds((prev) => {
        const next = new Set(prev);
        group.offeringIds.forEach((id) => next.delete(id));
        return next;
      });
    }

    setIsPending(false);
  };

  const handleAddButton = () => {
    if (addedGroup) {
      void removeCourse(addedGroup);
      return;
    }

    if (currentSemesterGroups.length === 1) {
      void addCourse(currentSemesterGroups[0]);
      return;
    }

    setShowAddPicker((prev) => !prev);
  };

  const filteredEntries = useMemo(() => {
    return semesterEntries
      .map((entry) => ({
        ...entry,
        chosen: {
          ...entry.chosen,
          docs: entry.chosen.docs.filter(
            (d) =>
              activeTab === "all" || d.tag === activeTab,
          ),
        },
      }))
      .filter((entry) => entry.chosen.docs.length > 0);
  }, [activeTab, semesterEntries]);

  const displayEntries =
    filteredEntries.length > 0 ? filteredEntries : semesterEntries;

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

  const totalCount = groups.reduce((s, e) => s + e.count, 0);

  return (
    <div
      style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}
      onClick={() => setShowAddPicker(false)}
    >
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

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 7px', color: 'var(--cs-ink)' }}>
              {subject.name}
            </h1>
            <div style={{ fontSize: 12, color: 'var(--cs-ink-faint)', marginBottom: 20 }}>
              {subject.department} · {groups.length}개 학기 · 노트 {totalCount}개
            </div>
          </div>

          {/* 담기 버튼 + 교수 선택 팝오버 */}
          <div style={{ position: 'relative', flexShrink: 0, marginTop: 4 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={handleAddButton}
              disabled={isPending}
              style={{
                fontSize: 12.5, padding: '6px 12px', borderRadius: 'var(--cs-radius-md)',
                border: `1px solid ${addedGroup ? 'var(--cs-purple-border)' : 'var(--cs-border-str)'}`,
                background: addedGroup ? 'var(--cs-purple-bg)' : 'var(--cs-surface)',
                color: addedGroup ? 'var(--cs-purple-dark)' : 'var(--cs-ink-soft)',
                cursor: isPending ? 'default' : 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s', opacity: isPending ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {addedGroup
                ? `✓ 내 과목 · ${addedGroup.professor} 교수님`
                : currentSemesterGroups.length > 1
                  ? '＋ 내 과목에 담기 ▾'
                  : '＋ 내 과목에 담기'}
            </button>

            {showAddPicker && !addedGroup && (
              <div
                style={{
                  position: 'absolute', top: '110%', right: 0, zIndex: 50,
                  background: 'var(--cs-surface)', border: '1px solid var(--cs-border)',
                  borderRadius: 'var(--cs-radius-dropdown)', padding: '6px',
                  boxShadow: 'var(--cs-shadow-dropdown)',
                  minWidth: 180,
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--cs-ink-faint)', padding: '4px 10px 6px' }}>
                  듣는 반을 골라주세요
                </div>
                {currentSemesterGroups.map(g => (
                  <div
                    key={g.groupKey}
                    onClick={() => void addCourse(g)}
                    style={{
                      padding: '8px 10px', borderRadius: 'var(--cs-radius-md)',
                      cursor: 'pointer', fontSize: 13, color: 'var(--cs-ink)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cs-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {g.professor} 교수님
                  </div>
                ))}
              </div>
            )}
          </div>
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

        {/* Semester groups */}
        {groups.length > 0 ? (
          <div style={{ borderLeft: '1px solid var(--cs-border-str)', paddingLeft: 20, marginLeft: 5, marginTop: 16 }}>
            {displayEntries.map(entry => {
              const g = entry.chosen;
              const canWrite = g.offeringIds.some(id => addedIds.has(id));

              return (
                <div key={entry.sortKey}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      margin: '24px 0 4px', position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute', left: -25, width: 9, height: 9, borderRadius: 'var(--cs-radius-full)',
                        background: g.isCurrent ? 'var(--cs-purple)' : 'var(--cs-surface)',
                        border: g.isCurrent ? '1px solid var(--cs-purple)' : '1px solid var(--cs-border-str)',
                      }}
                    />
                    <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--cs-ink)' }}>
                      {g.semester}
                    </h4>

                    {entry.hasMultiple ? (
                      <select
                        value={g.groupKey}
                        onChange={e => setSectionChoice(prev => ({ ...prev, [entry.sortKey]: e.target.value }))}
                        style={{
                          fontSize: 12, color: 'var(--cs-ink-soft)',
                          border: '1px solid var(--cs-border)', borderRadius: 'var(--cs-radius-sm)',
                          padding: '2px 6px', background: 'var(--cs-surface)',
                          fontFamily: 'inherit', cursor: 'pointer',
                        }}
                      >
                        {entry.options.map(opt => (
                          <option key={opt.groupKey} value={opt.groupKey}>
                            {opt.professor} 교수님
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--cs-ink-soft)' }}>· {g.professor} 교수님</span>
                    )}

                    {g.isCurrent && (
                      <span style={{
                        fontSize: 11, color: 'var(--cs-purple-dark)', background: 'var(--cs-purple-bg)',
                        padding: '2px 7px', borderRadius: 'var(--cs-radius-xs)',
                      }}>
                        이번 학기
                      </span>
                    )}
                    <span style={{ fontSize: 11.5, color: 'var(--cs-ink-faint)' }}>{g.count}개</span>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {canWrite && (
                        <button
                          onClick={() => router.push(`/notes/new?course=${g.offeringIds[0]}`)}
                          style={{
                            fontSize: 11.5, color: 'var(--cs-purple-dark)', background: 'var(--cs-surface)',
                            border: '1px solid var(--cs-border)', padding: '3px 8px', borderRadius: 'var(--cs-radius-sm)',
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cs-purple)'; e.currentTarget.style.background = 'var(--cs-purple-bg)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cs-border)'; e.currentTarget.style.background = 'var(--cs-surface)' }}
                        >
                          ＋ 노트
                        </button>
                      )}

                      <button style={{
                        fontSize: 11.5, color: 'var(--cs-ink-soft)', background: 'var(--cs-surface)',
                        border: '1px solid var(--cs-border)', padding: '3px 8px', borderRadius: 'var(--cs-radius-sm)',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                        최신순 ▾
                      </button>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--cs-border)' }}>
                    {g.docs.map((doc) => (
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
              );
            })}
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