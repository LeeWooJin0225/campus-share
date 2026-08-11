"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AdminPost = {
  id: string;
  title: string;
  post_type: string;
  created_at: string;
  author_id: string;
  course_offering_id: string;
  is_published: boolean;
  is_admin_hidden: boolean;
  moderation_reason: string | null;
  author_nickname: string;
  author_is_deleted: boolean;
  subject_name: string;
  professor_name: string;
  purchase_count: number;
};

type ApiResponse = { posts: AdminPost[] };

type ModalState =
  | { mode: "hide"; post: AdminPost }
  | { mode: "restore"; post: AdminPost }
  | null;

type ToastState = {
  message: string;
  type: "success" | "error";
} | null;

const MODERATION_REASONS = [
  "부적절한 콘텐츠",
  "저작권 침해 의심",
  "잘못된 자료 또는 허위 정보",
  "중복·도배 게시글",
  "개인정보 노출",
  "첨부파일 문제",
  "운영 정책 위반",
  "기타",
] as const;

type ModerationReasonOption = (typeof MODERATION_REASONS)[number];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function postTypeLabel(type: string) {
  const labels: Record<string, string> = {
    notes: "Notes",
    exam: "Exam",
    reference: "Reference",
    study_trail: "Study Trail",
  };
  return labels[type] ?? type;
}

function makeModerationReason(
  selectedReason: ModerationReasonOption | "",
  detail: string,
) {
  const trimmedDetail = detail.trim();
  if (!selectedReason) return "";
  if (selectedReason === "기타") return trimmedDetail;
  return trimmedDetail ? `${selectedReason} - ${trimmedDetail}` : selectedReason;
}

