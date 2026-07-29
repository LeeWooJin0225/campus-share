"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";

type PostType =
  | "notes"
  | "exam"
  | "reference"
  | "study_trail";

type FilterType = "all" | PostType;

type CourseInfo = {
  id: string;
  section: string | null;
  subjectName: string;
  subjectCode: string | null;
  professorName: string;
  year: number;
  term: number;
};

type PostItem = {
  id: string;
  title: string;
  postType: PostType;
  authorName: string;
  createdAt: string;
  commentCount: number;
  attachmentCount: number;
};

type CourseRow = {
  id: string;
  section: string | null;
  subjects:
    | {
        name: string;
        subject_code: string | null;
      }
    | {
        name: string;
        subject_code: string | null;
      }[]
    | null;
  professors:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
  semesters:
    | {
        year: number;
        term: number;
      }
    | {
        year: number;
        term: number;
      }[]
    | null;
};

type PostRow = {
  id: string;
  title: string;
  post_type: PostType;
  created_at: string;
  comment_count: number | null;
  profiles:
    | {
        nickname: string | null;
      }
    | {
        nickname: string | null;
      }[]
    | null;
  post_attachments:
    | {
        id: string;
      }[]
    | null;
};

const FILTERS: {
  value: FilterType;
  label: string;
}[] = [
  { value: "all", label: "전체" },
  { value: "notes", label: "Notes" },
  { value: "exam", label: "Exam" },
  {
    value: "reference",
    label: "Reference",
  },
  {
    value: "study_trail",
    label: "Study Trail",
  },
];

const TYPE_LABELS: Record<
  PostType,
  string
> = {
  notes: "Notes",
  exam: "Exam",
  reference: "Reference",
  study_trail: "Study Trail",
};

