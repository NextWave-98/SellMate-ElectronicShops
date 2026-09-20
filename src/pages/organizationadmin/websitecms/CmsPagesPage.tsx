/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCms } from '../../../hooks/useCms';

const emptyForm = { title: '', slug: '', content: '', isPublished: true, sortOrder: 0 };

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Custom CMS pages   create, edit, delete. */
export default function CmsPagesPage() {
  const { listPages, createPage, updatePage, deletePage } = useCms();
  const [pages, setPages] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await listPages();
    setPages((res?.data as any) ?? []);
  }, [listPages]);
  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      title: p.title || '',
      slug: p.slug || '',
      content: p.content || '',
      isPublished: p.isPublished !== false,
      sortOrder: p.sortOrder ?? 0,
    });
  };

  const save = async () => {
    if (!form.title) return;
    const slug = form.slug || slugify(form.title);
    const payload = { ...form, slug };
    if (editingId) {
      await updatePage(editingId, payload);
    } else {
      await createPage(payload);
    }
    resetForm();
    load();
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 grid gap-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">{editingId ? 'Edit page' : 'New page'}</p>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto from title" /></div>
          </div>
          <div>
            <Label>Content</Label>
            <textarea
              className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            Published on website
          </label>
          <div>
            <Button onClick={save} disabled={!form.title}>
              {editingId ? <><Save className="w-4 h-4 mr-1" /> Update page</> : <><Plus className="w-4 h-4 mr-1" /> Add page</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {pages.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground font-mono">/{p.slug}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant={p.isPublished !== false ? 'default' : 'outline'} className="text-[10px]">
                  {p.isPublished !== false ? 'Published' : 'Draft'}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={async () => { await deletePage(p.id); if (editingId === p.id) resetForm(); load(); }}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {pages.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">No custom pages yet.</p>}
      </div>
    </div>
  );
}
