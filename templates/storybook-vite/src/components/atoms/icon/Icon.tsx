import { Star } from "@phosphor-icons/react";

export interface IconProps { label?: string; size?: "sm" | "md" | "lg"; }

export function Icon({ label = "Star", size = "md" }: IconProps) {
  const sizes = { sm: "size-icon-sm", md: "size-icon-md", lg: "size-icon-lg" };
  return <Star aria-label={label} className={sizes[size]} weight="fill" />;
}
