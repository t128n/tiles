export function normalizeUrl(url: string): string {
  let trimmed = url.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
}

export function extractHostname(url: string): string {
  try {
    const parsed = new URL(normalizeUrl(url));
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function getFaviconUrl(url: string): string {
  const host = extractHostname(url);
  if (!host) return '';
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
}
