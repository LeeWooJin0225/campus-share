"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type SidebarCourse = {
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

type UserCourseRow = {
  course_offerings:
    | CourseRelation
    | CourseRelation[]
    | null;
};

function pickOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [courses, setCourses] = useState<SidebarCourse[]>([]);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [initial, setInitial] = useState("나");

  const currentSubjectId = pathname.startsWith("/courses/")
    ? pathname.split("/")[2] ?? null
    : null;

  const editorActive = pathname.startsWith("/notes/new");

  const NAV_ITEMS: { id: string; label: string; href: string; badge?: string }[] = [
    { id: 'home',     label: '홈',              href: '/' },
    { id: 'search',   label: '전체 과목 검색',  href: '/search' },
    {
      id: 'bookmark',
      label: '북마크',
      href: '/bookmarks',
      badge: bookmarkCount > 0 ? String(bookmarkCount) : undefined,
    },
  ];

  const isNavActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }

    return pathname.startsWith(href);
  };

  const isMyPageActive = pathname === '/mypage';

  useEffect(() => {
    const loadSidebar = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setCourses([]);
          return;
        }

        const uid = session.user.id;

        /* 내 과목 */
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
          .eq("user_id", uid);

        if (error) {
          throw error;
        }

        const rows = (data ?? []) as unknown as UserCourseRow[];

        setCourses(
          rows
            .map((row): SidebarCourse | null => {
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
              (course): course is SidebarCourse =>
                course !== null,
            )
            .sort((a, b) =>
              a.name.localeCompare(b.name, "ko"),
            ),
        );

        /* 북마크 개수 */
        const { count, error: bookmarkError } = await supabase
          .from("bookmarks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid);

        if (bookmarkError) {
          console.error("북마크 개수 조회 실패:", bookmarkError);
        } else {
          setBookmarkCount(count ?? 0);
        }

        /* 아바타 이니셜 */
        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select("nickname")
            .eq("id", uid)
            .maybeSingle();

        if (profileError) {
          console.error("프로필 조회 실패:", profileError);
        } else {
          const nickname =
            (profileData as { nickname: string | null } | null)
              ?.nickname ?? "";

          setInitial(nickname.slice(0, 1) || "나");
        }
      } catch (error) {
        console.error("사이드바 조회 실패:", error);
        setCourses([]);
      }
    };

    void loadSidebar();
  }, [pathname]);

  return (
    <aside
      style={{
        width: collapsed ? 52 : 224,
        flexShrink: 0,
        background: 'var(--cs-sidebar-bg)',
        borderRight: '1px solid var(--cs-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: collapsed ? '16px 8px' : '16px 12px',
        gap: 20,
        transition: 'width 0.18s ease, padding 0.18s ease',
        overflow: 'hidden',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? 0 : '0 4px',
        }}
      >
        {!collapsed && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontWeight: 600, fontSize: 15, color: 'var(--cs-ink)',
              overflow: 'hidden', cursor: 'pointer',
            }}
            onClick={() => router.push('/')}
          >
            <LogoMark />
            <span style={{ whiteSpace: 'nowrap' }}>CampusShare</span>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'none', border: 'none', color: 'var(--cs-ink-faint)',
            cursor: 'pointer', fontSize: 12, padding: '4px 6px',
            borderRadius: 'var(--cs-radius-xs)', lineHeight: 1, flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--cs-hover-nav)'; e.currentTarget.style.color = 'var(--cs-ink)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--cs-ink-faint)' }}
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {collapsed ? '⟩' : '⟨'}
        </button>
      </div>

      {/* New note button */}
      <div
        onClick={() => router.push('/notes/new')}
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'center',
          gap: 6, padding: collapsed ? '7px 0' : '7px',
          borderRadius: 'var(--cs-radius-lg)', fontSize: 13, fontWeight: 500,
          color: editorActive ? 'var(--cs-purple-dark)' : 'var(--cs-ink)',
          background: editorActive ? 'var(--cs-purple-bg)' : 'var(--cs-surface)',
          border: `1px solid ${editorActive ? 'var(--cs-purple-border-str)' : 'var(--cs-border-str)'}`,
          cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'all 0.12s',
        }}
        onMouseEnter={e => {
          if (!editorActive) e.currentTarget.style.background = 'var(--cs-bg)'
        }}
        onMouseLeave={e => {
          if (!editorActive) e.currentTarget.style.background = 'var(--cs-surface)'
        }}
      >
        <span style={{ fontSize: 13 }}>＋</span>
        {!collapsed && <span>새 노트</span>}
      </div>

      {/* Nav section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {NAV_ITEMS.map(item => {
          const isActive = isNavActive(item.href)
          return (
            <div
              key={item.id}
              onClick={() => router.push(item.href)}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                padding: collapsed ? '7px 0' : '7px 10px',
                borderRadius: 'var(--cs-radius-md)', fontSize: 13,
                color: isActive ? 'var(--cs-purple-dark)' : 'var(--cs-ink-soft)',
                fontWeight: isActive ? 500 : 400,
                background: isActive ? 'var(--cs-purple-bg)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--cs-hover-nav)'; e.currentTarget.style.color = 'var(--cs-ink)' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cs-ink-soft)' } }}
            >
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <span style={{ fontSize: 11.5, color: 'var(--cs-ink-faint)' }}>{item.badge}</span>
              )}
              {collapsed && <span style={{ width: 5, height: 5, borderRadius: 'var(--cs-radius-full)', background: 'currentColor', opacity: 0.5 }} />}
            </div>
          )
        })}
      </div>

      {/* Subjects */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {!collapsed && (
          <div style={{ fontSize: 11, color: 'var(--cs-ink-faint)', padding: '0 10px 7px', letterSpacing: '0.02em' }}>
            내 과목 · {courses.length}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {courses.map(subject => {
            const isActive = currentSubjectId === subject.id
            return (
              <div
                key={subject.id}
                onClick={() => router.push(`/courses/${subject.id}`)}
                title={collapsed ? subject.name : undefined}
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: 0, padding: collapsed ? '6px 0' : '7px 10px',
                  borderRadius: 'var(--cs-radius-md)', fontSize: 13,
                  color: isActive ? 'var(--cs-purple-dark)' : 'var(--cs-ink-soft)',
                  fontWeight: isActive ? 500 : 400,
                  background: isActive ? 'var(--cs-purple-bg)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--cs-hover-nav)'; e.currentTarget.style.color = 'var(--cs-ink)' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cs-ink-soft)' } }}
              >
                {collapsed
                  ? <span style={{ width: 6, height: 6, borderRadius: 'var(--cs-radius-full)', background: isActive ? 'var(--cs-purple)' : 'var(--cs-border-str)' }} />
                  : subject.name
                }
              </div>
            )
          })}

          {/* 내 과목 추가 — 담은 과목이 없을 때만 안내 */}
          {!collapsed && courses.length === 0 && (
            <div
              onClick={() => router.push('/search')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 5, padding: '7px 10px', marginTop: 7,
                fontSize: 12.5, color: 'var(--cs-purple)',
                border: '1px dashed var(--cs-border-str)',
                borderRadius: 'var(--cs-radius-md)', cursor: 'pointer',
                transition: 'border-color 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--cs-purple)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--cs-border-str)')}
            >
              ＋ 내 과목 추가
            </div>
          )}
        </div>
      </div>

      {/* Bottom: avatar + mypage */}
      <div
        onClick={() => router.push('/mypage')}
        title={collapsed ? '마이페이지' : undefined}
        style={{
          borderTop: '1px solid var(--cs-border)', marginTop: 'auto', paddingTop: 12,
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 9,
          cursor: 'pointer', borderRadius: 'var(--cs-radius-md)', padding: '10px 6px',
          background: isMyPageActive ? 'var(--cs-purple-bg)' : 'transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (!isMyPageActive) e.currentTarget.style.background = 'var(--cs-hover-nav)' }}
        onMouseLeave={e => { if (!isMyPageActive) e.currentTarget.style.background = 'transparent' }}
      >
        <div
          style={{
            width: 26, height: 26, borderRadius: 'var(--cs-radius-full)',
            background: 'var(--cs-purple-bg)', color: 'var(--cs-purple-dark)',
            fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 500, flexShrink: 0,
          }}
        >
          {initial}
        </div>
        {!collapsed && (
          <span style={{ fontSize: 13, color: isMyPageActive ? 'var(--cs-purple-dark)' : 'var(--cs-ink-soft)', fontWeight: isMyPageActive ? 500 : 400 }}>
            마이페이지
          </span>
        )}
      </div>
    </aside>
  )
}

function LogoMark() {
  return (
    <div
      style={{
        width: 19, height: 19, borderRadius: 'var(--cs-radius-sm)',
        background: 'var(--cs-purple)',
        flexShrink: 0,
      }}
    />
  )
}