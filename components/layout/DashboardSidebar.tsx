"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { supabase } from "@/lib/supabase";
import styles from "./DashboardSidebar.module.css";

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

type SidebarCourse = {
  id: string;
  name: string;
  color: string;
};

const COURSE_COLORS = [
  "#b3bbb4",
  "#8fa492",
  "#b89878",
  "#769baa",
  "#8e9ba9",
  "#9e8bb4",
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  /*
   * 현재 주소가 /courses/수업UUID인 경우
   * 수업 UUID 부분만 가져옴
   */
  const selectedCourseId =
    pathname.startsWith("/courses/")
      ? pathname.split("/")[2] ?? ""
      : "";

  const [courses, setCourses] =
    useState<SidebarCourse[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    const loadMyCourses = async () => {
      try {
        setIsLoading(true);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          setCourses([]);
          return;
        }

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

        const rows =
          (data ?? []) as unknown as UserCourseRow[];

        const nextCourses = rows
          .map(
            (
              row,
              index,
            ): SidebarCourse | null => {
              const rawCourse =
                row.course_offerings;

              const course = Array.isArray(
                rawCourse,
              )
                ? rawCourse[0]
                : rawCourse;

              if (!course) {
                return null;
              }

              const subject = Array.isArray(
                course.subjects,
              )
                ? course.subjects[0]
                : course.subjects;

              return {
                id: course.id,
                name:
                  subject?.name ??
                  "과목명 없음",
                color:
                  COURSE_COLORS[
                    index %
                      COURSE_COLORS.length
                  ],
              };
            },
          )
          .filter(
            (
              course,
            ): course is SidebarCourse =>
              course !== null,
          )
          .sort((a, b) =>
            a.name.localeCompare(
              b.name,
              "ko",
            ),
          );

        setCourses(nextCourses);
      } catch (error) {
        console.error(
          "사이드바 수강 과목 조회 실패:",
          error,
        );

        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadMyCourses();
  }, []);

  const subjectCountLabel = useMemo(() => {
    if (isLoading) {
      return "불러오는 중";
    }

    return String(courses.length);
  }, [courses.length, isLoading]);

  const isHomeActive = pathname === "/";

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTop}>
        <Link
          href="/"
          className={styles.logo}
        >
          <span className={styles.logoMark}>
            C
          </span>

          <span>CampusShare</span>
        </Link>

        <button
          type="button"
          className={styles.collapseButton}
          aria-label="사이드바 접기"
        >
          ‹
        </button>
      </div>

      <nav className={styles.navigation}>
        <Link
          href="/notes/new"
          className={styles.newNoteLink}
        >
          <span>＋</span>
          새 노트
        </Link>

        <Link
          href="/"
          className={
            isHomeActive
              ? styles.activeMenu
              : styles.menuLink
          }
        >
          <span>●</span>
          홈
        </Link>

        <Link
          href="/materials"
          className={
            pathname === "/materials"
              ? styles.activeMenu
              : styles.menuLink
          }
        >
          <span>⌕</span>
          전체 과목 검색
        </Link>

        <Link
          href="/bookmarks"
          className={
            pathname === "/bookmarks"
              ? styles.activeMenu
              : styles.menuLink
          }
        >
          <span>◇</span>
          북마크
        </Link>
      </nav>

      <section
        className={styles.subjectSection}
      >
        <p className={styles.sectionLabel}>
          내 과목 · {subjectCountLabel}
        </p>

        <ul className={styles.subjectList}>
          {courses.map((course) => {
            const isActive =
              selectedCourseId === course.id;

            return (
              <li key={course.id}>
                <Link
                  href={`/courses/${course.id}`}
                  className={
                    isActive
                      ? styles.activeSubject
                      : undefined
                  }
                >
                  <span
                    className={
                      styles.subjectDot
                    }
                    style={{
                      backgroundColor:
                        course.color,
                    }}
                  />

                  {course.name}
                </Link>
              </li>
            );
          })}

          {!isLoading &&
            courses.length === 0 && (
              <li
                className={
                  styles.emptySubject
                }
              >
                등록된 과목이 없습니다.
              </li>
            )}
        </ul>
      </section>

      <Link
        href="/mypage"
        className={styles.myPageLink}
      >
        <span>●</span>
        마이페이지
      </Link>
    </aside>
  );
}