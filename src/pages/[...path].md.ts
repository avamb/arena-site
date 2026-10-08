/**
 * Markdown twin of every page (doc 33 §3.10): `/pricing.md` is generated from the same YAML as
 * `/pricing`; a blog post's twin is its source. `headers.yaml` gives them `text/markdown`.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { loadPage, pageSlugs, slugToPath } from '@/lib/pages';
import { getPosts } from '@/lib/data';
import { activeLanguages, localePath } from '@/lib/i18n';
import { siteUrl } from '@config';

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = await pageSlugs();
  const out: { params: { path: string }; props: { lang: string; slug?: string; postId?: string } }[] = [];
  for (const l of activeLanguages()) {
    for (const slug of slugs) {
      const route = localePath(l.code, slugToPath(slug));
      const path = route === '/' ? 'index' : route === `/${l.code}` ? `${l.code}/index` : route.slice(1);
      out.push({ params: { path }, props: { lang: l.code, slug } });
    }
    for (const post of await getPosts(l.code)) {
      const id = post.id.split('/').pop()!;
      out.push({ params: { path: localePath(l.code, `/blog/${id}`).slice(1) }, props: { lang: l.code, postId: post.id } });
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
    body = `<!-- ${post.data.title} · ${new URL(localePath(lang, `/blog/${id}`), siteUrl)} -->\n\n# ${post.data.title}\n\n${post.data.description}\n\n${post.body ?? ''}\n`;
  } else {
    body = (await loadPage(lang, slug!)).markdown;
  }
  return new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
