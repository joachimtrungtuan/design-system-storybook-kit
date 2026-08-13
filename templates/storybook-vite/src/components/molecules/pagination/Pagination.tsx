export interface PaginationProps { current: number; total: number; }

export function Pagination({ current, total }: PaginationProps) {
  return <nav aria-label="Pagination" className="flex gap-2 text-small">{Array.from({ length: total }, (_, index) => index + 1).map((page) => <span className={page === current ? "font-bold text-semantic-action" : "text-semantic-muted"} key={page}>{page}</span>)}</nav>;
}
