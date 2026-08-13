export interface HeadingProps { children: React.ReactNode; level?: 1 | 2 | 3; }

export function Heading({ children, level = 2 }: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  return <Tag className="font-bold leading-heading text-heading text-semantic-ink">{children}</Tag>;
}
