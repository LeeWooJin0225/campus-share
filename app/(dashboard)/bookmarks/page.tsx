"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";

type PostType =
  | "notes"
  | "exam"
  | "reference"
  | "study_trail";

type SubjectRelation = {
  name: string;
};

type ProfessorRelation = {
  name: string;
};

type CourseOfferingRelation = {
  subjects:
    | SubjectRelation
    | SubjectRelation[]
    | null;
  professors:
    | ProfessorRelation
    | ProfessorRelation[]
    | null;
};

type PostRelation = {
  id: string;
  title: string;
  post_type: PostType;
  created_at: string;
  course_offerings:
    | CourseOfferingRelation
    | CourseOfferingRelation[]
    | null;
};

type BookmarkRow = {
  id: string;
  post_id: string;
  created_at: string;
  posts:
    | PostRelation
    | PostRelation[]
    | null;
};

type BookmarkItem = {
  bookmarkId: string;
  postId: string;
  title: string;
  postType: PostType;
  postCreatedAt: string;
  subjectName: string;
  professorName: string;
};

const TYPE_LABELS: Record<PostType, string> = {
  notes: "Notes",
  exam: "Exam",
  reference: "Reference",
  study_trail: "Study Trail",
};

export default function BookmarksPage() {
  const router = useRouter();

  const [bookmarks, setBookmarks] =
    useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] =
    useState(true);
  const [removingBookmarkId, setRemovingBookmarkId] =
    useState<string | null>(null);
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("bookmarks")
          .select(`
            id,
            post_id,
            created_at,
            posts (
              id,
              title,
              post_type,
              created_at,
              course_offerings (
                subjects ( name ),
                professors ( name )
              )
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        const rows =
          (data ?? []) as unknown as BookmarkRow[];

        const nextBookmarks = rows
          .map((row): BookmarkItem | null => {
            const post = Array.isArray(row.posts)
              ? row.posts[0]
              : row.posts;

            if (!post) {
              return null;
            }

            const course = Array.isArray(
              post.course_offerings,
            )
              ? post.course_offerings[0]
              : post.course_offerings;

            const subject = Array.isArray(
              course?.subjects,
            )
              ? course?.subjects[0]
              : course?.subjects;

            const professor = Array.isArray(
              course?.professors,
            )
              ? course?.professors[0]
              : course?.professors;

            return {
              bookmarkId: row.id,
              postId: post.id,
              title: post.title,
              postType: post.post_type,
              postCreatedAt: post.created_at,
              subjectName:
                subject?.name ?? "과목명 없음",
              professorName:
                professor?.name ?? "교수 미정",
            };
          })
          .filter(
            (
              item,
            ): item is BookmarkItem =>
              item !== null,
          );

        setBookmarks(nextBookmarks);
      } catch (error) {
        console.error(
          "북마크 목록 조회 실패:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "북마크 목록을 불러오지 못했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadBookmarks();
  }, [router]);

  const handleRemoveBookmark = async (
    bookmark: BookmarkItem,
  ) => {
    if (removingBookmarkId) {
      return;
    }

    try {
      setRemovingBookmarkId(
        bookmark.bookmarkId,
      );

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", bookmark.bookmarkId)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setBookmarks((previous) =>
        previous.filter(
          (item) =>
            item.bookmarkId !==
            bookmark.bookmarkId,
        ),
      );
    } catch (error) {
      console.error(
        "북마크 해제 실패:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "북마크를 해제하지 못했습니다.",
      );
    } finally {
      setRemovingBookmarkId(null);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <header className={styles.pageHeader}>
          <h1>
            북마크
            <span>{bookmarks.length}개</span>
          </h1>
        </header>

        {isLoading ? (
          <div className={styles.stateBox}>
            북마크를 불러오는 중입니다.
          </div>
        ) : errorMessage ? (
          <div className={styles.stateBox}>
            {errorMessage}
          </div>
        ) : bookmarks.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyStar}>
              ☆
            </span>

            <strong>
              저장한 북마크가 없습니다.
            </strong>

            <p>
              다시 보고 싶은 노트를 북마크해
              보세요.
            </p>

            <Link href="/">
              노트 둘러보기
            </Link>
          </div>
        ) : (
          <ul className={styles.bookmarkList}>
            {bookmarks.map((bookmark) => {
              const isRemoving =
                removingBookmarkId ===
                bookmark.bookmarkId;

              return (
                <li
                  key={bookmark.bookmarkId}
                  className={styles.bookmarkRow}
                >
                  <Link
                    href={`/posts/${bookmark.postId}`}
                    className={styles.postLink}
                  >
                    <span
                      className={`${styles.typeBadge} ${
                        styles[
                          `type_${bookmark.postType}`
                        ]
                      }`}
                    >
                      {
                        TYPE_LABELS[
                          bookmark.postType
                        ]
                      }
                    </span>

                    <div
                      className={styles.postInformation}
                    >
                      <strong>
                        {bookmark.title}
                      </strong>

                      <span>
                        {bookmark.subjectName}
                        {" · "}
                        {bookmark.professorName}
                        {" · "}
                        {formatRelativeDate(
                          bookmark.postCreatedAt,
                        )}
                      </span>
                    </div>
                  </Link>

                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() =>
                      void handleRemoveBookmark(
                        bookmark,
                      )
                    }
                    disabled={isRemoving}
                    aria-label={`${bookmark.title} 북마크 해제`}
                    title="북마크 해제"
                  >
                    {isRemoving ? "…" : "★"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
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
    now.getTime() -
      createdAt.getTime(),
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
      year: "numeric",
      month: "numeric",
      day: "numeric",
    },
  ).format(createdAt);
}
