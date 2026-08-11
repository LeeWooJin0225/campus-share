"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type ReportRow = {
  id: string;
  reporter_id: string;
  reporter_nickname: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  status:
    | "pending"
    | "resolved"
    | "rejected";
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  post_id: string | null;
  post_title: string;
  post_is_admin_hidden: boolean;
  post_is_published: boolean;
  reported_user_id: string | null;
  reported_user_nickname: string;
};

type ReportGroup = {
  key: string;
  targetType: string;
  targetId: string;

  representative: ReportRow;

  reportCount: number;
  reports: ReportRow[];

  reasonCounts: Record<
    string,
    number
  >;

  latestCreatedAt: string;
};

type ReportAction =
  | "reject"
  | "hide"
  | "suspend7"
  | "suspend30"
  | "ban";

type ActionModal = {
  group: ReportGroup;
  action: ReportAction;
} | null;

const REASON_LABELS: Record<
  string,
  string
> = {
  inappropriate: "부적절한 콘텐츠",
  abuse: "욕설·괴롭힘",
  spam: "중복·도배 게시글",
  copyright: "저작권 침해",
  incorrect: "허위·잘못된 자료",
  other: "기타",
};

const ACTION_LABELS: Record<
  ReportAction,
  string
> = {
  reject: "신고 기각",
  hide: "게시글 중단",
  suspend7: "작성자 7일 정지",
  suspend30: "작성자 30일 정지",
  ban: "작성자 영구 정지",
};

function formatDate(
  value: string | null,
) {
  if (!value) return "-";

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(new Date(value));
}

function buildGroups(
  reports: ReportRow[],
): ReportGroup[] {
  const map =
    new Map<
      string,
      ReportGroup
    >();

  for (const report of reports) {
    const key =
      `${report.target_type}:${report.target_id}`;

    const existing =
      map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        targetType:
          report.target_type,
        targetId:
          report.target_id,
        representative:
          report,
        reportCount: 1,
        reports: [report],
        reasonCounts: {
          [report.reason]: 1,
        },
        latestCreatedAt:
          report.created_at,
      });

      continue;
    }

    existing.reportCount += 1;
    existing.reports.push(
      report,
    );

    existing.reasonCounts[
      report.reason
    ] =
      (existing.reasonCounts[
        report.reason
      ] ?? 0) + 1;

    if (
      new Date(
        report.created_at,
      ).getTime() >
      new Date(
        existing.latestCreatedAt,
      ).getTime()
    ) {
      existing.latestCreatedAt =
        report.created_at;
    }
  }

  return Array.from(
    map.values(),
  ).sort(
    (a, b) =>
      new Date(
        b.latestCreatedAt,
      ).getTime() -
      new Date(
        a.latestCreatedAt,
      ).getTime(),
  );
}

