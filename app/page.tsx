"use client";

import Link from "next/link";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import DashboardHeader from "@/components/layout/DashboardHeader";
import styles from "./page.module.css";

type Subject = {
  id: number;
  name: string;
  description: string;
  period: string;
  color: string;
  notification?: boolean;
};

type RecentPost = {
  id: number;
  category: string;
  categoryClass: string;
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
    color: "#ee9d72",
    notification: true,
  },
  {
    id: 2,
    name: "운영체제",
    description: "기말문제 3개년 모음",
    period: "5시간 전",
    color: "#8da58a",
  },
  {
    id: 3,
    name: "웹 프로그래밍",
    description: "과제와 리액트 핵심 정리",
    period: "1일 전",
    color: "#c69a70",
    notification: true,
  },
  {
    id: 4,
    name: "데이터베이스",
    description: "정규화 배우고 회사 사례까지",
    period: "1일 전",
    color: "#75a0af",
  },
  {
    id: 5,
    name: "컴퓨터 네트워크",
    description: "TCP 3-way handshake 정리",
    period: "2일 전",
    color: "#9aa7b5",
  },
  {
    id: 6,
    name: "확률통계",
    description: "베이즈 정리, 실제 사례",
    period: "3일 전",
    color: "#9e8cb5",
  },
];

const recentPosts: RecentPost[] = [
  {
    id: 1,
    category: "Notes",
    categoryClass: "notes",
    title: "중간고사 범위 필기 정리 (1~5장)",
    author: "황정동",
    createdAt: "2시간 전",
    commentCount: 3,
  },
  {
    id: 2,
    category: "Exam",
    categoryClass: "exam",
    title: "학년 기말고사 복원 문제",
    author: "김계현",
    createdAt: "1일 전",
    commentCount: 14,
  },
  {
    id: 3,
    category: "↗ Study Trail",
    categoryClass: "study",
    title: "DB 정규화 배우고 실제 회사 사례까지 파봤어요",
    author: "스터디원",
    createdAt: "1일 전",
    commentCount: 6,
  },
  {
    id: 4,
    category: "↗ Study Trail",
    categoryClass: "study",
    title: "트리 배우고 실제 파일시스템 구조까지 찾아봄",
    author: "스터디원",
    createdAt: "3일 전",
    commentCount: 5,
  },
  {
    id: 5,
    category: "Notes",
    categoryClass: "notes",
    title: "리덕트 훅 완전 정복 (과제3 대비)",
    author: "박고딩",
    createdAt: "1일 전",
    commentCount: 4,
  },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <DashboardSidebar />
      
      <section className={styles.contentArea}>
        <DashboardHeader />

        <div className={styles.dashboard}>
          <section className={styles.recentSubjectCard}>
            <p className={styles.smallLabel}>이어서</p>

            <Link href="/subjects/data-structure">
              자료구조 · 트리와 이진탐색 정리
            </Link>

            <span>3분 전까지 보고 있었어요</span>
          </section>

          <section className={styles.subjectsSection}>
            <h2>내 과목</h2>

            <div className={styles.subjectGrid}>
              {subjects.map((subject) => (
                <Link
                  href={`/subjects/${subject.id}`}
                  key={subject.id}
                  className={styles.subjectCard}
                >
                  <div className={styles.subjectCardHeader}>
                    <div>
                      <span
                        className={styles.subjectDot}
                        style={{
                          backgroundColor: subject.color,
                        }}
                      />

                      <strong>{subject.name}</strong>
                    </div>

                    {subject.notification && (
                      <span className={styles.notificationDot} />
                    )}
                  </div>

                  <p>{subject.description}</p>
                  <span>{subject.period}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.recentSection}>
            <h2>최근 학습 기록</h2>

            <div className={styles.recentList}>
              {recentPosts.map((post) => (
                <Link
                  href={`/posts/${post.id}`}
                  key={post.id}
                  className={styles.recentRow}
                >
                  <div className={styles.postMain}>
                    <span
                      className={`${styles.categoryBadge} ${styles[post.categoryClass]
                        }`}
                    >
                      {post.category}
                    </span>

                    <strong>{post.title}</strong>
                  </div>

                  <div className={styles.postMeta}>
                    <span>
                      {post.author} · {post.createdAt}
                    </span>

                    <span>댓글 {post.commentCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}