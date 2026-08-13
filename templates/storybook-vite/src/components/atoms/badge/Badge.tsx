export interface BadgeProps { tone?: "neutral" | "accent"; children: React.ReactNode; }

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  const tones = { neutral: "bg-grey-neutral-100 text-semantic-ink", accent: "bg-semantic-accent text-semantic-inverse" };
  return <span className={`rounded-full px-2 py-1 text-small font-medium ${tones[tone]}`}>{children}</span>;
}
