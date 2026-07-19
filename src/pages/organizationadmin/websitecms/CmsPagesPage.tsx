/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useCms } from '../../../hooks/useCms';

/** Custom CMS pages for the public website. */
export default function CmsPagesPage() {
  const { listPages, createPage, deletePage } = useCms();
  const [pages, setPages] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ title: '', slug: '', content: '' });

  const load = useCallback(async () => {
    const res = await listPages();
    setPages((res?.data as any) ?? []);
  }, [listPages]);
  useEffect(() => { load(); }, [load]);

  const addPage = async () => {
    if (!form.title) return;
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const res = await createPage({ ...form, slug });
    if (res?.success || res?.status) { setForm({ title: '', slug: '', content: '' }); load(); }
  };

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-4 grid gap-3">
        <p className="font-semibold text-sm">New Page</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Slug (optional)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
        </div>
        <div><Label>Content</Label><textarea className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
        <div><Button onClick={addPage} disabled={!form.title}><Plus className="w-4 h-4 mr-1" /> Add Page</Button></div>
      </CardContent></Card>
      <div className="space-y-2">
        {pages.map((p) => (
          <Card key={p.id}><CardContent className="p-3 flex items-center justify-between">
            <div><p className="font-semibold">{p.title}</p><p className="text-xs text-muted-foreground font-mono">/{p.slug}</p></div>
            <Button variant="ghost" size="sm" onClick={async () => { await deletePage(p.id); load(); }}><Trash2 className="w-4 h-4 text-red-600" /></Button>
          </CardContent></Card>
        ))}
        {pages.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">No custom pages yet.</p>}
      </div>
    </div>
  );
}
