import { Heading, Text } from "../../atoms";

export interface CardProps { title: string; description: string; tone?: "default" | "accent"; }

export function Card({ description, title, tone = "default" }: CardProps) {
  const tones = { default: "bg-semantic-surface", accent: "bg-grey-neutral-100" };
  return <article className={`rounded-lg p-6 shadow-md ${tones[tone]}`}><Heading level={3}>{title}</Heading><Text tone="muted">{description}</Text></article>;
}
