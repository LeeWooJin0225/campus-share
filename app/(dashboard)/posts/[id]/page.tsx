"use client";

import Link from "next/link";
import {
  FormEvent,
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

import DOMPurify from "dompurify";

type PostType =
  | "notes"
  | "exam"
  | "reference"
  | "study_trail";

type PostRow = {
  id: string;
  author_id: string;
  course_offering_id: string;
  post_type: PostType;
  title: string;
  content: string | null;
  view_count: number | null;
  comment_count: number | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  nickname: string | null;
};

type CourseOfferingRow = {
  id: string;
  subjects:
    | { name: string }
    | { name: string }[]
    | null;
  professors:
    | { name: string }
    | { name: string }[]
    | null;
};

type AttachmentRow = {
  id: string;
  original_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  display_order: number | null;
};

type CommentRow = {
  id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
};

type CommentItem = CommentRow & {
  authorName: string;
};

type AttachmentItem = AttachmentRow & {
  signedUrl: string | null;
};

type PostDetail = PostRow & {
  authorName: string;
  subjectName: string;
  professorName: string;
};

const TYPE_LABELS: Record<PostType, string> = {
  notes: "Notes",
  exam: "Exam",
  reference: "Reference",
  study_trail: "↗ Study Trail",
};

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = params.id;

  const [post, setPost] =
    useState<PostDetail | null>(null);
  const [attachments, setAttachments] =
    useState<AttachmentItem[]>([]);
  const [comments, setComments] = useState<
    CommentItem[]
  >([]);

  const [commentText, setCommentText] =
    useState("");
  const [replyText, setReplyText] =
    useState("");
  const [replyingToId, setReplyingToId] =
    useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] =
    useState(false);
  const [isSavingBookmark, setIsSavingBookmark] =
    useState(false);
  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [editingCommentId, setEditingCommentId] =
    useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] =
    useState("");
  const [isSavingCommentEdit, setIsSavingCommentEdit] =
    useState(false);
  const [deletingCommentId, setDeletingCommentId] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);
  const [
    isSubmittingComment,
    setIsSubmittingComment,
  ] = useState(false);
  const [
    isSubmittingReply,
    setIsSubmittingReply,
  ] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  const commentCount = comments.length;

  const rootComments = useMemo(
    () =>
      comments.filter(
        (comment) =>
          comment.parent_comment_id === null,
      ),
    [comments],
  );

  const repliesByParent = useMemo(() => {
    const map = new Map<
      string,
      CommentItem[]
    >();

    comments.forEach((comment) => {
      if (!comment.parent_comment_id) {
        return;
      }

      const existing =
        map.get(comment.parent_comment_id) ??
        [];

      existing.push(comment);
      map.set(
        comment.parent_comment_id,
        existing,
      );
    });

    return map;
  }, [comments]);

  useEffect(() => {
    const loadPost = async () => {
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

        setCurrentUserId(session.user.id);

        const {
          data: postData,
          error: postError,
        } = await supabase
          .from("posts")
          .select(`
            id,
            author_id,
            course_offering_id,
            post_type,
            title,
            content,
            view_count,
            comment_count,
            created_at
          `)
          .eq("id", postId)
          .eq("is_published", true)
          .single();

        if (postError) {
          throw postError;
        }

        const rawPost = postData as PostRow;

        const [
          profileResult,
          courseResult,
          attachmentResult,
          commentResult,
          bookmarkResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, nickname")
            .eq("id", rawPost.author_id)
            .maybeSingle(),

          supabase
            .from("course_offerings")
            .select(`
              id,
              subjects ( name ),
              professors ( name )
            `)
            .eq(
              "id",
              rawPost.course_offering_id,
            )
            .single(),

          supabase
            .from("post_attachments")
            .select(`
              id,
              original_name,
              storage_path,
              mime_type,
              size_bytes,
              display_order
            `)
            .eq("post_id", postId)
            .order("display_order", {
              ascending: true,
            }),

          supabase
            .from("comments")
            .select(`
              id,
              author_id,
              parent_comment_id,
              content,
              created_at
            `)
            .eq("post_id", postId)
            .order("created_at", {
              ascending: true,
            }),

          supabase
            .from("bookmarks")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("post_id", postId)
            .maybeSingle(),
        ]);

        if (profileResult.error) {
          throw profileResult.error;
        }

        if (courseResult.error) {
          throw courseResult.error;
        }

        if (attachmentResult.error) {
          throw attachmentResult.error;
        }

        if (commentResult.error) {
          throw commentResult.error;
        }

        if (bookmarkResult.error) {
          throw bookmarkResult.error;
        }

        setIsBookmarked(
          Boolean(bookmarkResult.data),
        );

        const profile =
          profileResult.data as ProfileRow | null;

        const course =
          courseResult.data as unknown as CourseOfferingRow;

        const subject = Array.isArray(
          course.subjects,
        )
          ? course.subjects[0]
          : course.subjects;

        const professor = Array.isArray(
          course.professors,
        )
          ? course.professors[0]
          : course.professors;

        setPost({
          ...rawPost,
          authorName:
            profile?.nickname ?? "익명",
          subjectName:
            subject?.name ?? "과목명 없음",
          professorName:
            professor?.name ?? "교수 미정",
        });

        const rawAttachments =
          (attachmentResult.data ??
            []) as AttachmentRow[];

        const attachmentsWithUrls =
          await Promise.all(
            rawAttachments.map(
              async (attachment) => {
                const { data } =
                  await supabase.storage
                    .from("post-files")
                    .createSignedUrl(
                      attachment.storage_path,
                      60 * 60,
                    );

                return {
                  ...attachment,
                  signedUrl:
                    data?.signedUrl ?? null,
                };
              },
            ),
          );

        setAttachments(attachmentsWithUrls);

        const rawComments =
          (commentResult.data ??
            []) as CommentRow[];

        const authorIds = [
          ...new Set(
            rawComments.map(
              (comment) => comment.author_id,
            ),
          ),
        ];

        let profileMap = new Map<
          string,
          string
        >();

        if (authorIds.length > 0) {
          const {
            data: commentProfiles,
            error: commentProfileError,
          } = await supabase
            .from("profiles")
            .select("id, nickname")
            .in("id", authorIds);

          if (commentProfileError) {
            throw commentProfileError;
          }

          profileMap = new Map(
            (
              (commentProfiles ??
                []) as ProfileRow[]
            ).map((item) => [
              item.id,
              item.nickname ?? "익명",
            ]),
          );
        }

        setComments(
          rawComments.map((comment) => ({
            ...comment,
            authorName:
              profileMap.get(
                comment.author_id,
              ) ?? "익명",
          })),
        );
      } catch (error) {
        console.error(
          "게시글 상세 조회 실패:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "게시글을 불러오지 못했습니다.",
        );

        setPost(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (postId) {
      void loadPost();
    }
  }, [postId, router]);

  const handleBookmarkToggle = async () => {
    if (isSavingBookmark) {
      return;
    }

    try {
      setIsSavingBookmark(true);

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

      if (isBookmarked) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);

        if (error) {
          throw error;
        }

        setIsBookmarked(false);
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .insert({
            user_id: user.id,
            post_id: postId,
          });

        if (error) {
          throw error;
        }

        setIsBookmarked(true);
      }
    } catch (error) {
      console.error(
        "북마크 변경 실패:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "북마크를 변경하지 못했습니다.",
      );
    } finally {
      setIsSavingBookmark(false);
    }
  };

  const createComment = async (
    content: string,
    parentCommentId: string | null,
  ) => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session?.user) {
      router.replace("/login");
      return null;
    }

    const {
      data,
      error,
    } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        author_id: session.user.id,
        parent_comment_id: parentCommentId,
        content,
      })
      .select(`
        id,
        author_id,
        parent_comment_id,
        content,
        created_at
      `)
      .single();

    if (error) {
      throw error;
    }

    const { data: profileData } =
      await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", session.user.id)
        .maybeSingle();

    return {
      ...(data as CommentRow),
      authorName:
        profileData?.nickname ?? "나",
    } satisfies CommentItem;
  };

  const handleCommentSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedComment =
      commentText.trim();

    if (!trimmedComment) {
      return;
    }

    try {
      setIsSubmittingComment(true);

      const createdComment =
        await createComment(
          trimmedComment,
          null,
        );

      if (!createdComment) {
        return;
      }

      setComments((previous) => [
        ...previous,
        createdComment,
      ]);

      setCommentText("");
    } catch (error) {
      console.error(
        "댓글 등록 실패:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "댓글을 등록하지 못했습니다.",
      );
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReplySubmit = async (
    event: FormEvent<HTMLFormElement>,
    parentCommentId: string,
  ) => {
    event.preventDefault();

    const trimmedReply = replyText.trim();

    if (!trimmedReply) {
      return;
    }

    try {
      setIsSubmittingReply(true);

      const createdReply =
        await createComment(
          trimmedReply,
          parentCommentId,
        );

      if (!createdReply) {
        return;
      }

      setComments((previous) => [
        ...previous,
        createdReply,
      ]);

      setReplyText("");
      setReplyingToId(null);
    } catch (error) {
      console.error(
        "답글 등록 실패:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "답글을 등록하지 못했습니다.",
      );
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const openEditForm = (
    comment: CommentItem,
  ) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
    setReplyingToId(null);
    setReplyText("");
  };

  const cancelEditForm = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleCommentEditSubmit = async (
    event: FormEvent<HTMLFormElement>,
    commentId: string,
  ) => {
    event.preventDefault();

    const trimmedContent =
      editingCommentText.trim();

    if (!trimmedContent) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }

    try {
      setIsSavingCommentEdit(true);

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
        .from("comments")
        .update({
          content: trimmedContent,
        })
        .eq("id", commentId)
        .eq("author_id", user.id);

      if (error) {
        throw error;
      }

      setComments((previous) =>
        previous.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                content: trimmedContent,
              }
            : comment,
        ),
      );

      cancelEditForm();
    } catch (error) {
      console.error(
        "댓글 수정 실패:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "댓글을 수정하지 못했습니다.",
      );
    } finally {
      setIsSavingCommentEdit(false);
    }
  };

  const handleCommentDelete = async (
    comment: CommentItem,
  ) => {
    const replies =
      repliesByParent.get(comment.id) ?? [];

    if (
      comment.parent_comment_id === null &&
      replies.length > 0
    ) {
      alert(
        "답글이 달린 댓글은 삭제할 수 없습니다. 댓글 내용을 수정해주세요.",
      );
      return;
    }

    const confirmed = window.confirm(
      "이 댓글을 삭제하시겠습니까?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingCommentId(comment.id);

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
        .from("comments")
        .delete()
        .eq("id", comment.id)
        .eq("author_id", user.id);

      if (error) {
        throw error;
      }

      setComments((previous) =>
        previous.filter(
          (item) => item.id !== comment.id,
        ),
      );

      if (editingCommentId === comment.id) {
        cancelEditForm();
      }

      if (replyingToId === comment.id) {
        setReplyingToId(null);
        setReplyText("");
      }
    } catch (error) {
      console.error(
        "댓글 삭제 실패:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "댓글을 삭제하지 못했습니다.",
      );
    } finally {
      setDeletingCommentId(null);
    }
  };

  const openReplyForm = (
    commentId: string,
  ) => {
    setReplyingToId((previous) =>
      previous === commentId
        ? null
        : commentId,
    );

    setReplyText("");
  };

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.stateBox}>
          게시글을 불러오는 중입니다.
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className={styles.page}>
        <div className={styles.notFound}>
          <strong>
            게시글을 불러오지 못했습니다.
          </strong>

          <p>{errorMessage}</p>

          <Link href="/">
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <div className={styles.breadcrumb}>
          <Link href="/">홈</Link>
          <span>/</span>

          <Link
            href={`/courses/${post.course_offering_id}`}
          >
            {post.subjectName}
          </Link>

          <span>/</span>
          <span>{post.title}</span>
        </div>

        <header
          className={styles.articleHeader}
        >
          <div className={styles.titleArea}>
            <h1>{post.title}</h1>

            <div
              className={
                styles.postInformation
              }
            >
              <span
                className={`${styles.typeBadge} ${
                  styles[
                    `type_${post.post_type}`
                  ]
                }`}
              >
                {
                  TYPE_LABELS[
                    post.post_type
                  ]
                }
              </span>

              <span>{post.authorName}</span>
              <span>·</span>

              <span>
                {formatRelativeDate(
                  post.created_at,
                )}
              </span>

              <span>·</span>

              <Link
                href={`/courses/${post.course_offering_id}`}
              >
                {post.subjectName}
              </Link>
            </div>
          </div>

          <div className={styles.headerButtons}>
            {currentUserId === post.author_id && (
              <Link
                href={`/posts/${post.id}/edit`}
                className={styles.editButton}
              >
                글 수정
              </Link>
            )}

            <button
              type="button"
              className={
                isBookmarked
                  ? styles.activeBookmarkButton
                  : styles.bookmarkButton
              }
              onClick={() =>
                void handleBookmarkToggle()
              }
              disabled={isSavingBookmark}
              aria-pressed={isBookmarked}
            >
              {isSavingBookmark
                ? "처리 중..."
                : isBookmarked
                  ? "★ 북마크됨"
                  : "☆ 북마크"}
            </button>
          </div>
        </header>

        <section className={styles.postBody}>
          {post.content ? (
            <div
              className={styles.richTextContent}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  post.content,
                  {
                    USE_PROFILES: {
                      html: true,
                    },
                  },
                ),
              }}
            />
          ) : (
            <p className={styles.emptyContent}>
              작성된 본문이 없습니다.
            </p>
          )}
        </section>

        {attachments.length > 0 && (
          <section
            className={styles.attachments}
          >
            <h2>첨부파일</h2>

            <ul>
              {attachments.map(
                (attachment) => (
                  <li key={attachment.id}>
                    <div
                      className={
                        styles.fileInformation
                      }
                    >
                      <span
                        className={
                          styles.fileIcon
                        }
                      >
                        PDF
                      </span>

                      <div>
                        <strong>
                          {
                            attachment.original_name
                          }
                        </strong>

                        <span>
                          {formatFileSize(
                            attachment.size_bytes,
                          )}
                        </span>
                      </div>
                    </div>

                    {attachment.signedUrl ? (
                      <a
                        href={
                          attachment.signedUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className={
                          styles.fileOpenButton
                        }
                      >
                        파일 열기
                        <span aria-hidden="true">
                          ↗
                        </span>
                      </a>
                    ) : (
                      <span
                        className={
                          styles.unavailableFile
                        }
                      >
                        열 수 없음
                      </span>
                    )}
                  </li>
                ),
              )}
            </ul>
          </section>
        )}

        <section
          className={styles.commentsSection}
        >
          <h2>댓글 {commentCount}</h2>

          {rootComments.length > 0 ? (
            <ul
              className={styles.commentList}
            >
              {rootComments.map(
                (comment) => {
                  const replies =
                    repliesByParent.get(
                      comment.id,
                    ) ?? [];

                  return (
                    <li
                      key={comment.id}
                      className={
                        styles.commentThread
                      }
                    >
                      <div
                        className={
                          styles.commentRow
                        }
                      >
                        <div
                          className={
                            styles.commentAvatar
                          }
                        >
                          {comment.authorName.slice(
                            0,
                            1,
                          )}
                        </div>

                        <div
                          className={
                            styles.commentContent
                          }
                        >
                          <div
                            className={
                              styles.commentMeta
                            }
                          >
                            <strong>
                              {
                                comment.authorName
                              }
                            </strong>

                            <span>
                              {formatRelativeDate(
                                comment.created_at,
                              )}
                            </span>
                          </div>

                          {editingCommentId ===
                          comment.id ? (
                            <form
                              className={
                                styles.commentEditForm
                              }
                              onSubmit={(event) =>
                                handleCommentEditSubmit(
                                  event,
                                  comment.id,
                                )
                              }
                            >
                              <textarea
                                value={
                                  editingCommentText
                                }
                                onChange={(event) =>
                                  setEditingCommentText(
                                    event.target.value,
                                  )
                                }
                                maxLength={1000}
                                autoFocus
                              />

                              <div
                                className={
                                  styles.commentEditActions
                                }
                              >
                                <button
                                  type="button"
                                  className={
                                    styles.commentCancelButton
                                  }
                                  onClick={
                                    cancelEditForm
                                  }
                                >
                                  취소
                                </button>

                                <button
                                  type="submit"
                                  className={
                                    styles.commentSaveButton
                                  }
                                  disabled={
                                    !editingCommentText.trim() ||
                                    isSavingCommentEdit
                                  }
                                >
                                  {isSavingCommentEdit
                                    ? "저장 중..."
                                    : "수정 완료"}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <p>
                              {comment.content}
                            </p>
                          )}

                          {editingCommentId !==
                            comment.id && (
                            <div
                              className={
                                styles.commentActions
                              }
                            >
                              <button
                                type="button"
                                className={
                                  styles.replyToggle
                                }
                                onClick={() =>
                                  openReplyForm(
                                    comment.id,
                                  )
                                }
                              >
                                답글
                                {replies.length >
                                  0 &&
                                  ` ${replies.length}`}
                              </button>

                              {currentUserId ===
                                comment.author_id && (
                                <>
                                  <button
                                    type="button"
                                    className={
                                      styles.commentActionButton
                                    }
                                    onClick={() =>
                                      openEditForm(
                                        comment,
                                      )
                                    }
                                  >
                                    수정
                                  </button>

                                  <button
                                    type="button"
                                    className={
                                      styles.commentDeleteButton
                                    }
                                    onClick={() =>
                                      handleCommentDelete(
                                        comment,
                                      )
                                    }
                                    disabled={
                                      deletingCommentId ===
                                      comment.id
                                    }
                                  >
                                    {deletingCommentId ===
                                    comment.id
                                      ? "삭제 중..."
                                      : "삭제"}
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {replyingToId ===
                            comment.id && (
                            <form
                              className={
                                styles.replyForm
                              }
                              onSubmit={(
                                event,
                              ) =>
                                handleReplySubmit(
                                  event,
                                  comment.id,
                                )
                              }
                            >
                              <textarea
                                value={
                                  replyText
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setReplyText(
                                    event.target
                                      .value,
                                  )
                                }
                                placeholder={`${comment.authorName}님에게 답글 남기기`}
                                aria-label="답글 입력"
                                maxLength={
                                  1000
                                }
                                autoFocus
                              />

                              <div
                                className={
                                  styles.replyActions
                                }
                              >
                                <button
                                  type="button"
                                  className={
                                    styles.cancelReplyButton
                                  }
                                  onClick={() => {
                                    setReplyingToId(
                                      null,
                                    );
                                    setReplyText(
                                      "",
                                    );
                                  }}
                                >
                                  취소
                                </button>

                                <button
                                  type="submit"
                                  className={
                                    styles.submitReplyButton
                                  }
                                  disabled={
                                    !replyText.trim() ||
                                    isSubmittingReply
                                  }
                                >
                                  {isSubmittingReply
                                    ? "등록 중..."
                                    : "답글 등록"}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>

                      {replies.length >
                        0 && (
                        <ul
                          className={
                            styles.replyList
                          }
                        >
                          {replies.map(
                            (reply) => (
                              <li
                                key={
                                  reply.id
                                }
                              >
                                <span
                                  className={
                                    styles.replyLine
                                  }
                                  aria-hidden="true"
                                >
                                  ↳
                                </span>

                                <div
                                  className={
                                    styles.replyAvatar
                                  }
                                >
                                  {reply.authorName.slice(
                                    0,
                                    1,
                                  )}
                                </div>

                                <div
                                  className={
                                    styles.commentContent
                                  }
                                >
                                  <div
                                    className={
                                      styles.commentMeta
                                    }
                                  >
                                    <strong>
                                      {
                                        reply.authorName
                                      }
                                    </strong>

                                    <span>
                                      {formatRelativeDate(
                                        reply.created_at,
                                      )}
                                    </span>
                                  </div>

                                  {editingCommentId ===
                                  reply.id ? (
                                    <form
                                      className={
                                        styles.commentEditForm
                                      }
                                      onSubmit={(event) =>
                                        handleCommentEditSubmit(
                                          event,
                                          reply.id,
                                        )
                                      }
                                    >
                                      <textarea
                                        value={
                                          editingCommentText
                                        }
                                        onChange={(event) =>
                                          setEditingCommentText(
                                            event.target.value,
                                          )
                                        }
                                        maxLength={1000}
                                        autoFocus
                                      />

                                      <div
                                        className={
                                          styles.commentEditActions
                                        }
                                      >
                                        <button
                                          type="button"
                                          className={
                                            styles.commentCancelButton
                                          }
                                          onClick={
                                            cancelEditForm
                                          }
                                        >
                                          취소
                                        </button>

                                        <button
                                          type="submit"
                                          className={
                                            styles.commentSaveButton
                                          }
                                          disabled={
                                            !editingCommentText.trim() ||
                                            isSavingCommentEdit
                                          }
                                        >
                                          {isSavingCommentEdit
                                            ? "저장 중..."
                                            : "수정 완료"}
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <>
                                      <p>
                                        {
                                          reply.content
                                        }
                                      </p>

                                      {currentUserId ===
                                        reply.author_id && (
                                        <div
                                          className={
                                            styles.commentActions
                                          }
                                        >
                                          <button
                                            type="button"
                                            className={
                                              styles.commentActionButton
                                            }
                                            onClick={() =>
                                              openEditForm(
                                                reply,
                                              )
                                            }
                                          >
                                            수정
                                          </button>

                                          <button
                                            type="button"
                                            className={
                                              styles.commentDeleteButton
                                            }
                                            onClick={() =>
                                              handleCommentDelete(
                                                reply,
                                              )
                                            }
                                            disabled={
                                              deletingCommentId ===
                                              reply.id
                                            }
                                          >
                                            {deletingCommentId ===
                                            reply.id
                                              ? "삭제 중..."
                                              : "삭제"}
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </li>
                            ),
                          )}
                        </ul>
                      )}
                    </li>
                  );
                },
              )}
            </ul>
          ) : (
            <p
              className={styles.emptyComments}
            >
              아직 댓글이 없습니다. 첫 댓글을
              남겨보세요.
            </p>
          )}

          <form
            className={styles.commentForm}
            onSubmit={handleCommentSubmit}
          >
            <div className={styles.myAvatar}>
              나
            </div>

            <div
              className={styles.commentComposer}
            >
              <textarea
                value={commentText}
                onChange={(event) =>
                  setCommentText(
                    event.target.value,
                  )
                }
                placeholder="댓글을 남겨보세요..."
                aria-label="댓글 입력"
                maxLength={1000}
              />

              <div
                className={
                  styles.commentFormFooter
                }
              >
                <span>
                  {commentText.length}/1000
                </span>

                <button
                  type="submit"
                  disabled={
                    !commentText.trim() ||
                    isSubmittingComment
                  }
                >
                  {isSubmittingComment
                    ? "등록 중..."
                    : "댓글 등록"}
                </button>
              </div>
            </div>
          </form>
        </section>
      </article>
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

function formatFileSize(
  size: number | null,
) {
  if (!size) {
    return "크기 정보 없음";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(
      1,
    )} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}