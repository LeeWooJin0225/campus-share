"use client";

import Link from "next/link";

import styles from "./DashboardHeader.module.css";

export default function DashboardHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.searchArea}>
        <span className={styles.searchIcon}>⌕</span>

        <input
          type="search"
          placeholder="과목명, 교수님, 노트 제목을 검색해보세요"
          aria-label="노트 검색"
        />
      </div>

      <div className={styles.headerActions}>
        <Link
          href="/notes/new"
          className={styles.newNoteButton}
        >
          + 새 노트
        </Link>

        <button
          type="button"
          className={styles.profileButton}
          aria-label="프로필"
        >
          나
        </button>
      </div>
    </header>
  );
}