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
    extensions: [StarterKit],

    content: value,

    editable: !disabled,

    immediatelyRender: false,

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
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={
            editor.isActive("heading", {
              level: 2,
            })
              ? styles.activeButton
              : ""
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({ level: 2 })
              .run()
          }
        >
          제목
        </button>

        <button
          type="button"
          className={
            editor.isActive("bold")
              ? styles.activeButton
              : ""
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBold()
              .run()
          }
        >
          굵게
        </button>

        <button
          type="button"
          className={
            editor.isActive("italic")
              ? styles.activeButton
              : ""
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleItalic()
              .run()
          }
        >
          기울임
        </button>

        <button
          type="button"
          className={
            editor.isActive("bulletList")
              ? styles.activeButton
              : ""
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBulletList()
              .run()
          }
        >
          목록
        </button>

        <button
          type="button"
          className={
            editor.isActive("orderedList")
              ? styles.activeButton
              : ""
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleOrderedList()
              .run()
          }
        >
          번호
        </button>

        <button
          type="button"
          className={
            editor.isActive("blockquote")
              ? styles.activeButton
              : ""
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
          className={
            editor.isActive("codeBlock")
              ? styles.activeButton
              : ""
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
    </div>
  );
}