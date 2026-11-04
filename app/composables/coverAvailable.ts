import { coverSrc, type CoverSize } from '../../utils/cover'

// Whether VÖBB has an image for the id. The detail page asks before it renders the header: a slot
// that collapses after a failed image makes the text jump left. If VÖBB is too slow to say, the
// slot stays (true) and the image arrives later; the cover itself falls back by itself if it fails.
export async function coverAvailable(id: string | undefined, size: CoverSize, timeoutMs = 1500): Promise<boolean> {
  if (!id) return false;
  const src = coverSrc(id, size);

  // Server-rendered page: ask our own route, in-process. The browser then gets a 200 or no slot.
  if (import.meta.server) {
    try {
      const res = await $fetch.raw(src, { ignoreResponseError: true, responseType: 'arrayBuffer', timeout: timeoutMs });
      return res.status === 200;
    } catch {
      return true;
    }
  }

  // In the browser the preload also fills the cache, so the visible image shows at once
  return new Promise<boolean>((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => resolve(true), timeoutMs);
    image.onload = () => { clearTimeout(timer); resolve(true); };
    image.onerror = () => { clearTimeout(timer); resolve(false); };
    image.src = src;
  });
}
