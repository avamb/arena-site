/** Absolute-path URL of an author's photo for JSON-LD (Person.image), 400 px, from src/images/authors/. */
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import type { Author } from './data';

const photos = import.meta.glob<{ default: ImageMetadata }>('/src/images/authors/*.{jpg,jpeg,png,webp}', { eager: true });

export async function withImage(a: Author | undefined): Promise<Author | undefined> {
  const src = a && photos[`/src/images/authors/${a.photo}`]?.default;
  if (!a || !src) return a;
  return { ...a, image: (await getImage({ src, width: 400, height: 400, fit: 'cover', format: 'jpg' })).src };
}
