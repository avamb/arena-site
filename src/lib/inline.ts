/**
 * The only inline markup allowed in YAML strings: **bold** and [text](href). Everything else is
 * escaped. Keeps content editable by non-developers and safe to render with set:html.
 */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function inline(s: string, opts: { linkClass?: string; resolve?: (href: string) => string } = {}): string {
  const esc = escapeHtml(s);
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
      const url = opts.resolve ? opts.resolve(href) : href;
      const cls = opts.linkClass ? ` class="${opts.linkClass}"` : '';
      return `<a href="${url}"${cls}>${text}</a>`;
    });
}

/** Same string without any markup, for Markdown twins and JSON-LD. */
export function plain(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
}

/** Keep the markdown marks, used by the Markdown twin generator. */
export function md(s: string): string {
  return s;
}

/** Replace {placeholders} with values. */
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}
