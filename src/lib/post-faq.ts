/**
 * FAQ of a blog article, read from its Markdown body: the "## <heading>" section whose heading is the
 * language's `post.faq` string, each "### question" followed by its answer, up to the next "## " heading.
 * The page passes the result to JSON-LD (FAQPage); the Markdown twin is the source, so it has the FAQ too.
 */
const toPlain = (s: string) =>
  s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|_|`)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function faqOf(body: string, heading: string): { q: string; a: string }[] {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+/.test(l) && toPlain(l.replace(/^##\s+/, '')) === heading);
  if (start < 0) return [];
  const out: { q: string; a: string }[] = [];
  let current: { q: string; a: string[] } | undefined;
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/.test(line)) break;
    const q = line.match(/^###\s+(.+)$/);
    if (q) {
      if (current) out.push({ q: current.q, a: toPlain(current.a.join(' ')) });
      current = { q: toPlain(q[1]), a: [] };
    } else if (current) current.a.push(line);
  }
  if (current) out.push({ q: current.q, a: toPlain(current.a.join(' ')) });
  return out.filter((x) => x.q && x.a);
}