export default function AdminPostsPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<"all" | "visible" | "hidden" | "stopped">("all");
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState>(null);
  const [selectedReason, setSelectedReason] = useState<ModerationReasonOption | "">("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  async function getSessionToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/admin/login");
      return null;
    }

    return session.access_token;
  }

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function loadPosts() {
    try {
      setLoading(true);
      setErrorMessage("");

      const token = await getSessionToken();
      if (!token) return;

      const response = await fetch("/api/admin/posts", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const body = await response.json();

      if (response.status === 401 || response.status === 403) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(body.error ?? "게시글 목록을 불러오지 못했습니다.");
      }

      setPosts((body as ApiResponse).posts ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "게시글 목록을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesKeyword =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.author_nickname.toLowerCase().includes(q) ||
        post.subject_name.toLowerCase().includes(q) ||
        post.professor_name.toLowerCase().includes(q);

      const matchesFilter =
        filter === "all" ||
        (filter === "visible" && post.is_published && !post.is_admin_hidden) ||
        (filter === "hidden" && post.is_admin_hidden) ||
        (filter === "stopped" && !post.is_published);

      return matchesKeyword && matchesFilter;
    });
  }, [posts, keyword, filter]);

  function openHideModal(post: AdminPost) {
    setSelectedReason("");
    setReasonDetail("");
    setModal({ mode: "hide", post });
  }

  function openRestoreModal(post: AdminPost) {
    setModal({ mode: "restore", post });
  }

  function closeModal() {
    if (workingId) return;
    setModal(null);
    setSelectedReason("");
    setReasonDetail("");
  }

  async function updatePostVisibility(
    post: AdminPost,
    hidden: boolean,
    reason: string | null,
  ) {
    try {
      setWorkingId(post.id);

      const token = await getSessionToken();
      if (!token) return;

      const response = await fetch(`/api/admin/posts/${post.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isAdminHidden: hidden,
          reason,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "게시글 상태를 변경하지 못했습니다.");
      }

      setPosts((previous) =>
        previous.map((item) =>
          item.id === post.id
            ? {
                ...item,
                is_admin_hidden: hidden,
                moderation_reason: hidden ? reason : null,
              }
            : item,
        ),
      );

      setModal(null);
      setSelectedReason("");
      setReasonDetail("");

      showToast(
        hidden ? "게시글이 중단되었습니다." : "게시글 노출이 복구되었습니다.",
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "게시글 상태를 변경하지 못했습니다.",
        "error",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function confirmHide() {
    if (!modal || modal.mode !== "hide" || workingId) return;

    const finalReason = makeModerationReason(selectedReason, reasonDetail);
    if (!finalReason) return;

    await updatePostVisibility(modal.post, true, finalReason);
  }

  async function confirmRestore() {
    if (!modal || modal.mode !== "restore" || workingId) return;
    await updatePostVisibility(modal.post, false, null);
  }

  const canConfirmHide =
    Boolean(selectedReason) &&
    (selectedReason !== "기타" || Boolean(reasonDetail.trim()));

  const visibleCount = posts.filter(
    (post) => post.is_published && !post.is_admin_hidden,
  ).length;
  const hiddenCount = posts.filter((post) => post.is_admin_hidden).length;
  const stoppedCount = posts.filter((post) => !post.is_published).length;

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          background: "#f8f8fb",
          padding: "28px 32px 48px",
          fontFamily:
            'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          color: "#292431",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ margin: "0 0 5px", fontSize: 26 }}>게시글 관리</h1>
            <p style={{ margin: 0, color: "#8e8897", fontSize: 12.5 }}>
              과목과 교수 정보를 함께 확인하고 게시글 노출 상태를 관리합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadPosts()}
            style={{
              border: "1px solid #ddd7e9",
              borderRadius: 9,
              background: "#fff",
              color: "#674ac8",
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            새로고침
          </button>
        </div>

        <section
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {[
            ["전체 게시글", posts.length],
            ["정상 노출", visibleCount],
            ["관리자 게시 중단", hiddenCount],
            ["작성자 게시 중단", stoppedCount],
          ].map(([label, count]) => (
            <div
              key={String(label)}
              style={{
                background: "#fff",
                border: "1px solid #e9e6ee",
                borderRadius: 11,
                padding: "14px 15px",
              }}
            >
              <div style={{ fontSize: 10.5, color: "#8c8694" }}>{label}</div>
              <div
                style={{
                  marginTop: 7,
                  color: "#6548c7",
                  fontSize: 20,
                  fontWeight: 850,
                }}
              >
                {count}
              </div>
            </div>
          ))}
        </section>

        <section
          style={{
            marginTop: 14,
            background: "#fff",
            border: "1px solid #e9e6ee",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 14,
              display: "flex",
              gap: 9,
              flexWrap: "wrap",
              borderBottom: "1px solid #efedf2",
            }}
          >
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="제목, 작성자, 과목, 교수 검색"
              style={{
                flex: "1 1 320px",
                height: 38,
                border: "1px solid #ded9e7",
                borderRadius: 8,
                padding: "0 11px",
                outline: "none",
                font: "inherit",
                fontSize: 12.5,
              }}
            />

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as typeof filter)
              }
              style={{
                height: 38,
                border: "1px solid #ded9e7",
                borderRadius: 8,
                padding: "0 10px",
                background: "#fff",
                font: "inherit",
                fontSize: 12,
              }}
            >
              <option value="all">전체</option>
              <option value="visible">정상 노출</option>
              <option value="hidden">관리자 게시 중단</option>
              <option value="stopped">작성자 게시 중단</option>
            </select>
          </div>

          {errorMessage && (
            <div
              style={{
                margin: 14,
                padding: 11,
                borderRadius: 8,
                background: "#fff0f2",
                color: "#b84757",
                fontSize: 12,
              }}
            >
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div
              style={{
                padding: 42,
                textAlign: "center",
                color: "#9a94a1",
                fontSize: 12.5,
              }}
            >
              게시글을 불러오는 중...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div
              style={{
                padding: 42,
                textAlign: "center",
                color: "#9a94a1",
                fontSize: 12.5,
              }}
            >
              조건에 맞는 게시글이 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11.5,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#faf9fc",
                      color: "#817b88",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: "10px 12px" }}>게시글</th>
                    <th style={{ padding: "10px 12px" }}>과목 / 교수</th>
                    <th style={{ padding: "10px 12px" }}>작성자</th>
                    <th style={{ padding: "10px 12px" }}>유형</th>
                    <th style={{ padding: "10px 12px" }}>구매</th>
                    <th style={{ padding: "10px 12px" }}>작성일</th>
                    <th style={{ padding: "10px 12px" }}>상태</th>
                    <th style={{ padding: "10px 12px" }}>관리</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPosts.map((post) => {
                    const status = post.is_admin_hidden
                      ? "관리자 게시 중단"
                      : !post.is_published
                        ? "작성자 게시 중단"
                        : "정상 노출";

                    return (
                      <tr
                        key={post.id}
                        style={{ borderTop: "1px solid #f0eef3" }}
                      >
                        <td style={{ padding: "12px", minWidth: 270 }}>
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/admin/posts/${post.id}`)
                            }
                            style={{
                              border: 0,
                              padding: 0,
                              background: "transparent",
                              color: "#342d3e",
                              cursor: "pointer",
                              fontWeight: 800,
                              textAlign: "left",
                            }}
                          >
                            {post.title}
                          </button>

                          {post.moderation_reason && (
                            <div
                              style={{
                                marginTop: 6,
                                color: "#b75a68",
                                fontSize: 10,
                              }}
                            >
                              조치 사유: {post.moderation_reason}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "12px", minWidth: 170 }}>
                          <div style={{ color: "#403948", fontWeight: 750 }}>
                            {post.subject_name}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              color: "#97919d",
                              fontSize: 10,
                            }}
                          >
                            {post.professor_name} 교수님
                          </div>
                        </td>

                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          {post.author_is_deleted
                            ? "탈퇴한 사용자"
                            : post.author_nickname}
                        </td>

                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "4px 7px",
                              borderRadius: 999,
                              background: "#f1edff",
                              color: "#674ac8",
                              fontSize: 9.5,
                              fontWeight: 800,
                            }}
                          >
                            {postTypeLabel(post.post_type)}
                          </span>
                        </td>

                        <td style={{ padding: "12px" }}>{post.purchase_count}</td>

                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          {formatDate(post.created_at)}
                        </td>

                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              borderRadius: 999,
                              padding: "4px 7px",
                              fontSize: 9.5,
                              fontWeight: 800,
                              background: post.is_admin_hidden
                                ? "#fff0f2"
                                : !post.is_published
                                  ? "#f1eff4"
                                  : "#eaf8ef",
                              color: post.is_admin_hidden
                                ? "#bd4d5e"
                                : !post.is_published
                                  ? "#77717e"
                                  : "#39895a",
                            }}
                          >
                            {status}
                          </span>
                        </td>

                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            disabled={workingId === post.id}
                            onClick={() => {
                              if (post.is_admin_hidden) {
                                openRestoreModal(post);
                              } else {
                                openHideModal(post);
                              }
                            }}
                            style={{
                              border: "1px solid #ddd6ec",
                              borderRadius: 7,
                              background: "#fff",
                              color: post.is_admin_hidden
                                ? "#4e8a63"
                                : "#b54d5d",
                              padding: "6px 9px",
                              cursor:
                                workingId === post.id ? "default" : "pointer",
                              fontSize: 10.5,
                              fontWeight: 750,
                              opacity: workingId === post.id ? 0.6 : 1,
                            }}
                          >
                            {workingId === post.id
                              ? "처리 중..."
                              : post.is_admin_hidden
                                ? "노출 복구"
                                : "게시 중단"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {modal?.mode === "hide" && (
        <ModerationModal
          title={modal.post.title}
          purchaseCount={modal.post.purchase_count}
          working={Boolean(workingId)}
          selectedReason={selectedReason}
          setSelectedReason={setSelectedReason}
          reasonDetail={reasonDetail}
          setReasonDetail={setReasonDetail}
          canConfirm={canConfirmHide}
          onClose={closeModal}
          onConfirm={() => void confirmHide()}
        />
      )}

      {modal?.mode === "restore" && (
        <RestoreModal
          title={modal.post.title}
          working={Boolean(workingId)}
          onClose={closeModal}
          onConfirm={() => void confirmRestore()}
        />
      )}

      {toast && <Toast toast={toast} />}
    </>
  );
}

