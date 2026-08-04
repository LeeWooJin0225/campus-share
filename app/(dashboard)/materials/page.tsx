"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";

type SubjectCategory = "major" | "general" | string;

type SubjectRelation = {
  id: string;
  name: string;
  department: string | null;
  category: SubjectCategory | null;
};

type ProfessorRelation = {
  id: string;
  name: string;
};

type SemesterRelation = {
  id: string;
  year: number;
  term: number;
};

type CourseOfferingRow = {
  id: string;
  subject_id: string;
  professor_id: string | null;
  semester_id: string;
  section: string | null;
  subjects:
    | SubjectRelation
    | SubjectRelation[]
    | null;
  professors:
    | ProfessorRelation
    | ProfessorRelation[]
    | null;
  semesters:
    | SemesterRelation
    | SemesterRelation[]
    | null;
  posts:
    | { count: number }
    | { count: number }[]
    | null;
};

type CourseItem = {
  id: string;
  subjectName: string;
  department: string;
  category: SubjectCategory;
  professorName: string;
  semesterId: string;
  semesterLabel: string;
  noteCount: number;
};

type CategoryFilter =
  | "all"
  | "major"
  | "general";

const CATEGORY_TABS: {
  key: CategoryFilter;
  label: string;
}[] = [
  {
    key: "all",
    label: "전체",
  },
  {
    key: "major",
    label: "전공",
  },
  {
    key: "general",
    label: "교양",
  },
];

