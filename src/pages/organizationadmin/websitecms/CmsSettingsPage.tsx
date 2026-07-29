/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Upload, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useCms } from '../../../hooks/useCms';
import { useAuth } from '../../../context/AuthContext';
import { useBusinessContext } from '../../../context/BusinessContext';
import PhotoUploadInput from '../../../components/common/PhotoUploadInput';
import WebsitePreviewPanel, { type PreviewPage, type PreviewViewport } from './WebsitePreviewPanel';
import {
  DEFAULT_SOCIALS,
  SHOP_SECTIONS,
  RENTAL_SECTIONS,
  isShopIndustry,
  isRentalIndustry,
  mergeContentForIndustry,
} from './cms-defaults';
import type { CmsOutletContext } from './WebsiteCmsLayout';

function shopThemeDefaults() {
  return {
    version: 2,
    style: 'editorial',
    primary: '#111111',
    secondary: '#6B7280',
    accent: '#111111',
    sections: { ...SHOP_SECTIONS },
    heroCta: 'Shop now',
  };
}

function rentalThemeDefaults() {
  return {
    version: 2,
    style: 'glass',
    primary: '#111111',
    secondary: '#6B7280',
    accent: '#B8FF3C',
    glass: { blur: 24, opacity: 0.55, border: 0.7 },
    sections: { ...RENTAL_SECTIONS },
    heroCta: 'Browse fleet',
  };
}

function mergeTheme(raw: any, settings: any, industryType?: string) {
  const base = isRentalIndustry(industryType) ? rentalThemeDefaults() : shopThemeDefaults();
  return {
    ...base,
    ...(raw || {}),
    primary: raw?.primary || settings?.themeColor || base.primary,
    secondary: raw?.secondary || settings?.secondaryColor || base.secondary,
    accent: raw?.accent || base.accent,
    sections: { ...base.sections, ...(raw?.sections || {}) },
    heroCta: raw?.heroCta || base.heroCta,
    glass: isRentalIndustry(industryType)
      ? { ...(base as any).glass, ...(raw?.glass || {}) }
      : raw?.glass,
  };
}

function buildDraftPayload(settings: any, theme: any, content: any) {
  return {
    siteTitle: settings.siteTitle || null,
    tagline: settings.tagline || null,
    about: settings.about || null,
    phone: settings.phone || null,
    email: settings.email || null,
    address: settings.address || null,
    heroImage: settings.heroImage || null,
    logoImage: settings.logoImage || null,
    seoTitle: settings.seoTitle || null,
    seoDescription: settings.seoDescription || null,
    seoKeywords: settings.seoKeywords || null,
    socials: settings.socials || null,
    services: settings.services || null,
    isPublished: !!settings.isPublished,
    themeColor: theme.primary,
    secondaryColor: theme.secondary,
    themeJson: {
      ...theme,
      primary: theme.primary,
      secondary: theme.secondary,
      accent: theme.accent,
      sections: { ...theme.sections },
      heroCta: theme.heroCta,
    },
    content,
  };
}

