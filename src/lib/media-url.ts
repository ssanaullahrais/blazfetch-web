export function coerceMediaUrl(value: string) {
  const trimmed = value.trim().replace(/&amp;/gi, "&");
  if (!trimmed) return "";
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}
