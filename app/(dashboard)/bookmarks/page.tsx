"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import TagChip, { TagType } from "@/components/common/TagChip";
import { supabase } from "@/lib/supabase";

type BookmarkDoc = {
  id: string;
  title: string;
  tag: TagType;
  author: string;
  timeAgo: string;
  subjectName: string;
  courseOfferingId: string;
};

type CourseRelation = {
  id: string;
  subjects:
    | { name: string }
    | { name: string }[]
    | null;
};

type PostRelation = {
  id: string;
  title: string;
  post_type: TagType;
  created_at: string;
  course_offering_id: string;
  profiles:
    | { nickname: string | null }
    | { nickname: string | null }[]
    | null;
  course_offerings:
    | CourseRelation
    | CourseRelation[]
    | null;
};

type BookmarkRow = {
  id: string;
  created_at: string;
  posts: PostRelation | PostRelation[] | null;
};

function pickOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function formatRelativeDate(dateString: string) {
  const createdAt = new Date(dateString);
  const now = new Date();

  const difference = Math.max(
    0,
    now.getTime() - createdAt.getTime(),
  );

  const minutes = Math.floor(difference / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(createdAt)
    .replace(/\.$/, "");
}

export default function BookmarkPage() {
  const router = useRouter();

  const [bookmarked, setBookmarked] = useState<BookmarkDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("bookmarks")
          .select(`
            id,
            created_at,
            posts (
              id,
              title,
              post_type,
              created_at,
              course_offering_id,
              profiles:author_id (
                nickname
              ),
              course_offerings (
                id,
                subjects (
                  name
                )
              )
            )
          `)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const rows = (data ?? []) as unknown as BookmarkRow[];

        setBookmarked(
          rows
            .map((row): BookmarkDoc | null => {
              const post = pickOne(row.posts);

              if (!post) {
                return null;
              }

              const profile = pickOne(post.profiles);
              const course = pickOne(post.course_offerings);
              const subject = course
                ? pickOne(course.subjects)
                : null;

              return {
                id: post.id,
                title: post.title,
                tag: post.post_type,
                author: profile?.nickname ?? "익명",
                timeAgo: formatRelativeDate(post.created_at),
                subjectName: subject?.name ?? "",
                courseOfferingId: post.course_offering_id,
              };
            })
            .filter(
              (doc): doc is BookmarkDoc => doc !== null,
            ),
        );
      } catch (error) {
        console.error("북마크 조회 실패:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "북마크를 불러오지 못했습니다.",
        );

        setBookmarked([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadBookmarks();
  }, [router]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}>
      <div style={{ padding: '24px 32px 60px', maxWidth: 780, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: '-0.02em', color: 'var(--cs-ink)' }}>북마크</h1>
          <span style={{ fontSize: 13, color: 'var(--cs-ink-faint)' }}>{bookmarked.length}개</span>
        </div>

        {isLoading ? (
          <div style={{ paddingTop: 60, textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>
            불러오는 중이에요
          </div>
        ) : errorMessage ? (
          <div style={{ paddingTop: 60, textAlign: 'center', color: 'var(--cs-error)', fontSize: 13.5 }}>
            {errorMessage}
          </div>
        ) : bookmarked.length === 0 ? (
          <div style={{ paddingTop: 60, textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>
            북마크한 노트가 없어요
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--cs-border)' }}>
            {bookmarked.map(doc => (
              <div
                key={doc.id}
                onClick={() => router.push(`/posts/${doc.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 4px', borderBottom: '1px solid var(--cs-border)',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--cs-hover-row)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <TagChip tag={doc.tag} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: 'var(--cs-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--cs-ink-faint)', marginTop: 3 }}>
                    {doc.subjectName} · {doc.author} · {doc.timeAgo}
                  </div>
                </div>
                <span style={{ fontSize: 13, color: 'var(--cs-purple-dark)' }}>★</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}