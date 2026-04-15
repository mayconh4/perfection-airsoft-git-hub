import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { MISSION_TYPES, GAME_MODES } from '../data/missionCatalog';
import { supabase } from '../lib/supabase';

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
}

const CATEGORY_LABELS: Record<string, string> = {
  tecnico: 'Técnico',
  manutencao: 'Manutenção',
  tatico: 'Tático',
  guia: 'Guia',
  novidades: 'Novidades',
};

const CATEGORY_COLORS: Record<string, string> = {
  tecnico: 'text-primary border-primary/40 bg-primary/10',
  manutencao: 'text-blue-400 border-blue-400/40 bg-blue-400/10',
  tatico: 'text-red-400 border-red-400/40 bg-red-400/10',
  guia: 'text-green-400 border-green-400/40 bg-green-400/10',
  novidades: 'text-purple-400 border-purple-400/40 bg-purple-400/10',
};

export default function BlogListingPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [tab, setTab] = useState<'artigos' | 'manual'>('artigos');

  useEffect(() => {
    supabase
      .from('blog_posts')
      .select('id,slug,title,subtitle,category,cover_image,author,published_at,read_time,tags')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setPosts((data as BlogPost[]) || []);
        setLoadingPosts(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background-dark pt-12 pb-24 relative overflow-hidden crt-overlay">
      <div className="scanline" />
      <SEO title="Blog & Intel | Perfection Airsoft" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">

        {/* ── HEADER ── */}
        <div className="mb-14 border-l-4 border-primary pl-10 py-8 bg-surface/10 relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="text-primary font-black uppercase tracking-[0.5em] text-[10px] block mb-3 animate-pulse">
            INTEL & CONTEÚDO TÁTICO
          </span>
          <h1 className="text-6xl font-black text-white uppercase tracking-tighter italic">
            BLOG <span className="text-primary">PERFECTION</span>
          </h1>
          <p className="text-slate-500 text-[11px] font-mono uppercase tracking-[0.25em] mt-5 max-w-3xl leading-relaxed">
            ARTIGOS TÉCNICOS, GUIAS DE SETUP, TÁTICAS E O MANUAL DE OPERAÇÕES DO CAMPO.
            CONHECIMENTO QUE SEPARA O INICIANTE DO OPERADOR ELITE.
          </p>
          <div className="mt-6 flex gap-4 text-[8px] font-mono text-primary/40 uppercase tracking-widest">
            <span>[BASE DE CONHECIMENTO: ATIVA]</span>
            <span>[ACESSO: LIVRE]</span>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1 mb-12 border-b border-white/5">
          <button
            onClick={() => setTab('artigos')}
            className={`px-6 py-3 font-black text-[10px] uppercase tracking-[0.3em] transition-all border-b-2 -mb-[1px] ${
              tab === 'artigos'
                ? 'text-primary border-primary'
                : 'text-slate-600 border-transparent hover:text-slate-400'
            }`}
          >
            Artigos
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`px-6 py-3 font-black text-[10px] uppercase tracking-[0.3em] transition-all border-b-2 -mb-[1px] ${
              tab === 'manual'
                ? 'text-primary border-primary'
                : 'text-slate-600 border-transparent hover:text-slate-400'
            }`}
          >
            Manual de Operações
          </button>
        </div>

        {/* ── ARTIGOS TAB ── */}
        {tab === 'artigos' && (
          <>
            {loadingPosts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-surface/30 border border-white/5 animate-pulse h-72" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-24">
                <span className="material-symbols-outlined text-6xl text-slate-700 block mb-4">article</span>
                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
                  Nenhum artigo publicado ainda.
                </p>
              </div>
            ) : (
              <>
                {/* Featured post (first) */}
                {posts[0] && (
                  <Link to={`/blog/${posts[0].slug}`} className="group block mb-10">
                    <div className="relative bg-surface/20 border border-white/5 hover:border-primary/30 transition-all overflow-hidden grid grid-cols-1 md:grid-cols-5">
                      {/* Image */}
                      {posts[0].cover_image ? (
                        <div className="md:col-span-2 h-56 md:h-auto overflow-hidden">
                          <img
                            src={posts[0].cover_image}
                            alt={posts[0].title}
                            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
                          />
                        </div>
                      ) : (
                        <div className="md:col-span-2 bg-gradient-to-br from-primary/10 to-surface/40 flex items-center justify-center h-56 md:h-auto">
                          <span className="material-symbols-outlined text-8xl text-primary/20">article</span>
                        </div>
                      )}

                      {/* Content */}
                      <div className="md:col-span-3 p-10 flex flex-col justify-between relative">
                        <div className="absolute top-0 left-0 w-[2px] h-0 bg-primary group-hover:h-full transition-all duration-700" />

                        <div>
                          <div className="flex items-center gap-3 mb-5">
                            <span className={`font-mono text-[0.6rem] uppercase tracking-[0.3em] border px-3 py-1 ${CATEGORY_COLORS[posts[0].category] || CATEGORY_COLORS.tecnico}`}>
                              {CATEGORY_LABELS[posts[0].category] || posts[0].category}
                            </span>
                            <span className="font-mono text-[0.6rem] uppercase tracking-widest text-slate-600">
                              DESTAQUE
                            </span>
                          </div>

                          <h2 className="text-3xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors italic mb-4 leading-tight">
                            {posts[0].title}
                          </h2>

                          {posts[0].subtitle && (
                            <p className="text-slate-400 text-sm leading-relaxed line-clamp-3"
                              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                              {posts[0].subtitle}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/5">
                          <div className="flex items-center gap-4 text-[0.6rem] font-mono uppercase tracking-widest text-slate-600">
                            <span>{posts[0].author}</span>
                            <span>•</span>
                            <span>{posts[0].read_time} min</span>
                          </div>
                          <span className="flex items-center gap-1.5 font-black text-[0.65rem] uppercase tracking-[0.2em] text-white group-hover:gap-3 transition-all">
                            Ler artigo
                            <span className="material-symbols-outlined text-primary text-base">arrow_right_alt</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Rest of the posts grid */}
                {posts.length > 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.slice(1).map((post) => (
                      <Link key={post.id} to={`/blog/${post.slug}`} className="group flex flex-col">
                        <div className="bg-surface/20 border border-white/5 hover:border-primary/30 transition-all overflow-hidden flex-1 flex flex-col relative">
                          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

                          {/* Image */}
                          {post.cover_image ? (
                            <div className="h-44 overflow-hidden">
                              <img
                                src={post.cover_image}
                                alt={post.title}
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                              />
                            </div>
                          ) : (
                            <div className="h-44 bg-gradient-to-br from-primary/5 to-surface/40 flex items-center justify-center">
                              <span className="material-symbols-outlined text-5xl text-primary/15">article</span>
                            </div>
                          )}

                          <div className="p-7 flex flex-col flex-1">
                            <div className="flex items-center gap-2 mb-4">
                              <span className={`font-mono text-[0.55rem] uppercase tracking-[0.2em] border px-2.5 py-0.5 ${CATEGORY_COLORS[post.category] || CATEGORY_COLORS.tecnico}`}>
                                {CATEGORY_LABELS[post.category] || post.category}
                              </span>
                              <span className="font-mono text-[0.55rem] text-slate-700">{post.read_time} min</span>
                            </div>

                            <h3 className="text-xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors italic mb-3 leading-snug flex-1">
                              {post.title}
                            </h3>

                            {post.subtitle && (
                              <p className="text-slate-500 text-[0.8rem] line-clamp-2 mb-5"
                                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                                {post.subtitle}
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                              <span className="font-mono text-[0.55rem] uppercase text-slate-700">{post.author}</span>
                              <span className="flex items-center gap-1 font-black text-[0.6rem] uppercase tracking-wider text-primary group-hover:gap-2 transition-all">
                                Ler <span className="material-symbols-outlined text-sm">chevron_right</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── MANUAL TAB ── */}
        {tab === 'manual' && (
          <>
            {/* Modalidades Section */}
            <section className="mb-20">
              <div className="flex items-center gap-5 mb-10">
                <h2 className="text-2xl font-black text-white uppercase tracking-widest italic flex items-center gap-3">
                  <div className="size-9 bg-primary/20 flex items-center justify-center border border-primary/30">
                    <span className="material-symbols-outlined text-primary text-xl">military_tech</span>
                  </div>
                  Classificação de Missões
                </h2>
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">01 // MODALIDADES</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {MISSION_TYPES.map((type) => (
                  <Link key={type.id} to={`/blog/modalidades/${type.slug}`} className="group relative">
                    <div className="bg-surface/30 border border-white/5 p-10 hover:border-primary/50 transition-all duration-500 relative overflow-hidden h-full">
                      <div className="absolute top-0 left-0 w-[2px] h-0 bg-primary group-hover:h-full transition-all duration-700" />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-5">
                          <span className="text-[9px] text-primary font-black uppercase tracking-[0.35em] bg-primary/10 px-3 py-1 border border-primary/20 group-hover:bg-primary group-hover:text-black transition-colors">
                            {type.subtitle}
                          </span>
                        </div>
                        <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-5 group-hover:text-primary transition-colors italic">
                          {type.label}
                        </h3>
                        <p className="text-sm text-slate-400 font-mono leading-relaxed mb-7 uppercase tracking-wide">
                          {type.shortDescription}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] font-black text-white uppercase tracking-[0.2em] group-hover:gap-5 transition-all">
                          <span>Ver Protocolo</span>
                          <span className="material-symbols-outlined text-primary group-hover:translate-x-2 transition-transform">arrow_right_alt</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Game Modes Section */}
            <section>
              <div className="flex items-center gap-5 mb-10">
                <h2 className="text-2xl font-black text-white uppercase tracking-widest italic flex items-center gap-3">
                  <div className="size-9 bg-primary/20 flex items-center justify-center border border-primary/30">
                    <span className="material-symbols-outlined text-primary text-xl">security_update_good</span>
                  </div>
                  Modos Operacionais
                </h2>
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">02 // GAME MODES</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {GAME_MODES.map((mode) => (
                  <Link key={mode.id} to={`/blog/modos/${mode.slug}`}
                    className="group bg-surface/20 border border-white/5 p-7 hover:bg-surface/40 hover:border-white/20 transition-all flex flex-col justify-between relative">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                    <div>
                      <div className="flex justify-between items-start mb-5">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-none">
                          {mode.label}
                        </h3>
                        <span className="text-[8px] font-mono text-primary/40">[{mode.id.toUpperCase()}]</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono leading-relaxed uppercase mb-7 line-clamp-4 tracking-wide group-hover:text-slate-300 transition-colors">
                        {mode.shortDescription}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-5 border-t border-white/5">
                      <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                        Instruções
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
