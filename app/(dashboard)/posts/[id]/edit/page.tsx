"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import RichTextEditor from "@/components/editor/RichTextEditor";
import { supabase } from "@/lib/supabase";

type TagType =
  | "notes"
  | "exam"
  | "reference"
  | "study_trail";

type SubjectOption = {
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

type MyCourseRow = {
  course_offerings:
    | CourseRelation
    | CourseRelation[]
    | null;
};

type AttachmentInsertRow = {
  post_id: string;
  uploader_id: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  display_order: number;
};

type EditablePostRow = {
  id: string;
  author_id: string;
  course_offering_id: string;
  post_type: TagType;
  title: string;
  content: string | null;
  price: number;
};

type ExistingAttachment = {
  id: string;
  original_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  display_order: number | null;
};

const MAX_FILE_COUNT = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

const TAG_OPTIONS: {
  key: TagType;
  label: string;
}[] = [
  {
    key: "notes",
    label: "Notes",
  },
  {
    key: "exam",
    label: "Exam",
  },
  {
    key: "reference",
    label: "Reference",
  },
  {
    key: "study_trail",
    label: "Study Trail",
  },
];

function pickOne<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getPlainTextFromHtml(
  html: string,
) {
  if (typeof window === "undefined") {
    return "";
  }

  const element =
    document.createElement("div");

  element.innerHTML = html;

  return element.textContent ?? "";
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = params.id;

  const titleRef =
    useRef<HTMLTextAreaElement>(null);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [subjects, setSubjects] =
    useState<SubjectOption[]>([]);

  const [userId, setUserId] =
    useState("");

  const [
    selectedSubjectId,
    setSelectedSubjectId,
  ] = useState("");

  const [
    selectedTag,
    setSelectedTag,
  ] = useState<TagType | null>(null);

  const [title, setTitle] =
    useState("");

  const [body, setBody] =
    useState("");

  const [originalBody, setOriginalBody] =
    useState("");

  const [
    existingAttachments,
    setExistingAttachments,
  ] = useState<ExistingAttachment[]>([]);

  const [
    removedAttachments,
    setRemovedAttachments,
  ] = useState<ExistingAttachment[]>([]);

  const [files, setFiles] =
    useState<File[]>([]);


  const [
    fileErrorMessage,
    setFileErrorMessage,
  ] = useState("");

  const [
    showSubjectDropdown,
    setShowSubjectDropdown,
  ] = useState(false);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    tagError,
    setTagError,
  ] = useState(false);

  const [
    subjectError,
    setSubjectError,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    purchaseCount,
    setPurchaseCount,
  ] = useState(0);

  const hasPurchases = purchaseCount > 0;

  useEffect(() => {
    const loadEditPage = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        setUserId(session.user.id);

        const [
          postResult,
          courseResult,
          attachmentResult,
          purchaseCountResult,
        ] = await Promise.all([
          supabase
            .from("posts")
            .select(`
              id,
              author_id,
              course_offering_id,
              post_type,
              title,
              content,
              price
            `)
            .eq("id", postId)
            .single(),

          supabase
            .from(
              "user_course_offerings",
            )
            .select(`
              course_offerings (
                id,
                subjects (
                  name
                )
              )
            `)
            .eq(
              "user_id",
              session.user.id,
            ),

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
            .from("post_purchases")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("post_id", postId),
        ]);

        if (postResult.error) {
          throw postResult.error;
        }

        if (courseResult.error) {
          throw courseResult.error;
        }

        if (attachmentResult.error) {
          throw attachmentResult.error;
        }

        if (purchaseCountResult.error) {
          throw purchaseCountResult.error;
        }

        const post =
          postResult.data as EditablePostRow;

        if (
          post.author_id !==
          session.user.id
        ) {
          alert(
            "본인이 작성한 글만 수정할 수 있어요.",
          );
          router.replace(
            `/posts/${postId}`,
          );
          return;
        }

        const rows =
          (courseResult.data ??
            []) as unknown as MyCourseRow[];

        const nextSubjects = rows
          .map(
            (
              row,
            ): SubjectOption | null => {
              const course = pickOne(
                row.course_offerings,
              );

              if (!course) {
                return null;
              }

              const subject = pickOne(
                course.subjects,
              );

              return {
                id: course.id,
                name:
                  subject?.name ??
                  "과목명 없음",
              };
            },
          )
          .filter(
            (
              subject,
            ): subject is SubjectOption =>
              subject !== null,
          )
          .sort((a, b) =>
            a.name.localeCompare(
              b.name,
              "ko",
            ),
          );

        setSubjects(nextSubjects);
        setSelectedSubjectId(
          post.course_offering_id,
        );
        setSelectedTag(post.post_type);
        setTitle(post.title);
        setBody(post.content ?? "");
        setOriginalBody(post.content ?? "");
        setExistingAttachments(
          (attachmentResult.data ??
            []) as ExistingAttachment[],
        );
        setPurchaseCount(
          purchaseCountResult.count ?? 0,
        );
      } catch (error) {
        console.error(
          "게시글 수정 정보 조회 실패:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "게시글 정보를 불러오지 못했어요.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (postId) {
      void loadEditPage();
    }
  }, [postId, router]);

  const selectedSubject =
    subjects.find(
      (subject) =>
        subject.id ===
        selectedSubjectId,
    );

  const plainBody =
    getPlainTextFromHtml(body).trim();

  const wordCount = plainBody
    ? plainBody.split(/\s+/).length
    : 0;

  const handleTitleKey = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  };

  const handleFileSelection = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (hasPurchases) {
      event.target.value = "";
      setFileErrorMessage(
        "구매자가 있는 게시글은 첨부파일을 변경할 수 없어요.",
      );
      return;
    }

    const selectedFiles = Array.from(
      event.target.files ?? [],
    );

    event.target.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    setFileErrorMessage("");

    const remainingCount =
      MAX_FILE_COUNT -
      existingAttachments.length -
      files.length;

    if (remainingCount <= 0) {
      setFileErrorMessage(
        `첨부파일은 최대 ${MAX_FILE_COUNT}개까지 등록할 수 있어요.`,
      );
      return;
    }

    const oversizedFile =
      selectedFiles.find(
        (file) =>
          file.size > MAX_FILE_SIZE,
      );

    if (oversizedFile) {
      setFileErrorMessage(
        `${oversizedFile.name} 파일이 20MB를 초과해요.`,
      );
      return;
    }

    const unsupportedFile =
      selectedFiles.find(
        (file) =>
          !ACCEPTED_FILE_TYPES.includes(
            file.type as (
              typeof ACCEPTED_FILE_TYPES
            )[number],
          ),
      );

    if (unsupportedFile) {
      setFileErrorMessage(
        `${unsupportedFile.name} 파일 형식은 등록할 수 없어요.`,
      );
      return;
    }

    const existingKeys = new Set(
      files.map(
        (file) =>
          `${file.name}-${file.size}-${file.lastModified}`,
      ),
    );

    const uniqueFiles =
      selectedFiles.filter(
        (file) =>
          !existingKeys.has(
            `${file.name}-${file.size}-${file.lastModified}`,
          ),
      );

    const nextFiles = uniqueFiles.slice(
      0,
      remainingCount,
    );

    if (
      uniqueFiles.length >
      remainingCount
    ) {
      setFileErrorMessage(
        `첨부파일은 최대 ${MAX_FILE_COUNT}개까지 등록할 수 있어요. 가능한 파일만 추가했어요.`,
      );
    }

    setFiles((previous) => [
      ...previous,
      ...nextFiles,
    ]);
  };

  const removeExistingAttachment = (
    attachment: ExistingAttachment,
  ) => {
    if (hasPurchases) {
      setFileErrorMessage(
        "구매자가 있는 게시글은 첨부파일을 삭제할 수 없어요.",
      );
      return;
    }

    setExistingAttachments(
      (previous) =>
        previous.filter(
          (item) =>
            item.id !== attachment.id,
        ),
    );

    setRemovedAttachments(
      (previous) => [
        ...previous,
        attachment,
      ],
    );

    setFileErrorMessage("");
  };

  const removeFile = (
    targetIndex: number,
  ) => {
    if (hasPurchases) {
      return;
    }

    setFiles((previous) =>
      previous.filter(
        (_, index) =>
          index !== targetIndex,
      ),
    );

    setFileErrorMessage("");
  };

  const formatFileSize = (
    bytes: number,
  ) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  };

  const getFileExtension = (
    fileName: string,
  ) => {
    const extension =
      fileName
        .split(".")
        .pop()
        ?.toLowerCase();

    return extension || "file";
  };

  const handleUpdate = async () => {
    setErrorMessage("");

    let hasError = false;

    if (!selectedTag) {
      setTagError(true);
      hasError = true;
    }

    if (!selectedSubjectId) {
      setSubjectError(true);
      hasError = true;
    }

    if (!title.trim()) {
      setErrorMessage(
        "제목을 입력해주세요.",
      );
      hasError = true;
    }

    if (!plainBody) {
      setErrorMessage(
        "본문 내용을 입력해주세요.",
      );
      hasError = true;
    }


    if (
      hasError ||
      !selectedTag ||
      !selectedSubjectId ||
      !userId
    ) {
      return;
    }

    try {
      setIsSaving(true);

      /* 저장 직전 구매 여부를 다시 확인해 화면을 켜둔 사이의 구매도 반영합니다. */
      const {
        count: latestPurchaseCount,
        error: purchaseCheckError,
      } = await supabase
        .from("post_purchases")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("post_id", postId);

      if (purchaseCheckError) {
        throw purchaseCheckError;
      }

      const isLockedByPurchase =
        (latestPurchaseCount ?? 0) > 0;

      setPurchaseCount(
        latestPurchaseCount ?? 0,
      );

      if (
        isLockedByPurchase &&
        (files.length > 0 ||
          removedAttachments.length > 0)
      ) {
        throw new Error(
          "구매자가 생겨 첨부파일 변경이 잠겼어요. 새로고침 후 다시 수정해주세요.",
        );
      }

      const uploadedPaths: string[] = [];
      const insertedAttachmentIds: string[] = [];

      try {
        const attachmentRows:
          AttachmentInsertRow[] = [];

        for (
          let index = 0;
          index < files.length;
          index += 1
        ) {
          const file = files[index];
          const extension =
            getFileExtension(file.name);

          const storagePath =
            `${userId}/${postId}/${crypto.randomUUID()}.${extension}`;

          const {
            error: uploadError,
          } = await supabase.storage
            .from("post-files")
            .upload(
              storagePath,
              file,
              {
                contentType:
                  file.type ||
                  "application/octet-stream",
                cacheControl: "3600",
                upsert: false,
              },
            );

          if (uploadError) {
            throw uploadError;
          }

          uploadedPaths.push(
            storagePath,
          );

          attachmentRows.push({
            post_id: postId,
            uploader_id: userId,
            original_name:
              file.name,
            storage_path:
              storagePath,
            mime_type:
              file.type ||
              "application/octet-stream",
            size_bytes:
              file.size,
            display_order:
              existingAttachments.length +
              index,
          });
        }

        if (
          attachmentRows.length > 0
        ) {
          const {
            data:
              insertedAttachments,
            error:
              attachmentInsertError,
          } = await supabase
            .from(
              "post_attachments",
            )
            .insert(
              attachmentRows,
            )
            .select("id");

          if (
            attachmentInsertError
          ) {
            throw attachmentInsertError;
          }

          insertedAttachmentIds.push(
            ...(
              insertedAttachments ??
              []
            ).map(
              (
                attachment: {
                  id: string;
                },
              ) =>
                attachment.id,
            ),
          );
        }

        const summarySourceChanged =
          body !== originalBody ||
          files.length > 0 ||
          removedAttachments.length > 0;

        const aiSummaryResetFields =
          summarySourceChanged
            ? {
                ai_summary: null,
                ai_summary_generated_at: null,
              }
            : {};

        const postUpdates =
          isLockedByPurchase
            ? {
                /* 구매 후에는 제목/본문의 정정·보충만 허용 */
                title: title.trim(),
                content: body,

                ...aiSummaryResetFields,

                updated_at:
                  new Date().toISOString(),
              }
            : {
                course_offering_id:
                  selectedSubjectId,
                post_type:
                  selectedTag,
                title: title.trim(),
                content: body,
                price: 1,

                ...aiSummaryResetFields,

                updated_at:
                  new Date().toISOString(),
              };

        const {
          error: postUpdateError,
        } = await supabase
          .from("posts")
          .update(postUpdates)
          .eq("id", postId)
          .eq(
            "author_id",
            userId,
          );

        if (postUpdateError) {
          throw postUpdateError;
        }

        if (
          removedAttachments.length >
          0
        ) {
          const removedIds =
            removedAttachments.map(
              (attachment) =>
                attachment.id,
            );

          const {
            error:
              deleteAttachmentRowsError,
          } = await supabase
            .from(
              "post_attachments",
            )
            .delete()
            .in("id", removedIds)
            .eq("post_id", postId);

          if (
            deleteAttachmentRowsError
          ) {
            throw deleteAttachmentRowsError;
          }

          const removedPaths =
            removedAttachments.map(
              (attachment) =>
                attachment.storage_path,
            );

          const {
            error:
              deleteStorageError,
          } = await supabase.storage
            .from("post-files")
            .remove(removedPaths);

          if (deleteStorageError) {
            console.error(
              "기존 첨부파일 Storage 삭제 실패:",
              deleteStorageError,
            );
          }
        }
      } catch (updateError) {
        if (
          insertedAttachmentIds.length >
          0
        ) {
          await supabase
            .from(
              "post_attachments",
            )
            .delete()
            .in(
              "id",
              insertedAttachmentIds,
            );
        }

        if (
          uploadedPaths.length > 0
        ) {
          await supabase.storage
            .from("post-files")
            .remove(uploadedPaths);
        }

        throw updateError;
      }

      router.replace(
        `/posts/${postId}`,
      );
      router.refresh();
    } catch (error) {
      console.error(
        "노트 수정 실패:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "노트를 수정하지 못했어요.",
      );

      setIsSaving(false);
    }
  };

  const tagStyle = (
    key: TagType,
  ): React.CSSProperties => {
    const isSelected =
      selectedTag === key;

    if (key === "study_trail") {
      return {
        background: isSelected
          ? "var(--cs-purple-bg)"
          : "transparent",
        color: isSelected
          ? "var(--cs-purple-dark)"
          : "var(--cs-ink-soft)",
        border: `1px solid ${
          isSelected
            ? "var(--cs-purple)"
            : "var(--cs-border-str)"
        }`,
      };
    }

    return {
      background: isSelected
        ? "var(--cs-bg)"
        : "transparent",
      color: isSelected
        ? "var(--cs-ink)"
        : "var(--cs-ink-soft)",
      border:
        "1px solid var(--cs-border-str)",
    };
  };

  const goBack = () => {
    router.push(
      `/posts/${postId}`,
    );
  };

  if (isLoading) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "var(--cs-surface)",
          color:
            "var(--cs-ink-faint)",
          fontSize: 13,
        }}
      >
        게시글 정보를 불러오는 중이에요.
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        background:
          "var(--cs-surface)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 상단 바 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          padding: "10px 20px",
          borderBottom:
            "1px solid var(--cs-border)",
          background:
            "var(--cs-surface)",
          flexShrink: 0,
          gap: 12,
        }}
      >
        {/* 왼쪽 영역 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <button
            type="button"
            onClick={goBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color:
                "var(--cs-ink-faint)",
              fontSize: 13,
              fontFamily: "inherit",
              padding: "4px 6px",
              borderRadius:
                "var(--cs-radius-sm)",
              transition:
                "background 0.1s, color 0.1s",
            }}
            onMouseEnter={(
              event,
            ) => {
              event.currentTarget.style.background =
                "var(--cs-bg)";

              event.currentTarget.style.color =
                "var(--cs-ink)";
            }}
            onMouseLeave={(
              event,
            ) => {
              event.currentTarget.style.background =
                "none";

              event.currentTarget.style.color =
                "var(--cs-ink-faint)";
            }}
          >
            ← 뒤로
          </button>

          <span
            style={{
              color:
                "var(--cs-border-str)",
              fontSize: 13,
            }}
          >
            /
          </span>

          {/* 과목 선택 */}
          <div
            style={{
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={(
                event,
              ) => {
                event.stopPropagation();

                if (hasPurchases) {
                  return;
                }

                setShowSubjectDropdown(
                  (previous) =>
                    !previous,
                );
              }}
              disabled={hasPurchases}
              style={{
                background: "none",
                border: "none",
                cursor: hasPurchases
                  ? "not-allowed"
                  : "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 500,
                color: selectedSubject
                  ? "var(--cs-ink)"
                  : "var(--cs-ink-faint)",
                padding: "4px 8px",
                borderRadius:
                  "var(--cs-radius-sm)",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition:
                  "background 0.1s",
                opacity: hasPurchases
                  ? 0.65
                  : 1,
              }}
              onMouseEnter={(
                event,
              ) => {
                event.currentTarget.style.background =
                  "var(--cs-bg)";
              }}
              onMouseLeave={(
                event,
              ) => {
                event.currentTarget.style.background =
                  "none";
              }}
            >
              {selectedSubject && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius:
                      "var(--cs-radius-full)",
                    background:
                      "var(--cs-purple)",
                    flexShrink: 0,
                  }}
                />
              )}

              {selectedSubject
                ? selectedSubject.name
                : "과목 선택"}

              <span
                style={{
                  fontSize: 10,
                  opacity: 0.45,
                }}
              >
                ▾
              </span>
            </button>

            {showSubjectDropdown && !hasPurchases && (
              <div
                onClick={(
                  event,
                ) =>
                  event.stopPropagation()
                }
                style={{
                  position: "absolute",
                  top: "110%",
                  left: 0,
                  zIndex: 50,
                  background:
                    "var(--cs-surface)",
                  border:
                    "1px solid var(--cs-border)",
                  borderRadius:
                    "var(--cs-radius-dropdown)",
                  padding: 6,
                  boxShadow:
                    "var(--cs-shadow-dropdown)",
                  minWidth: 200,
                  maxHeight: 280,
                  overflowY: "auto",
                }}
              >
                {subjects.length ===
                0 ? (
                  <div
                    style={{
                      padding:
                        "10px 12px",
                      fontSize: 12,
                      color:
                        "var(--cs-ink-faint)",
                    }}
                  >
                    추가한 과목이
                    없습니다.
                  </div>
                ) : (
                  subjects.map(
                    (subject) => (
                      <div
                        key={
                          subject.id
                        }
                        onClick={() => {
                          setSelectedSubjectId(
                            subject.id,
                          );

                          setSubjectError(
                            false,
                          );

                          setShowSubjectDropdown(
                            false,
                          );
                        }}
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: 8,
                          padding:
                            "8px 10px",
                          borderRadius:
                            "var(--cs-radius-md)",
                          cursor:
                            "pointer",
                          fontSize: 13.5,
                          color:
                            "var(--cs-ink)",
                          background:
                            subject.id ===
                            selectedSubjectId
                              ? "var(--cs-purple-bg)"
                              : "transparent",
                          transition:
                            "background 0.1s",
                        }}
                        onMouseEnter={(
                          event,
                        ) => {
                          event.currentTarget.style.background =
                            subject.id ===
                            selectedSubjectId
                              ? "var(--cs-purple-bg)"
                              : "var(--cs-bg)";
                        }}
                        onMouseLeave={(
                          event,
                        ) => {
                          event.currentTarget.style.background =
                            subject.id ===
                            selectedSubjectId
                              ? "var(--cs-purple-bg)"
                              : "transparent";
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius:
                              "var(--cs-radius-full)",
                            background:
                              subject.id ===
                              selectedSubjectId
                                ? "var(--cs-purple)"
                                : "var(--cs-border-str)",
                            flexShrink: 0,
                          }}
                        />

                        {subject.name}
                      </div>
                    ),
                  )
                )}
              </div>
            )}
          </div>

          <span
            style={{
              color:
                "var(--cs-border-str)",
              fontSize: 13,
            }}
          >
            /
          </span>

          <span
            style={{
              fontSize: 13,
              color:
                "var(--cs-ink-faint)",
            }}
          >
            노트 수정
          </span>
        </div>

        {/* 오른쪽 영역 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          {wordCount > 0 && (
            <span
              style={{
                fontSize: 12,
                color:
                  "var(--cs-ink-faint)",
              }}
            >
              {wordCount}단어
            </span>
          )}

          <button
            type="button"
            onClick={() =>
              void handleUpdate()
            }
            disabled={isSaving}
            style={{
              background: isSaving
                ? "var(--cs-purple-bg)"
                : "var(--cs-purple)",
              color: isSaving
                ? "var(--cs-purple-dark)"
                : "var(--cs-surface)",
              border: "none",
              borderRadius:
                "var(--cs-radius-tag)",
              padding: "8px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: isSaving
                ? "default"
                : "pointer",
              transition:
                "background 0.15s",
            }}
            onMouseEnter={(
              event,
            ) => {
              if (!isSaving) {
                event.currentTarget.style.background =
                  "var(--cs-purple-hover)";
              }
            }}
            onMouseLeave={(
              event,
            ) => {
              if (!isSaving) {
                event.currentTarget.style.background =
                  "var(--cs-purple)";
              }
            }}
          >
            {isSaving
              ? "수정 중..."
              : "수정 완료"}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          padding:
            "0 24px 80px",
        }}
        onClick={() =>
          setShowSubjectDropdown(
            false,
          )
        }
      >
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            paddingTop: 48,
          }}
        >
          {errorMessage && (
            <div
              style={{
                marginBottom: 20,
                padding:
                  "10px 12px",
                borderRadius:
                  "var(--cs-radius-md)",
                background:
                  "var(--cs-exam-bg)",
                color:
                  "var(--cs-error)",
                fontSize: 12.5,
                lineHeight: 1.6,
              }}
            >
              {errorMessage}
            </div>
          )}

          {hasPurchases && (
            <div
              style={{
                marginBottom: 20,
                padding: "11px 13px",
                border: "1px solid var(--cs-purple-border)",
                borderRadius: "var(--cs-radius-md)",
                background: "var(--cs-purple-bg)",
                color: "var(--cs-purple-dark)",
                fontSize: 12,
                lineHeight: 1.65,
              }}
            >
              이미 {purchaseCount}명이 구매한 글이에요.
              과목·자료 유형·첨부파일은 변경할 수 없고,
              제목과 본문만 정정하거나 보충할 수 있어요.
            </div>
          )}

          {/* 자료 유형 */}
          <div
            style={{
              marginBottom: 28,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color:
                  "var(--cs-ink-faint)",
                marginBottom: 10,
              }}
            >
              자료 유형

              {tagError &&
                !selectedTag && (
                  <span
                    style={{
                      color:
                        "var(--cs-error)",
                      marginLeft: 8,
                      fontWeight: 400,
                    }}
                  >
                    — 유형을 선택해주세요
                  </span>
                )}

              {subjectError &&
                !selectedSubjectId && (
                  <span
                    style={{
                      color:
                        "var(--cs-error)",
                      marginLeft: 8,
                      fontWeight: 400,
                    }}
                  >
                    — 과목을 선택해주세요
                  </span>
                )}
            </div>

            <div
              style={{
                display: "flex",
                gap: 7,
                flexWrap: "wrap",
              }}
            >
              {TAG_OPTIONS.map(
                (option) => {
                  const isSelected =
                    selectedTag ===
                    option.key;

                  const style =
                    tagStyle(
                      option.key,
                    );

                  return (
                    <button
                      key={
                        option.key
                      }
                      type="button"
                      onClick={() => {
                        if (hasPurchases) {
                          return;
                        }

                        setSelectedTag(
                          option.key,
                        );

                        setTagError(
                          false,
                        );
                      }}
                      disabled={hasPurchases}
                      style={{
                        ...style,
                        borderRadius:
                          "var(--cs-radius-md)",
                        padding:
                          "5px 12px",
                        fontSize: 13,
                        fontWeight:
                          isSelected
                            ? 600
                            : 400,
                        fontFamily:
                          "inherit",
                        cursor: hasPurchases
                          ? "not-allowed"
                          : "pointer",
                        opacity: hasPurchases
                          ? 0.65
                          : 1,
                        transition:
                          "all 0.12s",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* 제목 */}
          <textarea
            ref={titleRef}
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value,
              )
            }
            onKeyDown={
              handleTitleKey
            }
            placeholder="제목을 입력하세요"
            rows={1}
            disabled={isSaving}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background:
                "transparent",
              resize: "none",
              fontSize: 34,
              fontWeight: 700,
              lineHeight: 1.25,
              fontFamily: "inherit",
              color:
                "var(--cs-ink)",
              marginBottom: 6,
              overflow: "hidden",
              opacity: isSaving
                ? 0.7
                : 1,
            }}
            onInput={(event) => {
              const textarea =
                event.currentTarget;

              textarea.style.height =
                "auto";

              textarea.style.height =
                `${textarea.scrollHeight}px`;
            }}
          />

          {/* 구분선 */}
          <div
            style={{
              height: 1,
              background:
                "var(--cs-border)",
              marginBottom: 24,
            }}
          />

          {/* Tiptap 에디터 */}
          <RichTextEditor
            value={body}
            onChange={setBody}
            disabled={isSaving}
          />

          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color:
                "var(--cs-ink-faint)",
              lineHeight: 1.7,
            }}
          >
          </div>

          {/* 첨부파일 */}

          <section
            style={{
              marginTop: 28,
              padding: 18,
              border:
                "1px solid #ded9ee",
              borderRadius: 10,
              background: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "flex-start",
                justifyContent:
                  "space-between",
                gap: 16,
                marginBottom: 14,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: "0 0 5px",
                    color:
                      "var(--cs-ink)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  첨부파일
                </h3>

                <p
                  style={{
                    margin: 0,
                    color:
                      "var(--cs-ink-faint)",
                    fontSize: 10.5,
                    lineHeight: 1.6,
                  }}
                >
                  {hasPurchases
                    ? "구매가 발생한 게시글은 기존 첨부파일을 유지해야 해요."
                    : "PDF, 이미지, Word, PowerPoint 파일을 파일당 최대 20MB까지 등록할 수 있어요."}
                </p>
              </div>

              <span
                style={{
                  flexShrink: 0,
                  color:
                    existingAttachments.length +
                      files.length ===
                    MAX_FILE_COUNT
                      ? "var(--cs-purple-dark)"
                      : "var(--cs-ink-faint)",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {existingAttachments.length +
                  files.length}/
                {MAX_FILE_COUNT}
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx"
              onChange={
                handleFileSelection
              }
              disabled={
                hasPurchases ||
                isSaving ||
                existingAttachments.length +
                  files.length >=
                  MAX_FILE_COUNT
              }
              style={{
                display: "none",
              }}
            />

            <button
              type="button"
              onClick={() => {
                if (hasPurchases) {
                  return;
                }

                fileInputRef.current?.click();
              }}
              disabled={
                hasPurchases ||
                isSaving ||
                existingAttachments.length +
                  files.length >=
                  MAX_FILE_COUNT
              }
              style={{
                display: "flex",
                width: "100%",
                minHeight: 110,
                alignItems: "center",
                justifyContent:
                  "center",
                flexDirection:
                  "column",
                gap: 8,
                border:
                  "1px dashed #cfc7e8",
                borderRadius: 9,
                background:
                  "#faf9fd",
                color:
                  "var(--cs-ink-soft)",
                fontFamily:
                  "inherit",
                fontSize: 12,
                cursor:
                  isSaving ||
                  files.length >=
                    MAX_FILE_COUNT
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  isSaving ||
                  files.length >=
                    MAX_FILE_COUNT
                    ? 0.6
                    : 1,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "flex",
                  width: 34,
                  height: 34,
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  border:
                    "1px solid #ded9ee",
                  borderRadius: "50%",
                  background:
                    "#ffffff",
                  color:
                    "var(--cs-purple-dark)",
                  fontSize: 17,
                }}
              >
                ↑
              </span>

              <strong
                style={{
                  fontSize: 11.5,
                }}
              >
                {hasPurchases
                  ? "첨부파일 변경 불가"
                  : "파일 선택하기"}
              </strong>

              <small
                style={{
                  color:
                    "var(--cs-ink-faint)",
                  fontSize: 10,
                }}
              >
                {hasPurchases
                  ? "구매자가 있어 원본 파일이 잠겼어요"
                  : "최대 5개 · 파일당 20MB"}
              </small>
            </button>

            {fileErrorMessage && (
              <p
                style={{
                  margin:
                    "10px 0 0",
                  color:
                    "var(--cs-error)",
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                {fileErrorMessage}
              </p>
            )}

            {existingAttachments.length >
              0 && (
              <ul
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: 8,
                  margin: "14px 0 0",
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {existingAttachments.map(
                  (attachment) => (
                    <li
                      key={attachment.id}
                      style={{
                        display:
                          "flex",
                        minHeight: 56,
                        alignItems:
                          "center",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        padding:
                          "8px 11px",
                        border:
                          "1px solid #e5e1f0",
                        borderRadius: 8,
                        background:
                          "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          minWidth: 0,
                          alignItems:
                            "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            display:
                              "flex",
                            width: 38,
                            height: 38,
                            flexShrink: 0,
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            borderRadius:
                              7,
                            background:
                              "#f0edf8",
                            color:
                              "var(--cs-purple-dark)",
                            fontSize: 9,
                            fontWeight:
                              800,
                            textTransform:
                              "uppercase",
                          }}
                        >
                          {getFileExtension(
                            attachment.original_name,
                          )}
                        </span>

                        <span
                          style={{
                            display:
                              "flex",
                            minWidth: 0,
                            flexDirection:
                              "column",
                            gap: 4,
                          }}
                        >
                          <strong
                            style={{
                              overflow:
                                "hidden",
                              color:
                                "var(--cs-ink)",
                              fontSize:
                                11,
                              fontWeight:
                                650,
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {
                              attachment.original_name
                            }
                          </strong>

                          <small
                            style={{
                              color:
                                "var(--cs-ink-faint)",
                              fontSize:
                                10,
                            }}
                          >
                            {formatFileSize(
                              attachment.size_bytes ??
                                0,
                            )}
                            {" · 기존 파일"}
                          </small>
                        </span>
                      </div>

                      {!hasPurchases && (
                      <button
                        type="button"
                        onClick={() =>
                          removeExistingAttachment(
                            attachment,
                          )
                        }
                        disabled={
                          isSaving
                        }
                        aria-label={`${attachment.original_name} 삭제`}
                        title="첨부파일 삭제"
                        style={{
                          display:
                            "flex",
                          width: 30,
                          height: 30,
                          flexShrink: 0,
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          border: 0,
                          borderRadius:
                            6,
                          background:
                            "transparent",
                          color:
                            "var(--cs-ink-faint)",
                          fontSize: 18,
                          cursor:
                            isSaving
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        ×
                      </button>
                      )}
                    </li>
                  ),
                )}
              </ul>
            )}

            {files.length > 0 && (
              <ul
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: 8,
                  margin: "14px 0 0",
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {files.map(
                  (file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      style={{
                        display:
                          "flex",
                        minHeight: 56,
                        alignItems:
                          "center",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        padding:
                          "8px 11px",
                        border:
                          "1px solid #e5e1f0",
                        borderRadius: 8,
                        background:
                          "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          minWidth: 0,
                          alignItems:
                            "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            display:
                              "flex",
                            width: 38,
                            height: 38,
                            flexShrink: 0,
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            borderRadius:
                              7,
                            background:
                              "#f0edf8",
                            color:
                              "var(--cs-purple-dark)",
                            fontSize: 9,
                            fontWeight:
                              800,
                            textTransform:
                              "uppercase",
                          }}
                        >
                          {getFileExtension(
                            file.name,
                          )}
                        </span>

                        <span
                          style={{
                            display:
                              "flex",
                            minWidth: 0,
                            flexDirection:
                              "column",
                            gap: 4,
                          }}
                        >
                          <strong
                            style={{
                              overflow:
                                "hidden",
                              color:
                                "var(--cs-ink)",
                              fontSize:
                                11,
                              fontWeight:
                                650,
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {file.name}
                          </strong>

                          <small
                            style={{
                              color:
                                "var(--cs-ink-faint)",
                              fontSize:
                                10,
                            }}
                          >
                            {formatFileSize(
                              file.size,
                            )}
                          </small>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeFile(
                            index,
                          )
                        }
                        disabled={
                          isSaving
                        }
                        aria-label={`${file.name} 삭제`}
                        title="첨부파일 삭제"
                        style={{
                          display:
                            "flex",
                          width: 30,
                          height: 30,
                          flexShrink: 0,
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          border: 0,
                          borderRadius:
                            6,
                          background:
                            "transparent",
                          color:
                            "var(--cs-ink-faint)",
                          fontSize: 18,
                          cursor:
                            isSaving
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        ×
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}