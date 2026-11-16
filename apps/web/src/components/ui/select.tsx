import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
}

export function Select({ label, name, id, options, ...props }: SelectProps) {
  const selectId = id ?? name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-muted text-xs font-medium">
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        className="border-border bg-surface focus:border-accent focus:ring-accent/30 rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-2"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
