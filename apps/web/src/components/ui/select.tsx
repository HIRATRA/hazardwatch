import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  /** Validation message shown below the select. */
  error?: string | undefined;
  /** Smaller label and padding, for toolbars such as the map filters. */
  compact?: boolean;
}

export function Select({
  label,
  name,
  id,
  options,
  error,
  compact = false,
  ...props
}: SelectProps) {
  const selectId = id ?? name;
  const errorId = `${selectId}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
        className={compact ? "text-muted text-xs font-medium" : "text-sm font-medium"}
      >
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`border-border bg-surface focus:border-accent focus:ring-accent/30 aria-invalid:border-danger rounded-md border text-sm outline-none focus:ring-2 ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
