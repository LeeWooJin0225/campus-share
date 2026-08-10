"use client";

import { useMemo } from "react";

type ReportStatus = "처리 대기" | "처리 완료" | "기각";

type RecentReport = {
  id: string;
  type: "게시글" | "댓글";
  title: string;
  reason: string;
  reporter: string;
  createdAt: string;
  status: ReportStatus;
};

const stats = [
  {
    label: "전체 회원",
    value: "1,248",
    sub: "+23명 (지난 7일)",
    icon: "👥",
  },
  {
    label: "전체 게시글",
    value: "3,527",
    sub: "+58개 (지난 7일)",
    icon: "📄",
  },
  {
    label: "누적 구매 수",
    value: "5,892",
    sub: "+112건 (지난 7일)",
    icon: "🛒",
  },
  {
    label: "처리 대기 신고",
    value: "12",
    sub: "+5건 (지난 7일)",
    icon: "🚨",
  },
];

const recentReports: RecentReport[] = [
  {
    id: "#128",
    type: "게시글",
    title: "마케팅 강의 정리본 판매합니다.",
    reason: "광고 / 도배",
    reporter: "user_1234",
    createdAt: "2026.08.10 14:23",
    status: "처리 대기",
  },
  {
    id: "#127",
    type: "댓글",
    title: "이거 개꿀자료ㅋㅋㅋ",
    reason: "욕설 / 비방",
    reporter: "user_2345",
    createdAt: "2026.08.10 13:11",
    status: "처리 대기",
  },
  {
    id: "#126",
    type: "게시글",
    title: "중간고사 정리.zip",
    reason: "저작권 침해",
    reporter: "user_3456",
    createdAt: "2026.08.09 22:05",
    status: "처리 완료",
  },
  {
    id: "#125",
    type: "댓글",
    title: "작성자한테 감사해요!",
    reason: "기타",
    reporter: "user_4567",
    createdAt: "2026.08.09 18:33",
    status: "기각",
  },
  {
    id: "#124",
    type: "게시글",
    title: "과제 대신 해드립니다",
    reason: "광고 / 도배",
    reporter: "user_5678",
    createdAt: "2026.08.09 17:02",
    status: "처리 완료",
  },
];

const navItems = [
  { icon: "⌂", label: "대시보드", active: true },
  { icon: "⚠", label: "신고 관리", active: false },
  { icon: "▤", label: "게시글 관리", active: false },
  { icon: "💬", label: "댓글 관리", active: false },
  { icon: "◯", label: "회원 관리", active: false },
];

