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

type ProfileRow = {
  nickname: string | null;
  avatar_url: string | null;
};

export default function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const [keyword, setKeyword] = useState("");

  const [isUserMenuOpen, setIsUserMenuOpen] =
    useState(false);

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const [nickname, setNickname] = useState("내 계정");
  const [email, setEmail] = useState("");
  const [initial, setInitial] = useState("나");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const userMenuRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search,
    );

    setKeyword(params.get("q") ?? "");
  }, [pathname]);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          setNickname("내 계정");
          setEmail("");
          setInitial("나");
          setAvatarUrl(null);
          return;
        }

        setEmail(user.email ?? "");

        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("nickname, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("프로필 조회 실패:", error);
          return;
        }

        const profile = profileData as ProfileRow | null;

        const nextNickname =
          profile?.nickname?.trim() || "내 계정";

        setNickname(nextNickname);
        setInitial(nextNickname.slice(0, 1) || "나");

        const rawAvatarUrl = profile?.avatar_url ?? null;

        if (!rawAvatarUrl) {
          setAvatarUrl(null);
          return;
        }

        if (
          rawAvatarUrl.startsWith("http://") ||
          rawAvatarUrl.startsWith("https://")
        ) {
          setAvatarUrl(rawAvatarUrl);
          return;
        }

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(rawAvatarUrl);

        setAvatarUrl(data.publicUrl);
      } catch (error) {
        console.error("사용자 정보 조회 실패:", error);
      }
    };

    void loadUserProfile();
  }, [pathname]);

  const runSearch = () => {
    const trimmed = keyword.trim();

    if (trimmed) {
      router.push(
        `/search?q=${encodeURIComponent(trimmed)}`,
      );
    } else {
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

  const avatarContent = avatarUrl ? (
    <img
      src={avatarUrl}
      alt="프로필 이미지"
      className={styles.avatarImage}
    />
  ) : (
    initial
  );

  return (
    <header className={styles.header}>
      <div className={styles.searchArea}>
        <input
          type="search"
          placeholder="과목명, 교수님, 학과명을 검색해보세요"
          aria-label="과목 검색"
          value={keyword}
          onChange={(event) =>
            setKeyword(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              runSearch();
            }
          }}
        />

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
            aria-label="사용자 메뉴"
          >
            {avatarContent}
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
                  {avatarContent}
                </div>

                <div>
                  <strong>{nickname}</strong>
                  <span>
                    {email || "이메일 정보 없음"}
                  </span>
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