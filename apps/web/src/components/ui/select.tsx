"use client";

import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react/dist/ssr";
import * as RadixSelect from "@radix-ui/react-select";
import { useLenis } from "lenis/react";
import { useId } from "react";

interface SelectProps {
  label: string;
  /** Field name, submitted with the form through a hidden native select. */
  name: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onValueChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  /** Validation message shown below the select. */
  error?: string | undefined;
  /** Smaller label and padding, for toolbars such as the map filters. */
  compact?: boolean;
}

/**
 * A dropdown with a styled list instead of the browser's, keyboard friendly
 * and announced like a native select. Page scrolling pauses while it is
 * open, so that the wheel scrolls the list.
 */
export function Select({
  label,
  name,
  value,
  options,
  onValueChange,
  id,
  disabled,
  error,
  compact = false,
}: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? `${name}-${generatedId}`;
  const labelId = `${triggerId}-label`;
  const errorId = `${triggerId}-error`;
  const lenis = useLenis();

  return (
    <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-2"}`}>
      <label
        id={labelId}
        htmlFor={triggerId}
        className={
          compact ? "text-muted text-xs font-medium" : "text-sm font-medium text-neutral-200"
        }
      >
        {label}
      </label>
      <RadixSelect.Root
        name={name}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled ?? false}
        onOpenChange={(open) => (open ? lenis?.stop() : lenis?.start())}
      >
        <RadixSelect.Trigger
          id={triggerId}
          aria-labelledby={labelId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`group aria-invalid:border-danger data-[state=open]:border-accent/60 flex w-full items-center justify-between gap-2 border text-left text-sm transition-[border-color,background-color,box-shadow] outline-none disabled:opacity-60 ${
            compact
              ? "border-border bg-surface/80 focus-visible:border-accent focus-visible:ring-accent/30 h-9 rounded-lg px-3 hover:border-white/25 focus-visible:ring-2"
              : "focus-visible:border-accent/70 focus-visible:ring-accent/20 h-11 rounded-xl border-white/10 bg-white/[0.03] px-3.5 hover:border-white/20 focus-visible:ring-4"
          }`}
        >
          <span className="truncate">
            {/* Rendered by the server too, before the list mounts in the browser. */}
            <RadixSelect.Value>
              {options.find((option) => option.value === value)?.label}
            </RadixSelect.Value>
          </span>
          <RadixSelect.Icon asChild>
            <CaretDownIcon className="text-muted size-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            data-lenis-prevent
            className="select-content border-border bg-surface-raised/95 z-50 max-h-[min(20rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-40 overflow-hidden rounded-xl border p-1 shadow-2xl shadow-black/40 backdrop-blur-xl"
          >
            <RadixSelect.Viewport>
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className="data-[highlighted]:bg-white/[0.07] data-[state=checked]:text-neutral-50 text-muted relative flex cursor-pointer items-center rounded-lg py-2 pr-8 pl-3 text-sm transition-colors outline-none select-none data-[highlighted]:text-neutral-50"
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="text-accent absolute right-2.5 inline-flex">
                    <CheckIcon className="size-3.5" weight="bold" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error && (
        <p id={errorId} className="text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