function StatusBadge({
  status,
}: {
  status: ReportStatus;
}) {
  const style =
    status === "처리 대기"
      ? {
          background: "#fff7df",
          color: "#b77a00",
        }
      : status === "처리 완료"
        ? {
            background: "#eaf8ef",
            color: "#3f9460",
          }
        : {
            background: "#f2f2f4",
            color: "#77747f",
          };

  return (
    <span
      style={{
        ...style,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 58,
        padding: "5px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

export default function AdminPage() {
  const pendingCount = useMemo(
    () =>
      recentReports.filter(
        (report) =>
          report.status === "처리 대기",
      ).length,
    [],
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns:
          "220px minmax(0, 1fr)",
        background: "#f6f7fb",
        color: "#22232a",
        fontFamily:
          'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* 사이드바 */}
      <aside
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #151f36 0%, #101a2d 100%)",
          color: "#fff",
          padding: "22px 14px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "2px 10px 20px",
          }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: -0.5,
            }}
          >
            CampusShare
          </div>
          <div
            style={{
              marginTop: 5,
              fontSize: 11,
              color:
                "rgba(255,255,255,.58)",
            }}
          >
            관리자
          </div>
        </div>

        <nav
          style={{
            display: "grid",
            gap: 5,
          }}
        >
          {navItems.map(({ icon, label, active }) => (
              <button
                key={label}
                type="button"
                style={{
                  width: "100%",
                  border: 0,
                  borderRadius: 9,
                  padding:
                    "10px 11px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: active
                    ? "rgba(255,255,255,.11)"
                    : "transparent",
                  color: active
                    ? "#ffffff"
                    : "rgba(255,255,255,.72)",
                  fontFamily:
                    "inherit",
                  fontSize: 12.5,
                  fontWeight: active
                    ? 700
                    : 500,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 20,
                    display: "inline-flex",
                    justifyContent:
                      "center",
                  }}
                >
                  {icon}
                </span>
                {label}
                {label ===
                  "신고 관리" &&
                  pendingCount > 0 && (
                    <span
                      style={{
                        marginLeft:
                          "auto",
                        minWidth: 20,
                        height: 20,
                        padding: "0 6px",
                        borderRadius: 999,
                        background:
                          "#ff6b6b",
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        fontSize: 10,
                        fontWeight:
                          800,
                      }}
                    >
                      {pendingCount}
                    </span>
                  )}
              </button>
            ),
          )}
        </nav>

        <div
          style={{
            marginTop: "auto",
            borderTop:
              "1px solid rgba(255,255,255,.10)",
            padding:
              "16px 10px 0",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color:
                "rgba(255,255,255,.48)",
            }}
          >
            로그인 계정
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 11.5,
              fontWeight: 650,
            }}
          >
            admin@sungshin.ac.kr
          </div>

          <button
            type="button"
            style={{
              marginTop: 12,
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border:
                "1px solid rgba(255,255,255,.15)",
              background:
                "transparent",
              color:
                "rgba(255,255,255,.8)",
              fontFamily: "inherit",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            서비스로 돌아가기
          </button>
        </div>
      </aside>

      {/* 메인 */}
      <main
        style={{
          minWidth: 0,
          padding:
            "28px 30px 48px",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems:
              "flex-start",
            justifyContent:
              "space-between",
            gap: 20,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 25,
                fontWeight: 800,
                letterSpacing: -0.8,
              }}
            >
              대시보드
            </h1>
            <p
              style={{
                margin:
                  "7px 0 0",
                color: "#8a8992",
                fontSize: 12,
              }}
            >
              CampusShare 운영 현황을
              한눈에 확인해요.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                color: "#9997a0",
                fontSize: 11,
              }}
            >
              2026.08.10 기준
            </span>

            <span
              style={{
                padding: "5px 8px",
                borderRadius: 999,
                background:
                  "#f0edff",
                color: "#6b52c8",
                fontSize: 10.5,
                fontWeight: 750,
              }}
            >
              ADMIN
            </span>
          </div>
        </header>

        {/* 통계 카드 */}
        <section
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {stats.map((stat) => (
            <article
              key={stat.label}
              style={{
                background:
                  "#ffffff",
                border:
                  "1px solid #e9eaf0",
                borderRadius: 12,
                padding: "17px 18px",
                boxShadow:
                  "0 1px 2px rgba(20,20,30,.02)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    color:
                      "#83828b",
                    fontSize:
                      11.5,
                    fontWeight:
                      650,
                  }}
                >
                  {stat.label}
                </span>
                <span
                  style={{
                    width: 31,
                    height: 31,
                    borderRadius: 9,
                    background:
                      "#f3f0ff",
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    fontSize: 15,
                  }}
                >
                  {stat.icon}
                </span>
              </div>

              <div
                style={{
                  marginTop: 13,
                  fontSize: 25,
                  fontWeight: 850,
                  letterSpacing:
                    -0.7,
                }}
              >
                {stat.value}
              </div>

              <div
                style={{
                  marginTop: 7,
                  color:
                    "#8d8b95",
                  fontSize: 10.5,
                }}
              >
                {stat.sub}
              </div>
            </article>
          ))}
        </section>

        {/* 중간 영역 */}
        <section
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.35fr) minmax(300px, .65fr)",
            gap: 16,
          }}
        >
          {/* 최근 7일 */}
          <article
            style={{
              minHeight: 300,
              border:
                "1px solid #e9eaf0",
              borderRadius: 12,
              background:
                "#ffffff",
              padding: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  최근 7일 활동 현황
                </h2>
                <p
                  style={{
                    margin:
                      "5px 0 0",
                    color:
                      "#97959f",
                    fontSize: 10.5,
                  }}
                >
                  게시글, 댓글, 신고 흐름
                </p>
              </div>
            </div>

            {/* 단순 차트 목업 */}
            <div
              style={{
                marginTop: 24,
                height: 205,
                position:
                  "relative",
                borderBottom:
                  "1px solid #ececf1",
                borderLeft:
                  "1px solid #ececf1",
                padding:
                  "10px 8px 0 18px",
              }}
            >
              {[25, 50, 75].map(
                (top) => (
                  <div
                    key={top}
                    style={{
                      position:
                        "absolute",
                      left: 0,
                      right: 0,
                      top: `${top}%`,
                      borderTop:
                        "1px dashed #efeff3",
                    }}
                  />
                ),
              )}

              <svg
                viewBox="0 0 700 190"
                preserveAspectRatio="none"
                style={{
                  width: "100%",
                  height: "100%",
                  position:
                    "relative",
                  zIndex: 2,
                }}
              >
                <polyline
                  points="15,125 120,90 230,105 340,55 455,78 570,118 680,96"
                  fill="none"
                  stroke="#6f52c9"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="15,155 120,142 230,132 340,118 455,140 570,126 680,112"
                  fill="none"
                  stroke="#62b783"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="15,176 120,174 230,176 340,171 455,175 570,172 680,166"
                  fill="none"
                  stroke="#ff7979"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div
                style={{
                  position:
                    "absolute",
                  left: 20,
                  right: 8,
                  bottom: -24,
                  display: "flex",
                  justifyContent:
                    "space-between",
                  color:
                    "#9b99a2",
                  fontSize: 9.5,
                }}
              >
                {[
                  "08.04",
                  "08.05",
                  "08.06",
                  "08.07",
                  "08.08",
                  "08.09",
                  "08.10",
                ].map((date) => (
                  <span key={date}>
                    {date}
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: 31,
                display: "flex",
                gap: 16,
                color:
                  "#77757f",
                fontSize: 10.5,
              }}
            >
              <span>● 게시글</span>
              <span>● 댓글</span>
              <span>● 신고</span>
            </div>
          </article>

          {/* 신고 사유 분포 */}
          <article
            style={{
              border:
                "1px solid #e9eaf0",
              borderRadius: 12,
              background:
                "#ffffff",
              padding: 18,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              신고 사유 분포
            </h2>

            <div
              style={{
                margin:
                  "24px auto 20px",
                width: 150,
                height: 150,
                borderRadius:
                  "50%",
                background:
                  "conic-gradient(#6f52c9 0 38%, #4a8be8 38% 66%, #59b987 66% 81%, #f2a64b 81% 91%, #c6c6ce 91% 100%)",
                position:
                  "relative",
              }}
            >
              <div
                style={{
                  position:
                    "absolute",
                  inset: 28,
                  borderRadius:
                    "50%",
                  background:
                    "#ffffff",
                  display: "grid",
                  placeItems:
                    "center",
                  textAlign:
                    "center",
                }}
              >
                <div>
                  <div
                    style={{
                      color:
                        "#96949d",
                      fontSize:
                        10,
                    }}
                  >
                    전체 신고
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize:
                        19,
                      fontWeight:
                        850,
                    }}
                  >
                    128건
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 9,
                color:
                  "#77757f",
                fontSize: 10.5,
              }}
            >
              <div>
                ● 부적절한 내용 38%
              </div>
              <div>
                ● 욕설 / 비방 28%
              </div>
              <div>
                ● 광고 / 도배 15%
              </div>
              <div>
                ● 저작권 침해 10%
              </div>
              <div>● 기타 9%</div>
            </div>
          </article>
        </section>

        {/* 최근 신고 */}
        <section
          style={{
            marginTop: 16,
            border:
              "1px solid #e9eaf0",
            borderRadius: 12,
            background: "#ffffff",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "17px 18px",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              borderBottom:
                "1px solid #efeff3",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                최근 신고 목록
              </h2>
              <p
                style={{
                  margin:
                    "5px 0 0",
                  color:
                    "#9997a0",
                  fontSize: 10.5,
                }}
              >
                최근 접수된 신고를
                확인해요.
              </p>
            </div>

            <button
              type="button"
              style={{
                border: 0,
                background:
                  "transparent",
                color:
                  "#6f52c9",
                fontFamily:
                  "inherit",
                fontSize: 11,
                fontWeight: 750,
                cursor: "pointer",
              }}
            >
              더보기 →
            </button>
          </div>

          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                fontSize: 11,
              }}
            >
              <thead>
                <tr
                  style={{
                    background:
                      "#fafafd",
                    color:
                      "#8a8892",
                    textAlign:
                      "left",
                  }}
                >
                  {[
                    "신고 ID",
                    "대상",
                    "신고 사유",
                    "신고자",
                    "신고일",
                    "상태",
                  ].map((head) => (
                    <th
                      key={head}
                      style={{
                        padding:
                          "11px 14px",
                        fontWeight:
                          700,
                        borderBottom:
                          "1px solid #efeff3",
                      }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentReports.map(
                  (report) => (
                    <tr
                      key={report.id}
                      style={{
                        borderBottom:
                          "1px solid #f1f1f4",
                      }}
                    >
                      <td
                        style={{
                          padding:
                            "12px 14px",
                          fontWeight:
                            750,
                          color:
                            "#5e5c66",
                        }}
                      >
                        {report.id}
                      </td>
                      <td
                        style={{
                          padding:
                            "12px 14px",
                          color:
                            "#33323a",
                          fontWeight:
                            650,
                          maxWidth: 300,
                        }}
                      >
                        [{report.type}]{" "}
                        {report.title}
                      </td>
                      <td
                        style={{
                          padding:
                            "12px 14px",
                          color:
                            "#6f6d76",
                        }}
                      >
                        {report.reason}
                      </td>
                      <td
                        style={{
                          padding:
                            "12px 14px",
                          color:
                            "#6f6d76",
                        }}
                      >
                        {report.reporter}
                      </td>
                      <td
                        style={{
                          padding:
                            "12px 14px",
                          color:
                            "#8c8993",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {report.createdAt}
                      </td>
                      <td
                        style={{
                          padding:
                            "12px 14px",
                        }}
                      >
                        <StatusBadge
                          status={
                            report.status
                          }
                        />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
