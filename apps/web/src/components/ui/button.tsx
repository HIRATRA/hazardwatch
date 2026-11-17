import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-neutral-950 hover:bg-accent-strong",
  ghost: "border border-border text-neutral-100 hover:bg-surface-raised",
  danger: "bg-danger text-neutral-950 hover:bg-danger/85",
};

/** Button styles, also used for links that look like buttons. */
export function buttonClassName(variant: Variant = "primary", className = "") {
  return `inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}
