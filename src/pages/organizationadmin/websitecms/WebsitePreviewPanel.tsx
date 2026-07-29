import { useMemo } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PreviewViewport = 'desktop' | 'tablet' | 'mobile';
export type PreviewPage = string;

const VIEWPORT_WIDTH: Record<PreviewViewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

type Props = {
  siteBaseUrl: string;
  siteSlug: string;
  previewToken?: string | null;
  viewport: PreviewViewport;
  onViewportChange: (v: PreviewViewport) => void;
  page: PreviewPage;
  onPageChange: (p: PreviewPage) => void;
  pageOptions: { path: string; label: string }[];
  refreshKey?: number;
  emptyHint?: string;
};

export default function WebsitePreviewPanel({
  siteBaseUrl,
  siteSlug,
  previewToken,
  viewport,
  onViewportChange,
  page,
  onPageChange,
  pageOptions,
  refreshKey = 0,
  emptyHint = 'Set the public site URL in .env and save a draft to preview.',
}: Props) {
  const iframeSrc = useMemo(() => {
    if (!siteBaseUrl || !siteSlug) return '';
    const base = `${siteBaseUrl.replace(/\/$/, '')}/${siteSlug}${page}`;
    if (!previewToken) return base;
    return `${base}?preview=${encodeURIComponent(previewToken)}`;
  }, [siteBaseUrl, siteSlug, page, previewToken, refreshKey]);

  return (
    <div className="flex h-full min-h-[480px] flex-col rounded-lg border bg-muted/30">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {pageOptions.map((p) => (
            <Button
              key={p.path || 'home'}
              type="button"
              size="sm"
              variant={page === p.path ? 'default' : 'outline'}
              onClick={() => onPageChange(p.path)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant={viewport === 'desktop' ? 'default' : 'ghost'} onClick={() => onViewportChange('desktop')} title="Desktop">
            <Monitor className="w-4 h-4" />
          </Button>
          <Button type="button" size="sm" variant={viewport === 'tablet' ? 'default' : 'ghost'} onClick={() => onViewportChange('tablet')} title="Tablet">
            <Tablet className="w-4 h-4" />
          </Button>
          <Button type="button" size="sm" variant={viewport === 'mobile' ? 'default' : 'ghost'} onClick={() => onViewportChange('mobile')} title="Mobile">
            <Smartphone className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto bg-neutral-200/60 p-3">
        {!iframeSrc ? (
          <p className="p-8 text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          <div
            className="h-[min(720px,70vh)] overflow-hidden rounded-md border bg-white shadow-lg transition-all duration-200"
            style={{ width: VIEWPORT_WIDTH[viewport], maxWidth: '100%' }}
          >
            <iframe
              key={`${iframeSrc}-${refreshKey}`}
              title="Website preview"
              src={iframeSrc}
              className="h-full w-full border-0"
            />
          </div>
        )}
      </div>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        {previewToken
          ? 'Preview shows your saved draft — live site unchanged until Publish.'
          : 'Save draft to preview unpublished changes.'}
      </p>
    </div>
  );
}