function ModerationModal({
  title,
  purchaseCount,
  working,
  selectedReason,
  setSelectedReason,
  reasonDetail,
  setReasonDetail,
  canConfirm,
  onClose,
  onConfirm,
}: {
  title: string;
  purchaseCount: number;
  working: boolean;
  selectedReason: ModerationReasonOption | "";
  setSelectedReason: (value: ModerationReasonOption) => void;
  reasonDetail: string;
  setReasonDetail: (value: string) => void;
  canConfirm: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(28, 23, 35, 0.42)",
        backdropFilter: "blur(3px)",
        fontFamily:
          'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px 24px 20px",
          boxSizing: "border-box",
          border: "1px solid #ebe7ef",
          borderRadius: 16,
          background: "#fff",
          boxShadow: "0 24px 70px rgba(41, 32, 57, 0.22)",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            display: "grid",
            placeItems: "center",
            borderRadius: 12,
            background: "#fff0f2",
            color: "#b94d5e",
            fontSize: 20,
            fontWeight: 900,
          }}
        >
          !
        </div>

        <h2 style={{ margin: "16px 0 7px", fontSize: 20, color: "#2d2733" }}>
          게시글을 중단하시겠어요?
        </h2>

        <p style={{ margin: 0, color: "#89828f", fontSize: 12, lineHeight: 1.7 }}>
          게시 중단 사유를 선택해 주세요. 이 글의 기존 구매자에게 1P씩 환불한 뒤 모든 일반 사용자 접근을 차단합니다.
        </p>

        <div
          style={{
            marginTop: 17,
            padding: "11px 12px",
            borderRadius: 9,
            background: "#faf9fc",
            border: "1px solid #efedf3",
          }}
        >
          <div style={{ color: "#9a94a0", fontSize: 9.5 }}>대상 게시글</div>
          <div
            style={{
              marginTop: 4,
              color: "#4a4351",
              fontSize: 11.5,
              fontWeight: 750,
              lineHeight: 1.5,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 9,
            background: "#fff8ef",
            border: "1px solid #f2dfc5",
            color: "#8a6230",
            fontSize: 10.5,
            lineHeight: 1.6,
          }}
        >
          구매자 {purchaseCount}명에게 총 {purchaseCount}P가 환불됩니다.
          <br />
          게시 중단 후에는 구매 여부와 관계없이 일반 사용자가 이 글을 열람할 수 없습니다.
        </div>

        <div style={{ marginTop: 18 }}>
          <div
            style={{
              marginBottom: 9,
              color: "#544d5c",
              fontSize: 11.5,
              fontWeight: 800,
            }}
          >
            게시 중단 사유
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {MODERATION_REASONS.map((reason) => {
              const selected = selectedReason === reason;

              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 42,
                    padding: "9px 10px",
                    border: selected
                      ? "1px solid #8b70d8"
                      : "1px solid #e4dfea",
                    borderRadius: 9,
                    background: selected ? "#f5f1ff" : "#fff",
                    color: selected ? "#6548c7" : "#5e5766",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    fontSize: 11,
                    fontWeight: selected ? 800 : 650,
                  }}
                >
                  <span
                    style={{
                      width: 15,
                      height: 15,
                      flexShrink: 0,
                      borderRadius: "50%",
                      border: selected
                        ? "4px solid #7458cc"
                        : "1.5px solid #b9b2c1",
                      boxSizing: "border-box",
                      background: "#fff",
                    }}
                  />
                  {reason}
                </button>
              );
            })}
          </div>
        </div>

        {selectedReason && (
          <label style={{ display: "grid", gap: 7, marginTop: 17 }}>
            <span
              style={{
                color: "#544d5c",
                fontSize: 11.5,
                fontWeight: 750,
              }}
            >
              {selectedReason === "기타" ? "상세 사유" : "추가 메모 (선택)"}
            </span>

            <textarea
              value={reasonDetail}
              onChange={(event) => setReasonDetail(event.target.value)}
              placeholder={
                selectedReason === "기타"
                  ? "게시 중단 사유를 입력해 주세요."
                  : "필요한 경우 세부 내용을 남겨 주세요."
              }
              rows={3}
              style={{
                width: "100%",
                minHeight: 82,
                boxSizing: "border-box",
                resize: "vertical",
                border: "1px solid #ded9e7",
                borderRadius: 10,
                padding: "10px 11px",
                outline: "none",
                color: "#38313f",
                font: "inherit",
                fontSize: 11.5,
                lineHeight: 1.6,
              }}
            />
          </label>
        )}

        <div
          style={{
            minHeight: 16,
            marginTop: 6,
            color:
              selectedReason === "기타" && !reasonDetail.trim()
                ? "#b46874"
                : "#9b95a1",
            fontSize: 9.5,
          }}
        >
          {!selectedReason
            ? "사유를 하나 선택해 주세요."
            : selectedReason === "기타" && !reasonDetail.trim()
              ? "기타 사유는 상세 내용을 입력해 주세요."
              : "선택한 사유는 관리자 조치 이력에 기록됩니다."}
        </div>

        <div
          style={{
            marginTop: 15,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            disabled={working}
            onClick={onClose}
            style={{
              height: 38,
              padding: "0 14px",
              border: "1px solid #ddd8e4",
              borderRadius: 9,
              background: "#fff",
              color: "#716a78",
              font: "inherit",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: working ? "default" : "pointer",
            }}
          >
            취소
          </button>

          <button
            type="button"
            disabled={working || !canConfirm}
            onClick={onConfirm}
            style={{
              height: 38,
              padding: "0 15px",
              border: 0,
              borderRadius: 9,
              background: working || !canConfirm ? "#d7aeb4" : "#b94d5e",
              color: "#fff",
              font: "inherit",
              fontSize: 11.5,
              fontWeight: 800,
              cursor: working || !canConfirm ? "default" : "pointer",
            }}
          >
            {working ? "처리 중..." : "게시 중단 및 환불"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RestoreModal({
  title,
  working,
  onClose,
  onConfirm,
}: {
  title: string;
  working: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(28, 23, 35, 0.42)",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 400,
          padding: "24px",
          borderRadius: 16,
          background: "#fff",
          boxShadow: "0 24px 70px rgba(41, 32, 57, 0.22)",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>게시글을 복구하시겠어요?</h2>
        <p style={{ margin: 0, color: "#89828f", fontSize: 12, lineHeight: 1.7 }}>
          관리자 게시 중단 상태를 해제하고 다시 정상 노출 상태로 변경합니다.
        </p>

        <div
          style={{
            marginTop: 18,
            padding: "11px 12px",
            borderRadius: 9,
            background: "#faf9fc",
            border: "1px solid #efedf3",
            fontSize: 11.5,
            fontWeight: 750,
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 22,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            disabled={working}
            onClick={onClose}
            style={{
              height: 38,
              padding: "0 14px",
              border: "1px solid #ddd8e4",
              borderRadius: 9,
              background: "#ffffff",
              color: "#716a78",
              font: "inherit",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: working ? "default" : "pointer",
              opacity: working ? 0.65 : 1,
            }}
          >
            취소
          </button>

          <button
            type="button"
            disabled={working}
            onClick={onConfirm}
            style={{
              height: 38,
              padding: "0 15px",
              border: 0,
              borderRadius: 9,
              background: working ? "#a8cbb4" : "#4f9667",
              color: "#ffffff",
              font: "inherit",
              fontSize: 11.5,
              fontWeight: 800,
              cursor: working ? "default" : "pointer",
              opacity: working ? 0.8 : 1,
            }}
          >
            {working ? "처리 중..." : "노출 복구"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast }: { toast: Exclude<ToastState, null> }) {
  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 1100,
        minWidth: 230,
        maxWidth: 360,
        padding: "12px 14px",
        borderRadius: 10,
        border:
          toast.type === "success"
            ? "1px solid #cfe5d6"
            : "1px solid #f0d4d9",
        background:
          toast.type === "success" ? "#f0faf3" : "#fff3f5",
        color: toast.type === "success" ? "#34784d" : "#ad4858",
        boxShadow: "0 12px 35px rgba(42, 34, 53, 0.12)",
        fontSize: 11.5,
        fontWeight: 700,
      }}
    >
      {toast.type === "success" ? "✓ " : "! "}
      {toast.message}
    </div>
  );
}
