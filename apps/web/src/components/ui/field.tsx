import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  /** Validation message shown below the input. */
  error?: string | undefined;
}

/** A text input with its label above, styled like the sign in form. */
export function Field({ label, name, id, error, ...props }: FieldProps) {
  const inputId = id ?? name;
  const errorId = `${inputId}-error`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-neutral-200">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="focus:border-accent/70 focus:ring-accent/20 aria-invalid:border-danger/70 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm text-neutral-100 transition-[border-color,background-color,box-shadow] outline-none placeholder:text-neutral-500 hover:border-white/20 focus:bg-white/[0.05] focus:ring-4"
        {...props}
      />
      {error && (
        <p id={errorId} className="text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
