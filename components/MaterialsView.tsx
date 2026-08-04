"use client";

import { useState } from "react";

import TagChip, {
  TagType,
} from "@/components/common/TagChip";

type Subject = {
  id: number | string;
  name: string;
  department: string | null;
};

type DocItem = {
  id: string;
  tag: TagType;
  title: string;
  author: string;
  timeAgo: string;
  comments: number;
};

// TODO:
// posts 테이블 연결 후 실제 데이터로 교체
// 현재는 과목별 더미 데이터
const DUMMY_DOCS_BY_SUBJECT: Record<
  string,
  DocItem[]
> = {
  자료구조: [
    {
      id: "ds-1",
      tag: "notes",
      title:
        "중간고사 범위 필기 정리 (1~5장)",
      author: "홍길동",
      timeAgo: "2시간 전",
      comments: 3,
    },
    {
      id: "ds-2",
      tag: "exam",
      title:
        "작년 기말고사 복원 문제",
      author: "김철수",
      timeAgo: "1일 전",
      comments: 14,
    },
    {
      id: "ds-3",
      tag: "study_trail",
      title:
        "트리 배우고 실제 파일시스템 구조까지 찾아봄",
      author: "스터디왕",
      timeAgo: "3일 전",
      comments: 5,
    },
    {
      id: "ds-4",
      tag: "reference",
      title:
        "자료구조 참고할 만한 강의 영상 모음",
      author: "이학생",
      timeAgo: "4일 전",
      comments: 2,
    },
  ],

  운영체제: [
    {
      id: "os-1",
      tag: "notes",
      title:
        "프로세스 스케줄링 정리",
      author: "박운영",
      timeAgo: "5시간 전",
      comments: 6,
    },
    {
      id: "os-2",
      tag: "exam",
      title:
        "가상 메모리 기출 모음",
      author: "최시험",
      timeAgo: "2일 전",
      comments: 9,
    },
    {
      id: "os-3",
      tag: "reference",
      title:
        "OS 강의 추천 자료",
      author: "정참고",
      timeAgo: "6일 전",
      comments: 1,
    },
  ],

  데이터베이스: [
    {
      id: "db-1",
      tag: "notes",
      title:
        "정규화 1~3정규형 정리",
      author: "김디비",
      timeAgo: "1일 전",
      comments: 4,
    },
    {
      id: "db-2",
      tag: "study_trail",
      title:
        "정규화 배우고 실제 회사 스키마 사례까지 찾아봄",
      author: "탐구생",
      timeAgo: "3일 전",
      comments: 7,
    },
  ],
};

function getDummyDocs(
  subjectName: string,
): DocItem[] {
  const subjectDocs =
    DUMMY_DOCS_BY_SUBJECT[subjectName];

  if (subjectDocs) {
    return subjectDocs;
  }

  // 매핑되지 않은 과목은 기본 더미 1개 표시
  return [
    {
      id: `default-${subjectName}`,
      tag: "notes",
      title: `${subjectName} 강의 필기 정리`,
      author: "익명",
      timeAgo: "방금 전",
      comments: 0,
    },
  ];
}

const FILTER_TABS: {
  key: "all" | TagType;
  label: string;
}[] = [
  {
    key: "all",
    label: "전체",
  },
  {
    key: "notes",
    label: "Notes",
  },
  {
    key: "exam",
    label: "Exam",
  },
  {
    key: "reference",
    label: "Reference",
  },
  {
    key: "study_trail",
    label: "Study Trail",
  },
];

type MaterialsViewProps = {
  subject: Subject;
};

export default function MaterialsView({
  subject,
}: MaterialsViewProps) {
  const [activeFilter, setActiveFilter] =
    useState<"all" | TagType>("all");

  const docs = getDummyDocs(subject.name);

  const filteredDocs =
    activeFilter === "all"
      ? docs
      : docs.filter(
          (doc) =>
            doc.tag === activeFilter,
        );

  return (
    <div className="h-full overflow-y-auto bg-white px-8 py-6">
      {/* 브레드크럼 */}
      <div className="mb-3.5 text-[12.5px] text-[#8E8C86]">
        <a
          href="/"
          className="hover:text-[#37352F]"
        >
          내 과목
        </a>{" "}
        /{" "}
        <span className="text-[#37352F]">
          {subject.name}
        </span>
      </div>

      {/* 과목 헤더 */}
      <div className="mb-5">
        <div className="mb-1 flex items-center gap-2.5">
          <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-[#7F77DD]" />

          <h2 className="text-2xl font-bold text-[#37352F]">
            {subject.name}
          </h2>
        </div>

        <div className="pl-[19px] text-[13px] text-[#8E8C86]">
          {subject.department ??
            "학과 정보 없음"}{" "}
          · 학기·교수 상관없이 모든 자료를
          모아봐요 · 자료 {docs.length}개
        </div>
      </div>

      {/* 필터 탭 + 자료 목록 */}
      <div className="mb-4 overflow-hidden rounded-lg border border-[#DEDCD6] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex border-b border-[#DEDCD6] bg-white px-[18px]">
          {FILTER_TABS.map((tab) => {
            const isActive =
              activeFilter === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  setActiveFilter(tab.key)
                }
                className={`-mb-px mr-5 border-b-2 py-2.5 text-[13.5px] transition-colors ${
                  isActive
                    ? "border-[#7F77DD] font-semibold text-[#7F77DD]"
                    : "border-transparent font-normal text-[#6E6D68]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div>
          {filteredDocs.length === 0 ? (
            <div className="px-[18px] py-8 text-center text-[13.5px] text-[#8E8C86]">
              이 유형의 자료가 아직 없어요.
            </div>
          ) : (
            filteredDocs.map(
              (doc, index) => (
                <div
                  key={doc.id}
                  className={`flex items-center gap-3.5 bg-white px-[18px] py-[13px] ${
                    index <
                    filteredDocs.length - 1
                      ? "border-b border-[#DEDCD6]"
                      : ""
                  }`}
                >
                  <TagChip
                    tag={doc.tag}
                  />

                  <span className="flex-1 truncate text-sm text-[#37352F]">
                    {doc.title}
                  </span>

                  <span className="shrink-0 text-[12.5px] text-[#8E8C86]">
                    {doc.author} ·{" "}
                    {doc.timeAgo}
                  </span>

                  <span className="w-12 shrink-0 text-right text-xs text-[#8E8C86]">
                    댓글 {doc.comments}
                  </span>
                </div>
              ),
            )
          )}
        </div>
      </div>

      {/* 자료 업로드 버튼 */}
      <div
        aria-disabled="true"
        title="곧 제공될 기능이에요"
        className="cursor-not-allowed rounded-lg border border-[#DEDCD6] px-[18px] py-3.5 text-center text-[13.5px] text-[#C7C5BE]"
      >
        + 이 과목에 자료를 올려보세요
      </div>
    </div>
  );
}