import { Button, Container, Heading } from "../../atoms";

export interface HeaderProps { title?: string; }

export function Header({ title = "Neutral system" }: HeaderProps) {
  return <header className="border-b border-grey-neutral-200 py-4"><Container><div className="flex items-center justify-between"><Heading level={2}>{title}</Heading><Button size="sm">Action</Button></div></Container></header>;
}
