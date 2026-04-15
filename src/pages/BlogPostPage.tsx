import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SEO } from '../components/SEO';

// ─── Types ─────────────────────────────────────────────────────────────────
interface ContentBlock {
  t: 'p' | 'lead' | 'bq' | 'h3' | 'h4' | 'list' | 'specs' | 'table' | 'insight' | 'warn' | 'cta' | 'rules';
  v?: string | string[] | SpecItem[] | RuleItem[];
  text?: string;
  href?: string;
  label?: string;
  headers?: string[];
  rows?: string[][];
}

interface SpecItem { label: string; value: string; desc: string }
interface RuleItem { kind: 'do' | 'dont'; text: string }

interface Chapter {
  n: string;
  id: string;
  title: string;
  hl: string;
  blocks: ContentBlock[];
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  cover_image: string | null;
  author: string;
  published_at: string;
  read_time: number;
  tags: string[];
  chapters: Chapter[];
}

// ─── Block renderer ─────────────────────────────────────────────────────────
function Block({ block }: { block: ContentBlock }) {
  switch (block.t) {
    case 'p':
    case 'lead':
      return (
        <p
          className={`mb-6 leading-[1.85] ${block.t === 'lead' ? 'text-lg text-slate-400 italic' : 'text-slate-200/90 text-[1.05rem]'}`}
          style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          dangerouslySetInnerHTML={{ __html: (block.v as string || '').replace(/<b>/g, '<strong class="text-primary font-semibold not-italic">').replace(/<\/b>/g, '</strong>') }}
        />
      );

    case 'bq':
      return (
        <blockquote className="relative border-l-[3px] border-primary/70 pl-7 pr-4 py-5 my-8 bg-primary/5">
          <span className="absolute top-0 left-3 text-5xl text-primary/20 font-black leading-none select-none">"</span>
          <p
            className="text-slate-200 text-lg italic leading-relaxed"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            {block.v as string}
          </p>
        </blockquote>
      );

    case 'h3':
      return (
        <h3 className="font-black text-primary text-xl uppercase tracking-widest mt-12 mb-5">
          {block.v as string}
        </h3>
      );

    case 'h4':
      return (
        <h4 className="font-mono text-[0.75rem] uppercase tracking-[0.2em] text-slate-500 mt-8 mb-4">
          {block.v as string}
        </h4>
      );

    case 'list': {
      const items = block.v as string[];
      return (
        <ul className="my-6 space-y-3" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-4 text-slate-300 text-[1rem] leading-relaxed border-b border-white/5 pb-3 last:border-0">
              <span className="text-primary font-black mt-0.5 flex-shrink-0">→</span>
              <span dangerouslySetInnerHTML={{ __html: item.replace(/<b>/g, '<strong class="text-primary font-semibold">').replace(/<\/b>/g, '</strong>') }} />
            </li>
          ))}
        </ul>
      );
    }

    case 'specs': {
      const specs = block.v as SpecItem[];
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
          {specs.map((s, i) => (
            <div key={i} className="bg-surface/40 border border-white/5 p-5 hover:border-primary/30 transition-all">
              <div className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-slate-500 mb-2">{s.label}</div>
              <div className="font-black text-primary text-2xl">{s.value}</div>
              <div className="text-slate-500 text-[0.8rem] mt-1">{s.desc}</div>
            </div>
          ))}
        </div>
      );
    }

    case 'table': {
      const { headers = [], rows = [] } = block;
      return (
        <div className="overflow-x-auto my-8">
          <table className="w-full border-collapse text-[0.875rem]">
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="text-left font-mono text-[0.65rem] uppercase tracking-[0.2em] text-primary border-b-2 border-primary/50 px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-white/5 hover:bg-primary/5 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-4 py-3 ${ci === 0 ? 'text-white font-semibold' : 'text-slate-400'}`}
                      style={ci === 0 ? { fontFamily: "'Source Serif 4', Georgia, serif" } : undefined}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'insight':
      return (
        <div className="relative border border-primary/20 p-7 my-8 bg-gradient-to-br from-primary/5 to-transparent">
          <span className="absolute -top-[9px] left-5 bg-background-dark px-3 font-mono text-[0.6rem] uppercase tracking-[0.25em] text-primary">
            INSIGHT
          </span>
          <p className="text-slate-300 italic leading-relaxed text-[0.95rem]"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
            {block.v as string}
          </p>
        </div>
      );

    case 'warn':
      return (
        <div className="relative border border-red-500/20 p-7 my-8 bg-red-500/5">
          <span className="absolute -top-[9px] left-5 bg-background-dark px-3 font-mono text-[0.6rem] uppercase tracking-[0.25em] text-red-400">
            ⚠ ATENÇÃO
          </span>
          <p className="text-slate-300 leading-relaxed text-[0.95rem]"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
            {block.v as string}
          </p>
        </div>
      );

    case 'cta':
      return (
        <div className="flex items-center justify-between gap-5 border border-white/10 p-6 my-8 hover:border-primary/30 transition-colors bg-surface/20 flex-wrap">
          <span className="text-slate-400 text-[0.9rem]"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
            {block.text}
          </span>
          <Link
            to={block.href || '/'}
            className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-primary border border-primary/50 px-6 py-2.5 hover:bg-primary hover:text-black transition-all whitespace-nowrap flex-shrink-0"
          >
            {block.label} →
          </Link>
        </div>
      );

    case 'rules': {
      const rules = block.v as RuleItem[];
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
          {rules.map((r, i) => (
            <div key={i} className={`p-5 border ${r.kind === 'do' ? 'border-l-[3px] border-l-primary/70 border-white/5 bg-surface/20' : 'border-l-[3px] border-l-red-500/70 border-white/5 bg-surface/20'}`}>
              <div className={`font-mono text-[0.6rem] uppercase tracking-[0.2em] mb-2 ${r.kind === 'do' ? 'text-primary' : 'text-red-400'}`}>
                {r.kind === 'do' ? '✓ Faça' : '✗ Evite'}
              </div>
              <p className="text-slate-400 text-[0.875rem]">{r.text}</p>
            </div>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChapter, setActiveChapter] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()
      .then(({ data, error }) => {
        if (!error && data) setPost(data as BlogPost);
        setLoading(false);
      });
  }, [slug]);

  // Active chapter tracking
  useEffect(() => {
    if (!post) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = sectionRefs.current.indexOf(e.target as HTMLElement);
            if (idx > -1) setActiveChapter(idx);
          }
        });
      },
      { threshold: 0.25 }
    );
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [post]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-4xl text-primary/40 animate-spin">progress_activity</span>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-slate-600">Carregando artigo...</span>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!post) {
    return (
      <div className="min-h-screen bg-background-dark pt-32 pb-20 flex flex-col items-center px-6">
        <span className="material-symbols-outlined text-8xl text-red-500/20 mb-6">article</span>
        <h1 className="text-3xl font-black text-white uppercase italic">Artigo não encontrado</h1>
        <p className="text-slate-500 font-mono text-[10px] mt-2 uppercase tracking-widest">O artigo solicitado não existe ou foi arquivado.</p>
        <Link to="/blog" className="mt-8 bg-primary/10 border border-primary/20 text-primary px-8 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-black transition-all">
          Voltar ao Blog
        </Link>
      </div>
    );
  }

  const dateStr = new Date(post.published_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background-dark text-slate-100">
      <SEO
        title={`${post.title} | Blog Perfection Airsoft`}
        description={post.subtitle || ''}
      />

      {/* Side nav dots — desktop only */}
      <nav className="fixed left-6 top-1/2 -translate-y-1/2 z-50 hidden xl:flex flex-col gap-3">
        {post.chapters.map((ch, i) => (
          <a
            key={ch.id}
            href={`#${ch.id}`}
            title={ch.title}
            className={`block rounded-full transition-all duration-300 ${
              activeChapter === i
                ? 'w-2.5 h-2.5 bg-primary shadow-[0_0_8px_rgba(255,193,7,0.6)]'
                : 'w-2 h-2 bg-slate-700 hover:bg-slate-400'
            }`}
          />
        ))}
      </nav>

      {/* ── HERO ── */}
      <header className="relative min-h-[55vh] flex items-center justify-center overflow-hidden border-b border-primary/10"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,193,7,0.04), transparent)' }}>
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(255,193,7,0.025) 49px,rgba(255,193,7,0.025) 50px)' }} />

        {post.cover_image && (
          <div className="absolute inset-0">
            <img src={post.cover_image} alt="" className="w-full h-full object-cover opacity-10" />
            <div className="absolute inset-0 bg-gradient-to-b from-background-dark/60 via-background-dark/40 to-background-dark" />
          </div>
        )}

        <div className="relative z-10 max-w-3xl mx-auto px-6 py-24 text-center">
          {/* Meta row */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-primary border border-primary/30 px-4 py-1.5 bg-primary/5">
              {post.category}
            </span>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">
              {post.read_time} min de leitura
            </span>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-slate-600">
              {dateStr}
            </span>
          </div>

          <h1 className="font-black uppercase tracking-tight leading-[0.9] text-white mb-6"
            style={{ fontSize: 'clamp(2.8rem, 8vw, 6rem)' }}>
            {post.title.split(' ').map((word, i, arr) => {
              // Highlight the last word in primary color
              const isLast = i === arr.length - 1;
              return isLast
                ? <span key={i} className="text-primary"> {word}</span>
                : <span key={i}>{i > 0 ? ' ' : ''}{word}</span>;
            })}
          </h1>

          {post.subtitle && (
            <p className="text-slate-400 text-lg leading-relaxed max-w-xl mx-auto"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: 'italic' }}>
              {post.subtitle}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-2 justify-center">
            {post.tags.map(tag => (
              <span key={tag} className="font-mono text-[0.6rem] uppercase tracking-widest text-slate-600 border border-white/5 px-3 py-1">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ── ARTICLE BODY ── */}
      <main className="max-w-[720px] mx-auto px-6">

        {/* Back link */}
        <Link to="/blog"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-primary transition-colors mt-12 mb-2 group">
          <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.25em]">Voltar ao Blog</span>
        </Link>

        {/* Chapters */}
        {post.chapters.map((chapter, idx) => (
          <section
            key={chapter.id}
            id={chapter.id}
            ref={(el) => { sectionRefs.current[idx] = el; }}
            className="pt-20 pb-12 border-b border-white/5 last:border-0"
          >
            {/* Chapter number (decorative) */}
            <div className="font-black text-[5rem] leading-none text-primary/[0.06] select-none -mb-4">
              {chapter.n}
            </div>

            <h2 className="font-black uppercase tracking-tight leading-[1.05] mb-8 text-white"
              style={{ fontSize: 'clamp(1.7rem, 4.5vw, 2.8rem)' }}>
              {chapter.title.split(chapter.hl).map((part, i, arr) => (
                i < arr.length - 1
                  ? <span key={i}>{part}<span className="text-primary">{chapter.hl}</span></span>
                  : <span key={i}>{part}</span>
              ))}
            </h2>

            {/* Content blocks */}
            {chapter.blocks.map((block, bi) => (
              <Block key={bi} block={block} />
            ))}
          </section>
        ))}

        {/* ── Closing CTA ── */}
        <div className="py-20 text-center"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(255,193,7,0.04), transparent)' }}>
          <h2 className="font-black text-white uppercase tracking-tight text-4xl mb-5">
            O Verdadeiro <span className="text-primary">Diferencial</span>
          </h2>
          <p className="text-slate-400 max-w-md mx-auto mb-8 leading-relaxed"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
            Agora você entende que precisão é engenharia, consistência é ajuste, e performance é equilíbrio. Monte seu setup com esse conhecimento.
          </p>
          <Link
            to="/categoria/pecas"
            className="inline-block font-mono text-[0.75rem] uppercase tracking-[0.3em] text-black bg-primary px-12 py-4 hover:bg-white transition-all shadow-[0_0_30px_rgba(255,193,7,0.2)]"
          >
            Montar Setup Agora
          </Link>
        </div>

        {/* ── Footer nav ── */}
        <div className="border-t border-white/5 py-8 flex items-center justify-between mb-12">
          <Link to="/blog" className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-slate-600 hover:text-white transition-colors">
            ← Todos os artigos
          </Link>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-[0.6rem] uppercase tracking-widest text-primary/50">
              Perfection Airsoft
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
