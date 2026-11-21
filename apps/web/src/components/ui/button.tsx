import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-neutral-950 hover:bg-accent-strong",
  ghost: "border border-white/15 text-neutral-100 hover:border-white/30 hover:bg-white/5",
  danger: "bg-danger text-neutral-950 hover:bg-danger/85",
};

/**
 * Button styles, also used for links that look like buttons: a pill, as on
 * the home page, that gives a little when pressed.
 */
export function buttonClassName(variant: Variant = "primary", className = "") {
  return `group inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium whitespace-nowrap transition-[background-color,border-color,transform] outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${variants[variant]} ${className}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}