export default function CoursePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [course, setCourse] =
    useState<CourseInfo | null>(null);
  const [posts, setPosts] = useState<
    PostItem[]
  >([]);
  const [activeFilter, setActiveFilter] =
    useState<FilterType>("all");
  const [isLoading, setIsLoading] =
    useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

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
          setCourse(null);
          setPosts([]);
          return;
        }

        const {
          data: courseData,
          error: courseError,
        } = await supabase
          .from("course_offerings")
          .select(`
            id,
            section,
            subjects (
              name,
              subject_code
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

        if (courseError) {
          throw courseError;
        }

        const rawCourse =
          courseData as unknown as CourseRow;

        const subject = Array.isArray(
          rawCourse.subjects,
        )
          ? rawCourse.subjects[0]
          : rawCourse.subjects;

        const professor = Array.isArray(
          rawCourse.professors,
        )
          ? rawCourse.professors[0]
          : rawCourse.professors;

        const semester = Array.isArray(
          rawCourse.semesters,
        )
          ? rawCourse.semesters[0]
          : rawCourse.semesters;

        if (!semester) {
          throw new Error(
            "학기 정보가 연결되어 있지 않습니다.",
          );
        }

        setCourse({
          id: rawCourse.id,
          section: rawCourse.section,
          subjectName:
            subject?.name ?? "과목명 없음",
          subjectCode:
            subject?.subject_code ?? null,
          professorName:
            professor?.name ?? "교수 미정",
          year: semester.year,
          term: semester.term,
        });

        const { data: postData, error: postError } =
          await supabase
            .from("posts")
            .select(`
              id,
              title,
              post_type,
              created_at,
              comment_count,
              profiles (
                nickname
              ),
              post_attachments (
                id
              )
            `)
            .eq("course_offering_id", courseId)
            .eq("is_published", true)
            .order("created_at", {
              ascending: false,
            });

        if (postError) {
          throw postError;
        }

        const rows =
          (postData ?? []) as unknown as PostRow[];

        setPosts(
          rows.map((row): PostItem => {
            const profile = Array.isArray(
              row.profiles,
            )
              ? row.profiles[0]
              : row.profiles;

            return {
              id: row.id,
              title: row.title,
              postType: row.post_type,
              authorName:
                profile?.nickname ?? "익명",
              createdAt: row.created_at,
              commentCount:
                row.comment_count ?? 0,
              attachmentCount:
                row.post_attachments?.length ??
                0,
            };
          }),
        );
      } catch (error) {
        console.error(
          "과목 상세 화면 조회 실패:",
          error,
        );

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

  const filteredPosts = useMemo(() => {
    if (activeFilter === "all") {
      return posts;
    }

    return posts.filter(
      (post) =>
        post.postType === activeFilter,
    );
  }, [activeFilter, posts]);

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.stateBox}>
          과목 자료를 불러오는 중입니다.
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyCourse}>
          <strong>
            과목을 불러오지 못했습니다.
          </strong>
          <p>{errorMessage}</p>
          <Link href="/">홈으로 돌아가기</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <p className={styles.breadcrumb}>
          내 자료 / {course.subjectName}
        </p>

        <header className={styles.courseHeader}>
          <div>
            <div className={styles.titleRow}>
              <span
                className={styles.titleDot}
              />
              <h1>{course.subjectName}</h1>
            </div>

            <p className={styles.courseMeta}>
              {course.professorName} 교수 ·{" "}
              {course.year}년 {course.term}학기
              {course.section
                ? ` · ${course.section}분반`
                : ""}
              {course.subjectCode
                ? ` · ${course.subjectCode}`
                : ""}
              {" · "}자료 {posts.length}개
            </p>
          </div>
        </header>

        <nav
          className={styles.filters}
          aria-label="자료 유형 필터"
        >
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={
                activeFilter === filter.value
                  ? styles.activeFilter
                  : styles.filterButton
              }
              onClick={() =>
                setActiveFilter(filter.value)
              }
            >
              {filter.label}
            </button>
          ))}
        </nav>

        {errorMessage && (
          <div className={styles.errorBox}>
            {errorMessage}
          </div>
        )}

        <section className={styles.postPanel}>
          {filteredPosts.length > 0 ? (
            <ul className={styles.postList}>
              {filteredPosts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/posts/${post.id}`}
                    className={styles.postLink}
                  >
                    <div
                      className={
                        styles.postMain
                      }
                    >
                      <span
                        className={`${styles.typeBadge} ${
                          styles[
                            `type_${post.postType}`
                          ]
                        }`}
                      >
                        {
                          TYPE_LABELS[
                            post.postType
                          ]
                        }
                      </span>

                      <strong
                        className={styles.postTitle}
                      >
                        {post.title}
                      </strong>

                      {post.attachmentCount >
                        0 && (
                        <span
                          className={
                            styles.attachmentCount
                          }
                        >
                          첨부{" "}
                          {post.attachmentCount}
                        </span>
                      )}
                    </div>

                    <div
                      className={styles.postMeta}
                    >
                      <span>
                        {post.authorName}
                      </span>
                      <span>·</span>
                      <span>
                        {formatRelativeDate(
                          post.createdAt,
                        )}
                      </span>
                      <span className={styles.comment}>
                        댓글 {post.commentCount}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyPosts}>
              선택한 유형의 자료가 없습니다.
            </div>
          )}
        </section>

        <Link
          href={`/notes/new?course=${course.id}`}
          className={styles.uploadPrompt}
        >
          ＋ 이 과목에 자료를 올려보세요
        </Link>
      </section>
    </main>
  );
}

function formatRelativeDate(
  dateString: string,
) {
  const createdAt = new Date(dateString);
  const now = new Date();

  const difference = Math.max(
    0,
    now.getTime() - createdAt.getTime(),
  );

  const minutes = Math.floor(
    difference / (1000 * 60),
  );
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    return "방금 전";
  }

  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  if (hours < 24) {
    return `${hours}시간 전`;
  }

  if (days < 7) {
    return `${days}일 전`;
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      month: "numeric",
      day: "numeric",
    },
  ).format(createdAt);
}
