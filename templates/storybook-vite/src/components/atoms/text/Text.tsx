export interface TextProps { children: React.ReactNode; tone?: "default" | "muted"; }

export function Text({ children, tone = "default" }: TextProps) {
  const tones = { default: "text-semantic-ink", muted: "text-semantic-muted" };
  return <p className={`leading-body text-body ${tones[tone]}`}>{children}</p>;
}
