interface GetTextOptions {
  /** Strip surrounding whitespace. Disable for secrets such as passwords. */
  trim?: boolean;
}

/** Reads a text field from form data, returning an empty string when absent or not text. */
export function getText(form: FormData, name: string, { trim = true }: GetTextOptions = {}) {
  const value = form.get(name);
  if (typeof value !== "string") {
    return "";
  }
  return trim ? value.trim() : value;
}
