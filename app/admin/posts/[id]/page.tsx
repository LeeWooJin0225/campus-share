"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import editorStyles from "@/components/editor/RichTextEditor.module.css";
import { supabase } from "@/lib/supabase";

type AttachmentItem = {
  id: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number;
  display_order: number;
  signed_url: string | null;
};

type AdminPostDetail = {
  id: string;
  author_id: string;
  title: string;
  content: string;
  post_type: string;
  price: number;
  created_at: string;
  updated_at: string | null;
  is_published: boolean;
  is_admin_hidden: boolean;
  moderation_reason: string | null;
  moderated_at: string | null;
  author_nickname: string;
  author_is_deleted: boolean;
  subject_name: string;
  subject_code: string | null;
  professor_name: string;
  semester_label: string;
  purchase_count: number;
  attachments: AttachmentItem[];
};

type ModalMode = "hide" | "restore" | null;

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

function makeModerationReason(
  selectedReason: ModerationReasonOption | "",
  detail: string,
) {
  const trimmedDetail = detail.trim();
  if (!selectedReason) return "";
  if (selectedReason === "기타") return trimmedDetail;
  return trimmedDetail ? `${selectedReason} - ${trimmedDetail}` : selectedReason;
}

function formatDate(value: string | null) {
  if (!value) return "-";
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

export default function AdminPostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = params.id;

  const [post, setPost] = useState<AdminPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedReason, setSelectedReason] =
    useState<ModerationReasonOption | "">("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  async function getToken() {
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

  async function loadPost() {
    try {
      setLoading(true);
      setErrorMessage("");

      const token = await getToken();
      if (!token) return;

      const response = await fetch(`/api/admin/posts/${postId}`, {
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
        throw new Error(body.error ?? "게시글을 불러오지 못했습니다.");
      }

      setPost(body.post);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "게시글을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (postId) void loadPost();
  }, [postId]);

  function openHideModal() {
    if (!post || working) return;
    setSelectedReason("");
    setReasonDetail("");
    setModalMode("hide");
  }

  function openRestoreModal() {
    if (!post || working) return;
    setModalMode("restore");
  }

  function closeModal() {
    if (working) return;
    setModalMode(null);
    setSelectedReason("");
    setReasonDetail("");
  }

  async function patchVisibility(hidden: boolean, reason: string | null) {
    if (!post || working) return;

    try {
      setWorking(true);

      const token = await getToken();
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

      setPost((previous) =>
        previous
          ? {
              ...previous,
              is_admin_hidden: hidden,
              moderation_reason: hidden ? reason : null,
              moderated_at: hidden ? new Date().toISOString() : null,
            }
          : previous,
      );

      setModalMode(null);
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
      setWorking(false);
    }
  }

  async function confirmHide() {
    const reason = makeModerationReason(selectedReason, reasonDetail);
    if (!reason) return;
    await patchVisibility(true, reason);
  }

  async function confirmRestore() {
    await patchVisibility(false, null);
  }

  const canConfirmHide =
    Boolean(selectedReason) &&
    (selectedReason !== "기타" || Boolean(reasonDetail.trim()));

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f8f8fb",
          color: "#8b8494",
        }}
      >
        게시글을 불러오는 중...
      </main>
    );
  }

  if (!post || errorMessage) {
    return (
      <main style={{ minHeight: "100vh", background: "#f8f8fb", padding: 32 }}>
        <button type="button" onClick={() => router.push("/admin/posts")}>
          ← 게시글 관리
        </button>
        <div style={{ marginTop: 22, color: "#b64858" }}>
          {errorMessage || "게시글을 찾을 수 없습니다."}
        </div>
      </main>
    );
  }

  const statusLabel = post.is_admin_hidden
    ? "관리자 게시 중단"
    : !post.is_published
      ? "작성자 게시 중단"
      : "정상 노출";

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          background: "#f8f8fb",
          padding: "28px 32px 52px",
          color: "#292431",
          fontFamily:
            'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <button
            type="button"
            onClick={() => router.push("/admin/posts")}
            style={{
              border: 0,
              padding: 0,
              background: "transparent",
              color: "#756b89",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ← 게시글 관리
          </button>

          <div
            style={{
              marginTop: 13,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 18,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  gap: 7,
                  flexWrap: "wrap",
                  marginBottom: 9,
                }}
              >
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    background: "#f1edff",
                    color: "#684bc8",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {postTypeLabel(post.post_type)}
                </span>

                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
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
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {statusLabel}
                </span>
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 27,
                  lineHeight: 1.35,
                  letterSpacing: "-0.7px",
                }}
              >
                {post.title}
              </h1>

              <div style={{ marginTop: 9, color: "#8e8795", fontSize: 11.5 }}>
                {post.author_nickname} · {formatDate(post.created_at)}
              </div>
            </div>

            <button
              type="button"
              disabled={working}
              onClick={() =>
                post.is_admin_hidden ? openRestoreModal() : openHideModal()
              }
              style={{
                flex: "0 0 auto",
                border: post.is_admin_hidden ? "1px solid #cfe4d6" : 0,
                borderRadius: 9,
                padding: "10px 14px",
                background: post.is_admin_hidden ? "#eef8f1" : "#b94d5e",
                color: post.is_admin_hidden ? "#397b51" : "#fff",
                cursor: working ? "default" : "pointer",
                fontSize: 11.5,
                fontWeight: 800,
                opacity: working ? 0.65 : 1,
              }}
            >
              {post.is_admin_hidden ? "노출 복구" : "게시 중단"}
            </button>
          </div>

          <div
            style={{
              marginTop: 22,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 310px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 14 }}>
              <section
                style={{
                  background: "#fff",
                  border: "1px solid #e9e6ee",
                  borderRadius: 12,
                  padding: "22px 24px",
                }}
              >
                <div
                  style={{
                    marginBottom: 18,
                    paddingBottom: 12,
                    borderBottom: "1px solid #f0edf3",
                    fontSize: 12,
                    fontWeight: 850,
                    color: "#554e5e",
                  }}
                >
                  게시글 내용
                </div>

                {post.content ? (
                  <div
                    className={editorStyles.proseMirror}
                    style={{
                      minHeight: 180,
                      margin: 0,
                      padding: 0,
                    }}
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                ) : (
                  <div style={{ minHeight: 180, color: "#aaa4af", fontSize: 12.5 }}>
                    본문 내용이 없습니다.
                  </div>
                )}
              </section>

              <section
                style={{
                  background: "#fff",
                  border: "1px solid #e9e6ee",
                  borderRadius: 12,
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    fontWeight: 850,
                    color: "#554e5e",
                  }}
                >
                  <span>첨부파일</span>
                  <span style={{ color: "#99929f", fontSize: 10.5 }}>
                    {post.attachments.length}개
                  </span>
                </div>

                {post.attachments.length === 0 ? (
                  <div style={{ marginTop: 14, color: "#aaa4af", fontSize: 11.5 }}>
                    첨부파일이 없습니다.
                  </div>
                ) : (
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {post.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "10px 11px",
                          border: "1px solid #efedf2",
                          borderRadius: 8,
                          background: "#fbfafc",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 11.5,
                              fontWeight: 700,
                            }}
                          >
                            {attachment.original_name}
                          </div>
                          <div
                            style={{
                              marginTop: 3,
                              color: "#9a94a0",
                              fontSize: 9.5,
                            }}
                          >
                            {formatFileSize(attachment.size_bytes)}
                          </div>
                        </div>

                        {attachment.signed_url ? (
                          <a
                            href={attachment.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              textDecoration: "none",
                              border: "1px solid #dcd6e8",
                              borderRadius: 7,
                              padding: "6px 9px",
                              background: "#fff",
                              color: "#674ac8",
                              fontSize: 10,
                              fontWeight: 750,
                            }}
                          >
                            확인
                          </a>
                        ) : (
                          <span style={{ color: "#b0aab5", fontSize: 9.5 }}>
                            열기 실패
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside style={{ display: "grid", gap: 12 }}>
              <section
                style={{
                  background: "#fff",
                  border: "1px solid #e9e6ee",
                  borderRadius: 12,
                  padding: "17px 18px",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 850, color: "#554e5e" }}>
                  게시글 정보
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                  {[
                    ["과목", post.subject_name],
                    ["과목 코드", post.subject_code ?? "-"],
                    ["교수", `${post.professor_name} 교수님`],
                    ["학기", post.semester_label],
                    ["자료 유형", postTypeLabel(post.post_type)],
                    ["구매 수", `${post.purchase_count}명`],
                    ["가격", `${post.price}P`],
                    ["작성자", post.author_nickname],
                    ["작성일", formatDate(post.created_at)],
                    ["수정일", formatDate(post.updated_at)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ color: "#a09aa6", fontSize: 9.5 }}>
                        {label}
                      </div>
                      <div
                        style={{
                          marginTop: 3,
                          color: "#403a46",
                          fontSize: 11.5,
                          fontWeight: 700,
                          wordBreak: "break-word",
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {post.is_admin_hidden && (
                <section
                  style={{
                    background: "#fff7f8",
                    border: "1px solid #f1d9de",
                    borderRadius: 12,
                    padding: "16px 17px",
                  }}
                >
                  <div style={{ color: "#aa4656", fontSize: 11.5, fontWeight: 850 }}>
                    관리자 게시 중단
                  </div>
                  <div
                    style={{
                      marginTop: 9,
                      color: "#8f636b",
                      fontSize: 10.5,
                      lineHeight: 1.65,
                    }}
                  >
                    {post.moderation_reason ?? "운영 정책 위반"}
                  </div>
                  <div style={{ marginTop: 7, color: "#b09096", fontSize: 9.5 }}>
                    {formatDate(post.moderated_at)}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>
      </main>

      {modalMode === "hide" && (
        <ModerationModal
          title={post.title}
          purchaseCount={post.purchase_count}
          working={working}
          selectedReason={selectedReason}
          setSelectedReason={setSelectedReason}
          reasonDetail={reasonDetail}
          setReasonDetail={setReasonDetail}
          canConfirm={canConfirmHide}
          onClose={closeModal}
          onConfirm={() => void confirmHide()}
        />
      )}

      {modalMode === "restore" && (
        <RestoreModal
          title={post.title}
          purchaseCount={post.purchase_count}
          working={working}
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
          게시 중단 사유를 선택해 주세요. 기존 구매자에게 1P씩 환불한 뒤 모든 일반 사용자 접근을 차단합니다.
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
          <div style={{ marginTop: 4, fontSize: 11.5, fontWeight: 750 }}>
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
            <span style={{ color: "#544d5c", fontSize: 11.5, fontWeight: 750 }}>
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
            disabled={working || !canConfirm}
            onClick={onConfirm}
            style={{
              height: 38,
              padding: "0 15px",
              border: 0,
              borderRadius: 9,
              background:
                working || !canConfirm
                  ? "#d7aeb4"
                  : "#b94d5e",
              color: "#ffffff",
              font: "inherit",
              fontSize: 11.5,
              fontWeight: 800,
              cursor:
                working || !canConfirm
                  ? "default"
                  : "pointer",
              opacity: working ? 0.8 : 1,
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
        background: "rgba(28, 23, 35, 0.42)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 400,
          padding: 24,
          borderRadius: 16,
          background: "#fff",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>게시글을 복구하시겠어요?</h2>
        <p style={{ margin: 0, color: "#89828f", fontSize: 12 }}>
          관리자 게시 중단 상태를 해제하고 다시 정상 노출 상태로 변경합니다.
        </p>
        <div
          style={{
            marginTop: 18,
            padding: "11px 12px",
            background: "#faf9fc",
            border: "1px solid #efedf3",
            borderRadius: 9,
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
        padding: "12px 14px",
        borderRadius: 10,
        background: toast.type === "success" ? "#f0faf3" : "#fff3f5",
        color: toast.type === "success" ? "#34784d" : "#ad4858",
        fontSize: 11.5,
        fontWeight: 700,
      }}
    >
      {toast.type === "success" ? "✓ " : "! "}
      {toast.message}
    </div>
  );
}
