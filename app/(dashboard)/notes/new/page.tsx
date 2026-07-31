"use client";

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import styles from "./new-note.module.css";
import RichTextEditor from "@/components/editor/RichTextEditor";

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

type UserCourseRow = {
  course_offering_id: string;
  course_offerings: CourseRelation | CourseRelation[] | null;
};

const MAX_FILE_COUNT = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 파일당 20MB

export default function NewNotePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postType, setPostType] =
    useState<PostType>("notes");
  const [courseOfferingId, setCourseOfferingId] =
    useState("");
  const [courseOptions, setCourseOptions] =
    useState<CourseOption[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] =
    useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    const loadMyCourses = async () => {
      try {
        setIsLoadingCourses(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          alert("로그인이 필요합니다.");
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
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
          .eq("user_id", user.id);

        if (error) {
          throw error;
        }

        const rows = (data ?? []) as unknown as UserCourseRow[];

        const options = rows
          .map((item): CourseOption | null => {
            const rawCourse = item.course_offerings;
            const course = Array.isArray(rawCourse)
              ? rawCourse[0]
              : rawCourse;

            if (!course) {
              return null;
            }

            const subject = Array.isArray(course.subjects)
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
              label: `${subject?.name ?? "과목명 없음"
                }${details.length > 0
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
      } catch (error) {
        console.error(
          "수강 과목 조회 실패:",
          error,
        );
        alert(
          "수강 과목을 불러오지 못했습니다.",
        );
      } finally {
        setIsLoadingCourses(false);
      }
    };

    void loadMyCourses();
  }, [router]);

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFiles = Array.from(
      event.target.files ?? [],
    );

    if (selectedFiles.length === 0) {
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_FILE_SIZE,
    );

    if (oversizedFile) {
      alert(
        `${oversizedFile.name} 파일은 20MB를 초과합니다.`,
      );
      event.target.value = "";
      return;
    }

    const newFiles = selectedFiles.filter(
      (selectedFile) =>
        !files.some(
          (existingFile) =>
            existingFile.name ===
            selectedFile.name &&
            existingFile.size ===
            selectedFile.size &&
            existingFile.lastModified ===
            selectedFile.lastModified,
        ),
    );

    if (
      files.length + newFiles.length >
      MAX_FILE_COUNT
    ) {
      alert(
        `첨부파일은 최대 ${MAX_FILE_COUNT}개까지 등록할 수 있습니다.`,
      );
      event.target.value = "";
      return;
    }

    setFiles((previousFiles) => [
      ...previousFiles,
      ...newFiles,
    ]);

    event.target.value = "";
  };

  const handleRemoveFile = (
    fileIndex: number,
  ) => {
    setFiles((previousFiles) =>
      previousFiles.filter(
        (_, index) => index !== fileIndex,
      ),
    );
  };

  const handlePublish = async () => {
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

    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    let createdPostId: string | null = null;
    const uploadedPaths: string[] = [];

    try {
      setIsSubmitting(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        alert("로그인이 필요합니다.");
        router.replace("/login");
        return;
      }

      const { data: post, error: postError } =
        await supabase
          .from("posts")
          .insert({
            author_id: user.id,
            course_offering_id:
              courseOfferingId,
            post_type: postType,
            title: title.trim(),
            content: content.trim(),
            is_published: true,
          })
          .select("id")
          .single();

      if (postError) {
        throw postError;
      }

      createdPostId = post.id;

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
        index < files.length;
        index += 1
      ) {
        const file = files[index];

        const extension =
          file.name
            .split(".")
            .pop()
            ?.toLowerCase() ?? "file";

        const storageFileName =
          `${crypto.randomUUID()}.${extension}`;

        const storagePath =
          `${user.id}/${post.id}/${storageFileName}`;

        const { error: uploadError } =
          await supabase.storage
            .from("post-files")
            .upload(storagePath, file, {
              contentType:
                file.type ||
                "application/octet-stream",
              upsert: false,
            });

        if (uploadError) {
          throw uploadError;
        }

        uploadedPaths.push(storagePath);

        attachmentRows.push({
          post_id: post.id,
          uploader_id: user.id,
          original_name: file.name,
          storage_path: storagePath,
          mime_type:
            file.type ||
            "application/octet-stream",
          size_bytes: file.size,
          display_order: index,
        });
      }

      if (attachmentRows.length > 0) {
        const { error: attachmentError } =
          await supabase
            .from("post_attachments")
            .insert(attachmentRows);

        if (attachmentError) {
          throw attachmentError;
        }
      }

      alert("게시글이 등록되었습니다.");
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(
        "게시글 등록 실패:",
        error,
      );

      if (uploadedPaths.length > 0) {
        const {
          error: storageCleanupError,
        } = await supabase.storage
          .from("post-files")
          .remove(uploadedPaths);

        if (storageCleanupError) {
          console.error(
            "업로드 파일 정리 실패:",
            storageCleanupError,
          );
        }
      }

      if (createdPostId) {
        const { error: postCleanupError } =
          await supabase
            .from("posts")
            .delete()
            .eq("id", createdPostId);

        if (postCleanupError) {
          console.error(
            "게시글 정리 실패:",
            postCleanupError,
          );
        }
      }

      const message =
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";

      alert(
        `게시글 등록에 실패했습니다.\n${message}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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

          <span>새 노트</span>
        </div>

        <button
          type="button"
          className={styles.publishButton}
          onClick={handlePublish}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "게시 중..."
            : "게시하기"}
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
            disabled={isLoadingCourses}
          >
            <option value="">
              {isLoadingCourses
                ? "수강 과목을 불러오는 중입니다"
                : "수업을 선택해주세요"}
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

          {!isLoadingCourses &&
            courseOptions.length === 0 && (
              <p
                className={styles.courseNotice}
              >
                등록된 수강 과목이 없습니다.
                먼저 내 과목을 등록해주세요.
              </p>
            )}
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
            value={content}
            onChange={setContent}
            disabled={isSubmitting}
          />

          <footer
            className={styles.editorFooter}
          >
            <span>
              마크다운 문법을 사용할 수
              있습니다.
            </span>

            <span>{content.length}자</span>
          </footer>
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
                PDF, 문서, 이미지, 압축파일을
                첨부할 수 있습니다.
              </p>
            </div>

            <span className={styles.fileCount}>
              {files.length}/{MAX_FILE_COUNT}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className={styles.hiddenFileInput}
            accept=".pdf,.ppt,.pptx,.doc,.docx,.hwp,.hwpx,.txt,.zip,.png,.jpg,.jpeg"
            onChange={handleFileChange}
          />

          <button
            type="button"
            className={
              styles.fileSelectButton
            }
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={
              files.length >= MAX_FILE_COUNT
            }
          >
            <span className={styles.uploadIcon}>
              ↑
            </span>

            <span>
              {files.length >= MAX_FILE_COUNT
                ? "첨부 가능한 파일 수를 모두 채웠습니다"
                : "파일을 선택하거나 여기에 추가해주세요"}
            </span>

            <small>
              파일당 최대 20MB · 최대 5개
            </small>
          </button>

          {files.length > 0 && (
            <ul className={styles.fileList}>
              {files.map((file, index) => (
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
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.removeFileButton
                    }
                    onClick={() =>
                      handleRemoveFile(index)
                    }
                    aria-label={`${file.name} 삭제`}
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