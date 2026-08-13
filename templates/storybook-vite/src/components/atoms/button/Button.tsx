export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
}

export function Button({ className = "", size = "md", tone = "primary", ...props }: ButtonProps) {
  const sizes = { sm: "px-2 py-1 text-small", md: "px-4 py-2 text-body", lg: "px-6 py-3 text-body" };
  const tones = {
    primary: "bg-semantic-action text-semantic-inverse hover:bg-brand-primary-700 active:bg-brand-primary-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-semantic-action",
    secondary: "bg-grey-neutral-100 text-semantic-ink hover:bg-grey-neutral-200 active:bg-grey-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-semantic-action",
  };
  return <button className={`rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${tones[tone]} ${className}`} {...props} />;
}
