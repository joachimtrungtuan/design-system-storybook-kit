export interface BreadcrumbProps { items: string[]; }

export function Breadcrumb({ items }: BreadcrumbProps) {
  return <nav aria-label="Breadcrumb"><ol className="flex gap-2 text-small text-semantic-muted">{items.map((item) => <li key={item}>{item}</li>)}</ol></nav>;
}
