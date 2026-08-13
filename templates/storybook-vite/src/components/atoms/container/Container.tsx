export interface ContainerProps { children: React.ReactNode; }

export function Container({ children }: ContainerProps) {
  return <div className="mx-auto w-full max-w-content px-4">{children}</div>;
}
