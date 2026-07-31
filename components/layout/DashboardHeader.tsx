"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import styles from "./DashboardHeader.module.css";

export default function DashboardHeader() {
  const router = useRouter();

  const [isUserMenuOpen, setIsUserMenuOpen] =
    useState(false);

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const userMenuRef =
    useRef<HTMLDivElement>(null);

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
        <span className={styles.searchIcon}>
          ⌕
        </span>

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