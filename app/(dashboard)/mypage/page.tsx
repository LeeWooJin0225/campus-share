"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import TagChip, { TagType } from "@/components/common/TagChip";
import { supabase } from "@/lib/supabase";

type MyTab = 'notes' | 'comments' | 'bookmarks' | 'points'

type DocItem = {
  id: string;
  title: string;
  tag: TagType;
  timeAgo: string;
  comments: number;
  subjectName: string;
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
  };
}

export default function MyPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<MyTab>('points')
  const [editingNickname, setEditingNickname] = useState(false)
  const [nickname, setNickname] = useState('')

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [balance, setBalance] = useState(0);
  const [myDocs, setMyDocs] = useState<DocItem[]>([]);
  const [myComments, setMyComments] = useState<CommentItem[]>([]);
  const [bookmarked, setBookmarked] = useState<DocItem[]>([]);
  const [pointHistory, setPointHistory] = useState<PointItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
            .select("nickname")
            .eq("id", uid)
            .maybeSingle();

        if (profileError) {
          console.error("프로필 조회 실패:", profileError);
        } else {
          setNickname(
            (profileData as { nickname: string | null } | null)
              ?.nickname ?? "",
          );
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
            rows.map((row): PointItem => ({
              id: row.id,
              desc: row.transaction_type,
              sub: row.description ?? "",
              delta: row.amount,
              date: formatDotDate(row.created_at),
            })),
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
              course_offerings (
                id,
                subjects (
                  name
                )
              )
            `)
            .eq("author_id", uid)
            .eq("is_published", true)
            .order("created_at", { ascending: false });

        if (postError) {
          console.error("내 노트 조회 실패:", postError);
        } else {
          const rows =
            (postData ?? []) as unknown as PostRelation[];

          setMyDocs(rows.map(toDocItem));
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

  const totalPoints = balance;
  const initial = nickname.slice(0, 1) || "나";

  const TABS: { key: MyTab; label: string }[] = [
    { key: 'points',    label: '포인트 내역' },
    { key: 'notes',     label: `내 노트 ${myDocs.length}` },
    { key: 'comments',  label: `내 댓글 ${myComments.length}` },
    { key: 'bookmarks', label: `북마크 ${bookmarked.length}` },
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
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--cs-radius-full)',
            background: 'var(--cs-purple-bg)', color: 'var(--cs-purple-dark)',
            fontSize: 20, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {initial}
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
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--cs-border)', marginBottom: 24 }}>
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
        {activeTab === 'notes' && (
          myDocs.length === 0
            ? <EmptyState text="아직 올린 노트가 없어요." />
            : <DocList docs={myDocs} router={router} />
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
                가입 보너스 50p
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
      </div>
    </div>
  )
}

function DocList({
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
          <span style={{ fontSize: 12, color: 'var(--cs-ink-faint)', flexShrink: 0 }}>댓글 {doc.comments}</span>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ paddingTop: 60, textAlign: 'center', color: 'var(--cs-ink-faint)', fontSize: 13.5 }}>{text}</div>
}