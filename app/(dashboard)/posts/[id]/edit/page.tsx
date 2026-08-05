"use client";

import {
  ChangeEvent,
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

import styles from "@/app/(dashboard)/notes/new/new-note.module.css";

type PostType =
  | "notes"
  | "exam"
  | "reference"
  | "study_trail";

type CourseOption = {
  id: string;
  label: string;
};

type CourseRelation = {
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
    | { name: string }
    | { name: string }[]
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

type UserCourseRow = {
  course_offering_id: string;
  course_offerings:
    | CourseRelation
    | CourseRelation[]
    | null;
};

type EditablePostRow = {
  id: string;
  author_id: string;
  course_offering_id: string;
  post_type: PostType;
  title: string;
  content: string | null;
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

const ACCEPTED_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "doc",
  "docx",
  "ppt",
  "pptx",
]);

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = params.id;
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [postType, setPostType] =
    useState<PostType>("notes");
  const [courseOfferingId, setCourseOfferingId] =
    useState("");
  const [courseOptions, setCourseOptions] =
    useState<CourseOption[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [
    existingAttachments,
    setExistingAttachments,
  ] = useState<ExistingAttachment[]>([]);
  const [
    removedAttachments,
    setRemovedAttachments,
  ] = useState<ExistingAttachment[]>([]);
  const [newFiles, setNewFiles] =
    useState<File[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [
    fileErrorMessage,
    setFileErrorMessage,
  ] = useState("");

  useEffect(() => {
    const loadEditPage = async () => {
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

        const [
          postResult,
          courseResult,
          attachmentResult,
        ] = await Promise.all([
          supabase
            .from("posts")
            .select(`
              id,
              author_id,
              course_offering_id,
              post_type,
              title,
              content
            `)
            .eq("id", postId)
            .single(),

          supabase
            .from("user_course_offerings")
            .select(`
              course_offering_id,
              course_offerings (
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
              )
            `)
            .eq("user_id", user.id),

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

        const post =
          postResult.data as EditablePostRow;

        if (post.author_id !== user.id) {
          alert("본인이 작성한 글만 수정할 수 있습니다.");
          router.replace(`/posts/${postId}`);
          return;
        }

        const rows =
          (courseResult.data ??
            []) as unknown as UserCourseRow[];

        const options = rows
          .map((item): CourseOption | null => {
            const rawCourse =
              item.course_offerings;

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

            const professor = Array.isArray(
              course.professors,
            )
              ? course.professors[0]
              : course.professors;

            const semester = Array.isArray(
              course.semesters,
            )
              ? course.semesters[0]
              : course.semesters;

            const details = [
              subject?.subject_code,
              professor?.name,
              semester
                ? `${semester.year}년 ${semester.term}학기`
                : null,
              course.section
                ? `${course.section}분반`
                : null,
            ].filter(
              (value): value is string =>
                Boolean(value),
            );

            return {
              id: course.id,
              label: `${
                subject?.name ?? "과목명 없음"
              }${
                details.length > 0
                  ? ` · ${details.join(" · ")}`
                  : ""
              }`,
            };
          })
          .filter(
            (
              option,
            ): option is CourseOption =>
              option !== null,
          );

        setCourseOptions(options);
        setPostType(post.post_type);
        setCourseOfferingId(
          post.course_offering_id,
        );
        setTitle(post.title);
        setContent(post.content ?? "");
        setExistingAttachments(
          (attachmentResult.data ??
            []) as ExistingAttachment[],
        );
      } catch (error) {
        console.error(
          "게시글 수정 정보 조회 실패:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "게시글 정보를 불러오지 못했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (postId) {
      void loadEditPage();
    }
  }, [postId, router]);

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFiles = Array.from(
      event.target.files ?? [],
    );

    event.target.value = "";
    setFileErrorMessage("");

    if (selectedFiles.length === 0) {
      return;
    }

    const currentCount =
      existingAttachments.length +
      newFiles.length;

    const remainingCount =
      MAX_FILE_COUNT - currentCount;

    if (remainingCount <= 0) {
      setFileErrorMessage(
        `첨부파일은 최대 ${MAX_FILE_COUNT}개까지 등록할 수 있습니다.`,
      );
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_FILE_SIZE,
    );

    if (oversizedFile) {
      setFileErrorMessage(
        `${oversizedFile.name} 파일은 20MB를 초과합니다.`,
      );
      return;
    }

    const unsupportedFile =
      selectedFiles.find(
        (file) =>
          !ACCEPTED_EXTENSIONS.has(
            getFileExtension(file.name),
          ),
      );

    if (unsupportedFile) {
      setFileErrorMessage(
        `${unsupportedFile.name} 파일 형식은 등록할 수 없습니다.`,
      );
      return;
    }

    const existingKeys = new Set(
      newFiles.map(
        (file) =>
          `${file.name}-${file.size}-${file.lastModified}`,
      ),
    );

    const uniqueFiles = selectedFiles.filter(
      (file) =>
        !existingKeys.has(
          `${file.name}-${file.size}-${file.lastModified}`,
        ),
    );

    const filesToAdd = uniqueFiles.slice(
      0,
      remainingCount,
    );

    if (uniqueFiles.length > remainingCount) {
      setFileErrorMessage(
        `첨부파일은 최대 ${MAX_FILE_COUNT}개까지 등록할 수 있어 가능한 파일만 추가했습니다.`,
      );
    }

    setNewFiles((previous) => [
      ...previous,
      ...filesToAdd,
    ]);
  };

  const handleRemoveExistingAttachment = (
    attachment: ExistingAttachment,
  ) => {
    setFileErrorMessage("");

    setExistingAttachments((previous) =>
      previous.filter(
        (item) => item.id !== attachment.id,
      ),
    );

    setRemovedAttachments((previous) => [
      ...previous,
      attachment,
    ]);
  };

  const handleRemoveNewFile = (
    fileIndex: number,
  ) => {
    setFileErrorMessage("");

    setNewFiles((previous) =>
      previous.filter(
        (_, index) => index !== fileIndex,
      ),
    );
  };

  const handleUpdate = async () => {
    if (isSubmitting) {
      return;
    }

    if (!courseOfferingId) {
      alert("수업을 선택해주세요.");
      return;
    }

    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!getPlainTextFromHtml(content)) {
      alert("내용을 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFileErrorMessage("");

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

      const uploadedPaths: string[] = [];
      const insertedAttachmentIds: string[] = [];

      try {
        const attachmentRows: {
          post_id: string;
          uploader_id: string;
          original_name: string;
          storage_path: string;
          mime_type: string;
          size_bytes: number;
          display_order: number;
        }[] = [];

        for (
          let index = 0;
          index < newFiles.length;
          index += 1
        ) {
          const file = newFiles[index];
          const extension =
            getFileExtension(file.name);

          const storagePath =
            `${user.id}/${postId}/${crypto.randomUUID()}.${extension}`;

          const { error: uploadError } =
            await supabase.storage
              .from("post-files")
              .upload(storagePath, file, {
                contentType:
                  file.type ||
                  "application/octet-stream",
                cacheControl: "3600",
                upsert: false,
              });

          if (uploadError) {
            throw uploadError;
          }

          uploadedPaths.push(storagePath);

          attachmentRows.push({
            post_id: postId,
            uploader_id: user.id,
            original_name: file.name,
            storage_path: storagePath,
            mime_type:
              file.type ||
              "application/octet-stream",
            size_bytes: file.size,
            display_order:
              existingAttachments.length +
              index,
          });
        }

        if (attachmentRows.length > 0) {
          const {
            data: insertedRows,
            error: insertError,
          } = await supabase
            .from("post_attachments")
            .insert(attachmentRows)
            .select("id");

          if (insertError) {
            throw insertError;
          }

          insertedAttachmentIds.push(
            ...((insertedRows ?? []) as {
              id: string;
            }[]).map((row) => row.id),
          );
        }

        const { error: postUpdateError } =
          await supabase
            .from("posts")
            .update({
              course_offering_id:
                courseOfferingId,
              post_type: postType,
              title: title.trim(),
              content: content.trim(),
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", postId)
            .eq("author_id", user.id);

        if (postUpdateError) {
          throw postUpdateError;
        }

        if (removedAttachments.length > 0) {
          const removedIds =
            removedAttachments.map(
              (attachment) => attachment.id,
            );

          const { error: deleteRowsError } =
            await supabase
              .from("post_attachments")
              .delete()
              .in("id", removedIds)
              .eq("post_id", postId);

          if (deleteRowsError) {
            throw deleteRowsError;
          }

          const removedPaths =
            removedAttachments.map(
              (attachment) =>
                attachment.storage_path,
            );

          const { error: deleteStorageError } =
            await supabase.storage
              .from("post-files")
              .remove(removedPaths);

          if (deleteStorageError) {
            console.error(
              "기존 첨부파일 스토리지 삭제 실패:",
              deleteStorageError,
            );
          }
        }
      } catch (updateError) {
        if (insertedAttachmentIds.length > 0) {
          await supabase
            .from("post_attachments")
            .delete()
            .in("id", insertedAttachmentIds);
        }

        if (uploadedPaths.length > 0) {
          await supabase.storage
            .from("post-files")
            .remove(uploadedPaths);
        }

        throw updateError;
      }

      alert("게시글이 수정되었습니다.");
      router.replace(`/posts/${postId}`);
      router.refresh();
    } catch (error) {
      console.error(
        "게시글 수정 실패:",
        error,
      );

      alert(
        error instanceof Error
          ? `게시글 수정에 실패했습니다.\n${error.message}`
          : "게시글 수정에 실패했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className={styles.page}>
        <div className={styles.editorContainer}>
          게시글 정보를 불러오는 중입니다.
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className={styles.page}>
        <div className={styles.editorContainer}>
          <p>{errorMessage}</p>

          <button
            type="button"
            onClick={() =>
              router.replace(`/posts/${postId}`)
            }
          >
            상세화면으로 돌아가기
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.breadcrumb}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.back()}
            aria-label="이전 페이지로 이동"
          >
            ←
          </button>

          <span>노트 수정</span>
        </div>

        <button
          type="button"
          className={styles.publishButton}
          onClick={handleUpdate}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "수정 중..."
            : "수정 완료"}
        </button>
      </header>

      <div className={styles.editorContainer}>
        <section className={styles.typeSection}>
          <p className={styles.sectionLabel}>
            자료 유형
          </p>

          <div className={styles.typeButtons}>
            <TypeButton
              label="Notes"
              value="notes"
              selectedType={postType}
              onSelect={setPostType}
            />

            <TypeButton
              label="Exam"
              value="exam"
              selectedType={postType}
              onSelect={setPostType}
            />

            <TypeButton
              label="Reference"
              value="reference"
              selectedType={postType}
              onSelect={setPostType}
            />

            <TypeButton
              label="Study Trail"
              value="study_trail"
              selectedType={postType}
              onSelect={setPostType}
            />
          </div>
        </section>

        <div className={styles.formGroup}>
          <label htmlFor="courseOffering">
            수업
          </label>

          <select
            id="courseOffering"
            value={courseOfferingId}
            onChange={(event) =>
              setCourseOfferingId(
                event.target.value,
              )
            }
          >
            <option value="">
              수업을 선택해주세요
            </option>

            {courseOptions.map((course) => (
              <option
                key={course.id}
                value={course.id}
              >
                {course.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="title">제목</label>

          <input
            id="title"
            type="text"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            placeholder="제목을 입력하세요"
            maxLength={150}
          />

          <div className={styles.titleLength}>
            {title.length}/150
          </div>
        </div>

        <section
          className={styles.contentSection}
        >
          <RichTextEditor
            key={`${postId}-${isLoading}`}
            value={content}
            onChange={setContent}
            disabled={isSubmitting}
          />

        </section>

        <section
          className={styles.attachmentSection}
        >
          <div
            className={styles.attachmentHeader}
          >
            <div>
              <p
                className={styles.attachmentTitle}
              >
                첨부파일
              </p>

              <p
                className={
                  styles.attachmentDescription
                }
              >
                PDF, 이미지, Word, PowerPoint 파일을
                파일당 최대 20MB까지 등록할 수 있습니다.
              </p>
            </div>

            <span className={styles.fileCount}>
              {existingAttachments.length +
                newFiles.length}
              /{MAX_FILE_COUNT}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className={styles.hiddenFileInput}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx"
            onChange={handleFileChange}
            disabled={isSubmitting}
          />

          <button
            type="button"
            className={styles.fileSelectButton}
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={
              isSubmitting ||
              existingAttachments.length +
                newFiles.length >=
                MAX_FILE_COUNT
            }
          >
            <span className={styles.uploadIcon}>
              ↑
            </span>

            <span>
              파일 추가하기
            </span>

            <small>
              파일당 최대 20MB · 최대 5개
            </small>
          </button>

          {fileErrorMessage && (
            <p
              style={{
                margin: "10px 0 0",
                color: "var(--cs-error)",
                fontSize: 11,
                lineHeight: 1.5,
              }}
            >
              {fileErrorMessage}
            </p>
          )}

          {(existingAttachments.length > 0 ||
            newFiles.length > 0) && (
            <ul className={styles.fileList}>
              {existingAttachments.map(
                (attachment) => (
                  <li
                    key={attachment.id}
                    className={styles.fileItem}
                  >
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
                        {getFileIcon(
                          attachment.original_name,
                        )}
                      </span>

                      <div
                        className={
                          styles.fileText
                        }
                      >
                        <span
                          className={
                            styles.fileName
                          }
                        >
                          {
                            attachment.original_name
                          }
                        </span>

                        <span
                          className={
                            styles.fileSize
                          }
                        >
                          {formatFileSize(
                            attachment.size_bytes ??
                              0,
                          )}
                          {" · 기존 파일"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={
                        styles.removeFileButton
                      }
                      onClick={() =>
                        handleRemoveExistingAttachment(
                          attachment,
                        )
                      }
                      aria-label={`${attachment.original_name} 삭제`}
                      disabled={isSubmitting}
                    >
                      ×
                    </button>
                  </li>
                ),
              )}

              {newFiles.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className={styles.fileItem}
                >
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
                      {getFileIcon(file.name)}
                    </span>

                    <div
                      className={
                        styles.fileText
                      }
                    >
                      <span
                        className={
                          styles.fileName
                        }
                      >
                        {file.name}
                      </span>

                      <span
                        className={
                          styles.fileSize
                        }
                      >
                        {formatFileSize(
                          file.size,
                        )}
                        {" · 새 파일"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.removeFileButton
                    }
                    onClick={() =>
                      handleRemoveNewFile(index)
                    }
                    aria-label={`${file.name} 삭제`}
                    disabled={isSubmitting}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}

type TypeButtonProps = {
  label: string;
  value: PostType;
  selectedType: PostType;
  onSelect: (type: PostType) => void;
};

function TypeButton({
  label,
  value,
  selectedType,
  onSelect,
}: TypeButtonProps) {
  return (
    <button
      type="button"
      className={
        selectedType === value
          ? styles.activeType
          : styles.typeButton
      }
      onClick={() => onSelect(value)}
    >
      {label}
    </button>
  );
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

  return (
    element.textContent ??
    element.innerText ??
    ""
  ).trim();
}

function getFileExtension(
  fileName: string,
) {
  return (
    fileName
      .split(".")
      .pop()
      ?.toLowerCase() ?? ""
  );
}

function formatFileSize(size: number) {
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

function getFileIcon(fileName: string) {
  const extension =
    fileName.split(".").pop()?.toLowerCase() ??
    "";

  if (extension === "pdf") {
    return "PDF";
  }

  if (
    ["png", "jpg", "jpeg"].includes(extension)
  ) {
    return "IMG";
  }

  if (
    ["ppt", "pptx"].includes(extension)
  ) {
    return "PPT";
  }

  if (
    ["doc", "docx", "hwp", "hwpx"].includes(
      extension,
    )
  ) {
    return "DOC";
  }

  if (extension === "zip") {
    return "ZIP";
  }

  return "FILE";
}