export default function MaterialsPage() {
  const [courses, setCourses] =
    useState<CourseItem[]>([]);
  const [myCourseIds, setMyCourseIds] =
    useState<Set<string>>(new Set());

  const [activeCategory, setActiveCategory] =
    useState<CategoryFilter>("all");
  const [selectedDepartment, setSelectedDepartment] =
    useState("all");
  const [selectedSemesterId, setSelectedSemesterId] =
    useState("all");
  const [searchKeyword, setSearchKeyword] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);
  const [addingCourseId, setAddingCourseId] =
    useState<string | null>(null);
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    const loadCourses = async () => {
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
          setErrorMessage(
            "로그인 후 이용할 수 있습니다.",
          );
          return;
        }

        const [
          courseResult,
          myCourseResult,
        ] = await Promise.all([
          supabase
            .from("course_offerings")
            .select(`
              id,
              subject_id,
              professor_id,
              semester_id,
              section,
              subjects (
                id,
                name,
                department,
                category
              ),
              professors (
                id,
                name
              ),
              semesters (
                id,
                year,
                term
              ),
              posts (
                count
              )
            `)
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("user_course_offerings")
            .select("course_offering_id")
            .eq("user_id", session.user.id),
        ]);

        if (courseResult.error) {
          throw courseResult.error;
        }

        if (myCourseResult.error) {
          throw myCourseResult.error;
        }

        const rows =
          (courseResult.data ??
            []) as unknown as CourseOfferingRow[];

        const nextCourses = rows.map(
          (row): CourseItem => {
            const subject = Array.isArray(
              row.subjects,
            )
              ? row.subjects[0]
              : row.subjects;

            const professor = Array.isArray(
              row.professors,
            )
              ? row.professors[0]
              : row.professors;

            const semester = Array.isArray(
              row.semesters,
            )
              ? row.semesters[0]
              : row.semesters;

            const postCountRelation =
              Array.isArray(row.posts)
                ? row.posts[0]
                : row.posts;

            return {
              id: row.id,
              subjectName:
                subject?.name ??
                "과목명 없음",
              department:
                subject?.department ??
                "학과 미지정",
              category:
                subject?.category ??
                "major",
              professorName:
                professor?.name ??
                "교수 미정",
              semesterId:
                semester?.id ??
                row.semester_id,
              semesterLabel: semester
                ? `${semester.year}년 ${semester.term}학기`
                : "학기 미정",
              noteCount:
                postCountRelation?.count ??
                0,
            };
          },
        );

        nextCourses.sort((a, b) => {
          const departmentCompare =
            a.department.localeCompare(
              b.department,
              "ko",
            );

          if (departmentCompare !== 0) {
            return departmentCompare;
          }

          return a.subjectName.localeCompare(
            b.subjectName,
            "ko",
          );
        });

        setCourses(nextCourses);

        setMyCourseIds(
          new Set(
            (
              myCourseResult.data ?? []
            ).map(
              (item) =>
                item.course_offering_id,
            ),
          ),
        );
      } catch (error) {
        console.error(
          "전체 과목 조회 실패:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "과목을 불러오지 못했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadCourses();
  }, []);

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        courses
          .map(
            (course) =>
              course.department,
          )
          .filter(Boolean),
      ),
    ).sort((a, b) =>
      a.localeCompare(b, "ko"),
    );
  }, [courses]);

  const semesters = useMemo(() => {
    const semesterMap = new Map<
      string,
      string
    >();

    courses.forEach((course) => {
      semesterMap.set(
        course.semesterId,
        course.semesterLabel,
      );
    });

    return Array.from(
      semesterMap.entries(),
    ).sort((a, b) =>
      b[1].localeCompare(a[1], "ko"),
    );
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const normalizedKeyword =
      searchKeyword.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesCategory =
        activeCategory === "all" ||
        course.category === activeCategory;

      const matchesDepartment =
        selectedDepartment === "all" ||
        course.department ===
          selectedDepartment;

      const matchesSemester =
        selectedSemesterId === "all" ||
        course.semesterId ===
          selectedSemesterId;

      const matchesKeyword =
        !normalizedKeyword ||
        course.subjectName
          .toLowerCase()
          .includes(
            normalizedKeyword,
          ) ||
        course.professorName
          .toLowerCase()
          .includes(
            normalizedKeyword,
          ) ||
        course.department
          .toLowerCase()
          .includes(
            normalizedKeyword,
          );

      return (
        matchesCategory &&
        matchesDepartment &&
        matchesSemester &&
        matchesKeyword
      );
    });
  }, [
    activeCategory,
    courses,
    searchKeyword,
    selectedDepartment,
    selectedSemesterId,
  ]);

  const groupedCourses = useMemo(() => {
    const map = new Map<
      string,
      CourseItem[]
    >();

    filteredCourses.forEach((course) => {
      const existing =
        map.get(course.department) ??
        [];

      existing.push(course);
      map.set(
        course.department,
        existing,
      );
    });

    return Array.from(map.entries());
  }, [filteredCourses]);

  const handleToggleCourse = async (
    courseOfferingId: string,
  ) => {
    try {
      setAddingCourseId(
        courseOfferingId,
      );

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.user) {
        alert(
          "로그인 후 이용할 수 있습니다.",
        );
        return;
      }

      const isAdded =
        myCourseIds.has(
          courseOfferingId,
        );

      if (isAdded) {
        const { error } = await supabase
          .from(
            "user_course_offerings",
          )
          .delete()
          .eq(
            "user_id",
            session.user.id,
          )
          .eq(
            "course_offering_id",
            courseOfferingId,
          );

        if (error) {
          throw error;
        }

        setMyCourseIds(
          (previous) => {
            const next =
              new Set(previous);

            next.delete(
              courseOfferingId,
            );

            return next;
          },
        );
      } else {
        const { error } = await supabase
          .from(
            "user_course_offerings",
          )
          .insert({
            user_id:
              session.user.id,
            course_offering_id:
              courseOfferingId,
          });

        if (error) {
          throw error;
        }

        setMyCourseIds(
          (previous) =>
            new Set([
              ...previous,
              courseOfferingId,
            ]),
        );
      }
    } catch (error) {
      console.error(
        "내 과목 변경 실패:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "내 과목을 변경하지 못했습니다.",
      );
    } finally {
      setAddingCourseId(null);
    }
  };

  return (
    <div className={styles.page}>
      <section
        className={styles.content}
      >
        <header
          className={styles.pageHeader}
        >
          <div>
            <h1>전체 과목</h1>

            <p>
              듣고 있는 수업을 찾아 내 과목에
              추가해보세요.
            </p>
          </div>
        </header>

        <section
          className={styles.filterPanel}
          aria-label="과목 필터"
        >
          <div
            className={styles.categoryTabs}
          >
            {CATEGORY_TABS.map((tab) => {
              const isActive =
                activeCategory === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  className={
                    isActive
                      ? styles.activeCategoryTab
                      : styles.categoryTab
                  }
                  onClick={() =>
                    setActiveCategory(
                      tab.key,
                    )
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div
            className={styles.filterControls}
          >
            <label
              className={styles.selectField}
            >
              <span>학과</span>

              <select
                value={selectedDepartment}
                onChange={(event) =>
                  setSelectedDepartment(
                    event.target.value,
                  )
                }
              >
                <option value="all">
                  전체 학과
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={department}
                      value={department}
                    >
                      {department}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label
              className={styles.selectField}
            >
              <span>학기</span>

              <select
                value={selectedSemesterId}
                onChange={(event) =>
                  setSelectedSemesterId(
                    event.target.value,
                  )
                }
              >
                <option value="all">
                  전체 학기
                </option>

                {semesters.map(
                  ([
                    semesterId,
                    semesterLabel,
                  ]) => (
                    <option
                      key={semesterId}
                      value={semesterId}
                    >
                      {semesterLabel}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label
              className={styles.searchField}
            >
              <span aria-hidden="true">
                ⌕
              </span>

              <input
                value={searchKeyword}
                onChange={(event) =>
                  setSearchKeyword(
                    event.target.value,
                  )
                }
                placeholder="과목명, 교수님 이름으로 검색"
                aria-label="과목명 또는 교수명 검색"
              />
            </label>
          </div>
        </section>

        <div
          className={styles.resultSummary}
        >
          <span>
            검색 결과{" "}
            <strong>
              {filteredCourses.length}
            </strong>
            개
          </span>

          {(activeCategory !== "all" ||
            selectedDepartment !== "all" ||
            selectedSemesterId !== "all" ||
            searchKeyword.trim()) && (
            <button
              type="button"
              onClick={() => {
                setActiveCategory("all");
                setSelectedDepartment(
                  "all",
                );
                setSelectedSemesterId(
                  "all",
                );
                setSearchKeyword("");
              }}
            >
              필터 초기화
            </button>
          )}
        </div>

        {isLoading ? (
          <div
            className={styles.stateBox}
          >
            과목을 불러오는 중입니다.
          </div>
        ) : errorMessage ? (
          <div
            className={styles.stateBox}
          >
            {errorMessage}
          </div>
        ) : groupedCourses.length ===
          0 ? (
          <div
            className={styles.stateBox}
          >
            조건에 맞는 과목이 없습니다.
          </div>
        ) : (
          <div
            className={
              styles.departmentGroups
            }
          >
            {groupedCourses.map(
              ([
                department,
                departmentCourses,
              ]) => (
                <section
                  key={department}
                  className={
                    styles.departmentGroup
                  }
                >
                  <div
                    className={
                      styles.groupHeading
                    }
                  >
                    <strong>
                      {department}
                    </strong>

                    <span>
                      {
                        departmentCourses.length
                      }
                      개 과목
                    </span>
                  </div>

                  <ul
                    className={
                      styles.courseList
                    }
                  >
                    {departmentCourses.map(
                      (course) => {
                        const isAdded =
                          myCourseIds.has(
                            course.id,
                          );

                        const isAdding =
                          addingCourseId ===
                          course.id;

                        return (
                          <li
                            key={course.id}
                            className={
                              styles.courseRow
                            }
                          >
                            <Link
                              href={`/courses/${course.id}`}
                              className={
                                styles.courseMain
                              }
                            >
                              <span
                                className={
                                  styles.courseDot
                                }
                              />

                              <strong>
                                {
                                  course.subjectName
                                }
                              </strong>
                            </Link>

                            <div
                              className={
                                styles.courseMeta
                              }
                            >
                              <span>
                                {
                                  course.semesterLabel
                                }{" "}
                                {
                                  course.professorName
                                }{" "}
                                교수님
                              </span>
                            </div>

                            <div
                              className={
                                styles.courseActions
                              }
                            >
                              <span
                                className={
                                  styles.noteCount
                                }
                              >
                                {course.noteCount >
                                0
                                  ? `노트 ${course.noteCount}개`
                                  : "노트 없음"}
                              </span>

                              <button
                                type="button"
                                className={
                                  isAdded
                                    ? styles.addedButton
                                    : styles.addButton
                                }
                                onClick={() =>
                                  void handleToggleCourse(
                                    course.id,
                                  )
                                }
                                disabled={
                                  isAdding
                                }
                                aria-label={
                                  isAdded
                                    ? `${course.subjectName} 내 과목에서 해제`
                                    : `${course.subjectName} 내 과목에 추가`
                                }
                              >
                                {isAdding
                                  ? "처리 중"
                                  : isAdded
                                    ? "해제"
                                    : "추가"}
                              </button>
                            </div>
                          </li>
                        );
                      },
                    )}
                  </ul>
                </section>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