/** Website content editor with live preview (draft → publish). Works for shop + rental. */
export default function CmsSettingsPage() {
  const { reloadPublishState } = useOutletContext<CmsOutletContext>();
  const { getSettings, saveDraft, publishDraft, discardDraft } = useCms();
  const { user } = useAuth() as any;
  const { industryType } = useBusinessContext();
  const businessId = user?.businessId;
  const shop = isShopIndustry(industryType);
  const rental = isRentalIndustry(industryType);

  const [settings, setSettings] = useState<any>({});
  const [theme, setTheme] = useState(() => mergeTheme(null, null, industryType));
  const [content, setContent] = useState(() => mergeContentForIndustry(null, industryType));
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const [previewPage, setPreviewPage] = useState<PreviewPage>('');

  const shopBase = (import.meta.env.VITE_SHOP_SITE_URL as string | undefined)?.replace(/\/$/, '') || '';
  const rentalBase = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, '') || '';
  const siteBase = rental ? rentalBase : shopBase;

  const pageOptions = useMemo(
    () => (rental
      ? [
          { path: '', label: 'Home' },
          { path: '/fleet', label: 'Fleet' },
          { path: '/contact', label: 'Contact' },
          { path: '/blog', label: 'Blog' },
        ]
      : [
          { path: '', label: 'Home' },
          { path: '/shop', label: 'Shop' },
          { path: '/contact', label: 'Contact' },
          { path: '/blog', label: 'Blog' },
        ]),
    [rental],
  );

  const sectionKeys = rental ? Object.keys(RENTAL_SECTIONS) : Object.keys(SHOP_SECTIONS);
  const showPreview = (shop || rental) && !!siteBase;

  const load = useCallback(async () => {
    const res = await getSettings();
    const data = (res?.data as any) ?? {};
    setSettings(data);
    setTheme(mergeTheme(data.themeJson, data, industryType));
    setContent(mergeContentForIndustry(data.themeJson?.content, industryType));
    setPreviewToken(data.previewToken ?? null);
    setHasDraft(!!data.hasDraft);
  }, [getSettings, industryType]);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: any) => setSettings((prev: any) => ({ ...prev, [k]: v }));
  const setThemeField = (k: string, v: any) => setTheme((prev: any) => ({ ...prev, [k]: v }));
  const setSection = (k: string, v: boolean) =>
    setTheme((prev: any) => ({ ...prev, sections: { ...prev.sections, [k]: v } }));
  const setContentField = (section: string, key: string, value: any) =>
    setContent((prev: any) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));

  const heroImages: string[] = content.hero?.images?.length
    ? content.hero.images
    : [settings.heroImage].filter(Boolean);

  const setHeroImageAt = (index: number, url: string) => {
    const imgs = [...(heroImages || [])];
    while (imgs.length <= index) imgs.push('');
    imgs[index] = url;
    setContentField('hero', 'images', imgs.filter(Boolean));
    if (index === 0) set('heroImage', url || null);
  };

  const handleSaveDraft = async () => {
    const payload = buildDraftPayload(settings, theme, content);
    const res = await saveDraft(payload);
    const data = (res?.data as any) ?? {};
    setPreviewToken(data.previewToken ?? previewToken);
    setHasDraft(true);
    setPreviewKey((k) => k + 1);
    reloadPublishState();
  };

  const handlePublish = async () => {
    const payload = buildDraftPayload({ ...settings, isPublished: true }, theme, content);
    await saveDraft(payload);
    await publishDraft();
    await load();
    setPreviewKey((k) => k + 1);
    reloadPublishState();
  };

  const handleDiscard = async () => {
    await discardDraft();
    await load();
    setPreviewKey((k) => k + 1);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_minmax(360px,42%)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          {hasDraft && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Unpublished draft</span>}
          <Button size="sm" variant="outline" onClick={handleSaveDraft}>
            <Save className="w-4 h-4 mr-1" /> Save draft
          </Button>
          <Button size="sm" onClick={handlePublish}>
            <Upload className="w-4 h-4 mr-1" /> Publish to live
          </Button>
          {hasDraft && (
            <Button size="sm" variant="ghost" onClick={handleDiscard}>
              <RotateCcw className="w-4 h-4 mr-1" /> Discard draft
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-4 grid gap-3">
            <h3 className="font-semibold text-sm">Branding &amp; contact</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Site title</Label><Input value={settings.siteTitle || ''} onChange={(e) => set('siteTitle', e.target.value)} /></div>
              <div><Label>Tagline</Label><Input value={settings.tagline || ''} onChange={(e) => set('tagline', e.target.value)} /></div>
            </div>
            <div>
              <Label>About</Label>
              <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={settings.about || ''} onChange={(e) => set('about', e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={settings.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div>
              <div><Label>Email</Label><Input value={settings.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
            </div>
            <div><Label>Address</Label><Input value={settings.address || ''} onChange={(e) => set('address', e.target.value)} /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Logo</Label>
                <PhotoUploadInput label="" max={1} photos={settings.logoImage ? [settings.logoImage] : []} onChange={(p) => set('logoImage', p[0] || '')} />
              </div>
              <div>
                <Label>Hero image</Label>
                <PhotoUploadInput label="" max={1} photos={settings.heroImage ? [settings.heroImage] : []} onChange={(p) => { set('heroImage', p[0] || ''); if (shop) setHeroImageAt(0, p[0] || ''); }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {shop && (
          <Card>
            <CardContent className="p-4 grid gap-3">
              <h3 className="font-semibold text-sm">Home — Hero (shop)</h3>
              <div><Label>Small label</Label><Input value={content.hero?.label || ''} onChange={(e) => setContentField('hero', 'label', e.target.value)} /></div>
              <div>
                <Label>Headline (Enter = line break)</Label>
                <textarea className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={content.hero?.headline || ''} onChange={(e) => setContentField('hero', 'headline', e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Primary button</Label><Input value={theme.heroCta || ''} onChange={(e) => setThemeField('heroCta', e.target.value)} /></div>
                <div><Label>Secondary button</Label><Input value={content.hero?.ctaSecondary || ''} onChange={(e) => setContentField('hero', 'ctaSecondary', e.target.value)} /></div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <Label>Hero image {i + 1}</Label>
                    <PhotoUploadInput label="" max={1} photos={heroImages[i] ? [heroImages[i]] : []} onChange={(p) => setHeroImageAt(i, p[0] || '')} />
                  </div>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Products title</Label><Input value={content.products?.title || ''} onChange={(e) => setContentField('products', 'title', e.target.value)} /></div>
                <div><Label>Featured title</Label><Input value={content.featured?.title || ''} onChange={(e) => setContentField('featured', 'title', e.target.value)} /></div>
                <div><Label>Blog title</Label><Input value={content.blog?.title || ''} onChange={(e) => setContentField('blog', 'title', e.target.value)} /></div>
                <div><Label>Footer tagline</Label><Input value={content.footer?.tagline || ''} onChange={(e) => setContentField('footer', 'tagline', e.target.value)} /></div>
                <div><Label>Shop page title</Label><Input value={content.shop?.title || ''} onChange={(e) => setContentField('shop', 'title', e.target.value)} /></div>
                <div><Label>Contact title</Label><Input value={content.contact?.title || ''} onChange={(e) => setContentField('contact', 'title', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>
        )}

        {rental && (
          <Card>
            <CardContent className="p-4 grid gap-3">
              <h3 className="font-semibold text-sm">Home — Content (rental)</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Hero CTA</Label><Input value={theme.heroCta || ''} onChange={(e) => setThemeField('heroCta', e.target.value)} /></div>
                <div><Label>Secondary CTA</Label><Input value={content.hero?.ctaSecondary || ''} onChange={(e) => setContentField('hero', 'ctaSecondary', e.target.value)} /></div>
                <div><Label>About title</Label><Input value={content.about?.title || ''} onChange={(e) => setContentField('about', 'title', e.target.value)} /></div>
                <div><Label>Services title</Label><Input value={content.services?.title || ''} onChange={(e) => setContentField('services', 'title', e.target.value)} /></div>
                <div><Label>Testimonials title</Label><Input value={content.testimonials?.title || ''} onChange={(e) => setContentField('testimonials', 'title', e.target.value)} /></div>
                <div><Label>Blog title</Label><Input value={content.blog?.title || ''} onChange={(e) => setContentField('blog', 'title', e.target.value)} /></div>
                <div><Label>Promo title</Label><Input value={content.promo?.title || ''} onChange={(e) => setContentField('promo', 'title', e.target.value)} /></div>
                <div><Label>Promo body</Label><Input value={content.promo?.body || ''} onChange={(e) => setContentField('promo', 'body', e.target.value)} /></div>
                <div><Label>Fleet page title</Label><Input value={content.fleet?.title || ''} onChange={(e) => setContentField('fleet', 'title', e.target.value)} /></div>
                <div><Label>Contact page title</Label><Input value={content.contact?.title || ''} onChange={(e) => setContentField('contact', 'title', e.target.value)} /></div>
                <div><Label>Contact CTA title</Label><Input value={content.contactCta?.title || ''} onChange={(e) => setContentField('contactCta', 'title', e.target.value)} /></div>
                <div><Label>Desk hours</Label><Input value={content.contactCta?.hours || ''} onChange={(e) => setContentField('contactCta', 'hours', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 grid gap-3">
            <h3 className="font-semibold text-sm">Theme colors</h3>
            <p className="text-xs text-muted-foreground">Layout and fonts stay fixed — only colors / copy change.</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {(['primary', 'secondary', 'accent'] as const).map((key) => (
                <div key={key}>
                  <Label className="capitalize">{key}</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="color" className="w-12 h-9 p-1" value={theme[key] || '#111111'} onChange={(e) => setThemeField(key, e.target.value)} />
                    <Input value={theme[key] || ''} onChange={(e) => setThemeField(key, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <Label>Visible sections</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {sectionKeys.map((key) => (
                  <label key={key} className="flex items-center gap-1.5 text-sm capitalize">
                    <input type="checkbox" checked={!!theme.sections?.[key]} onChange={(e) => setSection(key, e.target.checked)} />
                    {key}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 grid gap-3">
            <h3 className="font-semibold text-sm">Services</h3>
            <div className="space-y-2">
              {(settings.services || []).map((sv: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Service title" value={sv.title || ''} onChange={(e) => set('services', (settings.services || []).map((x: any, idx: number) => idx === i ? { ...x, title: e.target.value } : x))} />
                  <Input placeholder="Short description" value={sv.description || ''} onChange={(e) => set('services', (settings.services || []).map((x: any, idx: number) => idx === i ? { ...x, description: e.target.value } : x))} />
                  <Button variant="ghost" size="sm" onClick={() => set('services', (settings.services || []).filter((_: any, idx: number) => idx !== i))}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set('services', [...(settings.services || []), { title: '', description: '' }])}>
                Add service
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 grid gap-3">
            <h3 className="font-semibold text-sm">Social links</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {Object.keys(DEFAULT_SOCIALS).map((key) => (
                <div key={key}>
                  <Label className="capitalize">{key}</Label>
                  <Input
                    placeholder="https://..."
                    value={(settings.socials || {})[key] || ''}
                    onChange={(e) => set('socials', { ...(settings.socials || {}), [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>SEO title</Label><Input value={settings.seoTitle || ''} onChange={(e) => set('seoTitle', e.target.value)} /></div>
              <div><Label>SEO keywords</Label><Input value={settings.seoKeywords || ''} onChange={(e) => set('seoKeywords', e.target.value)} /></div>
            </div>
            <div><Label>SEO description</Label><Input value={settings.seoDescription || ''} onChange={(e) => set('seoDescription', e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!settings.isPublished} onChange={(e) => set('isPublished', e.target.checked)} />
              Website is public (slug: <span className="font-mono">{settings.siteSlug || businessId}</span>)
            </label>
            <p className="text-xs text-muted-foreground">
              Click <strong>Publish to live</strong> to apply draft changes and open the public URL.
            </p>
          </CardContent>
        </Card>
      </div>

      {showPreview && (
        <div className="xl:sticky xl:top-4 xl:self-start">
          <WebsitePreviewPanel
            siteBaseUrl={siteBase}
            siteSlug={settings.siteSlug || businessId || ''}
            previewToken={previewToken}
            viewport={viewport}
            onViewportChange={setViewport}
            page={previewPage}
            onPageChange={setPreviewPage}
            pageOptions={pageOptions}
            refreshKey={previewKey}
            emptyHint={rental ? 'Set VITE_PUBLIC_SITE_URL and save a draft to preview.' : 'Set VITE_SHOP_SITE_URL and save a draft to preview.'}
          />
        </div>
      )}
    </div>
  );
}
