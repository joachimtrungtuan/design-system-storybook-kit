import { Footer, Header } from "../../organisms";

export interface PageShellProps { children: React.ReactNode; title?: string; }

export function PageShell({ children, title }: PageShellProps) {
  return <div className="flex min-h-screen flex-col"><Header title={title} /><main className="flex-1 py-12">{children}</main><Footer /></div>;
}
