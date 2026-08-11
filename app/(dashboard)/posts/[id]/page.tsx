"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import editorStyles from "@/components/editor/RichTextEditor.module.css";
import TagChip, { TagType } from "@/components/common/TagChip";
import { supabase } from "@/lib/supabase";

const LIKES_ENABLED = true;

const REPORT_REASONS = [
  { code: "inappropriate", label: "부적절한 콘텐츠" },
  { code: "abuse", label: "욕설·괴롭힘" },
  { code: "spam", label: "중복·도배 게시글" },
  { code: "copyright", label: "저작권 침해" },
  { code: "incorrect", label: "허위·잘못된 자료" },
  { code: "other", label: "기타" },
] as const;

type DocInfo = {
  id: string;
  title: string;
  tag: TagType;
  authorId: string;
  author: string;
  timeAgo: string;
  content: string;
  courseOfferingId: string;
  price: number;
  isPublished: boolean;
  aiSummary: string | null;
};

type CourseInfo = {
  id: string;
  name: string;
  professor: string;
  semester: string;
};

type AttachmentItem = {
  id: string;
  originalName: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number;
};

type CommentItem = {
  id: string;
  authorId: string;
  parentCommentId: string | null;
  hasReplies: boolean;
  author: string;
  initial: string;
  avatarUrl: string | null;
  anon: boolean;
  time: string;
  text: string;
  isEdited: boolean;
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

type PostRow = {
  id: string;
  author_id: string;
  title: string;
  post_type: TagType;
  content: string | null;
  created_at: string;
  course_offering_id: string;
  price: number;
  is_published: boolean;
  is_admin_hidden: boolean;
  ai_summary: string | null;
  profiles:
  | { nickname: string | null; is_deleted: boolean | null }
  | { nickname: string | null; is_deleted: boolean | null }[]
  | null;
  course_offerings:
  | CourseRelation
  | CourseRelation[]
  | null;
};

type CommentRow = {
  id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string | null;
  is_anonymous: boolean | null;
  profiles:
  | {
    nickname: string | null;
    avatar_url: string | null;
    is_deleted: boolean | null;
  }
  | {
    nickname: string | null;
    avatar_url: string | null;
    is_deleted: boolean | null;
  }[]
  | null;
};


type AttachmentRow = {
  id: string;
  original_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
};


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

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function getFileExtension(fileName: string) {
  return (
    fileName
      .split(".")
      .pop()
      ?.toLowerCase() ?? "file"
  );
}


export default function DocumentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const docId = params.id;

  const [comment, setComment] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [bookmarked, setBookmarked] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [editingCommentId, setEditingCommentId] =
    useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] =
    useState("")
  const [replyingToId, setReplyingToId] =
    useState<string | null>(null)
  const [replyText, setReplyText] =
    useState("")
  const [replyAnonymous, setReplyAnonymous] =
    useState(false)
  const [isSubmittingReply, setIsSubmittingReply] =
    useState(false)
  const [isDeletingPost, setIsDeletingPost] =
    useState(false)
  const [attachments, setAttachments] =
    useState<AttachmentItem[]>([])
  const [walletBalance, setWalletBalance] =
    useState(0)
  const [hasPurchased, setHasPurchased] =
    useState(false)
  const [purchaseCount, setPurchaseCount] =
    useState(0)
  const [isPurchasing, setIsPurchasing] =
    useState(false)
  const [
    downloadingAttachmentId,
    setDownloadingAttachmentId,
  ] = useState<string | null>(null)

  const [doc, setDoc] = useState<DocInfo | null>(null);
  const [subject, setSubject] = useState<CourseInfo | null>(null);
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportToast, setReportToast] = useState("");

  const [aiSummary, setAiSummary] =
    useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] =
    useState(false);
  const [aiSummaryError, setAiSummaryError] =
    useState("");
  const [isAiSummaryOpen, setIsAiSummaryOpen] =
    useState(false);

  useEffect(() => {
    const loadDocument = async () => {
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

        setUserId(session.user.id);

        const { data: postData, error: postError } =
          await supabase
            .from("posts")
            .select(`
              id,
              author_id,
              title,
              post_type,
              content,
              created_at,
              course_offering_id,
              price,
              is_published,
              is_admin_hidden,
              ai_summary,
              profiles:profiles!posts_author_id_fkey (
                nickname,
                is_deleted
              ),
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
            .eq("id", docId)
            .eq("is_admin_hidden", false)
            .single();

        if (postError) {
          throw postError;
        }

        const row = postData as unknown as PostRow;

        const profile = pickOne(row.profiles);
        const course = pickOne(row.course_offerings);
        const courseSubject = course
          ? pickOne(course.subjects)
          : null;
        const courseProfessor = course
          ? pickOne(course.professors)
          : null;
        const courseSemester = course
          ? pickOne(course.semesters)
          : null;

        setDoc({
          id: row.id,
          title: row.title,
          tag: row.post_type,
          authorId: row.author_id,
          author: profile?.is_deleted
            ? "탈퇴한 사용자"
            : profile?.nickname ?? "익명",
          timeAgo: formatRelativeDate(row.created_at),
          content: row.content ?? "",
          courseOfferingId: row.course_offering_id,
          price: 1,
          isPublished: row.is_published,
          aiSummary: row.ai_summary ?? null,
        });

        setAiSummary(row.ai_summary ?? null);
        setIsAiSummaryOpen(false);

        setSubject({
          id: course?.id ?? row.course_offering_id,
          name: courseSubject?.name ?? "과목명 없음",
          professor: courseProfessor?.name ?? "교수 미정",
          semester: courseSemester
            ? `${courseSemester.year}-${courseSemester.term}`
            : "",
        });

        /* 구매 여부와 포인트 */
        const [
          walletResult,
          purchaseResult,
          purchaseCountResult,
        ] = await Promise.all([
          supabase
            .from("point_wallets")
            .select("balance")
            .eq(
              "user_id",
              session.user.id,
            )
            .maybeSingle(),

          supabase
            .from("post_purchases")
            .select("id")
            .eq("post_id", docId)
            .eq(
              "buyer_id",
              session.user.id,
            )
            .maybeSingle(),

          supabase
            .from("post_purchases")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("post_id", docId),
        ]);

        if (walletResult.error) {
          console.error(
            "포인트 조회 실패:",
            walletResult.error,
          );
        } else {
          setWalletBalance(
            walletResult.data?.balance ??
            0,
          );
        }

        if (purchaseResult.error) {
          console.error(
            "구매 여부 조회 실패:",
            purchaseResult.error,
          );
        } else {
          setHasPurchased(
            Boolean(
              purchaseResult.data,
            ),
          );
        }

        if (purchaseCountResult.error) {
          console.error(
            "구매 수 조회 실패:",
            purchaseCountResult.error,
          );
        } else {
          setPurchaseCount(
            purchaseCountResult.count ?? 0,
          );
        }

        /* 첨부파일 */
        const {
          data: attachmentData,
          error: attachmentError,
        } = await supabase
          .from("post_attachments")
          .select(`
            id,
            original_name,
            storage_path,
            mime_type,
            size_bytes
          `)
          .eq("post_id", docId)
          .order("display_order", {
            ascending: true,
          });

        if (attachmentError) {
          console.error(
            "첨부파일 조회 실패:",
            attachmentError,
          );
        } else {
          const attachmentRows =
            (attachmentData ??
              []) as AttachmentRow[];

          setAttachments(
            attachmentRows.map(
              (attachment) => ({
                id: attachment.id,
                originalName:
                  attachment.original_name,
                storagePath:
                  attachment.storage_path,
                mimeType:
                  attachment.mime_type,
                sizeBytes:
                  attachment.size_bytes ?? 0,
              }),
            ),
          );
        }

        /* 댓글 */
        const { data: commentData, error: commentError } =
          await supabase
            .from("comments")
            .select(`
              id,
              author_id,
              parent_comment_id,
              content,
              created_at,
              updated_at,
              is_anonymous,
              profiles:profiles!comments_author_id_fkey (
                nickname,
                avatar_url,
                is_deleted
              )
            `)
            .eq("post_id", docId)
            .order("created_at", { ascending: true });

        if (commentError) {
          console.error("댓글 조회 실패:", commentError);
        } else {
          const commentRows =
            (commentData ?? []) as unknown as CommentRow[];

          const repliedParentIds = new Set(
            commentRows
              .map((row) => row.parent_comment_id)
              .filter(
                (
                  parentId,
                ): parentId is string =>
                  Boolean(parentId),
              ),
          );

          setComments(
            commentRows.map((c): CommentItem => {
              const anon = c.is_anonymous ?? false;
              const commentProfile = pickOne(c.profiles);
              const nickname =
                commentProfile?.is_deleted
                  ? "탈퇴한 사용자"
                  : commentProfile?.nickname ?? "익명";
              const author = anon ? "익명" : nickname;

              const createdAt =
                new Date(c.created_at).getTime();

              const updatedAt = c.updated_at
                ? new Date(c.updated_at).getTime()
                : createdAt;

              return {
                id: c.id,
                authorId: c.author_id,
                parentCommentId:
                  c.parent_comment_id,
                hasReplies:
                  repliedParentIds.has(c.id),
                author,
                initial: author.slice(0, 1),
                avatarUrl:
                  anon
                    ? null
                    : pickOne(c.profiles)
                      ?.avatar_url ?? null,
                anon,
                time: formatRelativeDate(c.created_at),
                text: c.content,
                isEdited:
                  updatedAt - createdAt > 1000,
              };
            }),
          );
        }

        /* 좋아요 */
        if (LIKES_ENABLED) {
          const { data: likeData, error: likeError } =
            await supabase
              .from("post_likes")
              .select("user_id")
              .eq("post_id", docId);

          if (likeError) {
            console.error("좋아요 조회 실패:", likeError);
          } else {
            const rows =
              (likeData ?? []) as { user_id: string }[];

            setLikeCount(rows.length);
            setLiked(
              rows.some((r) => r.user_id === session.user.id),
            );
          }
        }

        /* 북마크 */
        const { data: bookmarkData, error: bookmarkError } =
          await supabase
            .from("bookmarks")
            .select("id")
            .eq("post_id", docId)
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (bookmarkError) {
          console.error("북마크 조회 실패:", bookmarkError);
        } else {
          setBookmarked(Boolean(bookmarkData));
        }
      } catch (error) {
        console.error("노트 상세 조회 실패:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "노트를 불러오지 못했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (docId) {
      void loadDocument();
    }
  }, [docId, router]);

  const addComment = async () => {
    if (!comment.trim() || !userId) return

    const text = comment;
    setComment('')

    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: docId,
        author_id: userId,
        content: text,
        is_anonymous: anonymous,
      })
      .select(`
        id,
        author_id,
        parent_comment_id,
        content,
        created_at,
        updated_at,
        is_anonymous,
        profiles:profiles!comments_author_id_fkey (
          nickname,
          avatar_url,
          is_deleted
        )
      `)
      .single();

    if (error) {
      console.error("댓글 등록 실패:", error);
      setComment(text);
      return;
    }

    const c = data as unknown as CommentRow;
    const anon = c.is_anonymous ?? false;
    const commentProfile = pickOne(c.profiles);
    const nickname =
      commentProfile?.is_deleted
        ? "탈퇴한 사용자"
        : commentProfile?.nickname ?? "익명";
    const author = anon ? "익명" : nickname;

    setComments(prev => [...prev, {
      id: c.id,
      authorId: c.author_id,
      parentCommentId:
        c.parent_comment_id,
      hasReplies: false,
      author,
      initial: author.slice(0, 1),
      avatarUrl:
        anon
          ? null
          : pickOne(c.profiles)
            ?.avatar_url ?? null,
      anon,
      time: formatRelativeDate(c.created_at),
      text: c.content,
      isEdited: false,
    }]);
  }

  const submitReport = async () => {
    if (!doc || !reportReason || isSubmittingReport) {
      return;
    }

    if (
      reportReason === "other" &&
      !reportDescription.trim()
    ) {
      return;
    }

    try {
      setIsSubmittingReport(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("로그인이 필요합니다.");
      }

      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          postId: doc.id,
          reason: reportReason,
          description:
            reportDescription.trim(),
        }),
      });

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
          "신고를 접수하지 못했습니다.",
        );
      }

      setShowReportModal(false);
      setReportReason("");
      setReportDescription("");
      setReportToast(
        "신고가 접수되었습니다.",
      );

      window.setTimeout(() => {
        setReportToast("");
      }, 3000);
    } catch (error) {
      setReportToast(
        error instanceof Error
          ? error.message
          : "신고를 접수하지 못했습니다.",
      );

      window.setTimeout(() => {
        setReportToast("");
      }, 3000);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const purchasePost = async () => {
    if (
      !doc ||
      !doc.isPublished ||
      doc.authorId === userId ||
      hasPurchased ||
      isPurchasing
    ) {
      return;
    }

    const confirmed = window.confirm(
      "1포인트를 사용해 이 글을 구매할까요?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsPurchasing(true);

      const {
        data,
        error,
      } = await supabase.rpc(
        "purchase_post",
        {
          target_post_id:
            doc.id,
        },
      );

      if (error) {
        throw error;
      }

      const result = Array.isArray(data)
        ? data[0]
        : data;

      setHasPurchased(true);
      setPurchaseCount((previous) => previous + 1);
      setWalletBalance(
        result?.buyer_balance ??
        Math.max(
          0,
          walletBalance - 1,
        ),
      );

      alert(
        "구매가 완료되었습니다.",
      );
    } catch (error) {
      console.error(
        "게시글 구매 실패:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "게시글을 구매하지 못했습니다.",
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const pdfAttachmentCount =
    attachments.filter(
      (attachment) =>
        attachment.mimeType === "application/pdf" ||
        attachment.originalName
          .toLowerCase()
          .endsWith(".pdf"),
    ).length;

  const hasMoreThanFivePdfs =
    pdfAttachmentCount > 5;

  const generateAiSummary = async () => {
    if (
      !doc ||
      isGeneratingSummary
    ) {
      return;
    }

    try {
      setIsGeneratingSummary(true);
      setAiSummaryError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("로그인이 필요합니다.");
      }

      const response = await fetch(
        `/api/posts/${doc.id}/summary`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
          "AI 요약을 생성하지 못했습니다.",
        );
      }

      setAiSummary(result.summary ?? null);
      setIsAiSummaryOpen(true);

      setDoc((previous) =>
        previous
          ? {
            ...previous,
            aiSummary:
              result.summary ?? null,
          }
          : previous,
      );
    } catch (error) {
      console.error(
        "AI 요약 요청 실패:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "AI 요약을 생성하지 못했습니다.";

      setAiSummaryError(
        message.includes("요약할 내용이 부족")
          ? message
          : "AI 요약을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const downloadAttachment = async (
    attachment: AttachmentItem,
  ) => {
    if (downloadingAttachmentId) {
      return;
    }

    try {
      setDownloadingAttachmentId(
        attachment.id,
      );

      const {
        data,
        error,
      } = await supabase.storage
        .from("post-files")
        .createSignedUrl(
          attachment.storagePath,
          60,
          {
            download:
              attachment.originalName,
          },
        );

      if (error) {
        throw error;
      }

      const link =
        document.createElement("a");

      link.href = data.signedUrl;
      link.download =
        attachment.originalName;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(
        "첨부파일 다운로드 실패:",
        error,
      );

      alert(
        error instanceof Error
          ? `파일을 다운로드하지 못했습니다.\n${error.message}`
          : "파일을 다운로드하지 못했습니다.",
      );
    } finally {
      setDownloadingAttachmentId(
        null,
      );
    }
  };

  const startReply = (
    targetComment: CommentItem,
  ) => {
    /*
     * 답글의 답글을 눌러도 최상위 댓글 아래에 달리도록
     * 부모 댓글 id를 사용합니다.
     */
    setReplyingToId(
      targetComment.parentCommentId ??
      targetComment.id,
    );
    setReplyText("");
    setReplyAnonymous(false);
  };

  const cancelReply = () => {
    setReplyingToId(null);
    setReplyText("");
    setReplyAnonymous(false);
  };

  const addReply = async (
    parentCommentId: string,
  ) => {
    const content = replyText.trim();

    if (
      !content ||
      !userId ||
      isSubmittingReply
    ) {
      return;
    }

    try {
      setIsSubmittingReply(true);

      const {
        data,
        error,
      } = await supabase
        .from("comments")
        .insert({
          post_id: docId,
          author_id: userId,
          parent_comment_id:
            parentCommentId,
          content,
          is_anonymous:
            replyAnonymous,
        })
        .select(`
          id,
          author_id,
          parent_comment_id,
          content,
          created_at,
          updated_at,
          is_anonymous,
          profiles:profiles!comments_author_id_fkey (
            nickname,
            avatar_url,
            is_deleted
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      const c =
        data as unknown as CommentRow;

      const anon =
        c.is_anonymous ?? false;

      const profile =
        pickOne(c.profiles);

      const nickname =
        profile?.is_deleted
          ? "탈퇴한 사용자"
          : profile?.nickname ?? "익명";

      const author =
        anon ? "익명" : nickname;

      const nextReply: CommentItem = {
        id: c.id,
        authorId: c.author_id,
        parentCommentId:
          c.parent_comment_id,
        hasReplies: false,
        author,
        initial:
          author.slice(0, 1),
        avatarUrl:
          anon
            ? null
            : profile?.avatar_url ??
            null,
        anon,
        time: formatRelativeDate(
          c.created_at,
        ),
        text: c.content,
        isEdited: false,
      };

      setComments((previous) => {
        const nextComments =
          previous.map((item) =>
            item.id ===
              parentCommentId
              ? {
                ...item,
                hasReplies: true,
              }
              : item,
          );

        const parentIndex =
          nextComments.findIndex(
            (item) =>
              item.id ===
              parentCommentId,
          );

        if (parentIndex < 0) {
          return [
            ...nextComments,
            nextReply,
          ];
        }

        let insertIndex =
          parentIndex + 1;

        while (
          insertIndex <
          nextComments.length &&
          nextComments[insertIndex]
            .parentCommentId ===
          parentCommentId
        ) {
          insertIndex += 1;
        }

        return [
          ...nextComments.slice(
            0,
            insertIndex,
          ),
          nextReply,
          ...nextComments.slice(
            insertIndex,
          ),
        ];
      });

      cancelReply();
    } catch (error) {
      console.error(
        "답글 등록 실패:",
        error,
      );

      alert(
        error instanceof Error
          ? `답글을 등록하지 못했습니다.\n${error.message}`
          : "답글을 등록하지 못했습니다.",
      );
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const editPost = () => {
    if (!doc || doc.authorId !== userId) {
      return;
    }

    router.push(`/posts/${docId}/edit`);
  };

  const deletePost = async () => {
    if (
      !doc ||
      doc.authorId !== userId ||
      isDeletingPost
    ) {
      return;
    }

    /*
     * 구매자가 한 명이라도 있으면 실제 삭제하지 않습니다.
     * 신규 노출/구매만 막고 기존 구매자는 계속 열람할 수 있게
     * is_published 만 false 로 바꿉니다.
     */
    if (purchaseCount > 0) {
      if (!doc.isPublished) {
        alert("이미 게시 중단된 글입니다.");
        return;
      }

      const confirmed = window.confirm(
        `이 글은 ${purchaseCount}명이 구매했어요.\n완전히 삭제할 수 없으며 게시 중단 처리됩니다.\n기존 구매자는 계속 열람할 수 있어요.\n\n게시 중단할까요?`,
      );

      if (!confirmed) {
        return;
      }

      try {
        setIsDeletingPost(true);

        const { error } = await supabase
          .from("posts")
          .update({
            is_published: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", docId)
          .eq("author_id", userId);

        if (error) {
          throw error;
        }

        setDoc((previous) =>
          previous
            ? {
              ...previous,
              isPublished: false,
            }
            : previous,
        );

        alert(
          "게시가 중단되었습니다. 기존 구매자는 계속 자료를 볼 수 있어요.",
        );
        router.replace(
          `/courses/${doc.courseOfferingId}`,
        );
        router.refresh();
      } catch (error) {
        console.error(
          "게시글 게시 중단 실패:",
          error,
        );

        alert(
          error instanceof Error
            ? `게시글을 게시 중단하지 못했습니다.\n${error.message}`
            : "게시글을 게시 중단하지 못했습니다.",
        );
      } finally {
        setIsDeletingPost(false);
      }

      return;
    }

    const confirmed = window.confirm(
      "아직 구매자가 없는 글입니다.\n게시글을 완전히 삭제할까요?\n삭제한 글은 되돌릴 수 없습니다.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeletingPost(true);

      const {
        data: attachmentRows,
        error: attachmentReadError,
      } = await supabase
        .from("post_attachments")
        .select("storage_path")
        .eq("post_id", docId);

      if (attachmentReadError) {
        throw attachmentReadError;
      }

      const storagePaths = (
        attachmentRows ?? []
      )
        .map(
          (row: { storage_path: string }) =>
            row.storage_path,
        )
        .filter(Boolean);

      const { error: deletePostError } =
        await supabase
          .from("posts")
          .delete()
          .eq("id", docId)
          .eq("author_id", userId);

      if (deletePostError) {
        throw deletePostError;
      }

      if (storagePaths.length > 0) {
        const { error: storageDeleteError } =
          await supabase.storage
            .from("post-files")
            .remove(storagePaths);

        if (storageDeleteError) {
          console.error(
            "게시글 첨부파일 삭제 실패:",
            storageDeleteError,
          );
        }
      }

      alert("게시글이 삭제되었습니다.");
      router.replace(
        `/courses/${doc.courseOfferingId}`,
      );
      router.refresh();
    } catch (error) {
      console.error("게시글 삭제 실패:", error);

      alert(
        error instanceof Error
          ? `게시글을 삭제하지 못했습니다.\n${error.message}`
          : "게시글을 삭제하지 못했습니다.",
      );
    } finally {
      setIsDeletingPost(false);
    }
  };

  const startEditingComment = (
    targetComment: CommentItem,
  ) => {
    if (targetComment.authorId !== userId) {
      return;
    }

    setEditingCommentId(targetComment.id);
    setEditingCommentText(targetComment.text);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditedComment = async (
    commentId: string,
  ) => {
    const nextContent =
      editingCommentText.trim();

    if (!nextContent || !userId) {
      return;
    }

    const { error } = await supabase
      .from("comments")
      .update({
        content: nextContent,
      })
      .eq("id", commentId)
      .eq("author_id", userId);

    if (error) {
      console.error("댓글 수정 실패:", error);
      alert("댓글을 수정하지 못했습니다.");
      return;
    }

    setComments((previous) =>
      previous.map((item) =>
        item.id === commentId
          ? {
            ...item,
            text: nextContent,
            isEdited: true,
          }
          : item,
      ),
    );

    cancelEditingComment();
  };

  const deleteComment = async (
    targetComment: CommentItem,
  ) => {
    if (
      targetComment.authorId !== userId
    ) {
      return;
    }

    if (targetComment.hasReplies) {
      alert(
        "답글이 달린 댓글은 삭제할 수 없습니다. 수정만 가능합니다.",
      );
      return;
    }

    const confirmed = window.confirm(
      "댓글을 삭제할까요?",
    );

    if (!confirmed) {
      return;
    }

    const {
      count: replyCount,
      error: replyCheckError,
    } = await supabase
      .from("comments")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "parent_comment_id",
        targetComment.id,
      );

    if (replyCheckError) {
      console.error(
        "댓글 답글 확인 실패:",
        replyCheckError,
      );
      alert("댓글 상태를 확인하지 못했습니다.");
      return;
    }

    if ((replyCount ?? 0) > 0) {
      setComments((previous) =>
        previous.map((item) =>
          item.id === targetComment.id
            ? {
              ...item,
              hasReplies: true,
            }
            : item,
        ),
      );

      alert(
        "답글이 달린 댓글은 삭제할 수 없습니다. 수정만 가능합니다.",
      );
      return;
    }

    const { error: deleteError } =
      await supabase
        .from("comments")
        .delete()
        .eq("id", targetComment.id)
        .eq("author_id", userId);

    if (deleteError) {
      console.error(
        "댓글 삭제 실패:",
        deleteError,
      );
      alert("댓글을 삭제하지 못했습니다.");
      return;
    }

    setComments((previous) =>
      previous.filter(
        (item) =>
          item.id !== targetComment.id,
      ),
    );

    if (
      editingCommentId ===
      targetComment.id
    ) {
      cancelEditingComment();
    }
  };

  const toggleLike = async () => {
    const nextLiked = !liked;

    setLikeCount(prev => nextLiked ? prev + 1 : prev - 1)
    setLiked(nextLiked)

    if (!LIKES_ENABLED || !userId) return;

    if (nextLiked) {
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: docId, user_id: userId });

      if (error) console.error("좋아요 등록 실패:", error);
    } else {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", docId)
        .eq("user_id", userId);

      if (error) console.error("좋아요 취소 실패:", error);
    }
  }

  const toggleBookmark = async () => {
    if (!userId) return;

    const nextBookmarked = !bookmarked;

    setBookmarked(nextBookmarked);

    if (nextBookmarked) {
      const { error } = await supabase
        .from("bookmarks")
        .insert({ post_id: docId, user_id: userId });

      if (error) {
        console.error("북마크 등록 실패:", error);
        setBookmarked(false);
      }
    } else {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("post_id", docId)
        .eq("user_id", userId);

      if (error) {
        console.error("북마크 해제 실패:", error);
        setBookmarked(true);
      }
    }
  }


  if (isLoading) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}>
        <div style={{ padding: '40px 26px', textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>
          불러오는 중이에요
        </div>
      </div>
    );
  }

  if (!doc || !subject) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}>
        <div style={{ padding: '40px 26px', textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>
          {errorMessage || '노트를 불러오지 못했습니다.'}
        </div>
      </div>
    );
  }

  const canAccessPaidContent =
    doc.authorId === userId ||
    hasPurchased;

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}>
      <div style={{ maxWidth: 660, margin: '0 auto', padding: '24px 26px 80px' }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: 'var(--cs-ink-faint)', marginBottom: 14 }}>
          <span style={{ cursor: 'pointer' }}
            onClick={() => router.push('/')}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--cs-ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--cs-ink-faint)')}
          >내 과목</span>
          {' / '}
          <span style={{ cursor: 'pointer' }}
            onClick={() => router.push(`/courses/${doc.courseOfferingId}`)}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--cs-ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--cs-ink-faint)')}
          >{subject.name}</span>
          {' / '}
          <span style={{ color: 'var(--cs-ink)' }}>노트</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.45, letterSpacing: '-0.02em', margin: '14px 0 0', color: 'var(--cs-ink)' }}>
          {doc.title}
        </h1>

        {/* Byline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 13, fontSize: 12.5, color: 'var(--cs-ink-faint)', paddingBottom: 20, borderBottom: '1px solid var(--cs-border)' }}>
          <TagChip tag={doc.tag} size="md" />
          <span>{doc.author} · {doc.timeAgo} · {subject.professor} 교수님 {subject.semester}학기</span>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            {doc.authorId === userId && (
              <>
                <button
                  type="button"
                  onClick={editPost}
                  style={{
                    fontSize: 12,
                    color:
                      "var(--cs-ink-soft)",
                    background:
                      "var(--cs-surface)",
                    border:
                      "1px solid var(--cs-border-str)",
                    padding: "5px 10px",
                    borderRadius:
                      "var(--cs-radius-md)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  수정
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void deletePost()
                  }
                  disabled={
                    isDeletingPost ||
                    (purchaseCount > 0 &&
                      !doc.isPublished)
                  }
                  style={{
                    fontSize: 12,
                    color:
                      "var(--cs-error)",
                    background:
                      "var(--cs-surface)",
                    border:
                      "1px solid var(--cs-border-str)",
                    padding: "5px 10px",
                    borderRadius:
                      "var(--cs-radius-md)",
                    cursor:
                      isDeletingPost ||
                        (purchaseCount > 0 &&
                          !doc.isPublished)
                        ? "not-allowed"
                        : "pointer",
                    fontFamily: "inherit",
                    opacity:
                      isDeletingPost ||
                        (purchaseCount > 0 &&
                          !doc.isPublished)
                        ? 0.6
                        : 1,
                  }}
                >
                  {isDeletingPost
                    ? purchaseCount > 0
                      ? "중단 중..."
                      : "삭제 중..."
                    : purchaseCount > 0
                      ? doc.isPublished
                        ? "게시 중단"
                        : "게시 중단됨"
                      : "삭제"}
                </button>
              </>
            )}

            {doc.authorId !== userId && (
              <button
                type="button"
                onClick={() => {
                  setReportReason("");
                  setReportDescription("");
                  setShowReportModal(true);
                }}
                style={{
                  fontSize: 12,
                  color: "var(--cs-error)",
                  background: "var(--cs-surface)",
                  border: "1px solid var(--cs-border-str)",
                  padding: "5px 10px",
                  borderRadius: "var(--cs-radius-md)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                신고
              </button>
            )}

            <button
              type="button"
              onClick={toggleBookmark}
              style={{
                fontSize: 12.5,
                color: bookmarked
                  ? "var(--cs-purple-dark)"
                  : "var(--cs-ink-soft)",
                background: bookmarked
                  ? "var(--cs-purple-bg)"
                  : "var(--cs-surface)",
                border: `1px solid ${bookmarked
                  ? "var(--cs-purple-border)"
                  : "var(--cs-border-str)"
                  }`,
                padding: "5px 11px",
                borderRadius:
                  "var(--cs-radius-md)",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              ★ 북마크
            </button>
          </div>
        </div>

        {/* Body */}
        {canAccessPaidContent ? (
          <div
            className={editorStyles.proseMirror}
            style={{
              marginTop: 24,
              minHeight: 0,
              padding: 0,
            }}
            dangerouslySetInnerHTML={{
              __html: doc.content,
            }}
          />
        ) : (
          <section
            style={{
              marginTop: 28,
              padding: "34px 24px",
              border:
                "1px solid var(--cs-border)",
              borderRadius: 12,
              background:
                "var(--cs-bg)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                marginBottom: 8,
                color:
                  "var(--cs-ink)",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {doc.isPublished
                ? "유료 자료입니다"
                : "게시 중단된 자료입니다"}
            </div>

            <p
              style={{
                margin:
                  "0 0 18px",
                color:
                  "var(--cs-ink-soft)",
                fontSize: 12.5,
                lineHeight: 1.7,
              }}
            >
              {doc.isPublished ? (
                <>
                  1포인트를 결제하면
                  본문과 첨부파일, 댓글을 볼 수
                  있어요.
                  <br />
                  현재 보유 포인트는{" "}
                  {walletBalance}P입니다.
                </>
              ) : (
                <>
                  작성자가 게시를 중단해
                  새로운 구매는 할 수 없어요.
                  <br />
                  기존 구매자는 계속 열람할 수 있습니다.
                </>
              )}
            </p>

            {doc.isPublished && (
              <button
                type="button"
                onClick={() =>
                  void purchasePost()
                }
                disabled={
                  isPurchasing ||
                  walletBalance < 1
                }
                style={{
                  border: 0,
                  borderRadius:
                    "var(--cs-radius-md)",
                  padding:
                    "9px 18px",
                  background:
                    "var(--cs-purple)",
                  color:
                    "var(--cs-surface)",
                  fontFamily:
                    "inherit",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor:
                    isPurchasing ||
                      walletBalance < 1
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    walletBalance < 1
                      ? 0.55
                      : 1,
                }}
              >
                {isPurchasing
                  ? "구매 중..."
                  : walletBalance < 1
                    ? "포인트가 부족해요"
                    : "1P로 구매하기"}
              </button>
            )}
          </section>
        )}

        {/* AI Summary */}
        {canAccessPaidContent && (
          <section
            style={{
              marginTop: 28,
              padding: 18,
              border:
                "1px solid var(--cs-purple-border)",
              borderRadius: 10,
              background:
                "var(--cs-purple-bg)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    color:
                      "var(--cs-purple-dark)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  ✨ AI 요약
                </div>

                {!isAiSummaryOpen && (
                  <div
                    style={{
                      marginTop: 4,
                      color:
                        "var(--cs-ink-soft)",
                      fontSize: 11.5,
                      lineHeight: 1.6,
                    }}
                  >
                    게시글 본문과 첨부된 PDF를 바탕으로
                    핵심 내용을 정리해드려요.
                  </div>
                )}
              </div>

              {aiSummary ? (
                <button
                  type="button"
                  onClick={() =>
                    setIsAiSummaryOpen(
                      (previous) => !previous,
                    )
                  }
                  style={{
                    flexShrink: 0,
                    border:
                      "1px solid var(--cs-purple-border)",
                    borderRadius:
                      "var(--cs-radius-md)",
                    padding: "7px 12px",
                    background:
                      "var(--cs-surface)",
                    color:
                      "var(--cs-purple-dark)",
                    fontFamily: "inherit",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {isAiSummaryOpen
                    ? "접기"
                    : "AI 요약 보기"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    void generateAiSummary()
                  }
                  disabled={isGeneratingSummary}
                  style={{
                    flexShrink: 0,
                    border: 0,
                    borderRadius:
                      "var(--cs-radius-md)",
                    padding: "7px 12px",
                    background:
                      "var(--cs-purple)",
                    color: "white",
                    fontFamily: "inherit",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor:
                      isGeneratingSummary
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      isGeneratingSummary
                        ? 0.55
                        : 1,
                  }}
                >
                  {isGeneratingSummary
                    ? "요약 중..."
                    : "AI 요약 생성"}
                </button>
              )}
            </div>

            {aiSummary && isAiSummaryOpen && (
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop:
                    "1px solid var(--cs-purple-border)",
                  color:
                    "var(--cs-ink-body)",
                  fontSize: 13,
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                }}
              >
                {aiSummary}
              </div>
            )}

            {aiSummaryError && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  border:
                    "1px solid var(--cs-border)",
                  borderRadius:
                    "var(--cs-radius-md)",
                  background:
                    "var(--cs-surface)",
                }}
              >
                <div
                  style={{
                    color:
                      "var(--cs-error)",
                    fontSize: 11.5,
                    lineHeight: 1.6,
                  }}
                >
                  {aiSummaryError}
                </div>

                {!aiSummaryError.includes(
                  "요약할 내용이 부족",
                ) && (
                    <button
                      type="button"
                      onClick={() =>
                        void generateAiSummary()
                      }
                      disabled={
                        isGeneratingSummary
                      }
                      style={{
                        marginTop: 9,
                        border:
                          "1px solid var(--cs-border-str)",
                        borderRadius:
                          "var(--cs-radius-md)",
                        padding: "6px 10px",
                        background:
                          "var(--cs-surface)",
                        color:
                          "var(--cs-ink)",
                        fontFamily:
                          "inherit",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor:
                          isGeneratingSummary
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      다시 시도
                    </button>
                  )}
              </div>
            )}

            {hasMoreThanFivePdfs && (
              <div
                style={{
                  marginTop: 10,
                  color:
                    "var(--cs-ink-faint)",
                  fontSize: 10.5,
                  lineHeight: 1.55,
                }}
              >
                첨부된 PDF가 많아 앞의 5개 파일을
                기준으로 요약합니다.
              </div>
            )}

            {(isAiSummaryOpen || !aiSummary) && (
              <div
                style={{
                  marginTop: 12,
                  color:
                    "var(--cs-ink-faint)",
                  fontSize: 10,
                  lineHeight: 1.55,
                }}
              >
                AI가 생성한 요약으로, 원본 자료와
                차이가 있을 수 있습니다.
              </div>
            )}
          </section>
        )}

        {/* Attachments */}
        {canAccessPaidContent &&
          attachments.length > 0 && (
            <section
              style={{
                marginTop: 30,
                padding: 18,
                border:
                  "1px solid #ded9ee",
                borderRadius: 10,
                background:
                  "var(--cs-surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: "0 0 4px",
                      color:
                        "var(--cs-ink)",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    첨부파일
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color:
                        "var(--cs-ink-faint)",
                      fontSize: 10.5,
                    }}
                  >
                    파일명을 눌러 다운로드할 수
                    있어요.
                  </p>
                </div>

                <span
                  style={{
                    color:
                      "var(--cs-ink-faint)",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {attachments.length}개
                </span>
              </div>

              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {attachments.map(
                  (attachment) => {
                    const isDownloading =
                      downloadingAttachmentId ===
                      attachment.id;

                    return (
                      <li
                        key={attachment.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          minHeight: 58,
                          padding:
                            "9px 11px",
                          border:
                            "1px solid #e5e1f0",
                          borderRadius: 8,
                          background:
                            "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "center",
                            gap: 10,
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              width: 38,
                              height: 38,
                              flexShrink: 0,
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              borderRadius: 7,
                              background:
                                "#f0edf8",
                              color:
                                "var(--cs-purple-dark)",
                              fontSize: 9,
                              fontWeight: 800,
                              textTransform:
                                "uppercase",
                            }}
                          >
                            {getFileExtension(
                              attachment.originalName,
                            )}
                          </span>

                          <span
                            style={{
                              display: "flex",
                              flexDirection:
                                "column",
                              gap: 4,
                              minWidth: 0,
                            }}
                          >
                            <strong
                              style={{
                                overflow:
                                  "hidden",
                                color:
                                  "var(--cs-ink)",
                                fontSize: 11.5,
                                fontWeight: 650,
                                textOverflow:
                                  "ellipsis",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {
                                attachment.originalName
                              }
                            </strong>

                            <small
                              style={{
                                color:
                                  "var(--cs-ink-faint)",
                                fontSize: 10,
                              }}
                            >
                              {formatFileSize(
                                attachment.sizeBytes,
                              )}
                            </small>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void downloadAttachment(
                              attachment,
                            )
                          }
                          disabled={
                            Boolean(
                              downloadingAttachmentId,
                            )
                          }
                          style={{
                            flexShrink: 0,
                            border:
                              "1px solid var(--cs-border-str)",
                            borderRadius:
                              "var(--cs-radius-md)",
                            background:
                              "var(--cs-surface)",
                            color:
                              "var(--cs-purple-dark)",
                            padding:
                              "6px 10px",
                            fontFamily:
                              "inherit",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor:
                              downloadingAttachmentId
                                ? "not-allowed"
                                : "pointer",
                            opacity:
                              downloadingAttachmentId &&
                                !isDownloading
                                ? 0.55
                                : 1,
                          }}
                        >
                          {isDownloading
                            ? "준비 중..."
                            : "다운로드"}
                        </button>
                      </li>
                    );
                  },
                )}
              </ul>
            </section>
          )}

        {/* Comments */}
        {canAccessPaidContent && (
          <div style={{ borderTop: '1px solid var(--cs-border)', marginTop: 32, paddingTop: 20 }}>
            {/* Like + Share above comment input */}
            <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
              <button
                onClick={toggleLike}
                style={{
                  fontSize: 12.5, color: liked ? 'var(--cs-purple-dark)' : 'var(--cs-ink-soft)',
                  background: liked ? 'var(--cs-purple-bg)' : 'var(--cs-surface)',
                  border: `1px solid ${liked ? 'var(--cs-purple-border)' : 'var(--cs-border-str)'}`,
                  padding: '6px 11px', borderRadius: 'var(--cs-radius-md)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                {liked ? '♥' : '♡'} 좋아요 {likeCount}
              </button>
              <button style={{
                fontSize: 12.5, color: 'var(--cs-ink-soft)',
                background: 'var(--cs-surface)', border: '1px solid var(--cs-border-str)',
                padding: '6px 11px', borderRadius: 'var(--cs-radius-md)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                공유
              </button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--cs-ink-soft)', fontWeight: 500, marginBottom: 16 }}>
              댓글 {comments.length}
            </div>

            {comments.map((c) => {
              const isMine =
                c.authorId === userId;
              const isEditing =
                editingCommentId === c.id;

              return (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 18,
                    marginLeft:
                      c.parentCommentId
                        ? 28
                        : 0,
                  }}
                >
                  {c.parentCommentId && (
                    <span
                      aria-hidden="true"
                      style={{
                        width: 14,
                        flexShrink: 0,
                        color:
                          "var(--cs-ink-faint)",
                        fontSize: 13,
                        lineHeight:
                          "28px",
                      }}
                    >
                      ↳
                    </span>
                  )}

                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius:
                        "var(--cs-radius-full)",
                      flexShrink: 0,
                      overflow: "hidden",
                      background: c.anon
                        ? "var(--cs-sunk)"
                        : "var(--cs-purple-bg)",
                      color: c.anon
                        ? "var(--cs-ink-faint)"
                        : "var(--cs-purple-dark)",
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                      fontWeight: 500,
                    }}
                  >
                    {!c.anon &&
                      c.avatarUrl ? (
                      <img
                        src={c.avatarUrl}
                        alt={`${c.author} 프로필`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      c.initial
                    )}
                  </div>

                  <div
                    style={{
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 500,
                          color:
                            "var(--cs-ink)",
                        }}
                      >
                        {c.author} ·{" "}
                        <span
                          style={{
                            fontWeight: 400,
                            color:
                              "var(--cs-ink-faint)",
                          }}
                        >
                          {c.time}
                          {c.isEdited && (
                            <>
                              {" · "}
                              수정됨
                            </>
                          )}
                        </span>
                      </div>

                      <div
                        style={{
                          marginLeft: "auto",
                          display: "flex",
                          gap: 6,
                        }}
                      >
                        {isMine &&
                          !isEditing && (
                            <button
                              type="button"
                              onClick={() =>
                                startEditingComment(
                                  c,
                                )
                              }
                              style={{
                                padding: 0,
                                border: 0,
                                background:
                                  "transparent",
                                color:
                                  "var(--cs-ink-faint)",
                                fontFamily:
                                  "inherit",
                                fontSize: 11,
                                cursor:
                                  "pointer",
                              }}
                            >
                              수정
                            </button>
                          )}

                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() =>
                              startReply(c)
                            }
                            style={{
                              padding: 0,
                              border: 0,
                              background:
                                "transparent",
                              color:
                                "var(--cs-purple-dark)",
                              fontFamily:
                                "inherit",
                              fontSize: 11,
                              cursor:
                                "pointer",
                            }}
                          >
                            답글
                          </button>
                        )}

                        {isMine &&
                          !isEditing &&
                          !c.hasReplies && (
                            <button
                              type="button"
                              onClick={() =>
                                void deleteComment(
                                  c,
                                )
                              }
                              style={{
                                padding: 0,
                                border: 0,
                                background:
                                  "transparent",
                                color:
                                  "var(--cs-error)",
                                fontFamily:
                                  "inherit",
                                fontSize: 11,
                                cursor:
                                  "pointer",
                              }}
                            >
                              삭제
                            </button>
                          )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div
                        style={{
                          marginTop: 7,
                        }}
                      >
                        <textarea
                          value={
                            editingCommentText
                          }
                          onChange={(event) =>
                            setEditingCommentText(
                              event.target
                                .value,
                            )
                          }
                          rows={3}
                          autoFocus
                          style={{
                            width: "100%",
                            resize:
                              "vertical",
                            boxSizing:
                              "border-box",
                            padding:
                              "9px 10px",
                            border:
                              "1px solid var(--cs-purple-border)",
                            borderRadius:
                              "var(--cs-radius-md)",
                            outline: "none",
                            background:
                              "var(--cs-surface)",
                            color:
                              "var(--cs-ink)",
                            fontFamily:
                              "inherit",
                            fontSize: 13,
                            lineHeight: 1.6,
                          }}
                        />

                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "flex-end",
                            gap: 6,
                            marginTop: 6,
                          }}
                        >
                          <button
                            type="button"
                            onClick={
                              cancelEditingComment
                            }
                            style={{
                              padding:
                                "5px 9px",
                              border:
                                "1px solid var(--cs-border-str)",
                              borderRadius:
                                "var(--cs-radius-md)",
                              background:
                                "var(--cs-surface)",
                              color:
                                "var(--cs-ink-soft)",
                              fontFamily:
                                "inherit",
                              fontSize: 11,
                              cursor:
                                "pointer",
                            }}
                          >
                            취소
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void saveEditedComment(
                                c.id,
                              )
                            }
                            disabled={
                              !editingCommentText.trim()
                            }
                            style={{
                              padding:
                                "5px 9px",
                              border: 0,
                              borderRadius:
                                "var(--cs-radius-md)",
                              background:
                                "var(--cs-purple)",
                              color:
                                "var(--cs-surface)",
                              fontFamily:
                                "inherit",
                              fontSize: 11,
                              cursor:
                                editingCommentText.trim()
                                  ? "pointer"
                                  : "not-allowed",
                              opacity:
                                editingCommentText.trim()
                                  ? 1
                                  : 0.55,
                            }}
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: 14,
                          lineHeight: 1.7,
                          marginTop: 4,
                          color:
                            "var(--cs-ink-body)",
                          whiteSpace:
                            "pre-wrap",
                        }}
                      >
                        {c.text}
                      </div>
                    )}

                    {replyingToId === c.id && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: 10,
                          border:
                            "1px solid var(--cs-purple-border)",
                          borderRadius:
                            "var(--cs-radius-md)",
                          background:
                            "var(--cs-purple-bg)",
                        }}
                      >
                        <div
                          style={{
                            marginBottom: 7,
                            color:
                              "var(--cs-purple-dark)",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {c.author}님에게 답글
                        </div>

                        <textarea
                          value={replyText}
                          onChange={(event) =>
                            setReplyText(
                              event.target.value,
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key ===
                              "Enter" &&
                              (event.ctrlKey ||
                                event.metaKey)
                            ) {
                              event.preventDefault();
                              void addReply(c.id);
                            }
                          }}
                          rows={3}
                          autoFocus
                          placeholder="답글을 입력하세요..."
                          disabled={
                            isSubmittingReply
                          }
                          style={{
                            width: "100%",
                            boxSizing:
                              "border-box",
                            resize:
                              "vertical",
                            padding:
                              "9px 10px",
                            border:
                              "1px solid var(--cs-border-str)",
                            borderRadius:
                              "var(--cs-radius-md)",
                            outline: "none",
                            background:
                              "var(--cs-surface)",
                            color:
                              "var(--cs-ink)",
                            fontFamily:
                              "inherit",
                            fontSize: 13,
                            lineHeight: 1.6,
                          }}
                        />

                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap: 8,
                            marginTop: 7,
                          }}
                        >
                          <label
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              gap: 5,
                              color:
                                "var(--cs-ink-soft)",
                              fontSize: 11,
                              cursor:
                                "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={
                                replyAnonymous
                              }
                              onChange={(
                                event,
                              ) =>
                                setReplyAnonymous(
                                  event.target
                                    .checked,
                                )
                              }
                              disabled={
                                isSubmittingReply
                              }
                              style={{
                                width: 13,
                                height: 13,
                                accentColor:
                                  "var(--cs-purple)",
                              }}
                            />
                            익명으로 쓰기
                          </label>

                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                            }}
                          >
                            <button
                              type="button"
                              onClick={
                                cancelReply
                              }
                              disabled={
                                isSubmittingReply
                              }
                              style={{
                                padding:
                                  "5px 9px",
                                border:
                                  "1px solid var(--cs-border-str)",
                                borderRadius:
                                  "var(--cs-radius-md)",
                                background:
                                  "var(--cs-surface)",
                                color:
                                  "var(--cs-ink-soft)",
                                fontFamily:
                                  "inherit",
                                fontSize: 11,
                                cursor:
                                  "pointer",
                              }}
                            >
                              취소
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void addReply(
                                  c.id,
                                )
                              }
                              disabled={
                                !replyText.trim() ||
                                isSubmittingReply
                              }
                              style={{
                                padding:
                                  "5px 10px",
                                border: 0,
                                borderRadius:
                                  "var(--cs-radius-md)",
                                background:
                                  "var(--cs-purple)",
                                color:
                                  "var(--cs-surface)",
                                fontFamily:
                                  "inherit",
                                fontSize: 11,
                                fontWeight: 600,
                                cursor:
                                  !replyText.trim() ||
                                    isSubmittingReply
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  !replyText.trim() ||
                                    isSubmittingReply
                                    ? 0.55
                                    : 1,
                              }}
                            >
                              {isSubmittingReply
                                ? "등록 중..."
                                : "답글 등록"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {isMine &&
                      c.hasReplies && (
                        <div
                          style={{
                            marginTop: 5,
                            color:
                              "var(--cs-ink-faint)",
                            fontSize: 10.5,
                          }}
                        >
                          답글이 있어 삭제할 수
                          없습니다.
                        </div>
                      )}
                  </div>
                </div>
              );
            })}

            {/* Comment input */}
            <div style={{
              border: '1px solid var(--cs-border-str)', borderRadius: 'var(--cs-radius-lg)', padding: '11px 13px',
              fontSize: 13, color: 'var(--cs-ink-faint)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--cs-surface)',
            }}>
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addComment() }}
                placeholder="댓글을 남겨보세요..."
                style={{
                  border: 'none', outline: 'none', background: 'none',
                  fontSize: 13, fontFamily: 'inherit', color: 'var(--cs-ink)', flex: 1,
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--cs-ink-soft)', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={e => setAnonymous(e.target.checked)}
                  style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--cs-purple)' }}
                />
                익명으로 쓰기
              </label>
            </div>
          </div>
        )}
      </div>

      {showReportModal && (
        <div
          role="presentation"
          onClick={() => {
            if (!isSubmittingReport) {
              setShowReportModal(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(25, 22, 34, 0.4)",
            backdropFilter: "blur(3px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: 460,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 22,
              boxSizing: "border-box",
              border: "1px solid var(--cs-border)",
              borderRadius: 14,
              background: "var(--cs-surface)",
              boxShadow: "var(--cs-shadow-dropdown)",
            }}
          >
            <h2
              style={{
                margin: "0 0 7px",
                color: "var(--cs-ink)",
                fontSize: 18,
              }}
            >
              게시글 신고
            </h2>

            <p
              style={{
                margin: 0,
                color: "var(--cs-ink-soft)",
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              신고 사유를 선택해 주세요. 신고 내용은 관리자에게 전달됩니다.
            </p>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {REPORT_REASONS.map(
                (reason) => {
                  const selected =
                    reportReason ===
                    reason.code;

                  return (
                    <button
                      key={reason.code}
                      type="button"
                      onClick={() =>
                        setReportReason(
                          reason.code,
                        )
                      }
                      style={{
                        minHeight: 40,
                        border: selected
                          ? "1px solid var(--cs-purple)"
                          : "1px solid var(--cs-border)",
                        borderRadius:
                          "var(--cs-radius-md)",
                        background: selected
                          ? "var(--cs-purple-bg)"
                          : "var(--cs-surface)",
                        color: selected
                          ? "var(--cs-purple-dark)"
                          : "var(--cs-ink-soft)",
                        fontFamily:
                          "inherit",
                        fontSize: 11.5,
                        fontWeight: selected
                          ? 700
                          : 500,
                        cursor: "pointer",
                      }}
                    >
                      {reason.label}
                    </button>
                  );
                },
              )}
            </div>

            {reportReason && (
              <label
                style={{
                  display: "grid",
                  gap: 6,
                  marginTop: 15,
                }}
              >
                <span
                  style={{
                    color: "var(--cs-ink-soft)",
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  {reportReason === "other"
                    ? "상세 사유"
                    : "추가 설명 (선택)"}
                </span>

                <textarea
                  value={reportDescription}
                  onChange={(event) =>
                    setReportDescription(
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder={
                    reportReason === "other"
                      ? "신고 사유를 입력해 주세요."
                      : "필요한 경우 세부 내용을 적어주세요."
                  }
                  style={{
                    width: "100%",
                    minHeight: 82,
                    boxSizing: "border-box",
                    resize: "vertical",
                    border:
                      "1px solid var(--cs-border-str)",
                    borderRadius:
                      "var(--cs-radius-md)",
                    padding: "9px 10px",
                    outline: "none",
                    background:
                      "var(--cs-surface)",
                    color: "var(--cs-ink)",
                    fontFamily: "inherit",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                />
              </label>
            )}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: 8,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                disabled={
                  isSubmittingReport
                }
                onClick={() =>
                  setShowReportModal(false)
                }
                style={{
                  height: 38,
                  padding: "0 14px",
                  border:
                    "1px solid var(--cs-border-str)",
                  borderRadius:
                    "var(--cs-radius-md)",
                  background:
                    "var(--cs-surface)",
                  color:
                    "var(--cs-ink-soft)",
                  fontFamily: "inherit",
                  fontSize: 12,
                  cursor:
                    isSubmittingReport
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                취소
              </button>

              <button
                type="button"
                disabled={
                  !reportReason ||
                  (reportReason ===
                    "other" &&
                    !reportDescription.trim()) ||
                  isSubmittingReport
                }
                onClick={() =>
                  void submitReport()
                }
                style={{
                  height: 38,
                  padding: "0 15px",
                  border: 0,
                  borderRadius:
                    "var(--cs-radius-md)",
                  background:
                    "var(--cs-error)",
                  color: "#fff",
                  fontFamily:
                    "inherit",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor:
                    !reportReason ||
                    (reportReason ===
                      "other" &&
                      !reportDescription.trim()) ||
                    isSubmittingReport
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    !reportReason ||
                    (reportReason ===
                      "other" &&
                      !reportDescription.trim()) ||
                    isSubmittingReport
                      ? 0.5
                      : 1,
                }}
              >
                {isSubmittingReport
                  ? "접수 중..."
                  : "신고 접수"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportToast && (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            zIndex: 1100,
            maxWidth: 340,
            padding: "12px 14px",
            borderRadius: 10,
            border:
              "1px solid var(--cs-border)",
            background:
              "var(--cs-surface)",
            color:
              "var(--cs-ink-soft)",
            boxShadow:
              "var(--cs-shadow-dropdown)",
            fontSize: 11.5,
            fontWeight: 650,
          }}
        >
          {reportToast}
        </div>
      )}
    </div>
  );
}