/**
 * Markdown twin of every page (doc 33 §3.10): `/pricing.md` is generated from the same YAML as
 * `/pricing`; a blog post's twin is its source. `headers.yaml` gives them `text/markdown`.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { loadPage, pageRoutes, slugToPath } from '@/lib/pages';
import { getPosts } from '@/lib/data';
import { localePath, postPath } from '@/lib/i18n';
import { siteUrl, languages } from '@config';

export const getStaticPaths: GetStaticPaths = async () => {
  const out: { params: { path: string }; props: { lang: string; slug?: string; postId?: string } }[] = [];
  for (const { lang, slug } of await pageRoutes()) {
    const route = localePath(lang, slugToPath(slug));
    const path = route === '/' ? 'index' : route === `/${lang}` ? `${lang}/index` : route.slice(1);
    out.push({ params: { path }, props: { lang, slug } });
  }
  for (const l of languages) {
    for (const post of await getPosts(l.code)) {
      const id = post.id.split('/').pop()!;
      out.push({ params: { path: postPath(l.code, id).slice(1) }, props: { lang: l.code, postId: post.id } });
    }
  }
  return out;
};

export const GET: APIRoute = async ({ props }) => {
  const { lang, slug, postId } = props as { lang: 'en'; slug?: string; postId?: string };
  let body: string;
  if (postId) {
    const post = (await getPosts(lang)).find((p) => p.id === postId)!;
    const id = post.id.split('/').pop()!;
    body = `<!-- ${post.data.title} · ${new URL(postPath(lang, id), siteUrl)} -->\n\n# ${post.data.title}\n\n${post.data.description}\n\n${post.body ?? ''}\n`;
  } else {
    body = (await loadPage(lang, slug!)).markdown;
  }
  return new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
