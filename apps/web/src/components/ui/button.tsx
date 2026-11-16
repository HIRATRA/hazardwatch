import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-neutral-950 hover:bg-accent-strong",
  ghost: "border border-border text-neutral-100 hover:bg-surface-raised",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
