"use client";

import Link from "next/link";
import TagChip from "@/components/common/TagChip";
import styles from "./page.module.css";

type Subject = {
  id: number;
  name: string;
  description: string;
  period: string;
};

type PostCategory = "notes" | "exam" | "trail";

type RecentPost = {
  id: number;
  category: PostCategory;
  title: string;
  author: string;
  createdAt: string;
  commentCount: number;
};

const subjects: Subject[] = [
  {
    id: 1,
    name: "자료구조",
    description: "트리와 이진탐색 정리",
    period: "3시간 전",
  },
  {
    id: 2,
    name: "운영체제",
    description: "기말문제 3개년 모음",
    period: "5시간 전",
  },
  {
    id: 3,
    name: "웹 프로그래밍",
    description: "과제와 리액트 핵심 정리",
    period: "1일 전",
  },
  {
    id: 4,
    name: "데이터베이스",
    description: "정규화 배우고 회사 사례까지",
    period: "1일 전",
  },
  {
    id: 5,
    name: "컴퓨터 네트워크",
    description: "TCP 3-way handshake 정리",
    period: "2일 전",
  },
  {
    id: 6,
    name: "확률통계",
    description: "베이즈 정리, 실제 사례",
    period: "3일 전",
  },
];

const recentPosts: RecentPost[] = [
  {
    id: 1,
    category: "notes",
    title: "중간고사 범위 필기 정리 (1~5장)",
    author: "황정동",
    createdAt: "2시간 전",
    commentCount: 3,
  },
  {
    id: 2,
    category: "exam",
    title: "학년 기말고사 복원 문제",
    author: "김계현",
    createdAt: "1일 전",
    commentCount: 14,
  },
  {
    id: 3,
    category: "trail",
    title: "DB 정규화 배우고 실제 회사 사례까지 파봤어요",
    author: "스터디원",
    createdAt: "1일 전",
    commentCount: 6,
  },
  {
    id: 4,
    category: "trail",
    title: "트리 배우고 실제 파일시스템 구조까지 찾아봄",
    author: "스터디원",
    createdAt: "3일 전",
    commentCount: 5,
  },
  {
    id: 5,
    category: "notes",
    title: "리덕트 훅 완전 정복 (과제3 대비)",
    author: "박고딩",
    createdAt: "1일 전",
    commentCount: 4,
  },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <p className={styles.sectionLabel}>내 과목</p>

      <div className={styles.subjectGrid}>
        {subjects.map((subject) => (
          <Link
            href={`/subjects/${subject.id}`}
            key={subject.id}
            className={styles.subjectCard}
          >
            <h3 className={styles.subjectName}>{subject.name}</h3>

            <div className={styles.subjectMeta}>
              {subject.description}
            </div>

            <div className={styles.subjectStatus}>
              {subject.period}
            </div>
          </Link>
        ))}
      </div>

      <p className={styles.sectionLabel}>최근 올라온 노트</p>

      <div className={styles.recentList}>
        {recentPosts.map((post) => (
          <Link
            href={`/posts/${post.id}`}
            key={post.id}
            className={styles.recentRow}
          >
            <TagChip tag={post.category} />

            <span className={styles.recentTitle}>{post.title}</span>

            <span className={styles.recentMeta}>
              {post.author}
              <span className={styles.recentMetaGap}>
                {post.createdAt}
              </span>
              <span className={styles.recentMetaGap}>
                댓글 {post.commentCount}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}