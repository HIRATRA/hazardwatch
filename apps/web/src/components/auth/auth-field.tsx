"use client";

import type { Icon } from "@phosphor-icons/react";
import { CheckIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react/dist/ssr";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  name: string;
  /** Shown at the start of the input. */
  icon: Icon;
  /**
   * For a new password: shows the minimum length under the input, ticked
   * once it is reached.
   */
  lengthHint?: boolean;
  /** Shown at the end of the label row, such as a link. */
  labelAside?: ReactNode;
}

/**
 * A text input with its label above and an icon inside. Password inputs
 * get a button that shows or hides what was typed.
 */
export function AuthField({
  label,
  name,
  icon: Icon,
  type = "text",
  lengthHint = false,
  labelAside,
  minLength,
  onChange,
  ...props
}: AuthFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);
  const [length, setLength] = useState(0);
  const longEnough = minLength !== undefined && length >= minLength;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-neutral-200">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="group relative">
        <Icon
          aria-hidden
          className="text-muted group-focus-within:text-accent pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 transition-colors"
        />
        <input
          id={id}
          name={name}
          type={isPassword && visible ? "text" : type}
          minLength={minLength}
          aria-describedby={lengthHint ? hintId : undefined}
          onChange={(event) => {
            setLength(event.target.value.length);
            onChange?.(event);
          }}
          className={`focus:border-accent/70 focus:ring-accent/20 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 text-sm text-neutral-100 transition-[border-color,background-color,box-shadow] outline-none placeholder:text-neutral-500 hover:border-white/20 focus:bg-white/[0.05] focus:ring-4 ${isPassword ? "pr-11" : "pr-3.5"}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((shown) => !shown)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-controls={id}
            className="text-muted focus-visible:ring-accent absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg transition-colors outline-none hover:bg-white/[0.06] hover:text-neutral-100 focus-visible:ring-2"
          >
            {visible ? (
              <EyeSlashIcon aria-hidden className="size-4" />
            ) : (
              <EyeIcon aria-hidden className="size-4" />
            )}
          </button>
        )}
      </div>
      {lengthHint && minLength !== undefined && (
        <p
          id={hintId}
          className={`flex items-center gap-1.5 text-xs transition-colors ${longEnough ? "text-neutral-200" : "text-muted"}`}
        >
          <CheckIcon
            aria-hidden
            weight="bold"
            className={`size-3.5 transition-[color,opacity] ${longEnough ? "text-accent opacity-100" : "opacity-40"}`}
          />
          At least {minLength} characters
        </p>
      )}
    </div>
  );
}
