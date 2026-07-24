"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import styles from "./materials.module.css";

type Material = {
    id: number;
    title: string;
    description: string;
    subject: string;
    category: string;
    department: string;
    semester: string;
    fileType: "PDF" | "DOCX" | "PPTX";
    uploader: string;
    uploaderInitial: string;
    rating: number;
    downloads: number;
    points: number;
    createdAt: string;
    aiSummary: boolean;
};

const materialList: Material[] = [
    {
        id: 1,
        title: "자료구조 기말고사 핵심 요약본",
        description:
            "스택, 큐, 트리, 그래프 단원을 시험 범위 중심으로 정리한 자료입니다.",
        subject: "자료구조",
        category: "요약본",
        department: "컴퓨터공학과",
        semester: "2026-1학기",
        fileType: "PDF",
        uploader: "공부왕",
        uploaderInitial: "공",
        rating: 4.8,
        downloads: 342,
        points: 100,
        createdAt: "2026-07-20",
        aiSummary: true,
    },
    {
        id: 2,
        title: "운영체제 강의 전체 정리",
        description:
            "프로세스부터 가상 메모리까지 강의 내용을 주차별로 정리했습니다.",
        subject: "운영체제",
        category: "강의자료",
        department: "컴퓨터공학과",
        semester: "2026-1학기",
        fileType: "DOCX",
        uploader: "자료수집가",
        uploaderInitial: "자",
        rating: 4.6,
        downloads: 278,
        points: 150,
        createdAt: "2026-07-18",
        aiSummary: true,
    },
    {
        id: 3,
        title: "전자회로 중간고사 기출문제",
        description:
            "전자회로 중간고사 대비용 기출문제와 간단한 풀이를 포함했습니다.",
        subject: "전자회로",
        category: "시험자료",
        department: "전자공학과",
        semester: "2025-2학기",
        fileType: "PDF",
        uploader: "열정학생",
        uploaderInitial: "열",
        rating: 4.7,
        downloads: 215,
        points: 120,
        createdAt: "2026-07-16",
        aiSummary: false,
    },
    {
        id: 4,
        title: "데이터베이스 정규화 발표자료",
        description:
            "제1정규형부터 BCNF까지 예시와 함께 정리한 발표 자료입니다.",
        subject: "데이터베이스",
        category: "강의자료",
        department: "컴퓨터공학과",
        semester: "2026-1학기",
        fileType: "PPTX",
        uploader: "팀플천재",
        uploaderInitial: "팀",
        rating: 4.5,
        downloads: 188,
        points: 80,
        createdAt: "2026-07-14",
        aiSummary: false,
    },
    {
        id: 5,
        title: "확률과 통계 시험 전 공식 정리",
        description:
            "중간·기말 시험에 자주 나오는 공식과 대표 문제를 정리했습니다.",
        subject: "확률과통계",
        category: "필기",
        department: "통계학과",
        semester: "2026-1학기",
        fileType: "PDF",
        uploader: "깐깐한리뷰어",
        uploaderInitial: "깐",
        rating: 4.9,
        downloads: 176,
        points: 100,
        createdAt: "2026-07-12",
        aiSummary: true,
    },
];

const categories = [
    "전체",
    "강의자료",
    "시험자료",
    "필기",
    "요약본",
];

const recommendedKeywords = [
    "자료구조",
    "운영체제",
    "전자회로",
    "기말고사",
    "요약본",
];

