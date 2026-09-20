/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCms } from '../../../hooks/useCms';

const emptyForm = { author: '', role: '', content: '', rating: 5, isPublished: true };

/** Customer testimonials   create, edit, delete. */
export default function CmsTestimonialsPage() {
  const { listTestimonials, createTestimonial, updateTestimonial, deleteTestimonial } = useCms();
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await listTestimonials();
    setTestimonials((res?.data as any) ?? []);
  }, [listTestimonials]);
  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      author: r.author || '',
      role: r.role || '',
      content: r.content || '',
      rating: r.rating ?? 5,
      isPublished: r.isPublished !== false,
    });
  };

  const save = async () => {
    if (!form.author || !form.content) return;
    const payload = {
      author: form.author,
      role: form.role || null,
      content: form.content,
      rating: Math.min(5, Math.max(1, Number(form.rating) || 5)),
      isPublished: !!form.isPublished,
    };
    if (editingId) {
      await updateTestimonial(editingId, payload);
    } else {
      await createTestimonial(payload);
    }
    resetForm();
    load();
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 grid gap-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">{editingId ? 'Edit testimonial' : 'New testimonial'}</p>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Author</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
            <div><Label>Role / Company</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
          </div>
          <div>
            <Label>Content</Label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Rating (1–5)</Label>
              <Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
            </div>
            <label className="flex items-end gap-2 text-sm pb-2">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
              Published on website
            </label>
          </div>
          <div>
            <Button onClick={save} disabled={!form.author || !form.content}>
              {editingId ? <><Save className="w-4 h-4 mr-1" /> Update</> : <><Plus className="w-4 h-4 mr-1" /> Add testimonial</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {testimonials.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">&ldquo;{r.content}&rdquo;</p>
                <p className="text-xs text-muted-foreground">
                    {r.author}{r.role ? `, ${r.role}` : ''} {'★'.repeat(r.rating || 0)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant={r.isPublished !== false ? 'default' : 'outline'} className="text-[10px]">
                  {r.isPublished !== false ? 'Published' : 'Draft'}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => startEdit(r)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={async () => { await deleteTestimonial(r.id); if (editingId === r.id) resetForm(); load(); }}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {testimonials.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">No testimonials yet.</p>}
      </div>
    </div>
  );
}
