/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, Mail, MapPin, Star, CalendarDays, Loader2 } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';

/** PUBLIC company website rendered from CMS content — /site/:businessId */
export default function PublicWebsitePage() {
  const { businessId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/public/site/${businessId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Site not available');
        setData(json.data);
        if (json.data?.settings?.seoTitle) document.title = json.data.settings.seoTitle;
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [businessId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-center p-6"><div><h1 className="text-xl font-bold text-gray-700">Website unavailable</h1><p className="text-sm text-muted-foreground mt-2">{error}</p></div></div>;

  const s = data.settings || {};
  const biz = data.business || {};
  const theme = s.themeColor || '#2563eb';
  const services: any[] = s.services || [];

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Hero */}
      <header
        className="relative text-white"
        style={{ background: s.heroImage ? `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)), url(${s.heroImage}) center/cover` : `linear-gradient(135deg, ${theme}, #1e3a8a)` }}
      >
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold">{s.siteTitle || biz.name}</h1>
          {s.tagline && <p className="mt-3 text-lg text-white/90">{s.tagline}</p>}
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            {biz.telephone && <a href={`tel:${biz.telephone}`} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm flex items-center gap-2"><Phone className="w-4 h-4" /> Call Us</a>}
            <a href={`/book/${businessId}`} className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Book a Service</a>
          </div>
        </div>
      </header>

      {/* About */}
      {s.about && (
        <section className="max-w-4xl mx-auto px-6 py-14 text-center">
          <h2 className="text-2xl font-bold" style={{ color: theme }}>About Us</h2>
          <p className="mt-4 text-gray-600 leading-relaxed">{s.about}</p>
        </section>
      )}

      {/* Services */}
      {services.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-center" style={{ color: theme }}>Our Services</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {services.map((sv, i) => (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm">
                  <h3 className="font-semibold">{sv.title}</h3>
                  {sv.description && <p className="text-sm text-gray-500 mt-1">{sv.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog / promotions */}
      {data.posts?.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-14">
          <h2 className="text-2xl font-bold text-center" style={{ color: theme }}>News &amp; Offers</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {data.posts.map((p: any) => (
              <article key={p.id} className="border rounded-xl overflow-hidden">
                {p.coverImage && <img src={p.coverImage} alt={p.title} className="w-full h-40 object-cover" />}
                <div className="p-4">
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{p.excerpt || p.content}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {data.testimonials?.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-center" style={{ color: theme }}>What Our Customers Say</h2>
            <div className="grid sm:grid-cols-2 gap-4 mt-8">
              {data.testimonials.map((r: any) => (
                <div key={r.id} className="bg-white rounded-xl p-5 shadow-sm">
                  <div className="flex gap-0.5 mb-2">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}</div>
                  <p className="text-sm text-gray-600">&ldquo;{r.content}&rdquo;</p>
                  <p className="text-xs text-gray-400 mt-2">— {r.author}{r.role ? `, ${r.role}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact footer */}
      <footer className="text-white py-12" style={{ background: theme }}>
        <div className="max-w-4xl mx-auto px-6 text-center space-y-2">
          <h2 className="text-xl font-bold">{s.siteTitle || biz.name}</h2>
          {(s.phone || biz.telephone) && <p className="flex items-center justify-center gap-2 text-sm"><Phone className="w-4 h-4" /> {s.phone || biz.telephone}</p>}
          {(s.email || biz.email) && <p className="flex items-center justify-center gap-2 text-sm"><Mail className="w-4 h-4" /> {s.email || biz.email}</p>}
          {(s.address || biz.address) && <p className="flex items-center justify-center gap-2 text-sm"><MapPin className="w-4 h-4" /> {s.address || biz.address}</p>}
          <p className="text-xs text-white/70 pt-4">Powered by SellMate</p>
        </div>
      </footer>
    </div>
  );
}
