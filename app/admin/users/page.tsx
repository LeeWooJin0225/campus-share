"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AdminUser = {
  id: string;
  nickname: string;
  email: string | null;
  created_at: string;
  is_deleted: boolean;
  role: "user" | "admin";
  account_status: "active" | "suspended" | "banned";
  suspended_until: string | null;
  post_count: number;
  comment_count: number;
};

type ApiResponse = {
  users: AdminUser[];
};

type UserAction = "suspend7" | "suspend30" | "unsuspend" | "ban";

type ActionModalState = {
  user: AdminUser;
  action: UserAction;
} | null;

type ToastState = {
  message: string;
  type: "success" | "error";
} | null;

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

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended" | "banned" | "deleted">("all");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<ActionModalState>(null);
  const [actionReason, setActionReason] = useState("");
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

  async function loadUsers() {
    try {
      setLoading(true);
      setErrorMessage("");

      const token = await getSessionToken();
      if (!token) return;

      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const body = await response.json();

      if (response.status === 401 || response.status === 403) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(body.error ?? "회원 목록을 불러오지 못했습니다.");
      }

      setUsers((body as ApiResponse).users ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "회원 목록을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return users.filter((user) => {
      const matchesKeyword =
        !q ||
        user.nickname.toLowerCase().includes(q) ||
        (user.email ?? "").toLowerCase().includes(q);

      const matchesFilter =
        filter === "all" ||
        (filter === "deleted" && user.is_deleted) ||
        (!user.is_deleted && filter === user.account_status);

      return matchesKeyword && matchesFilter;
    });
  }, [users, keyword, filter]);

  const actionLabels: Record<UserAction, string> = {
    suspend7: "7일 이용 정지",
    suspend30: "30일 이용 정지",
    unsuspend: "이용 정지 해제",
    ban: "영구 이용 정지",
  };

  function showToast(
    message: string,
    type: "success" | "error",
  ) {
    setToast({ message, type });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  function openActionModal(
    user: AdminUser,
    action: UserAction,
  ) {
    setActionReason("");
    setActionModal({ user, action });
  }

  function closeActionModal() {
    if (workingId) return;

    setActionModal(null);
    setActionReason("");
  }

  async function changeStatus() {
    if (!actionModal || workingId) return;

    const { user, action } = actionModal;

    try {
      setWorkingId(user.id);

      const token = await getSessionToken();
      if (!token) return;

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          reason:
            action === "unsuspend"
              ? "관리자 이용 정지 해제"
              : actionReason.trim() || "운영 정책에 따른 조치",
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body.error ?? "회원 상태를 변경하지 못했습니다.",
        );
      }

      setUsers((previous) =>
        previous.map((item) =>
          item.id === user.id
            ? {
                ...item,
                account_status: body.user.account_status,
                suspended_until: body.user.suspended_until,
              }
            : item,
        ),
      );

      setActionModal(null);
      setActionReason("");

      showToast(
        action === "unsuspend"
          ? `${user.nickname} 회원의 이용 정지를 해제했습니다.`
          : `${user.nickname} 회원을 ${actionLabels[action]} 처리했습니다.`,
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "회원 상태를 변경하지 못했습니다.",
        "error",
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
  <>
    <main style={{ minHeight: "100vh", background: "#f8f8fb", padding: "28px 32px 48px", fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: "#292431" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <button type="button" onClick={() => router.push("/admin")} style={{ border: 0, background: "transparent", padding: 0, color: "#7b7190", cursor: "pointer", fontSize: 12 }}>
            ← 대시보드
          </button>
          <h1 style={{ margin: "10px 0 5px", fontSize: 26 }}>회원 관리</h1>
          <p style={{ margin: 0, color: "#8e8897", fontSize: 12.5 }}>
            회원 상태와 활동량을 확인하고 이용 정지 또는 영구 정지 조치를 할 수 있어요.
          </p>
        </div>

        <button type="button" onClick={() => void loadUsers()} style={{ border: "1px solid #ddd7e9", borderRadius: 9, background: "#fff", color: "#674ac8", padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
          새로고침
        </button>
      </div>

      <section style={{ marginTop: 22, background: "#fff", border: "1px solid #e9e6ee", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 14, display: "flex", gap: 9, flexWrap: "wrap", borderBottom: "1px solid #efedf2" }}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="닉네임 또는 이메일 검색"
            style={{ flex: "1 1 260px", height: 38, border: "1px solid #ded9e7", borderRadius: 8, padding: "0 11px", outline: "none", font: "inherit", fontSize: 12.5 }}
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            style={{ height: 38, border: "1px solid #ded9e7", borderRadius: 8, padding: "0 10px", background: "#fff", font: "inherit", fontSize: 12 }}
          >
            <option value="all">전체 회원</option>
            <option value="active">정상</option>
            <option value="suspended">이용 정지</option>
            <option value="banned">영구 정지</option>
            <option value="deleted">탈퇴 회원</option>
          </select>
        </div>

        {errorMessage && <div style={{ margin: 14, padding: 11, borderRadius: 8, background: "#fff0f2", color: "#b84757", fontSize: 12 }}>{errorMessage}</div>}

        {loading ? (
          <div style={{ padding: 42, textAlign: "center", color: "#9a94a1", fontSize: 12.5 }}>회원 목록을 불러오는 중...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: 42, textAlign: "center", color: "#9a94a1", fontSize: 12.5 }}>조건에 맞는 회원이 없습니다.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: "#faf9fc", color: "#817b88", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px" }}>회원</th>
                  <th style={{ padding: "10px 12px" }}>가입일</th>
                  <th style={{ padding: "10px 12px" }}>게시글</th>
                  <th style={{ padding: "10px 12px" }}>댓글</th>
                  <th style={{ padding: "10px 12px" }}>상태</th>
                  <th style={{ padding: "10px 12px" }}>정지 종료</th>
                  <th style={{ padding: "10px 12px" }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const statusLabel = user.is_deleted
                    ? "탈퇴"
                    : user.account_status === "suspended"
                      ? "이용 정지"
                      : user.account_status === "banned"
                        ? "영구 정지"
                        : user.role === "admin"
                          ? "관리자"
                          : "정상";

                  return (
                    <tr key={user.id} style={{ borderTop: "1px solid #f0eef3" }}>
                      <td style={{ padding: "12px", minWidth: 220 }}>
                        <div style={{ fontWeight: 800, color: "#342d3e" }}>{user.nickname}</div>
                        <div style={{ marginTop: 4, color: "#99939f", fontSize: 10 }}>{user.email ?? "이메일 없음"}</div>
                      </td>
                      <td style={{ padding: "12px", whiteSpace: "nowrap" }}>{formatDate(user.created_at)}</td>
                      <td style={{ padding: "12px" }}>{user.post_count}</td>
                      <td style={{ padding: "12px" }}>{user.comment_count}</td>
                      <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", borderRadius: 999, padding: "4px 7px", fontSize: 9.5, fontWeight: 800, background: user.is_deleted ? "#f1eff4" : user.account_status === "banned" ? "#fff0f2" : user.account_status === "suspended" ? "#fff4dc" : user.role === "admin" ? "#f1edff" : "#eaf8ef", color: user.is_deleted ? "#77717e" : user.account_status === "banned" ? "#bd4d5e" : user.account_status === "suspended" ? "#ae7000" : user.role === "admin" ? "#684bc8" : "#39895a" }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: "12px", whiteSpace: "nowrap" }}>{formatDate(user.suspended_until)}</td>
                      <td style={{ padding: "12px", minWidth: 250 }}>
                        {user.role === "admin" || user.is_deleted ? (
                          <span style={{ color: "#aaa4af", fontSize: 10.5 }}>조치 불가</span>
                        ) : (
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {user.account_status === "suspended" || user.account_status === "banned" ? (
                              <button type="button" disabled={workingId === user.id} onClick={() => openActionModal(user, "unsuspend")} style={{ border: "1px solid #d9d3e7", borderRadius: 7, background: "#fff", color: "#4d8861", padding: "6px 8px", cursor: "pointer", fontSize: 10 }}>
                                정지 해제
                              </button>
                            ) : (
                              <>
                                <button type="button" disabled={workingId === user.id} onClick={() => openActionModal(user, "suspend7")} style={{ border: "1px solid #e1d9ca", borderRadius: 7, background: "#fff", color: "#9b6a16", padding: "6px 8px", cursor: "pointer", fontSize: 10 }}>
                                  7일 정지
                                </button>
                                <button type="button" disabled={workingId === user.id} onClick={() => openActionModal(user, "suspend30")} style={{ border: "1px solid #e1d9ca", borderRadius: 7, background: "#fff", color: "#9b6a16", padding: "6px 8px", cursor: "pointer", fontSize: 10 }}>
                                  30일 정지
                                </button>
                                <button type="button" disabled={workingId === user.id} onClick={() => openActionModal(user, "ban")} style={{ border: "1px solid #ead4d8", borderRadius: 7, background: "#fff", color: "#b94e5e", padding: "6px 8px", cursor: "pointer", fontSize: 10 }}>
                                  영구 정지
                                </button>
                              </>
                            )}
                          </div>
                        )}
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

    {actionModal && (
      <div
        role="presentation"
        onClick={closeActionModal}
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
            maxWidth: 430,
            padding: "24px 24px 20px",
            boxSizing: "border-box",
            border: "1px solid #ebe7ef",
            borderRadius: 16,
            background: "#ffffff",
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
              background:
                actionModal.action === "unsuspend"
                  ? "#eaf8ef"
                  : "#fff0f2",
              color:
                actionModal.action === "unsuspend"
                  ? "#397b51"
                  : "#b94d5e",
              fontSize: 20,
              fontWeight: 900,
            }}
          >
            {actionModal.action === "unsuspend" ? "✓" : "!"}
          </div>

          <h2
            style={{
              margin: "16px 0 7px",
              color: "#2d2733",
              fontSize: 20,
              letterSpacing: "-0.4px",
            }}
          >
            {actionModal.action === "unsuspend"
              ? "이용 정지를 해제하시겠어요?"
              : `${actionLabels[actionModal.action]} 처리하시겠어요?`}
          </h2>

          <p
            style={{
              margin: 0,
              color: "#89828f",
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            {actionModal.action === "suspend7"
              ? "해당 회원은 7일 동안 CampusShare를 이용할 수 없습니다."
              : actionModal.action === "suspend30"
                ? "해당 회원은 30일 동안 CampusShare를 이용할 수 없습니다."
                : actionModal.action === "ban"
                  ? "해당 회원은 별도 해제 전까지 CampusShare를 이용할 수 없습니다."
                  : "해제 즉시 해당 회원이 다시 CampusShare를 이용할 수 있습니다."}
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
            <div
              style={{
                color: "#9a94a0",
                fontSize: 9.5,
              }}
            >
              대상 회원
            </div>

            <div
              style={{
                marginTop: 4,
                color: "#4a4351",
                fontSize: 11.5,
                fontWeight: 750,
              }}
            >
              {actionModal.user.nickname}
              {actionModal.user.email
                ? ` · ${actionModal.user.email}`
                : ""}
            </div>
          </div>

          {actionModal.action !== "unsuspend" && (
            <label
              style={{
                display: "grid",
                gap: 7,
                marginTop: 17,
              }}
            >
              <span
                style={{
                  color: "#544d5c",
                  fontSize: 11.5,
                  fontWeight: 750,
                }}
              >
                조치 사유
              </span>

              <textarea
                value={actionReason}
                onChange={(event) =>
                  setActionReason(event.target.value)
                }
                placeholder="조치 사유를 입력해 주세요."
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
              marginTop: 20,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              type="button"
              disabled={Boolean(workingId)}
              onClick={closeActionModal}
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
                cursor: workingId ? "default" : "pointer",
                opacity: workingId ? 0.65 : 1,
              }}
            >
              취소
            </button>

            <button
              type="button"
              disabled={Boolean(workingId)}
              onClick={() => void changeStatus()}
              style={{
                height: 38,
                padding: "0 15px",
                border: 0,
                borderRadius: 9,
                background: workingId
                  ? "#c9c4ce"
                  : actionModal.action === "unsuspend"
                    ? "#4f9667"
                    : actionModal.action === "ban"
                      ? "#a93f50"
                      : "#b07a24",
                color: "#ffffff",
                font: "inherit",
                fontSize: 11.5,
                fontWeight: 800,
                cursor: workingId ? "default" : "pointer",
                opacity: workingId ? 0.8 : 1,
              }}
            >
              {workingId
                ? "처리 중..."
                : actionModal.action === "unsuspend"
                  ? "정지 해제"
                  : actionLabels[actionModal.action]}
            </button>
          </div>
        </div>
      </div>
    )}

    {toast && (
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
            toast.type === "success"
              ? "#f0faf3"
              : "#fff3f5",
          color:
            toast.type === "success"
              ? "#34784d"
              : "#ad4858",
          boxShadow:
            "0 12px 35px rgba(42, 34, 53, 0.12)",
          fontFamily:
            'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 11.5,
          fontWeight: 700,
        }}
      >
        {toast.type === "success" ? "✓ " : "! "}
        {toast.message}
      </div>
    )}
  </>
  );
}
