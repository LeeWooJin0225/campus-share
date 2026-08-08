"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import TagChip, { TagType } from "@/components/common/TagChip";
import { supabase } from "@/lib/supabase";

type MyTab = 'purchases' | 'notes' | 'comments' | 'bookmarks' | 'points'

type DocItem = {
  id: string;
  title: string;
  tag: TagType;
  timeAgo: string;
  comments: number;
  subjectName: string;
  isPublished: boolean;
  purchasedAt?: string;
};

type CommentItem = {
  id: string;
  text: string;
  docTitle: string;
  subjectName: string;
  date: string;
};

type PointItem = {
  id: string;
  desc: string;
  sub: string;
  delta: number;
  date: string;
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
  comment_count: number | null;
  is_published: boolean;
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

type PurchaseRow = {
  id: string;
  purchased_at: string;
  posts: PostRelation | PostRelation[] | null;
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  posts: PostRelation | PostRelation[] | null;
};

type PointRow = {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
};

function displayNickname(
  profile: { nickname: string | null; is_deleted?: boolean | null } | null,
) {
  if (profile?.is_deleted) {
    return "탈퇴한 사용자";
  }

  return profile?.nickname ?? "익명";
}

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

function formatDotDate(dateString: string) {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function getPointLabel(
  transactionType: string,
  description: string | null,
) {
  const normalizedDescription =
    description?.trim() ?? "";

  if (
    normalizedDescription.includes("게시글 작성 보상") ||
    normalizedDescription.includes("노트 업로드")
  ) {
    return {
      title: "자료 업로드 보상",
      detail: normalizedDescription || "게시글 작성 보상",
    };
  }

  const labels: Record<
    string,
    { title: string; detail: string }
  > = {
    signup: {
      title: "가입 보너스",
      detail: "회원가입 보상",
    },
    purchase: {
      title: "자료 구매",
      detail: "자료 열람에 사용한 포인트",
    },
    sale: {
      title: "자료 판매",
      detail: "내 자료가 구매되어 받은 포인트",
    },
    refund: {
      title: "포인트 환불",
      detail: "환불된 포인트",
    },
    admin_adjustment: {
      title: "포인트 조정",
      detail: "관리자에 의해 조정된 포인트",
    },
  };

  const fallback = labels[transactionType] ?? {
    title: "포인트 변동",
    detail: transactionType,
  };

  return {
    title: fallback.title,
    detail: normalizedDescription || fallback.detail,
  };
}

function toDocItem(post: PostRelation): DocItem {
  const course = pickOne(post.course_offerings);
  const subject = course ? pickOne(course.subjects) : null;

  return {
    id: post.id,
    title: post.title,
    tag: post.post_type,
    timeAgo: formatRelativeDate(post.created_at),
    comments: post.comment_count ?? 0,
    subjectName: subject?.name ?? "",
    isPublished: post.is_published,
  };
}

export default function MyPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<MyTab>('purchases')
  const [editingNickname, setEditingNickname] = useState(false)
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [balance, setBalance] = useState(0);
  const [myDocs, setMyDocs] = useState<DocItem[]>([]);
  const [purchasedDocs, setPurchasedDocs] = useState<DocItem[]>([]);
  const [myComments, setMyComments] = useState<CommentItem[]>([]);
  const [bookmarked, setBookmarked] = useState<DocItem[]>([]);
  const [pointHistory, setPointHistory] = useState<PointItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawConfirmed, setWithdrawConfirmed] = useState(false);
  const [withdrawText, setWithdrawText] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    const loadMyPage = async () => {
      try {
        setIsLoading(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        const uid = session.user.id;

        setUserId(uid);
        setEmail(session.user.email ?? "");

        /* 프로필 */
        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select("nickname, avatar_url")
            .eq("id", uid)
            .maybeSingle();

        if (profileError) {
          console.error("프로필 조회 실패:", profileError);
        } else {
          const profile = profileData as {
            nickname: string | null;
            avatar_url: string | null;
          } | null;

          setNickname(profile?.nickname ?? "");
          setAvatarUrl(profile?.avatar_url ?? "");
        }

        /* 포인트 지갑 */
        const { data: walletData, error: walletError } =
          await supabase
            .from("point_wallets")
            .select("balance")
            .eq("user_id", uid)
            .maybeSingle();

        if (walletError) {
          console.error("포인트 지갑 조회 실패:", walletError);
        } else {
          setBalance(
            (walletData as { balance: number } | null)
              ?.balance ?? 0,
          );
        }

        /* 포인트 내역 */
        const { data: pointData, error: pointError } =
          await supabase
            .from("point_transactions")
            .select(`
              id,
              amount,
              transaction_type,
              description,
              created_at
            `)
            .eq("user_id", uid)
            .order("created_at", { ascending: false });

        if (pointError) {
          console.error("포인트 내역 조회 실패:", pointError);
        } else {
          const rows =
            (pointData ?? []) as unknown as PointRow[];

          setPointHistory(
            rows.map((row): PointItem => {
              const label = getPointLabel(
                row.transaction_type,
                row.description,
              );

              return {
                id: row.id,
                desc: label.title,
                sub: label.detail,
                delta: row.amount,
                date: formatDotDate(row.created_at),
              };
            }),
          );
        }

        /* 내 노트 */
        const { data: postData, error: postError } =
          await supabase
            .from("posts")
            .select(`
              id,
              title,
              post_type,
              created_at,
              comment_count,
              is_published,
              course_offerings (
                id,
                subjects (
                  name
                )
              )
            `)
            .eq("author_id", uid)
            .order("created_at", { ascending: false });

        if (postError) {
          console.error("내 노트 조회 실패:", postError);
        } else {
          const rows =
            (postData ?? []) as unknown as PostRelation[];

          setMyDocs(rows.map(toDocItem));
        }

        /* 구매한 노트 */
        const { data: purchaseData, error: purchaseError } =
          await supabase
            .from("post_purchases")
            .select(`
              id,
              purchased_at,
              posts:post_id (
                id,
                title,
                post_type,
                created_at,
                comment_count,
                is_published,
                course_offerings (
                  id,
                  subjects (
                    name
                  )
                )
              )
            `)
            .eq("buyer_id", uid)
            .order("purchased_at", { ascending: false });

        if (purchaseError) {
          console.error("구매한 노트 조회 실패:", purchaseError);
        } else {
          const rows =
            (purchaseData ?? []) as unknown as PurchaseRow[];

          setPurchasedDocs(
            rows
              .map((row): DocItem | null => {
                const post = pickOne(row.posts);

                if (!post) {
                  return null;
                }

                return {
                  ...toDocItem(post),
                  purchasedAt: formatDotDate(row.purchased_at),
                };
              })
              .filter(
                (doc): doc is DocItem => doc !== null,
              ),
          );
        }

        /* 내 댓글 */
        const { data: commentData, error: commentError } =
          await supabase
            .from("comments")
            .select(`
              id,
              content,
              created_at,
              posts (
                id,
                title,
                post_type,
                created_at,
                comment_count,
                is_published,
                course_offerings (
                  id,
                  subjects (
                    name
                  )
                )
              )
            `)
            .eq("author_id", uid)
            .order("created_at", { ascending: false });

        if (commentError) {
          console.error("내 댓글 조회 실패:", commentError);
        } else {
          const rows =
            (commentData ?? []) as unknown as CommentRow[];

          setMyComments(
            rows.map((row): CommentItem => {
              const post = pickOne(row.posts);
              const course = post
                ? pickOne(post.course_offerings)
                : null;
              const subject = course
                ? pickOne(course.subjects)
                : null;

              return {
                id: row.id,
                text: row.content,
                docTitle: post?.title ?? "",
                subjectName: subject?.name ?? "",
                date: formatRelativeDate(row.created_at),
              };
            }),
          );
        }

        /* 북마크 */
        const { data: bookmarkData, error: bookmarkError } =
          await supabase
            .from("bookmarks")
            .select(`
              id,
              created_at,
              posts (
                id,
                title,
                post_type,
                created_at,
                comment_count,
                is_published,
                course_offerings (
                  id,
                  subjects (
                    name
                  )
                )
              )
            `)
            .eq("user_id", uid)
            .order("created_at", { ascending: false });

        if (bookmarkError) {
          console.error("북마크 조회 실패:", bookmarkError);
        } else {
          const rows =
            (bookmarkData ?? []) as unknown as BookmarkRow[];

          setBookmarked(
            rows
              .map((row) => {
                const post = pickOne(row.posts);
                return post ? toDocItem(post) : null;
              })
              .filter(
                (doc): doc is DocItem => doc !== null,
              ),
          );
        }
      } catch (error) {
        console.error("마이페이지 조회 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadMyPage();
  }, [router]);

  const saveNickname = async () => {
    setEditingNickname(false);

    if (!userId) return;

    const { error } = await supabase
      .from("profiles")
      .update({ nickname })
      .eq("id", userId);

    if (error) {
      console.error("닉네임 저장 실패:", error);
    }
  };

  const uploadAvatar = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file || !userId || isUploadingAvatar) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 등록할 수 있어요.");
      event.target.value = "";
      return;
    }

    const maxFileSize = 5 * 1024 * 1024;

    if (file.size > maxFileSize) {
      alert("프로필 이미지는 5MB 이하만 등록할 수 있어요.");
      event.target.value = "";
      return;
    }

    try {
      setIsUploadingAvatar(true);

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath =
        `${userId}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) {
        await supabase.storage
          .from("avatars")
          .remove([filePath]);

        throw profileError;
      }

      setAvatarUrl(publicUrl);
    } catch (error) {
      console.error("프로필 이미지 등록 실패:", error);

      alert(
        error instanceof Error
          ? error.message
          : "프로필 이미지를 등록하지 못했어요.",
      );
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const withdrawAccount = async () => {
    if (
      !withdrawConfirmed ||
      withdrawText.trim() !== "회원탈퇴" ||
      isWithdrawing
    ) {
      return;
    }

    try {
      setIsWithdrawing(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("로그인 정보를 확인할 수 없어요.");
      }

      const response = await fetch("/api/account/withdraw", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ?? "회원탈퇴를 처리하지 못했어요.",
        );
      }

      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("회원탈퇴 실패:", error);
      alert(
        error instanceof Error
          ? error.message
          : "회원탈퇴를 처리하지 못했어요.",
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  const publishedDocs = myDocs.filter(
    (doc) => doc.isPublished,
  );
  const stoppedDocs = myDocs.filter(
    (doc) => !doc.isPublished,
  );

  const totalPoints = balance;
  const initial = nickname.slice(0, 1) || "나";

  const TABS: { key: MyTab; label: string }[] = [
    { key: 'purchases', label: `구매한 노트 ${purchasedDocs.length}` },
    { key: 'notes', label: `내 노트 ${myDocs.length}` },
    { key: 'bookmarks', label: `북마크 ${bookmarked.length}` },
    { key: 'comments', label: `내 댓글 ${myComments.length}` },
    { key: 'points', label: '포인트 내역' },
  ]

  if (isLoading) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}>
        <div style={{ padding: '40px 32px', textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>
          불러오는 중이에요
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--cs-surface)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 32px 80px' }}>

        {/* Profile header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20,
          padding: '24px', background: 'var(--cs-card-bg)', borderRadius: 'var(--cs-radius-2xl)',
          border: '1px solid var(--cs-border)', marginBottom: 28,
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              aria-label="프로필 이미지 변경"
              title="프로필 이미지 변경"
              style={{
                width: 56,
                height: 56,
                padding: 0,
                borderRadius: 'var(--cs-radius-full)',
                border: '1px solid var(--cs-border)',
                background: 'var(--cs-purple-bg)',
                color: 'var(--cs-purple-dark)',
                fontSize: 20,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                cursor: isUploadingAvatar ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="프로필"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                initial
              )}
            </button>

            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 20,
                height: 20,
                borderRadius: 'var(--cs-radius-full)',
                border: '2px solid var(--cs-card-bg)',
                background: 'var(--cs-purple)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                pointerEvents: 'none',
              }}
            >
              {isUploadingAvatar ? '…' : '✎'}
            </span>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={uploadAvatar}
              style={{ display: 'none' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingNickname ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <input
                  autoFocus
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveNickname() }}
                  style={{
                    fontSize: 17, fontWeight: 600, fontFamily: 'inherit',
                    border: 'none', borderBottom: '2px solid var(--cs-purple)',
                    outline: 'none', background: 'transparent', color: 'var(--cs-ink)',
                    width: 160,
                  }}
                />
                <button
                  onClick={saveNickname}
                  style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 'var(--cs-radius-md)',
                    background: 'var(--cs-purple)', color: 'var(--cs-surface)',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >저장</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--cs-ink)' }}>{nickname}</span>
                <button
                  onClick={() => setEditingNickname(true)}
                  style={{
                    fontSize: 11.5, color: 'var(--cs-ink-faint)', background: 'none',
                    border: '1px solid var(--cs-border)', borderRadius: 'var(--cs-radius-sm)',
                    padding: '2px 7px', cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cs-border-str)'; e.currentTarget.style.color = 'var(--cs-ink-soft)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cs-border)'; e.currentTarget.style.color = 'var(--cs-ink-faint)' }}
                >프로필 변경</button>
              </div>
            )}
            <div style={{ fontSize: 13, color: 'var(--cs-ink-soft)' }}>{email}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cs-purple)', letterSpacing: '-0.02em' }}>
              {totalPoints}p
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--cs-ink-faint)', marginTop: 2 }}>보유 포인트</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', borderBottom: '1px solid var(--cs-border)', marginBottom: 24 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                background: 'none', border: 'none', padding: '0 14px 10px',
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                color: activeTab === t.key ? 'var(--cs-purple-dark)' : 'var(--cs-ink-soft)',
                fontWeight: activeTab === t.key ? 600 : 400,
                boxShadow: activeTab === t.key ? 'inset 0 -2px 0 var(--cs-purple)' : 'none',
                marginBottom: -1, whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        {activeTab === 'purchases' && (
          purchasedDocs.length === 0
            ? <EmptyState text="아직 구매한 노트가 없어요." />
            : <PurchasedDocList docs={purchasedDocs} router={router} />
        )}

        {activeTab === 'notes' && (
          myDocs.length === 0 ? (
            <EmptyState text="아직 올린 노트가 없어요." />
          ) : (
            <div>
              <DocSection
                title="판매 중"
                count={publishedDocs.length}
                docs={publishedDocs}
                router={router}
                emptyText="현재 판매 중인 노트가 없어요."
              />

              <div style={{ height: 28 }} />

              <DocSection
                title="게시 중단"
                count={stoppedDocs.length}
                docs={stoppedDocs}
                router={router}
                emptyText="게시 중단한 노트가 없어요."
                muted
              />
            </div>
          )
        )}

        {activeTab === 'comments' && (
          myComments.length === 0
            ? <EmptyState text="아직 작성한 댓글이 없어요." />
            : (
              <div style={{ borderTop: '1px solid var(--cs-border)' }}>
                {myComments.map(c => (
                  <div key={c.id} style={{
                    padding: '14px 4px', borderBottom: '1px solid var(--cs-border)',
                  }}>
                    <div style={{ fontSize: 13.5, color: 'var(--cs-ink)', lineHeight: 1.6, marginBottom: 6 }}>
                      &quot;{c.text}&quot;
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--cs-ink-faint)' }}>
                      {c.subjectName} · {c.docTitle} · <span>{c.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
        )}

        {activeTab === 'bookmarks' && (
          bookmarked.length === 0
            ? <EmptyState text="북마크한 노트가 없어요." />
            : <DocList docs={bookmarked} router={router} />
        )}

        {activeTab === 'points' && (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', background: 'var(--cs-purple-bg)', borderRadius: 'var(--cs-radius-xl)',
              marginBottom: 20,
            }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--cs-purple-dark)', marginBottom: 2 }}>현재 보유 포인트</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cs-purple)', letterSpacing: '-0.02em' }}>{totalPoints}p</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--cs-purple-dark)', lineHeight: 1.7, textAlign: 'right' }}>
                노트 열람 시 1p 차감<br />
                노트 업로드 시 30p 적립<br />
                가입 보너스 30p
              </div>
            </div>
            {pointHistory.length === 0 ? (
              <EmptyState text="포인트 내역이 없어요." />
            ) : (
              <div style={{ borderTop: '1px solid var(--cs-border)' }}>
                {pointHistory.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 4px', borderBottom: '1px solid var(--cs-border)',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 'var(--cs-radius-full)', flexShrink: 0,
                      background: p.delta > 0 ? 'var(--cs-ref-bg)' : 'var(--cs-exam-bg)',
                      color: p.delta > 0 ? 'var(--cs-ref-fg)' : 'var(--cs-exam-fg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13,
                    }}>
                      {p.delta > 0 ? '↑' : '↓'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: 'var(--cs-ink)' }}>{p.desc}</div>
                      <div style={{ fontSize: 12, color: 'var(--cs-ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{p.sub}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: p.delta > 0 ? 'var(--cs-ref-fg)' : 'var(--cs-exam-fg)' }}>
                        {p.delta > 0 ? '+' : ''}{p.delta}p
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--cs-ink-faint)', marginTop: 1 }}>{p.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <section
          style={{
            marginTop: 44,
            paddingTop: 20,
            borderTop: '1px solid var(--cs-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--cs-ink-soft)' }}>계정 관리</div>
              <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--cs-ink-faint)' }}>탈퇴 후에는 계정을 다시 사용할 수 없어요.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setWithdrawConfirmed(false);
                setWithdrawText("");
                setShowWithdrawModal(true);
              }}
              style={{
                border: '1px solid var(--cs-border-str)',
                borderRadius: 'var(--cs-radius-md)',
                background: 'var(--cs-surface)',
                color: 'var(--cs-error)',
                padding: '6px 10px',
                fontFamily: 'inherit',
                fontSize: 11.5,
                cursor: 'pointer',
              }}
            >
              회원탈퇴
            </button>
          </div>
        </section>

        {showWithdrawModal && (
          <div
            role="presentation"
            onClick={() => !isWithdrawing && setShowWithdrawModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              background: 'rgba(25, 22, 34, 0.38)',
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="withdraw-title"
              onClick={event => event.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 460,
                border: '1px solid var(--cs-border)',
                borderRadius: 'var(--cs-radius-xl)',
                background: 'var(--cs-surface)',
                padding: 22,
                boxShadow: 'var(--cs-shadow-dropdown)',
              }}
            >
              <h2 id="withdraw-title" style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--cs-ink)' }}>
                회원탈퇴
              </h2>
              <p style={{ margin: '0 0 16px', fontSize: 12.5, lineHeight: 1.7, color: 'var(--cs-ink-soft)' }}>
                탈퇴하면 프로필은 ‘탈퇴한 사용자’로 표시되고 계정으로 다시 로그인할 수 없어요.
              </p>

              <div style={{ padding: 14, borderRadius: 'var(--cs-radius-lg)', background: 'var(--cs-bg)', fontSize: 12, lineHeight: 1.9, color: 'var(--cs-ink-soft)' }}>
                <div>• 이미 구매한 사용자는 자료를 계속 열람·다운로드할 수 있어요.</div>
                <div>• 게시 중인 자료는 유지되어 새 사용자도 기존과 같이 1P로 구매할 수 있어요.</div>
                <div>• 탈퇴 이후 발생하는 판매 포인트는 작성자에게 지급되지 않아요.</div>
                <div>• 탈퇴 후에는 게시글을 수정하거나 삭제할 수 없어요.</div>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 16, fontSize: 12.5, lineHeight: 1.6, color: 'var(--cs-ink)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={withdrawConfirmed}
                  onChange={event => setWithdrawConfirmed(event.target.checked)}
                  disabled={isWithdrawing}
                  style={{ marginTop: 3, accentColor: 'var(--cs-purple)' }}
                />
                <span><strong>작성한 게시글과 자료를 서비스에 유지합니다.</strong> 위 내용을 확인했어요.</span>
              </label>

              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 6, fontSize: 11.5, color: 'var(--cs-ink-faint)' }}>확인을 위해 <strong style={{ color: 'var(--cs-ink-soft)' }}>회원탈퇴</strong>를 입력해주세요.</div>
                <input
                  value={withdrawText}
                  onChange={event => setWithdrawText(event.target.value)}
                  disabled={isWithdrawing}
                  placeholder="회원탈퇴"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: '1px solid var(--cs-border-str)',
                    borderRadius: 'var(--cs-radius-md)',
                    padding: '9px 10px',
                    outline: 'none',
                    background: 'var(--cs-surface)',
                    color: 'var(--cs-ink)',
                    fontFamily: 'inherit',
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={isWithdrawing}
                  style={{
                    border: '1px solid var(--cs-border-str)',
                    borderRadius: 'var(--cs-radius-md)',
                    background: 'var(--cs-surface)',
                    color: 'var(--cs-ink-soft)',
                    padding: '8px 12px',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    cursor: isWithdrawing ? 'not-allowed' : 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void withdrawAccount()}
                  disabled={!withdrawConfirmed || withdrawText.trim() !== '회원탈퇴' || isWithdrawing}
                  style={{
                    border: 0,
                    borderRadius: 'var(--cs-radius-md)',
                    background: 'var(--cs-error)',
                    color: '#fff',
                    padding: '8px 12px',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: !withdrawConfirmed || withdrawText.trim() !== '회원탈퇴' || isWithdrawing ? 'not-allowed' : 'pointer',
                    opacity: !withdrawConfirmed || withdrawText.trim() !== '회원탈퇴' || isWithdrawing ? 0.5 : 1,
                  }}
                >
                  {isWithdrawing ? '탈퇴 처리 중...' : '회원탈퇴'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PurchasedDocList({
  docs,
  router,
}: {
  docs: DocItem[];
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div style={{ borderTop: '1px solid var(--cs-border)' }}>
      {docs.map(doc => (
        <div
          key={doc.id}
          onClick={() => router.push(`/posts/${doc.id}`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '13px 4px',
            borderBottom: '1px solid var(--cs-border)',
            cursor: 'pointer',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--cs-hover-row)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <TagChip tag={doc.tag} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  minWidth: 0,
                  overflow: 'hidden',
                  color: 'var(--cs-ink)',
                  fontSize: 13.5,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {doc.title}
              </div>

              {!doc.isPublished && (
                <span
                  style={{
                    flexShrink: 0,
                    padding: '2px 6px',
                    borderRadius: 'var(--cs-radius-xs)',
                    background: 'var(--cs-bg)',
                    color: 'var(--cs-ink-faint)',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  게시 중단
                </span>
              )}
            </div>

            <div
              style={{
                marginTop: 2,
                color: 'var(--cs-ink-faint)',
                fontSize: 12,
              }}
            >
              {doc.subjectName || '과목 정보 없음'}
              {doc.purchasedAt ? ` · ${doc.purchasedAt} 구매` : ''}
            </div>
          </div>

          <span
            style={{
              flexShrink: 0,
              color: 'var(--cs-ink-faint)',
              fontSize: 12,
            }}
          >
            댓글 {doc.comments}
          </span>
        </div>
      ))}
    </div>
  );
}

function DocSection({
  title,
  count,
  docs,
  router,
  emptyText,
  muted = false,
}: {
  title: string;
  count: number;
  docs: DocItem[];
  router: ReturnType<typeof useRouter>;
  emptyText: string;
  muted?: boolean;
}) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 650, color: muted ? 'var(--cs-ink-soft)' : 'var(--cs-ink)' }}>{title}</h3>
        <span style={{ fontSize: 11, color: 'var(--cs-ink-faint)' }}>{count}</span>
      </div>
      {docs.length === 0 ? (
        <div style={{ padding: '22px 4px', borderTop: '1px solid var(--cs-border)', borderBottom: '1px solid var(--cs-border)', color: 'var(--cs-ink-faint)', fontSize: 12 }}>{emptyText}</div>
      ) : (
        <DocList docs={docs} router={router} showStatus />
      )}
    </section>
  );
}

function DocList({
  docs,
  router,
  showStatus = false,
}: {
  docs: DocItem[];
  router: ReturnType<typeof useRouter>;
  showStatus?: boolean;
}) {
  return (
    <div style={{ borderTop: '1px solid var(--cs-border)' }}>
      {docs.map(doc => (
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
            <div style={{ fontSize: 13.5, color: 'var(--cs-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
            <div style={{ fontSize: 12, color: 'var(--cs-ink-faint)', marginTop: 2 }}>{doc.subjectName} · {doc.timeAgo}</div>
          </div>
          {showStatus && (
            <span
              style={{
                flexShrink: 0,
                padding: '2px 7px',
                borderRadius: 'var(--cs-radius-xs)',
                background: doc.isPublished ? 'var(--cs-ref-bg)' : 'var(--cs-bg)',
                color: doc.isPublished ? 'var(--cs-ref-fg)' : 'var(--cs-ink-faint)',
                fontSize: 10.5,
                fontWeight: 600,
              }}
            >
              {doc.isPublished ? '판매 중' : '게시 중단'}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--cs-ink-faint)', flexShrink: 0 }}>댓글 {doc.comments}</span>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ paddingTop: 60, textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>{text}</div>
}