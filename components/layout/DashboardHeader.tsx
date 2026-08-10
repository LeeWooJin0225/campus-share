"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import styles from "./DashboardHeader.module.css";

export default function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();

  /* 검색창에 입력 중인 글자를 담아두는 상태 */
  const [keyword, setKeyword] = useState("");

  const [isUserMenuOpen, setIsUserMenuOpen] =
    useState(false);

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const userMenuRef =
    useRef<HTMLDivElement>(null);

  /* 페이지가 바뀔 때 주소창의 q 값을 검색창에 다시 채워줍니다.
     - /search?q=이산수학 링크를 직접 열어도 검색창에 글자가 보입니다
     - 뒤로가기를 눌렀을 때 검색창과 목록이 어긋나지 않습니다 */
  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search,
    );

    setKeyword(params.get("q") ?? "");
  }, [pathname]);

  /* 실제로 검색을 실행하는 함수 (Enter와 버튼이 같이 사용) */
  const runSearch = () => {
    const trimmed = keyword.trim();

    if (trimmed) {
      /* encodeURIComponent: 한글이나 공백을 주소에 안전하게 담아줍니다 */
      router.push(
        `/search?q=${encodeURIComponent(trimmed)}`,
      );
    } else {
      /* 빈 칸으로 검색하면 전체 목록으로 */
      router.push("/search");
    }
  };

  useEffect(() => {
    const handleOutsideClick = (
      event: MouseEvent,
    ) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "로그아웃 오류:",
          error,
        );

        alert(
          "로그아웃하지 못했습니다. 다시 시도해주세요.",
        );

        return;
      }

      setIsUserMenuOpen(false);

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "로그아웃 예외:",
        error,
      );

      alert(
        "로그아웃 중 오류가 발생했습니다.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.searchArea}>
        <input
          type="search"
          placeholder="과목명, 교수님, 학과명을 검색해보세요"
          aria-label="과목 검색"
          /* value + onChange 한 쌍이 있어야 입력한 글자가 state에 담깁니다 */
          value={keyword}
          onChange={(event) =>
            setKeyword(event.target.value)
          }
          /* Enter를 누르면 검색 실행 */
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              runSearch();
            }
          }}
        />

        {/* 돋보기 검색 버튼 — Enter와 똑같이 runSearch를 호출합니다 */}
        <button
          type="button"
          onClick={runSearch}
          className={styles.searchButton}
          aria-label="검색"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
        </button>
      </div>

      <div className={styles.headerActions}>
        <Link
          href="/notes/new"
          className={styles.newNoteButton}
        >
          ＋ 새 노트
        </Link>

        <div
          className={styles.userMenuWrapper}
          ref={userMenuRef}
        >
          <button
            type="button"
            className={styles.userButton}
            onClick={() =>
              setIsUserMenuOpen(
                (previous) => !previous,
              )
            }
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
          >
            나
          </button>

          {isUserMenuOpen && (
            <div
              className={styles.userMenu}
              role="menu"
            >
              <div
                className={
                  styles.userMenuHeader
                }
              >
                <div
                  className={
                    styles.userAvatar
                  }
                >
                  나
                </div>

                <div>
                  <strong>내 계정</strong>
                  <span>CampusShare</span>
                </div>
              </div>

              <button
                type="button"
                className={
                  styles.logoutButton
                }
                onClick={handleLogout}
                disabled={isLoggingOut}
                role="menuitem"
              >
                <span aria-hidden="true">
                  ↪
                </span>

                {isLoggingOut
                  ? "로그아웃 중..."
                  : "로그아웃"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}