export default function AdminReportsPage() {
  const router = useRouter();

  const [reports, setReports] =
    useState<ReportRow[]>([]);

  const [filter, setFilter] =
    useState<
      | "all"
      | "pending"
      | "resolved"
      | "rejected"
    >("pending");

  const [loading, setLoading] =
    useState(true);

  const [workingKey, setWorkingKey] =
    useState<string | null>(
      null,
    );

  const [modal, setModal] =
    useState<ActionModal>(null);

  const [toast, setToast] =
    useState("");

  const groupedReports =
    useMemo(
      () =>
        buildGroups(reports),
      [reports],
    );

  async function getToken() {
    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    if (!session) {
      router.replace(
        "/admin/login",
      );

      return null;
    }

    return session.access_token;
  }

  function showToast(
    message: string,
  ) {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 3000);
  }

  async function loadReports() {
    try {
      setLoading(true);

      const token =
        await getToken();

      if (!token) return;

      const response =
        await fetch(
          `/api/admin/reports?status=${filter}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

      const body =
        await response.json();

      if (!response.ok) {
        throw new Error(
          body.error ??
            "신고 목록을 불러오지 못했습니다.",
        );
      }

      setReports(
        body.reports ?? [],
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "신고 목록을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, [filter]);

  async function markGroup(
    group: ReportGroup,
    status:
      | "resolved"
      | "rejected",
  ) {
    const token =
      await getToken();

    if (!token) {
      throw new Error(
        "관리자 로그인이 필요합니다.",
      );
    }

    const response =
      await fetch(
        `/api/admin/reports/${group.representative.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body:
            JSON.stringify({
              status,
            }),
        },
      );

    const body =
      await response.json();

    if (!response.ok) {
      throw new Error(
        body.error ??
          "신고 상태를 변경하지 못했습니다.",
      );
    }

    return body as {
      processed_count?: number;
    };
  }

  async function hideReportedPost(
    group: ReportGroup,
  ) {
    const report =
      group.representative;

    if (!report.post_id) {
      throw new Error(
        "게시글을 찾을 수 없습니다.",
      );
    }

    const token =
      await getToken();

    if (!token) {
      throw new Error(
        "관리자 로그인이 필요합니다.",
      );
    }

    const reasonSummary =
      Object.entries(
        group.reasonCounts,
      )
        .map(
          ([
            reason,
            count,
          ]) =>
            `${REASON_LABELS[reason] ?? reason} ${count}건`,
        )
        .join(", ");

    const response =
      await fetch(
        `/api/admin/posts/${report.post_id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body:
            JSON.stringify({
              isAdminHidden: true,
              reason:
                `신고 처리: ${reasonSummary}`,
            }),
        },
      );

    const body =
      await response.json();

    if (!response.ok) {
      throw new Error(
        body.error ??
          "게시글을 중단하지 못했습니다.",
      );
    }
  }

  async function runAction() {
    if (
      !modal ||
      workingKey
    ) {
      return;
    }

    const {
      group,
      action,
    } = modal;

    const report =
      group.representative;

    try {
      setWorkingKey(
        group.key,
      );

      if (
        action === "reject"
      ) {
        const result =
          await markGroup(
            group,
            "rejected",
          );

        setModal(null);

        setReports(
          (previous) =>
            previous.filter(
              (item) =>
                !(
                  item.target_type ===
                    group.targetType &&
                  item.target_id ===
                    group.targetId
                ),
            ),
        );

        showToast(
          `${result.processed_count ?? group.reportCount}건의 신고를 모두 기각했습니다.`,
        );

        return;
      }

      /*
       * 신고 인용 시에는
       * 대상 게시글을 항상
       * 게시 중단 + 환불합니다.
       */
      await hideReportedPost(
        group,
      );

      if (
        action !== "hide"
      ) {
        if (
          !report.reported_user_id
        ) {
          throw new Error(
            "작성자 정보를 찾을 수 없습니다.",
          );
        }

        const token =
          await getToken();

        if (!token) {
          throw new Error(
            "관리자 로그인이 필요합니다.",
          );
        }

        const response =
          await fetch(
            `/api/admin/users/${report.reported_user_id}`,
            {
              method:
                "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
              body:
                JSON.stringify({
                  action,
                  reason:
                    `게시글 신고 ${group.reportCount}건 누적`,
                }),
            },
          );

        const body =
          await response.json();

        if (!response.ok) {
          throw new Error(
            body.error ??
              "회원 제재를 처리하지 못했습니다.",
          );
        }
      }

      const result =
        await markGroup(
          group,
          "resolved",
        );

      setModal(null);

      setReports(
        (previous) =>
          previous.filter(
            (item) =>
              !(
                item.target_type ===
                  group.targetType &&
                item.target_id ===
                  group.targetId
              ),
          ),
      );

      const processedCount =
        result.processed_count ??
        group.reportCount;

      if (
        action === "hide"
      ) {
        showToast(
          `${processedCount}건의 신고를 처리하고 게시글 중단·환불을 완료했습니다.`,
        );
      } else {
        showToast(
          `${processedCount}건의 신고 처리, ${ACTION_LABELS[action]}, 게시글 중단·환불을 완료했습니다.`,
        );
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "신고를 처리하지 못했습니다.",
      );
    } finally {
      setWorkingKey(null);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8f8fb",
        padding:
          "28px 32px 48px",
        color: "#292431",
        fontFamily:
          'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <h1
        style={{
          margin: "0 0 5px",
          fontSize: 26,
        }}
      >
        신고 관리
      </h1>

      <p
        style={{
          margin: 0,
          color: "#8e8897",
          fontSize: 12.5,
        }}
      >
        같은 게시글에 접수된 신고는 하나로 묶어서 보여드려요.
      </p>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 18,
          flexWrap: "wrap",
        }}
      >
        {[
          [
            "pending",
            "처리 대기",
          ],
          [
            "resolved",
            "처리 완료",
          ],
          [
            "rejected",
            "기각",
          ],
          ["all", "전체"],
        ].map(
          ([
            value,
            label,
          ]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setFilter(
                  value as typeof filter,
                )
              }
              style={{
                border:
                  filter ===
                  value
                    ? "1px solid #8e73d8"
                    : "1px solid #ded9e7",
                borderRadius:
                  999,
                padding:
                  "7px 11px",
                background:
                  filter ===
                  value
                    ? "#f3efff"
                    : "#fff",
                color:
                  filter ===
                  value
                    ? "#6548c7"
                    : "#77717e",
                fontSize: 11,
                fontWeight: 750,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ),
        )}
      </div>

      <section
        style={{
          marginTop: 14,
          overflow: "hidden",
          border:
            "1px solid #e9e6ee",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: 42,
              textAlign:
                "center",
              color:
                "#99939f",
              fontSize: 12.5,
            }}
          >
            신고 목록을 불러오는 중...
          </div>
        ) : groupedReports.length ===
          0 ? (
          <div
            style={{
              padding: 42,
              textAlign:
                "center",
              color:
                "#99939f",
              fontSize: 12.5,
            }}
          >
            해당 상태의 신고가 없습니다.
          </div>
        ) : (
          groupedReports.map(
            (group) => {
              const report =
                group.representative;

              const isPending =
                report.status ===
                "pending";

              const reasonEntries =
                Object.entries(
                  group.reasonCounts,
                ).sort(
                  (
                    a,
                    b,
                  ) =>
                    b[1] -
                    a[1],
                );

              return (
                <article
                  key={
                    group.key
                  }
                  style={{
                    display:
                      "flex",
                    gap: 18,
                    justifyContent:
                      "space-between",
                    padding:
                      "18px",
                    borderBottom:
                      "1px solid #efedf2",
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 7,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <span
                        style={{
                          padding:
                            "4px 8px",
                          borderRadius:
                            999,
                          background:
                            "#f1edff",
                          color:
                            "#684bc8",
                          fontSize:
                            10,
                          fontWeight:
                            850,
                        }}
                      >
                        신고{" "}
                        {
                          group.reportCount
                        }
                        건
                      </span>

                      <span
                        style={{
                          color:
                            "#a09aa6",
                          fontSize:
                            10,
                        }}
                      >
                        최근 신고{" "}
                        {formatDate(
                          group.latestCreatedAt,
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={
                        !report.post_id
                      }
                      onClick={() => {
                        if (
                          report.post_id
                        ) {
                          router.push(
                            `/admin/posts/${report.post_id}`,
                          );
                        }
                      }}
                      style={{
                        display:
                          "block",
                        marginTop: 10,
                        padding: 0,
                        border: 0,
                        background:
                          "transparent",
                        color:
                          "#342d3e",
                        fontSize: 15,
                        fontWeight: 800,
                        cursor:
                          report.post_id
                            ? "pointer"
                            : "default",
                        textAlign:
                          "left",
                      }}
                    >
                      {
                        report.post_title
                      }
                    </button>

                    <div
                      style={{
                        marginTop: 7,
                        color:
                          "#77717e",
                        fontSize:
                          11,
                      }}
                    >
                      작성자:{" "}
                      {
                        report.reported_user_nickname
                      }
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        gap: 6,
                        flexWrap:
                          "wrap",
                        marginTop: 10,
                      }}
                    >
                      {reasonEntries.map(
                        ([
                          reason,
                          count,
                        ]) => (
                          <span
                            key={
                              reason
                            }
                            style={{
                              padding:
                                "4px 7px",
                              borderRadius:
                                7,
                              background:
                                "#faf9fc",
                              border:
                                "1px solid #ece9f0",
                              color:
                                "#665f6d",
                              fontSize:
                                10.5,
                            }}
                          >
                            {REASON_LABELS[
                              reason
                            ] ??
                              reason}{" "}
                            {
                              count
                            }
                            건
                          </span>
                        ),
                      )}
                    </div>

                    {group.reports.some(
                      (item) =>
                        Boolean(
                          item.description,
                        ),
                    ) && (
                      <details
                        style={{
                          marginTop:
                            11,
                        }}
                      >
                        <summary
                          style={{
                            color:
                              "#776f80",
                            fontSize:
                              10.5,
                            cursor:
                              "pointer",
                          }}
                        >
                          신고 상세 내용 보기
                        </summary>

                        <div
                          style={{
                            display:
                              "grid",
                            gap: 7,
                            marginTop:
                              8,
                          }}
                        >
                          {group.reports
                            .filter(
                              (
                                item,
                              ) =>
                                Boolean(
                                  item.description,
                                ),
                            )
                            .map(
                              (
                                item,
                              ) => (
                                <div
                                  key={
                                    item.id
                                  }
                                  style={{
                                    padding:
                                      "8px 9px",
                                    borderRadius:
                                      8,
                                    background:
                                      "#faf9fc",
                                    color:
                                      "#655e6c",
                                    fontSize:
                                      10.5,
                                    lineHeight:
                                      1.55,
                                  }}
                                >
                                  <strong>
                                    {REASON_LABELS[
                                      item.reason
                                    ] ??
                                      item.reason}
                                  </strong>
                                  {" · "}
                                  {
                                    item.reporter_nickname
                                  }
                                  <br />
                                  {
                                    item.description
                                  }
                                </div>
                              ),
                            )}
                        </div>
                      </details>
                    )}

                    {!isPending && (
                      <div
                        style={{
                          marginTop:
                            9,
                          color:
                            report.status ===
                            "resolved"
                              ? "#4f8261"
                              : "#8a7d83",
                          fontSize:
                            10.5,
                        }}
                      >
                        {report.status ===
                        "resolved"
                          ? "처리 완료"
                          : "기각"}
                        {" · "}
                        {formatDate(
                          report.resolved_at,
                        )}
                      </div>
                    )}
                  </div>

                  {isPending && (
                    <div
                      style={{
                        width:
                          275,
                        display:
                          "flex",
                        alignContent:
                          "flex-start",
                        justifyContent:
                          "flex-end",
                        gap: 6,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <ActionButton
                        label="기각"
                        disabled={
                          workingKey ===
                          group.key
                        }
                        onClick={() =>
                          setModal({
                            group,
                            action:
                              "reject",
                          })
                        }
                      />

                      <ActionButton
                        label="게시글 중단"
                        danger
                        disabled={
                          workingKey ===
                            group.key ||
                          !report.post_id ||
                          report.post_is_admin_hidden
                        }
                        onClick={() =>
                          setModal({
                            group,
                            action:
                              "hide",
                          })
                        }
                      />

                      <ActionButton
                        label="작성자 7일 정지"
                        warning
                        disabled={
                          workingKey ===
                            group.key ||
                          !report.reported_user_id
                        }
                        onClick={() =>
                          setModal({
                            group,
                            action:
                              "suspend7",
                          })
                        }
                      />

                      <ActionButton
                        label="작성자 30일 정지"
                        warning
                        disabled={
                          workingKey ===
                            group.key ||
                          !report.reported_user_id
                        }
                        onClick={() =>
                          setModal({
                            group,
                            action:
                              "suspend30",
                          })
                        }
                      />

                      <ActionButton
                        label="작성자 영구 정지"
                        danger
                        disabled={
                          workingKey ===
                            group.key ||
                          !report.reported_user_id
                        }
                        onClick={() =>
                          setModal({
                            group,
                            action:
                              "ban",
                          })
                        }
                      />
                    </div>
                  )}
                </article>
              );
            },
          )
        )}
      </section>

      {modal && (
        <div
          role="presentation"
          onClick={() => {
            if (
              !workingKey
            ) {
              setModal(null);
            }
          }}
          style={{
            position:
              "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems:
              "center",
            padding: 24,
            background:
              "rgba(28, 23, 35, 0.42)",
            backdropFilter:
              "blur(3px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(
              event,
            ) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: 440,
              padding:
                "24px 24px 20px",
              boxSizing:
                "border-box",
              border:
                "1px solid #ebe7ef",
              borderRadius: 16,
              background:
                "#fff",
              boxShadow:
                "0 24px 70px rgba(41, 32, 57, 0.22)",
            }}
          >
            <h2
              style={{
                margin:
                  "0 0 8px",
                color:
                  "#2d2733",
                fontSize: 19,
              }}
            >
              {
                ACTION_LABELS[
                  modal.action
                ]
              }
            </h2>

            <p
              style={{
                margin: 0,
                color:
                  "#89828f",
                fontSize: 12,
                lineHeight:
                  1.7,
              }}
            >
              {modal.action ===
              "reject"
                ? `이 게시글에 접수된 신고 ${modal.group.reportCount}건을 모두 기각합니다.`
                : modal.action ===
                  "hide"
                  ? `신고 ${modal.group.reportCount}건을 모두 처리 완료하고 게시글을 중단합니다. 기존 구매자는 환불됩니다.`
                  : `신고 ${modal.group.reportCount}건을 모두 처리 완료하고 작성자에게 ${ACTION_LABELS[modal.action]} 제재를 적용합니다. 게시글도 함께 중단되며 기존 구매자는 환불됩니다.`}
            </p>

            <div
              style={{
                marginTop:
                  16,
                padding:
                  "11px 12px",
                borderRadius:
                  9,
                background:
                  "#faf9fc",
                border:
                  "1px solid #efedf3",
                color:
                  "#5f5866",
                fontSize:
                  11.5,
                lineHeight:
                  1.8,
              }}
            >
              <strong>
                {
                  modal.group
                    .representative
                    .post_title
                }
              </strong>
              <br />
              총 신고:{" "}
              {
                modal.group
                  .reportCount
              }
              건
              <br />
              처리:{" "}
              {modal.action ===
              "reject"
                ? "전체 기각"
                : modal.action ===
                  "hide"
                  ? "게시글 중단 + 구매자 환불"
                  : `${ACTION_LABELS[modal.action]} + 게시글 중단 + 구매자 환불`}
            </div>

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap: 8,
                marginTop:
                  20,
              }}
            >
              <button
                type="button"
                disabled={Boolean(
                  workingKey,
                )}
                onClick={() =>
                  setModal(null)
                }
                style={{
                  height: 38,
                  padding:
                    "0 14px",
                  border:
                    "1px solid #ddd8e4",
                  borderRadius:
                    9,
                  background:
                    "#fff",
                  color:
                    "#716a78",
                  font:
                    "inherit",
                  fontSize:
                    11.5,
                  fontWeight:
                    700,
                  cursor:
                    workingKey
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                취소
              </button>

              <button
                type="button"
                disabled={Boolean(
                  workingKey,
                )}
                onClick={() =>
                  void runAction()
                }
                style={{
                  height: 38,
                  padding:
                    "0 15px",
                  border: 0,
                  borderRadius:
                    9,
                  background:
                    modal.action ===
                    "reject"
                      ? "#77717e"
                      : modal.action ===
                          "suspend7" ||
                        modal.action ===
                          "suspend30"
                        ? "#b07a24"
                        : "#a93f50",
                  color:
                    "#fff",
                  font:
                    "inherit",
                  fontSize:
                    11.5,
                  fontWeight:
                    800,
                  cursor:
                    workingKey
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {workingKey
                  ? "처리 중..."
                  : "처리하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position:
              "fixed",
            right: 24,
            bottom: 24,
            zIndex: 1100,
            maxWidth:
              380,
            padding:
              "12px 14px",
            borderRadius:
              10,
            border:
              "1px solid #ddd8e4",
            background:
              "#fff",
            color:
              "#5e5766",
            boxShadow:
              "0 12px 35px rgba(42, 34, 53, 0.12)",
            fontSize:
              11.5,
            fontWeight:
              700,
          }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
  danger = false,
  warning = false,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        border: danger
          ? "1px solid #ead4d8"
          : warning
            ? "1px solid #e1d9ca"
            : "1px solid #ddd8e4",
        borderRadius: 7,
        background:
          "#fff",
        color: danger
          ? "#a93f50"
          : warning
            ? "#9b6a16"
            : "#77717e",
        padding:
          "6px 8px",
        fontFamily:
          "inherit",
        fontSize: 10,
        cursor:
          disabled
            ? "not-allowed"
            : "pointer",
        opacity:
          disabled
            ? 0.55
            : 1,
      }}
    >
      {label}
    </button>
  );
}
