"use client";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

// 한 번에 보여줄 페이지 번호 개수입니다.
const BLOCK_SIZE = 10;

// 페이지 번호를 최대 10개까지 숫자 버튼으로 보여줍니다.
// 전체 페이지가 10개를 넘으면, 지금 보이는 10개 묶음의 앞/뒤로 10페이지씩 한 번에 이동하는
// « » 버튼이 함께 나타납니다. '목록', '회원', '대출이력' 화면에서 공통으로 씁니다.
export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // 지금 페이지가 속한 "10페이지 묶음"의 시작과 끝을 구합니다. (예: 23페이지 → 21~30 묶음)
  const blockStart = Math.floor((page - 1) / BLOCK_SIZE) * BLOCK_SIZE + 1;
  const blockEnd = Math.min(blockStart + BLOCK_SIZE - 1, totalPages);

  const pageNumbers: number[] = [];
  for (let p = blockStart; p <= blockEnd; p++) {
    pageNumbers.push(p);
  }

  const hasPrevBlock = blockStart > 1;
  const hasNextBlock = blockEnd < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 text-sm">
      <button
        type="button"
        disabled={!hasPrevBlock}
        onClick={() => onPageChange(Math.max(1, blockStart - BLOCK_SIZE))}
        className="cursor-pointer rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="이전 10페이지"
      >
        «
      </button>
      {pageNumbers.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={`cursor-pointer rounded border px-3 py-1 ${
            p === page ? "border-[#383838] bg-[#383838] text-[#F9F6F0]" : "hover:bg-neutral-50"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={!hasNextBlock}
        onClick={() => onPageChange(Math.min(totalPages, blockStart + BLOCK_SIZE))}
        className="cursor-pointer rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="다음 10페이지"
      >
        »
      </button>
    </div>
  );
}