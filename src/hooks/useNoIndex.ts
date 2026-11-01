import { useEffect } from 'react';

/** Adds `<meta name="robots" content="noindex, nofollow">` while the calling page is mounted. */
export function useNoIndex(): void {
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previous = meta?.getAttribute('content') ?? null;
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');
    return () => {
      if (!meta) return;
      if (created) meta.remove();
      else if (previous !== null) meta.setAttribute('content', previous);
    };
  }, []);
}

export default useNoIndex;
