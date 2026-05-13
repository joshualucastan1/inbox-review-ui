/** Escape HTML entities for safe rendering */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Format an ISO timestamp as a relative "Xm ago", "Xh ago", "Xd ago" string */
export function fmtRelativeWhen(iso: string | undefined | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const ago = (Date.now() - t) / 1000;
  if (ago < 3600) return `${Math.round(ago / 60)}m ago`;
  if (ago < 86400) return `${Math.round(ago / 3600)}h ago`;
  if (ago < 86400 * 30) return `${Math.round(ago / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Format a unix timestamp as relative string */
export function fmtRelativeUnix(ts: number | null | undefined): string {
  if (!ts) return '';
  return fmtRelativeWhen(new Date(ts * 1000).toISOString());
}

/** Format seconds until a future timestamp as "Xh Ym" or "Xm" */
export function fmtUntil(ts: number | undefined, nowTs: number): string {
  if (!ts) return '?';
  const secs = Math.max(0, ts - nowTs);
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h < 24) return `${h}h ${mm}m`;
  return `${h}h`;
}

/** Format a duration in seconds as "Xs", "Xm Ys", "Xh Ym" */
export function fmtDuration(secs: number | null | undefined): string {
  if (secs == null) return '?';
  if (secs < 60) return `${Math.round(secs)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

/** Quick approximate edit distance for live UI feedback (character-level) */
export function simpleEditDistance(a: string, b: string): number {
  if (a === b) return 0;
  const lenDiff = Math.abs(a.length - b.length);
  if (lenDiff > 0 && lenDiff > Math.min(a.length, b.length) * 0.3) return lenDiff;
  const min = Math.min(a.length, b.length);
  let mismatch = lenDiff;
  for (let i = 0; i < min; i++) {
    if (a[i] !== b[i]) mismatch++;
  }
  return mismatch;
}

/** Word-level inline diff using LCS. Returns HTML string with <ins>/<del> tags. */
export function inlineDiff(orig: string, sent: string): string {
  const a = (orig || '').split(/(\s+)/);
  const b = (sent || '').split(/(\s+)/);

  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  let i = m;
  let j = n;
  const out: string[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      out.unshift(escapeHtml(a[i - 1]));
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      out.unshift(`<ins class="bg-emerald-100 no-underline">${escapeHtml(b[j - 1])}</ins>`);
      j--;
    } else {
      out.unshift(`<del class="bg-red-100 line-through">${escapeHtml(a[i - 1])}</del>`);
      i--;
    }
  }
  return out.join('');
}

/** Parse attachment names from string or array */
export function parseAttachmentNames(attachments: string | string[] | undefined | null): string[] {
  if (!attachments) return [];
  if (Array.isArray(attachments)) return attachments;
  try {
    const parsed = JSON.parse(attachments);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return attachments ? [attachments] : [];
  }
}

/** Check if draft body mentions an attachment */
export function mentionsAttached(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes('attached') ||
    lower.includes('attachment') ||
    lower.includes('attaching') ||
    lower.includes('please find')
  );
}

/** Region of a conversation item based on timezone */
export function regionOfTz(tz: string | undefined | null, regionMap: Record<string, string>): string {
  if (!tz) return 'none';
  return regionMap[tz.toUpperCase()] || 'none';
}
