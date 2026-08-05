"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
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

export default function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSubjectId =
    searchParams.get("course") ?? "";

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
  ] = useState(initialSubjectId);

  const [
    selectedTag,
    setSelectedTag,
  ] = useState<TagType | null>(null);

  const [title, setTitle] =
    useState("");

  const [body, setBody] =
    useState("");

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
    isPublished,
    setIsPublished,
  ] = useState(false);

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

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const loadMyCourses = async () => {
      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        setUserId(session.user.id);

        const {
          data,
          error,
        } = await supabase
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
          );

        if (error) {
          throw error;
        }

        const rows =
          (data ?? []) as unknown as MyCourseRow[];

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
      } catch (error) {
        console.error(
          "에디터 과목 조회 실패:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "과목 목록을 불러오지 못했어요.",
        );
      }
    };

    void loadMyCourses();
  }, [router]);

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
    const selectedFiles = Array.from(
      event.target.files ?? [],
    );

    event.target.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    setFileErrorMessage("");

    const remainingCount =
      MAX_FILE_COUNT - files.length;

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

  const removeFile = (
    targetIndex: number,
  ) => {
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

  const handlePublish = async () => {
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
      setIsPublished(true);

      const {
        data,
        error,
      } = await supabase
        .from("posts")
        .insert({
          author_id: userId,
          course_offering_id:
            selectedSubjectId,
          post_type: selectedTag,
          title: title.trim(),
          content: body,
          is_published: true,
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      const created =
        data as { id: string };

      const uploadedPaths: string[] = [];

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
            `${userId}/${created.id}/${crypto.randomUUID()}.${extension}`;

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
            post_id: created.id,
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
              index,
          });
        }

        if (
          attachmentRows.length > 0
        ) {
          const {
            error:
              attachmentInsertError,
          } = await supabase
            .from(
              "post_attachments",
            )
            .insert(
              attachmentRows,
            );

          if (
            attachmentInsertError
          ) {
            throw attachmentInsertError;
          }
        }
      } catch (
        attachmentError
      ) {
        if (
          uploadedPaths.length > 0
        ) {
          await supabase.storage
            .from("post-files")
            .remove(uploadedPaths);
        }

        await supabase
          .from("posts")
          .delete()
          .eq("id", created.id)
          .eq(
            "author_id",
            userId,
          );

        throw attachmentError;
      }

      router.push(
        `/posts/${created.id}`,
      );
    } catch (error) {
      console.error(
        "노트 게시 실패:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "노트를 게시하지 못했어요.",
      );

      setIsPublished(false);
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
    if (selectedSubjectId) {
      router.push(
        `/courses/${selectedSubjectId}`,
      );
      return;
    }

    router.push("/");
  };

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

                setShowSubjectDropdown(
                  (previous) =>
                    !previous,
                );
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
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

            {showSubjectDropdown && (
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
            새 노트
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
              void handlePublish()
            }
            disabled={isPublished}
            style={{
              background: isPublished
                ? "var(--cs-purple-bg)"
                : "var(--cs-purple)",
              color: isPublished
                ? "var(--cs-purple-dark)"
                : "var(--cs-surface)",
              border: "none",
              borderRadius:
                "var(--cs-radius-tag)",
              padding: "8px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: isPublished
                ? "default"
                : "pointer",
              transition:
                "background 0.15s",
            }}
            onMouseEnter={(
              event,
            ) => {
              if (!isPublished) {
                event.currentTarget.style.background =
                  "var(--cs-purple-hover)";
              }
            }}
            onMouseLeave={(
              event,
            ) => {
              if (!isPublished) {
                event.currentTarget.style.background =
                  "var(--cs-purple)";
              }
            }}
          >
            {isPublished
              ? "게시 중..."
              : "게시하기"}
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
                        setSelectedTag(
                          option.key,
                        );

                        setTagError(
                          false,
                        );
                      }}
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
                        cursor:
                          "pointer",
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
            disabled={isPublished}
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
              opacity: isPublished
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
            disabled={isPublished}
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
                  PDF, 이미지, Word,
                  PowerPoint 파일을 파일당
                  최대 20MB까지 등록할 수
                  있어요.
                </p>
              </div>

              <span
                style={{
                  flexShrink: 0,
                  color:
                    files.length ===
                    MAX_FILE_COUNT
                      ? "var(--cs-purple-dark)"
                      : "var(--cs-ink-faint)",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {files.length}/
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
                isPublished ||
                files.length >=
                  MAX_FILE_COUNT
              }
              style={{
                display: "none",
              }}
            />

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={
                isPublished ||
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
                  isPublished ||
                  files.length >=
                    MAX_FILE_COUNT
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  isPublished ||
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
                파일 선택하기
              </strong>

              <small
                style={{
                  color:
                    "var(--cs-ink-faint)",
                  fontSize: 10,
                }}
              >
                최대 5개 · 파일당 20MB
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
                          isPublished
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
                            isPublished
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