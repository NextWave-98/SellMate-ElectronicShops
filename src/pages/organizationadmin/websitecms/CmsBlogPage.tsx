/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCms } from '../../../hooks/useCms';
import PhotoUploadInput from '../../../components/common/PhotoUploadInput';

const emptyPost = { title: '', slug: '', excerpt: '', content: '', coverImage: '', isPublished: true };

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Blog posts / promotions   create, edit (with cover), delete. */
export default function CmsBlogPage() {
  const { listPosts, createPost, updatePost, deletePost } = useCms();
  const [posts, setPosts] = useState<any[]>([]);
  const [post, setPost] = useState<any>(emptyPost);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await listPosts();
    setPosts((res?.data as any) ?? []);
  }, [listPosts]);
  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setPost(emptyPost);
    setEditingId(null);
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setPost({
      title: p.title || '',
      slug: p.slug || '',
      excerpt: p.excerpt || '',
      content: p.content || '',
      coverImage: p.coverImage || '',
      isPublished: !!p.isPublished,
    });
  };

  const save = async () => {
    if (!post.title) return;
    const slug = post.slug || slugify(post.title);
    const payload = {
      ...post,
      slug,
      coverImage: post.coverImage || null,
      excerpt: post.excerpt || null,
      content: post.content || null,
    };
    if (editingId) {
      await updatePost(editingId, payload);
    } else {
      await createPost(payload);
    }
    resetForm();
    load();
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 grid gap-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">{editingId ? 'Edit post' : 'New post'}</p>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Title</Label><Input value={post.title} onChange={(e) => setPost({ ...post, title: e.target.value })} /></div>
            <div><Label>Slug</Label><Input value={post.slug} onChange={(e) => setPost({ ...post, slug: e.target.value })} placeholder="auto from title" /></div>
          </div>
          <div><Label>Excerpt</Label><Input value={post.excerpt} onChange={(e) => setPost({ ...post, excerpt: e.target.value })} /></div>
          <div>
            <Label>Content</Label>
            <textarea
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={post.content}
              onChange={(e) => setPost({ ...post, content: e.target.value })}
            />
          </div>
          <div>
            <Label>Cover image</Label>
            <PhotoUploadInput
              label=""
              max={1}
              photos={post.coverImage ? [post.coverImage] : []}
              onChange={(p) => setPost({ ...post, coverImage: p[0] || '' })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={post.isPublished} onChange={(e) => setPost({ ...post, isPublished: e.target.checked })} />
            Published
          </label>
          <div>
            <Button onClick={save} disabled={!post.title}>
              {editingId ? <><Save className="w-4 h-4 mr-1" /> Update post</> : <><Plus className="w-4 h-4 mr-1" /> Add post</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {posts.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {p.coverImage && (
                  <img src={p.coverImage} alt="" className="h-12 w-16 shrink-0 rounded object-cover" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.excerpt}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant={p.isPublished ? 'default' : 'outline'} className="text-[10px]">
                  {p.isPublished ? 'Published' : 'Draft'}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={async () => { await deletePost(p.id); if (editingId === p.id) resetForm(); load(); }}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {posts.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">No posts yet.</p>}
      </div>
    </div>
  );
}
