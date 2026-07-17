"use client";

import { useI18n } from "@/components/language-provider";

const BOARDS = [
  { name: "공지사항", posts: [
    { title: "7월 독서모임 신청 안내", date: "07-15" },
    { title: "8월 휴관일 안내", date: "07-12" },
    { title: "신착 도서 입고 안내", date: "07-10" },
    { title: "여름 독서 이벤트 당첨자", date: "07-08" },
    { title: "홈페이지 개편 안내", date: "07-05" },
  ]},
  { name: "자유게시판", posts: [
    { title: "이 책 정말 인생책이에요", date: "07-14" },
    { title: "요즘 읽는 소설 추천해요", date: "07-13" },
    { title: "도서관 카페 너무 좋네요", date: "07-11" },
    { title: "주말 자리 여유 있나요?", date: "07-09" },
    { title: "첫 방문 후기 남깁니다", date: "07-07" },
  ]},
  { name: "독서모임", posts: [
    { title: "함께 읽어요: 데미안", date: "07-13" },
    { title: "8월 모임 주제 투표", date: "07-10" },
    { title: "지난 모임 후기 모음", date: "07-06" },
    { title: "신규 회원 환영합니다", date: "07-04" },
    { title: "모임 장소 변경 안내", date: "07-02" },
  ]},
];

export default function RecentPosts() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3.5">
      {BOARDS.map((board) => (
        <div key={board.name} className="rounded-xl border border-neutral-200 bg-white p-3.5">
          <h4 className="mb-2.5 flex items-center px-1 text-[13px] font-extrabold">
            {board.name}
            <span className="ml-auto text-[11px] font-normal text-neutral-400">
              {t("posts.more")}
            </span>
          </h4>
          {board.posts.map((p, idx) => (
            <div
              key={idx}
              className="flex items-baseline gap-2 border-t border-neutral-100 px-1 py-1.5 text-[12.5px] first:border-t-0"
            >
              <span className="truncate text-neutral-600">{p.title}</span>
              <span className="ml-auto shrink-0 text-[11px] text-neutral-400">{p.date}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}