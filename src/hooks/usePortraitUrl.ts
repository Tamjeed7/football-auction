import { useEffect, useState } from 'react';
import { getPortraitObjectUrl } from '../lib/portraitStore';

/** Resolves a custom portrait asset id to a displayable object URL, revoking it on unmount/change. */
export function usePortraitUrl(assetId?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    if (!assetId) {
      setUrl(null);
      return;
    }

    getPortraitObjectUrl(assetId).then(resolved => {
      if (cancelled) return;
      objectUrl = resolved;
      setUrl(resolved);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);

  return url;
}
