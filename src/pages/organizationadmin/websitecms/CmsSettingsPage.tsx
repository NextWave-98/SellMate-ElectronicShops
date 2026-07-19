/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useCms } from '../../../hooks/useCms';
import { useAuth } from '../../../context/AuthContext';
import PhotoUploadInput from '../../../components/common/PhotoUploadInput';
import type { CmsOutletContext } from './WebsiteCmsLayout';

const FONT_OPTIONS = [
  { value: 'Syne', label: 'Syne (display)' },
  { value: 'Outfit', label: 'Outfit' },
  { value: 'DM Sans', label: 'DM Sans (body)' },
  { value: 'Manrope', label: 'Manrope' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
];

const DEFAULT_THEME = {
  version: 1,
  style: 'glass',
  primary: '#111111',
  secondary: '#6B7280',
  accent: '#B8FF3C',
  fontDisplay: 'Syne',
  fontBody: 'DM Sans',
  glass: { blur: 24, opacity: 0.55, border: 0.7 },
  sections: {
    hero: true,
    fleet: true,
    about: true,
    services: true,
    testimonials: true,
    blog: true,
    contact: true,
  },
  heroCta: 'Browse Fleet',
};

function mergeTheme(raw: any, settings?: any) {
  return {
    ...DEFAULT_THEME,
    ...(raw || {}),
    primary: raw?.primary || settings?.themeColor || DEFAULT_THEME.primary,
    secondary: raw?.secondary || settings?.secondaryColor || DEFAULT_THEME.secondary,
    accent: raw?.accent || DEFAULT_THEME.accent,
    fontBody: raw?.fontBody || settings?.fontFamily || DEFAULT_THEME.fontBody,
    glass: { ...DEFAULT_THEME.glass, ...(raw?.glass || {}) },
    sections: { ...DEFAULT_THEME.sections, ...(raw?.sections || {}) },
  };
}

/** Public website settings: branding, contact, SEO, services & publish toggle. */
export default function CmsSettingsPage() {
  const { reloadPublishState } = useOutletContext<CmsOutletContext>();
  const { getSettings, saveSettings: saveCmsSettings } = useCms();
  const { user } = useAuth() as any;
  const businessId = user?.businessId;

  const [settings, setSettings] = useState<any>({});
  const [theme, setTheme] = useState(DEFAULT_THEME);

  const load = useCallback(async () => {
    const res = await getSettings();
    const data = (res?.data as any) ?? {};
    setSettings(data);
    setTheme(mergeTheme(data.themeJson, data));
  }, [getSettings]);
  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: any) => setSettings((prev: any) => ({ ...prev, [k]: v }));
  const setThemeField = (k: string, v: any) => setTheme((prev: any) => ({ ...prev, [k]: v }));
  const setGlass = (k: string, v: number) =>
    setTheme((prev: any) => ({ ...prev, glass: { ...prev.glass, [k]: v } }));
  const setSection = (k: string, v: boolean) =>
    setTheme((prev: any) => ({ ...prev, sections: { ...prev.sections, [k]: v } }));

  const saveSettings = async () => {
    // Send only editable CMS fields so colors/themeJson persist cleanly
    await saveCmsSettings({
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
      themeColor: theme.primary || DEFAULT_THEME.primary,
      secondaryColor: theme.secondary || DEFAULT_THEME.secondary,
      fontFamily: theme.fontBody || DEFAULT_THEME.fontBody,
      themeJson: {
        ...DEFAULT_THEME,
        ...theme,
        primary: theme.primary || DEFAULT_THEME.primary,
        secondary: theme.secondary || DEFAULT_THEME.secondary,
        accent: theme.accent || DEFAULT_THEME.accent,
        glass: { ...DEFAULT_THEME.glass, ...(theme.glass || {}) },
        sections: { ...DEFAULT_THEME.sections, ...(theme.sections || {}) },
      },
    });
    reloadPublishState();
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Site Title</Label><Input value={settings.siteTitle || ''} onChange={(e) => set('siteTitle', e.target.value)} /></div>
            <div><Label>Tagline</Label><Input value={settings.tagline || ''} onChange={(e) => set('tagline', e.target.value)} /></div>
          </div>
          <div>
            <Label>About</Label>
            <textarea
              className="w-full min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={settings.about || ''}
              onChange={(e) => set('about', e.target.value)}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={settings.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div>
            <div><Label>Email</Label><Input value={settings.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
          </div>
          <div><Label>Address</Label><Input value={settings.address || ''} onChange={(e) => set('address', e.target.value)} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Hero Image</Label>
              <PhotoUploadInput label="" max={1} photos={settings.heroImage ? [settings.heroImage] : []} onChange={(p) => set('heroImage', p[0] || '')} />
            </div>
            <div>
              <Label>Logo</Label>
              <PhotoUploadInput label="" max={1} photos={settings.logoImage ? [settings.logoImage] : []} onChange={(p) => set('logoImage', p[0] || '')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 grid gap-3">
          <h3 className="font-semibold text-sm">Theme &amp; glass style</h3>
          <p className="text-xs text-muted-foreground -mt-1">
            Colors and fonts apply to the public Next.js rental site without redeploying.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Primary</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" className="w-12 h-9 p-1" value={theme.primary || '#111111'} onChange={(e) => setThemeField('primary', e.target.value)} />
                <Input value={theme.primary || ''} onChange={(e) => setThemeField('primary', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Secondary</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" className="w-12 h-9 p-1" value={theme.secondary || '#6B7280'} onChange={(e) => setThemeField('secondary', e.target.value)} />
                <Input value={theme.secondary || ''} onChange={(e) => setThemeField('secondary', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Accent (neon / highlights)</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" className="w-12 h-9 p-1" value={theme.accent || '#B8FF3C'} onChange={(e) => setThemeField('accent', e.target.value)} />
                <Input value={theme.accent || ''} onChange={(e) => setThemeField('accent', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="rounded-md border border-dashed p-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-block h-8 w-8 rounded-full border" style={{ background: theme.primary }} />
            <span className="inline-block h-8 w-8 rounded-full border" style={{ background: theme.accent }} />
            <span>Preview: primary buttons / accent badges update on the live Next.js site after Save.</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Display font</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={theme.fontDisplay || 'Syne'}
                onChange={(e) => setThemeField('fontDisplay', e.target.value)}
              >
                {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Body font</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={theme.fontBody || 'DM Sans'}
                onChange={(e) => setThemeField('fontBody', e.target.value)}
              >
                {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div><Label>Hero CTA label</Label><Input value={theme.heroCta || ''} onChange={(e) => setThemeField('heroCta', e.target.value)} /></div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Glass blur ({theme.glass?.blur ?? 16}px)</Label>
              <Input type="range" min={8} max={32} value={theme.glass?.blur ?? 16} onChange={(e) => setGlass('blur', Number(e.target.value))} />
            </div>
            <div>
              <Label>Glass opacity ({theme.glass?.opacity ?? 0.12})</Label>
              <Input type="range" min={0.05} max={0.35} step={0.01} value={theme.glass?.opacity ?? 0.12} onChange={(e) => setGlass('opacity', Number(e.target.value))} />
            </div>
            <div>
              <Label>Glass border ({theme.glass?.border ?? 0.18})</Label>
              <Input type="range" min={0.05} max={0.4} step={0.01} value={theme.glass?.border ?? 0.18} onChange={(e) => setGlass('border', Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Visible sections</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {Object.keys(DEFAULT_THEME.sections).map((key) => (
                <label key={key} className="flex items-center gap-1.5 text-sm capitalize">
                  <input
                    type="checkbox"
                    checked={!!theme.sections?.[key]}
                    onChange={(e) => setSection(key, e.target.checked)}
                  />
                  {key}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>SEO Title</Label><Input value={settings.seoTitle || ''} onChange={(e) => set('seoTitle', e.target.value)} /></div>
            <div><Label>SEO Keywords</Label><Input value={settings.seoKeywords || ''} onChange={(e) => set('seoKeywords', e.target.value)} /></div>
          </div>
          <div><Label>SEO Description</Label><Input value={settings.seoDescription || ''} onChange={(e) => set('seoDescription', e.target.value)} /></div>
          <div>
            <Label>Services (shown on the public site)</Label>
            <div className="space-y-2 mt-1">
              {(settings.services || []).map((sv: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Service title" value={sv.title || ''} onChange={(e) => set('services', (settings.services || []).map((x: any, idx: number) => idx === i ? { ...x, title: e.target.value } : x))} />
                  <Input placeholder="Short description" value={sv.description || ''} onChange={(e) => set('services', (settings.services || []).map((x: any, idx: number) => idx === i ? { ...x, description: e.target.value } : x))} />
                  <Button variant="ghost" size="sm" onClick={() => set('services', (settings.services || []).filter((_: any, idx: number) => idx !== i))}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set('services', [...(settings.services || []), { title: '', description: '' }])}><Plus className="w-3 h-3 mr-1" /> Add service</Button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!settings.isPublished} onChange={(e) => set('isPublished', e.target.checked)} />
            Publish website (make public site live for <span className="font-mono">{settings.siteSlug || businessId}</span>)
          </label>
          <div><Button onClick={saveSettings}><Save className="w-4 h-4 mr-1" /> Save Settings</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}
