import { Container, Text } from "../../atoms";

export interface FooterProps { message?: string; }

export function Footer({ message = "A neutral foundation for product teams." }: FooterProps) {
  return <footer className="border-t border-grey-neutral-200 py-6"><Container><Text tone="muted">{message}</Text></Container></footer>;
}
