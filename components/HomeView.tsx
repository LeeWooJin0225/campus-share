"use client";

import Link from "next/link";
import TagChip, { TagType } from "@/components/TagChip";

type Offering = {
  id: number | string;
  subject: { id: number | string; name: string; department: string | null } | null;
  professor: { id: number | string; name: string } | null;
  semester: { id: number | string; year: number; term: number } | null;
};

// TODO: posts 테이블 연결되면 실제 데이터로 교체
const DUMMY_CONTINUE = {
  subjectName: "자료구조",
  title: "트리와 이진탐색 정리",
  timeAgo: "3분 전까지 보고 있었어요",
};

const DUMMY_RECENT_ACTIVITY: {
  id: string;
  tag: TagType;
  title: string;
  author: string;
  timeAgo: string;
  comments: number;
}[] = [
  { id: "1", tag: "Notes", title: "중간고사 범위 필기 정리 (1~5장)", author: "홍길동", timeAgo: "2시간 전", comments: 3 },
  { id: "2", tag: "Exam", title: "작년 기말고사 복원 문제", author: "김철수", timeAgo: "1일 전", comments: 14 },
  { id: "3", tag: "Study Trail", title: "트리 배우고 실제 파일시스템 구조까지 찾아봄", author: "스터디왕", timeAgo: "3일 전", comments: 5 },
  { id: "4", tag: "Notes", title: "리액트 훅 완전 정복 (과제3 대비)", author: "박코딩", timeAgo: "1일 전", comments: 4 },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 text-[12.5px] font-medium text-[#8E8C86]">
      {children}
    </div>
  );
}

export default function HomeView({ offerings }: { offerings: Offering[] }) {
  return (
    <div className="h-full overflow-y-auto bg-white px-8 py-7">
      {/* 이어보기 카드 — 더미 데이터 */}
      <Link
        href="/materials"
        className="mb-8 block rounded-lg border border-[#DEDCD6] px-[18px] py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-[#D3D1C7]"
      >
        <div className="mb-1 text-[11.5px] text-[#8E8C86]">이어보기</div>
        <div className="mb-0.5 text-[15px] font-semibold text-[#37352F]">
          {DUMMY_CONTINUE.subjectName} · {DUMMY_CONTINUE.title}
        </div>
        <div className="text-[12.5px] text-[#8E8C86]">
          {DUMMY_CONTINUE.timeAgo}
        </div>
      </Link>

      {/* 내 과목 — 실제 DB 데이터 (이번 학기 개설 기준) */}
      <SectionLabel>내 과목</SectionLabel>
      {offerings.length === 0 ? (
        <p className="mb-8 text-sm text-[#8E8C86]">등록된 강의가 없습니다.</p>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[#DEDCD6] shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map((offering) => {
            const subjectName = offering.subject?.name ?? "이름 없음";
            return (
              <Link
                key={offering.id}
                href={`/materials?subject=${encodeURIComponent(subjectName)}`}
                className="border-l-[3px] border-transparent bg-white px-[18px] py-4 transition-colors hover:bg-[#FBFBFA]"
              >
                <div className="mb-1.5 flex items-center gap-[7px]">
                  <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#B4B2A9]" />
                  <span className="text-sm font-semibold text-[#37352F]">
                    {subjectName}
                  </span>
                </div>
                <div className="mb-[3px] truncate text-[12.5px] text-[#6E6D68]">
                  {offering.professor?.name ?? "교수 정보 없음"}
                </div>
                <div className="text-[11.5px] text-[#8E8C86]">
                  {offering.semester
                    ? `${offering.semester.year}-${offering.semester.term}`
                    : ""}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 최근 학습 기록 — 더미 데이터 */}
      <SectionLabel>최근 학습 기록</SectionLabel>
      <div className="overflow-hidden rounded-lg border border-[#DEDCD6] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {DUMMY_RECENT_ACTIVITY.map((doc, i) => (
          <Link
            key={doc.id}
            href="/materials"
            className={`flex items-center gap-3.5 bg-white px-[18px] py-[13px] transition-colors hover:bg-[#FBFBFA] ${
              i < DUMMY_RECENT_ACTIVITY.length - 1
                ? "border-b border-[#DEDCD6]"
                : ""
            }`}
          >
            <TagChip tag={doc.tag} />
            <span className="flex-1 truncate text-sm text-[#37352F]">
              {doc.title}
            </span>
            <span className="shrink-0 text-[12.5px] text-[#8E8C86]">
              {doc.author} · {doc.timeAgo}
            </span>
            <span className="w-12 shrink-0 text-right text-xs text-[#8E8C86]">
              댓글 {doc.comments}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}