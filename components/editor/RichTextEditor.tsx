"use client";

import {
  EditorContent,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import styles from "./RichTextEditor.module.css";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function RichTextEditor({
  value,
  onChange,
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2],
        },
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,

    editorProps: {
      attributes: {
        class: styles.proseMirror,
      },
    },

    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className={styles.loading}>
        에디터를 불러오는 중입니다.
      </div>
    );
  }

  return (
    <div
      className={`${styles.editor} ${
        disabled ? styles.disabled : ""
      }`}
    >
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.toolbarButton} ${
            editor.isActive("heading", {
              level: 2,
            })
              ? styles.activeButton
              : ""
          }`}
          disabled={disabled}
          onMouseDown={(event) =>
            event.preventDefault()
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({
                level: 2,
              })
              .run()
          }
        >
          제목
        </button>

        <span
          className={styles.divider}
          aria-hidden="true"
        />

        <button
          type="button"
          className={`${styles.toolbarButton} ${styles.boldButton} ${
            editor.isActive("bold")
              ? styles.activeButton
              : ""
          }`}
          disabled={disabled}
          onMouseDown={(event) =>
            event.preventDefault()
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBold()
              .run()
          }
          aria-label="굵게"
          title="굵게"
        >
          B
        </button>

        <button
          type="button"
          className={`${styles.toolbarButton} ${styles.italicButton} ${
            editor.isActive("italic")
              ? styles.activeButton
              : ""
          }`}
          disabled={disabled}
          onMouseDown={(event) =>
            event.preventDefault()
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleItalic()
              .run()
          }
          aria-label="기울임"
          title="기울임"
        >
          I
        </button>

        <span
          className={styles.divider}
          aria-hidden="true"
        />

        <button
          type="button"
          className={`${styles.toolbarButton} ${
            editor.isActive("bulletList")
              ? styles.activeButton
              : ""
          }`}
          disabled={disabled}
          onMouseDown={(event) =>
            event.preventDefault()
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBulletList()
              .run()
          }
        >
          • 목록
        </button>

        <button
          type="button"
          className={`${styles.toolbarButton} ${
            editor.isActive("orderedList")
              ? styles.activeButton
              : ""
          }`}
          disabled={disabled}
          onMouseDown={(event) =>
            event.preventDefault()
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleOrderedList()
              .run()
          }
        >
          1. 번호
        </button>

        <span
          className={styles.divider}
          aria-hidden="true"
        />

        <button
          type="button"
          className={`${styles.toolbarButton} ${
            editor.isActive("blockquote")
              ? styles.activeButton
              : ""
          }`}
          disabled={disabled}
          onMouseDown={(event) =>
            event.preventDefault()
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBlockquote()
              .run()
          }
        >
          인용
        </button>

        <button
          type="button"
          className={`${styles.toolbarButton} ${
            editor.isActive("codeBlock")
              ? styles.activeButton
              : ""
          }`}
          disabled={disabled}
          onMouseDown={(event) =>
            event.preventDefault()
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleCodeBlock()
              .run()
          }
        >
          코드
        </button>
      </div>

      <EditorContent
        editor={editor}
        className={styles.content}
      />

      <div className={styles.footer}>
        굵게, 목록, 인용, 코드 블록을 사용할 수 있어요.
      </div>
    </div>
  );
}
