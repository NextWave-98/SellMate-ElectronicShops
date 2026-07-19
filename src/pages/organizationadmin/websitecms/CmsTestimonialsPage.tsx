/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useCms } from '../../../hooks/useCms';

/** Customer testimonials for the public website. */
export default function CmsTestimonialsPage() {
  const { listTestimonials, createTestimonial, deleteTestimonial } = useCms();
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ author: '', role: '', content: '', rating: 5 });

  const load = useCallback(async () => {
    const res = await listTestimonials();
    setTestimonials((res?.data as any) ?? []);
  }, [listTestimonials]);
  useEffect(() => { load(); }, [load]);

  const addTestimonial = async () => {
    if (!form.author || !form.content) return;
    const res = await createTestimonial(form);
    if (res?.success || res?.status) { setForm({ author: '', role: '', content: '', rating: 5 }); load(); }
  };

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-4 grid gap-3">
        <p className="font-semibold text-sm">New Testimonial</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Author</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
          <div><Label>Role / Company</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
        </div>
        <div><Label>Content</Label><textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
        <div><Label>Rating (1-5)</Label><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} /></div>
        <div><Button onClick={addTestimonial} disabled={!form.author || !form.content}><Plus className="w-4 h-4 mr-1" /> Add Testimonial</Button></div>
      </CardContent></Card>
      <div className="space-y-2">
        {testimonials.map((r) => (
          <Card key={r.id}><CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm">&ldquo;{r.content}&rdquo;</p>
              <p className="text-xs text-muted-foreground">— {r.author}{r.role ? `, ${r.role}` : ''} {'★'.repeat(r.rating)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={async () => { await deleteTestimonial(r.id); load(); }}><Trash2 className="w-4 h-4 text-red-600" /></Button>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
