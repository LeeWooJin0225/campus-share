"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// TODO: 나중에 실제 DB의 subjects로 교체 (일단 더미)
const DUMMY_SUBJECTS = [
  "자료구조",
  "운영체제",
  "웹 프로그래밍",
  "데이터베이스",
  "컴퓨터 네트워크",
  "확률및통계",
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isHomeActive = pathname === "/";

  return (
    <aside
      className="relative flex shrink-0 flex-col overflow-hidden border-r border-[#DEDCD6] bg-[#F5F5F5] transition-all duration-200"
      style={{
        width: collapsed ? 52 : 240,
        padding: collapsed ? "16px 8px" : "16px 12px",
      }}
    >
      {/* 로고 + 접기/펴기 버튼 */}
      <div
        className={`mb-4 flex items-center ${
          collapsed ? "flex-col gap-2" : "justify-between px-1"
        }`}
      >
        <Link
          href="/"
          className="flex items-center gap-2 overflow-hidden text-[15px] font-bold text-[#3C3489]"
        >
          <span className="relative h-5 w-5 shrink-0 rounded-[5px] bg-[#3C3489]">
            <span className="absolute inset-[5px] rounded-sm border-[1.5px] border-[#FBFBFA]" />
          </span>
          {!collapsed && <span className="whitespace-nowrap">CampusShare</span>}
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? "사이드바 펴기" : "사이드바 접기"}
          className="rounded px-1.5 py-1 text-xs leading-none text-[#8E8C86] hover:bg-black/5 hover:text-[#37352F]"
        >
          {collapsed ? "⟩" : "⟨"}
        </button>
      </div>

      {/* 새 노트 — 아직 페이지 없어서 클릭 비활성화 */}
      <div
        aria-disabled="true"
        title="곧 제공될 기능이에요"
        className={`mb-3 flex cursor-not-allowed items-center gap-1.5 rounded-md border border-[#D3D1C7] px-2.5 py-[7px] text-[13.5px] font-medium text-[#B4B2A9] ${
          collapsed ? "justify-center" : "justify-start"
        }`}
      >
        <span className="text-[13px] leading-none">+</span>
        {!collapsed && <span>새 노트</span>}
      </div>

      {/* 홈 — 실제 링크 */}
      <Link
        href="/"
        className={`flex items-center rounded px-2.5 py-1.5 text-sm transition-colors ${
          collapsed ? "justify-center" : "justify-start"
        } ${
          isHomeActive
            ? "bg-[#F1EFFD] font-semibold text-[#7F77DD]"
            : "font-normal text-[#6E6D68] hover:bg-black/[0.04] hover:text-[#37352F]"
        }`}
      >
        {!collapsed ? "홈" : <span className="h-[5px] w-[5px] rounded-full bg-current opacity-50" />}
      </Link>

      {/* 전체 과목 검색 / 북마크 — 아직 페이지 없어서 회색, 클릭 비활성화 */}
      {["전체 과목 검색", "북마크"].map((label) => (
        <div
          key={label}
          aria-disabled="true"
          title="곧 제공될 기능이에요"
          className={`flex cursor-not-allowed items-center rounded px-2.5 py-1.5 text-sm text-[#C7C5BE] ${
            collapsed ? "justify-center" : "justify-start"
          }`}
        >
          {!collapsed ? label : <span className="h-[5px] w-[5px] rounded-full bg-current opacity-30" />}
        </div>
      ))}

      {/* 구분선 */}
      <div className="my-2.5 h-px bg-[#DEDCD6]" />

      {/* 내 과목 — 더미 데이터, 클릭 비활성화 */}
      {!collapsed && (
        <div className="mb-1 px-2 text-[11.5px] font-medium text-[#8E8C86]">
          내 과목 · {DUMMY_SUBJECTS.length}
        </div>
      )}
      <div className="mb-3 flex flex-1 flex-col gap-px overflow-y-auto">
        {DUMMY_SUBJECTS.map((name) => (
          <div
            key={name}
            aria-disabled="true"
            className={`flex cursor-not-allowed items-center gap-2 rounded px-2 py-1.5 text-[13.5px] text-[#37352F] ${
              collapsed ? "justify-center" : "justify-start"
            }`}
          >
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#B4B2A9]" />
            {!collapsed && <span>{name}</span>}
          </div>
        ))}
      </div>

      <div className="my-2.5 h-px bg-[#DEDCD6]" />

      {/* 마이페이지 — 아직 페이지 없어서 회색, 클릭 비활성화 */}
      <div
        aria-disabled="true"
        title="곧 제공될 기능이에요"
        className={`flex cursor-not-allowed items-center rounded px-2.5 py-1.5 text-sm text-[#C7C5BE] ${
          collapsed ? "justify-center" : "justify-start"
        }`}
      >
        {!collapsed ? "마이페이지" : <span className="h-[5px] w-[5px] rounded-full bg-current opacity-30" />}
      </div>
    </aside>
  );
}