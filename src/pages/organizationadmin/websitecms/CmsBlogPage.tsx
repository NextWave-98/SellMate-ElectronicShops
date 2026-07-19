/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCms } from '../../../hooks/useCms';

/** Blog posts / promotions for the public website. */
export default function CmsBlogPage() {
  const { listPosts, createPost, deletePost } = useCms();
  const [posts, setPosts] = useState<any[]>([]);
  const [post, setPost] = useState<any>({ title: '', slug: '', excerpt: '', content: '', isPublished: true });

  const load = useCallback(async () => {
    const res = await listPosts();
    setPosts((res?.data as any) ?? []);
  }, [listPosts]);
  useEffect(() => { load(); }, [load]);

  const addPost = async () => {
    if (!post.title) return;
    const slug = post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const res = await createPost({ ...post, slug });
    if (res?.success || res?.status) { setPost({ title: '', slug: '', excerpt: '', content: '', isPublished: true }); load(); }
  };

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-4 grid gap-3">
        <p className="font-semibold text-sm">New Post</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Title</Label><Input value={post.title} onChange={(e) => setPost({ ...post, title: e.target.value })} /></div>
          <div><Label>Slug (optional)</Label><Input value={post.slug} onChange={(e) => setPost({ ...post, slug: e.target.value })} /></div>
        </div>
        <div><Label>Excerpt</Label><Input value={post.excerpt} onChange={(e) => setPost({ ...post, excerpt: e.target.value })} /></div>
        <div><Label>Content</Label><textarea className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={post.content} onChange={(e) => setPost({ ...post, content: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={post.isPublished} onChange={(e) => setPost({ ...post, isPublished: e.target.checked })} /> Published</label>
        <div><Button onClick={addPost} disabled={!post.title}><Plus className="w-4 h-4 mr-1" /> Add Post</Button></div>
      </CardContent></Card>
      <div className="space-y-2">
        {posts.map((p) => (
          <Card key={p.id}><CardContent className="p-3 flex items-center justify-between">
            <div><p className="font-semibold">{p.title}</p><p className="text-xs text-muted-foreground">{p.excerpt}</p></div>
            <div className="flex items-center gap-2">
              <Badge variant={p.isPublished ? 'default' : 'outline'} className="text-[10px]">{p.isPublished ? 'Published' : 'Draft'}</Badge>
              <Button variant="ghost" size="sm" onClick={async () => { await deletePost(p.id); load(); }}><Trash2 className="w-4 h-4 text-red-600" /></Button>
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
