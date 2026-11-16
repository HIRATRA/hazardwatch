import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
}

export function Field({ label, name, id, ...props }: FieldProps) {
  const inputId = id ?? name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className="border-border bg-surface focus:border-accent focus:ring-accent/30 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
        {...props}
      />
    </div>
  );
}
