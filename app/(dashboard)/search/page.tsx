"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Offering = {
  /* 대표 분반 id (담기/이동에 사용) */
  id: string;
  /* 같은 과목+교수인 모든 분반 id */
  offeringIds: string[];
  name: string;
  professor: string;
  dept: string;
  docCount: number;
  /* [추가] 가장 최근 노트가 올라온 시각 (숫자). 노트가 없으면 0 */
  lastActivity: number;
  empty: boolean;
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
};

/* [추가] 정렬 종류 */
type SortKey = "name" | "count" | "recent";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "가나다순" },
  { key: "count", label: "자료 많은 순" },
  { key: "recent", label: "최근 활동 순" },
];

/* [추가] 분반 하나의 노트 개수 + 마지막 활동 시각 */
type CountInfo = {
  count: number;
  lastActivity: number;
};

/* Figma 원본 DEPTS 순서 — DB 학과를 이 순서로 먼저 정렬합니다 */
const DEPT_ORDER = [
  "컴퓨터공학과",
  "AI융합학부",
  "서비스디자인공학과",
  "융합보안공학과",
  "경제학과",
  "지능형시스템",
];

const NO_DEPT_LABEL = "기타";

const NOTE_COUNTS_ENABLED = true;

async function fetchNoteCounts(
  offeringIds: string[],
): Promise<Record<string, CountInfo>> {
  if (!NOTE_COUNTS_ENABLED || offeringIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("posts")
    /* [변경] created_at 도 함께 가져옵니다 (최근 활동 순의 재료) */
    .select("course_offering_id, created_at")
    .in("course_offering_id", offeringIds)
    .eq("is_published", true)
    .eq("is_deleted", false);

  if (error) {
    console.error("노트 개수 조회 실패:", error);
    return {};
  }

  const counts: Record<string, CountInfo> = {};

  (data ?? []).forEach((row) => {
    const r = row as {
      course_offering_id: string;
      created_at: string;
    };

    /* new Date(...).getTime() : 날짜를 숫자로 바꿉니다.
       숫자여야 크기 비교(Math.max)와 정렬이 가능합니다 */
    const time = new Date(r.created_at).getTime();

    const prev = counts[r.course_offering_id];

    if (prev) {
      prev.count += 1;
      prev.lastActivity = Math.max(prev.lastActivity, time);
    } else {
      counts[r.course_offering_id] = {
        count: 1,
        lastActivity: time,
      };
    }
  });

  return counts;
}

function pickOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const [dept, setDept] = useState("전체");
  /* [추가] 현재 선택된 정렬 */
  const [sort, setSort] = useState<SortKey>("name");
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(
    new Set(),
  );
  const [userId, setUserId] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadOfferings = async () => {
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

        const uid = session.user.id;
        setUserId(uid);

        const { data, error } = await supabase
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
            )
          `);

        if (error) {
          throw error;
        }

        const rows = (data ?? []) as unknown as OfferingRow[];

        const counts = await fetchNoteCounts(
          rows.map((row) => row.id),
        );

        /* 과목 + 교수 기준으로 합치기 (같은 교수 다른 분반은 한 줄) */
        const groupMap = new Map<string, Offering>();

        rows.forEach((row) => {
          const subject = pickOne(row.subjects);
          const professor = pickOne(row.professors);

          const key = `${row.subject_id}__${professor?.id ?? "unknown"}`;

          const info = counts[row.id];
          const docCount = info?.count ?? 0;
          const lastActivity = info?.lastActivity ?? 0;

          const existing = groupMap.get(key);

          if (existing) {
            existing.offeringIds.push(row.id);
            /* 개수는 더하고 */
            existing.docCount += docCount;
            /* 활동 시각은 더 최근 것을 남깁니다 */
            existing.lastActivity = Math.max(
              existing.lastActivity,
              lastActivity,
            );
            existing.empty = existing.docCount === 0;
            return;
          }

          groupMap.set(key, {
            id: row.id,
            offeringIds: [row.id],
            name: subject?.name ?? "이름 없음",
            professor: professor?.name ?? "교수 미정",
            dept: subject?.department ?? NO_DEPT_LABEL,
            docCount,
            lastActivity,
            empty: docCount === 0,
          });
        });

        setOfferings(Array.from(groupMap.values()));

        /* 내가 담은 분반 */
        const { data: myData, error: myError } = await supabase
          .from("user_course_offerings")
          .select("course_offering_id")
          .eq("user_id", uid);

        if (myError) {
          console.error("내 과목 조회 실패:", myError);
        } else {
          const ids = (myData ?? []) as {
            course_offering_id: string;
          }[];

          setAddedIds(
            new Set(ids.map((r) => r.course_offering_id)),
          );
        }
      } catch (error) {
        console.error("전체 과목 조회 실패:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "과목 목록을 불러오지 못했습니다.",
        );

        setOfferings([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadOfferings();
  }, [router]);

  /* 묶음 안의 분반 중 하나라도 담겨 있으면 담긴 것으로 표시 */
  const isGroupAdded = (offering: Offering) =>
    offering.offeringIds.some((id) => addedIds.has(id));

  const toggleMyCourse = async (offering: Offering) => {
    if (!userId || pendingId) return;

    setPendingId(offering.id);

    const addedOne = offering.offeringIds.find((id) =>
      addedIds.has(id),
    );

    if (addedOne) {
      /* 묶음 안에 담긴 것 전부 제거 */
      const { error } = await supabase
        .from("user_course_offerings")
        .delete()
        .eq("user_id", userId)
        .in("course_offering_id", offering.offeringIds);

      if (error) {
        console.error("내 과목 빼기 실패:", error);
      } else {
        setAddedIds((prev) => {
          const next = new Set(prev);
          offering.offeringIds.forEach((id) => next.delete(id));
          return next;
        });
      }
    } else {
      /* 대표 분반 하나만 담기 */
      const { error } = await supabase
        .from("user_course_offerings")
        .insert({
          user_id: userId,
          course_offering_id: offering.id,
        });

      if (error) {
        console.error("내 과목 담기 실패:", error);
      } else {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.add(offering.id);
          return next;
        });
      }
    }

    setPendingId("");
  };

  const depts = useMemo(() => {
    const found = new Set<string>();

    offerings.forEach((offering) => found.add(offering.dept));

    const ordered = DEPT_ORDER.filter((d) => found.has(d));

    const rest = Array.from(found)
      .filter((d) => !DEPT_ORDER.includes(d))
      .sort((a, b) => a.localeCompare(b, "ko"));

    return ["전체", ...ordered, ...rest];
  }, [offerings]);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return offerings.filter((s) => {
      const matchDept = dept === "전체" || s.dept === dept;

      const matchQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.professor.toLowerCase().includes(q) ||
        s.dept.toLowerCase().includes(q);

      return matchDept && matchQuery;
    });
  }, [dept, offerings, q]);

  /* [추가] 걸러낸 결과를 정렬합니다 */
  const sorted = useMemo(() => {
    /* [...filtered] 로 복사본을 먼저 만듭니다.
       .sort() 는 원본 배열을 직접 뒤집어버리기 때문에,
       복사 없이 쓰면 React가 변경을 못 알아채거나 다른 곳이 같이 망가집니다 */
    const list = [...filtered];

    if (sort === "name") {
      /* localeCompare(b, "ko") : 한글 가나다순.
         그냥 > 로 비교하면 유니코드 순서라 결과가 이상해집니다 */
      list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    } else if (sort === "count") {
      /* b - a : 큰 값이 앞 (내림차순).
         개수가 같으면 이름순으로 한 번 더 정리 */
      list.sort(
        (a, b) =>
          b.docCount - a.docCount ||
          a.name.localeCompare(b.name, "ko"),
      );
    } else {
      list.sort(
        (a, b) =>
          b.lastActivity - a.lastActivity ||
          a.name.localeCompare(b.name, "ko"),
      );
    }

    return list;
  }, [filtered, sort]);

  const groups = useMemo(() => {
    return depts
      .filter((d) => d !== "전체")
      .map((d) => ({
        dept: d,
        /* [변경] filtered → sorted */
        subjects: sorted.filter((s) => s.dept === d),
      }))
      .filter((g) => g.subjects.length > 0);
  }, [depts, sorted]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}>
      <div style={{ padding: '24px 32px 60px', maxWidth: 820, margin: '0 auto' }}>

        <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 18px', letterSpacing: '-0.02em', color: 'var(--cs-ink)' }}>
          전체 과목
        </h1>

        {/* Dept filter chips + 정렬 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', flex: 1 }}>
            {depts.map(d => (
              <button
                key={d}
                onClick={() => setDept(d)}
                style={{
                  fontSize: 12.5, padding: '5px 13px', borderRadius: 'var(--cs-radius-pill)',
                  border: '1px solid',
                  borderColor: dept === d ? 'var(--cs-purple)' : 'var(--cs-border)',
                  background: dept === d ? 'var(--cs-purple-bg)' : 'var(--cs-surface)',
                  color: dept === d ? 'var(--cs-purple-dark)' : 'var(--cs-ink-soft)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                }}
              >
                {d}
              </button>
            ))}
          </div>

          {/* [추가] 정렬 드롭다운 */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            aria-label="정렬 기준"
            style={{
              flexShrink: 0,
              fontSize: 12.5,
              padding: '5px 8px',
              borderRadius: 'var(--cs-radius-md)',
              border: '1px solid var(--cs-border)',
              background: 'var(--cs-surface)',
              color: 'var(--cs-ink-soft)',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        {isLoading ? (
          <div style={{ paddingTop: 60, textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>
            불러오는 중이에요
          </div>
        ) : errorMessage ? (
          <div style={{ paddingTop: 60, textAlign: 'center', color: 'var(--cs-error)', fontSize: 13.5 }}>
            {errorMessage}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ paddingTop: 60, textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>
            {q ? `"${query}"과 일치하는 과목이 없어요` : '검색 결과가 없어요'}
          </div>
        ) : (
          <div>
            {groups.map(group => (
              <div key={group.dept} style={{ marginBottom: 28 }}>
                {(dept === '전체' || groups.length > 1) && (
                  <div style={{
                    fontSize: 12.5, fontWeight: 600, color: 'var(--cs-ink-soft)',
                    marginBottom: 6, paddingBottom: 7,
                    borderBottom: '1px solid var(--cs-border)',
                    letterSpacing: '0.01em',
                  }}>
                    {group.dept}
                    <span style={{ fontWeight: 400, color: 'var(--cs-ink-faint)', marginLeft: 6 }}>
                      {group.subjects.length}개 과목
                    </span>
                  </div>
                )}

                <div>
                  {group.subjects.map(s => {
                    const isAdded = isGroupAdded(s)
                    const isPending = pendingId === s.id

                    return (
                      <div
                        key={s.id}
                        onClick={() => router.push(`/courses/${s.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center',
                          padding: '12px 8px',
                          borderBottom: '1px solid var(--cs-bg)',
                          cursor: 'pointer', transition: 'background 0.1s',
                          borderRadius: 'var(--cs-radius-md)',
                          gap: 12,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--cs-card-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{
                          width: 8, height: 8, borderRadius: 'var(--cs-radius-full)', flexShrink: 0,
                          background: s.empty ? 'var(--cs-border-str)' : 'var(--cs-purple)',
                        }} />

                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--cs-ink)', flex: '0 0 160px' }}>
                          {s.name}
                        </span>

                        <span style={{ fontSize: 13, color: 'var(--cs-ink-soft)', flex: 1 }}>
                          이번 학기 {s.professor} 교수님
                        </span>

                        <span style={{ fontSize: 12.5, color: 'var(--cs-ink-faint)', flexShrink: 0, marginRight: 8 }}>
                          {s.empty ? '노트 없음' : `노트 ${s.docCount}개`}
                        </span>

                        <button
                          onClick={e => { e.stopPropagation(); void toggleMyCourse(s) }}
                          disabled={isPending}
                          style={{
                            fontSize: 11.5, padding: '3px 9px', borderRadius: 'var(--cs-radius-sm)',
                            border: `1px solid ${isAdded ? 'var(--cs-purple-border)' : 'var(--cs-border)'}`,
                            background: isAdded ? 'var(--cs-purple-bg)' : 'var(--cs-surface)',
                            color: isAdded ? 'var(--cs-purple-dark)' : 'var(--cs-ink-soft)',
                            cursor: isPending ? 'default' : 'pointer', fontFamily: 'inherit',
                            flexShrink: 0, transition: 'all 0.1s',
                            opacity: isPending ? 0.6 : 1,
                          }}
                          onMouseEnter={e => { if (!isAdded) { e.currentTarget.style.borderColor = 'var(--cs-purple)'; e.currentTarget.style.color = 'var(--cs-purple-dark)' } }}
                          onMouseLeave={e => { if (!isAdded) { e.currentTarget.style.borderColor = 'var(--cs-border)'; e.currentTarget.style.color = 'var(--cs-ink-soft)' } }}
                        >
                          {isAdded ? '✓ 담음' : '＋ 추가'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}