export default function MaterialsPage() {
    const [searchInput, setSearchInput] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedCategory, setSelectedCategory] =
        useState("전체");
    const [sortOption, setSortOption] = useState("latest");

    const materials = useMemo(() => {
        const normalizedKeyword = searchKeyword
            .trim()
            .toLowerCase();

        const filtered = materialList.filter((material) => {
            const matchesCategory =
                selectedCategory === "전체" ||
                material.category === selectedCategory;

            const searchableText = [
                material.title,
                material.description,
                material.subject,
                material.department,
                material.uploader,
            ]
                .join(" ")
                .toLowerCase();

            const matchesKeyword =
                !normalizedKeyword ||
                searchableText.includes(normalizedKeyword);

            return matchesCategory && matchesKeyword;
        });

        return [...filtered].sort((a, b) => {
            if (sortOption === "downloads") {
                return b.downloads - a.downloads;
            }

            if (sortOption === "rating") {
                return b.rating - a.rating;
            }

            if (sortOption === "pointsLow") {
                return a.points - b.points;
            }

            return (
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            );
        });
    }, [searchKeyword, selectedCategory, sortOption]);

    const handleSearch = (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        setSearchKeyword(searchInput);
    };

    const handleKeywordClick = (keyword: string) => {
        setSearchInput(keyword);
        setSearchKeyword(keyword);
    };

    const resetFilters = () => {
        setSearchInput("");
        setSearchKeyword("");
        setSelectedCategory("전체");
        setSortOption("latest");
    };

    return (
        <div className={styles.site}>
            <header className={styles.header}>
                <Link href="/" className={styles.brand}>
                    <span className={styles.logoMark}>C</span>

                    <span>
                        <strong>CampusShare</strong>
                        <small>학생 자료 공유 플랫폼</small>
                    </span>
                </Link>

                <nav className={styles.navigation}>
                    <Link href="/" className={styles.navLink}>
                        홈
                    </Link>

                    <Link
                        href="/materials"
                        className={`${styles.navLink} ${styles.activeNav}`}
                    >
                        자료실
                    </Link>

                    <Link href="/reviews" className={styles.navLink}>
                        후기
                    </Link>

                    <Link
                        href="/ai-summary"
                        className={styles.navLink}
                    >
                        AI 요약
                    </Link>

                    <Link
                        href="/community"
                        className={styles.navLink}
                    >
                        커뮤니티
                    </Link>
                </nav>

                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="알림"
                    >
                        ♢
                        <span className={styles.notificationDot} />
                    </button>

                    <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="쪽지"
                    >
                        ✉
                    </button>

                    <Link href="/mypage" className={styles.profile}>
                        <span className={styles.profileAvatar}>김</span>
                        <span>김학생</span>
                    </Link>
                </div>
            </header>

            <main className={styles.page}>
                <div className={styles.layout}>
                    <section className={styles.content}>
                        <section className={styles.hero}>
                            <div className={styles.heroContent}>
                                <p className={styles.heroEyebrow}>
                                    CAMPUS ARCHIVE
                                </p>

                                <h1>
                                    필요한 강의자료를
                                    <br />
                                    빠르게 찾아보세요
                                </h1>

                                <p className={styles.heroDescription}>
                                    강의자료부터 시험자료, 필기와 요약본까지
                                    <br />
                                    필요한 자료를 한곳에서 확인할 수 있어요.
                                </p>

                                <form
                                    className={styles.searchForm}
                                    onSubmit={handleSearch}
                                >
                                    <input
                                        type="search"
                                        placeholder="과목명이나 자료명을 검색해보세요"
                                        value={searchInput}
                                        onChange={(event) =>
                                            setSearchInput(event.target.value)
                                        }
                                    />

                                    <button type="submit" aria-label="검색">
                                        🔍
                                    </button>
                                </form>

                                <div className={styles.keywordList}>
                                    {recommendedKeywords.map((keyword) => (
                                        <button
                                            key={keyword}
                                            type="button"
                                            onClick={() =>
                                                handleKeywordClick(keyword)
                                            }
                                        >
                                            #{keyword}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.heroVisual}>
                                <div className={styles.smallPaper}>
                                    PDF
                                </div>

                                <div className={`${styles.book} ${styles.bookBack}`} />
                                <div className={`${styles.book} ${styles.bookMiddle}`} />
                                <div className={`${styles.book} ${styles.bookFront}`} />

                                <div className={styles.graduationCap}>
                                    <span className={styles.capTop} />
                                    <span className={styles.capBody} />
                                    <span className={styles.capString} />
                                </div>

                                <div className={styles.ratingBubble}>
                                    ★★★★★
                                </div>
                            </div>
                        </section>

                        <section className={styles.filterPanel}>
                            <div className={styles.categoryArea}>
                                <span className={styles.filterTitle}>
                                    자료 유형
                                </span>

                                <div className={styles.categoryButtons}>
                                    {categories.map((category) => (
                                        <button
                                            key={category}
                                            type="button"
                                            className={
                                                selectedCategory === category
                                                    ? styles.selectedCategory
                                                    : ""
                                            }
                                            onClick={() =>
                                                setSelectedCategory(category)
                                            }
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <select
                                className={styles.sortSelect}
                                value={sortOption}
                                onChange={(event) =>
                                    setSortOption(event.target.value)
                                }
                                aria-label="자료 정렬"
                            >
                                <option value="latest">최신순</option>
                                <option value="downloads">
                                    다운로드순
                                </option>
                                <option value="rating">평점순</option>
                                <option value="pointsLow">
                                    낮은 포인트순
                                </option>
                            </select>
                        </section>

                        <div className={styles.resultHeader}>
                            <div>
                                <h2>전체 자료</h2>

                                <p>
                                    총 <strong>{materials.length}</strong>개의
                                    자료가 있습니다.
                                </p>
                            </div>

                            <Link
                                href="/materials/new"
                                className={styles.mobileUploadButton}
                            >
                                + 자료 업로드
                            </Link>
                        </div>

                        {materials.length > 0 ? (
                            <div className={styles.materialList}>
                                {materials.map((material) => (
                                    <article
                                        key={material.id}
                                        className={styles.materialCard}
                                    >
                                        <Link
                                            href={`/materials/${material.id}`}
                                            className={styles.thumbnail}
                                            aria-label={`${material.title} 상세보기`}
                                        >
                                            <span
                                                className={`${styles.fileBadge} ${styles[
                                                    `file${material.fileType}`
                                                    ]
                                                    }`}
                                            >
                                                {material.fileType}
                                            </span>

                                            <div className={styles.documentPreview}>
                                                <span />
                                                <span />
                                                <span />
                                                <span />
                                                <span />
                                            </div>
                                        </Link>

                                        <div className={styles.materialContent}>
                                            <div className={styles.badgeRow}>
                                                <span className={styles.categoryBadge}>
                                                    {material.category}
                                                </span>

                                                {material.aiSummary && (
                                                    <span className={styles.aiBadge}>
                                                        ✨ AI 요약 제공
                                                    </span>
                                                )}
                                            </div>

                                            <Link
                                                href={`/materials/${material.id}`}
                                                className={styles.materialTitle}
                                            >
                                                {material.title}
                                            </Link>

                                            <p className={styles.materialDescription}>
                                                {material.description}
                                            </p>

                                            <div className={styles.materialMeta}>
                                                <span>{material.subject}</span>
                                                <span>{material.department}</span>
                                                <span>{material.semester}</span>
                                            </div>

                                            <div className={styles.materialFooter}>
                                                <div className={styles.uploader}>
                                                    <span className={styles.uploaderAvatar}>
                                                        {material.uploaderInitial}
                                                    </span>

                                                    <span>{material.uploader}</span>
                                                </div>

                                                <div className={styles.stats}>
                                                    <span className={styles.rating}>
                                                        ★ {material.rating}
                                                    </span>

                                                    <span>
                                                        ↓ {material.downloads.toLocaleString()}
                                                    </span>

                                                    <span className={styles.points}>
                                                        <b>P</b>
                                                        {material.points}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className={styles.bookmarkButton}
                                            aria-label="관심 자료 등록"
                                        >
                                            ♡
                                        </button>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <section className={styles.emptyState}>
                                <span className={styles.emptyIcon}>🔎</span>
                                <h3>검색 결과가 없습니다.</h3>
                                <p>
                                    다른 과목명이나 키워드로 검색해보세요.
                                </p>

                                <button type="button" onClick={resetFilters}>
                                    필터 초기화
                                </button>
                            </section>
                        )}

                        {materials.length > 0 && (
                            <nav
                                className={styles.pagination}
                                aria-label="자료 목록 페이지"
                            >
                                <button type="button" disabled>
                                    ‹
                                </button>
                                <button
                                    type="button"
                                    className={styles.currentPage}
                                >
                                    1
                                </button>
                                <button type="button">2</button>
                                <button type="button">3</button>
                                <button type="button">4</button>
                                <button type="button">5</button>
                                <button type="button">›</button>
                            </nav>
                        )}
                    </section>

                    <aside className={styles.sidebar}>
                        <section
                            className={`${styles.sideCard} ${styles.uploadCard}`}
                        >
                            <span className={styles.uploadIcon}>＋</span>

                            <h2>자료를 공유해보세요</h2>

                            <p>
                                유용한 자료를 업로드하고
                                <br />
                                포인트를 받아보세요.
                            </p>

                            <Link href="/materials/new">
                                자료 업로드
                            </Link>
                        </section>

                        <section className={styles.sideCard}>
                            <div className={styles.sideTitle}>
                                <h2>인기 자료 TOP 5</h2>
                                <Link href="/materials?sort=popular">
                                    더보기 ›
                                </Link>
                            </div>

                            <ol className={styles.popularList}>
                                {materialList.slice(0, 5).map((material, index) => (
                                    <li key={material.id}>
                                        <strong>{index + 1}</strong>

                                        <Link href={`/materials/${material.id}`}>
                                            <span>{material.title}</span>
                                            <small>{material.subject}</small>
                                        </Link>

                                        <em>{material.downloads}</em>
                                    </li>
                                ))}
                            </ol>
                        </section>

                        <section className={styles.sideCard}>
                            <div className={styles.sideTitle}>
                                <h2>인기 검색어</h2>
                            </div>

                            <div className={styles.sideKeywords}>
                                {recommendedKeywords.map((keyword) => (
                                    <button
                                        key={keyword}
                                        type="button"
                                        onClick={() =>
                                            handleKeywordClick(keyword)
                                        }
                                    >
                                        #{keyword}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className={styles.sideCard}>
                            <div className={styles.sideTitle}>
                                <h2>최근 본 자료</h2>
                                <Link href="/mypage/recent">더보기 ›</Link>
                            </div>

                            <div className={styles.recentList}>
                                {materialList.slice(0, 3).map((material) => (
                                    <Link
                                        key={material.id}
                                        href={`/materials/${material.id}`}
                                    >
                                        <span
                                            className={`${styles.recentFile} ${styles[
                                                `file${material.fileType}`
                                                ]
                                                }`}
                                        >
                                            {material.fileType}
                                        </span>

                                        <span>
                                            <strong>{material.title}</strong>
                                            <small>{material.subject}</small>
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    </aside>
                </div>
            </main>
        </div>
    );
}