import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { OperatorKYCForm } from '../components/OperatorKYCForm';

export default function CreateRafflePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ticket_price: '',
    total_tickets: '',
    draw_date: '',
    rules: '',
    image_url: '',
    images: [] as string[],
    logistics_description: 'Envio segurado para todo o Brasil via transportadora tática especializada.',
    slug: ''
  });

  const [hasPixKey, setHasPixKey] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (user) {
      checkPixKey();
      if (id) {
        loadRaffleData();
      }
    }
  }, [id, user, navigate]);

  const checkPixKey = async () => {
    if (!user) return;
    try {
      const isAdmin = user?.email === 'admin@perfectionairsoft.com.br';
      if (isAdmin) {
        setHasPixKey(true);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('kyc_status, asaas_wallet_id')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setHasPixKey(!!data?.asaas_wallet_id);
    } catch (err) {
      console.error('Erro ao verificar Status Asaas:', err);
      setHasPixKey(false);
    }
  };

  const loadRaffleData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        const isAdmin = user?.email === 'admin@perfectionairsoft.com.br';
        if (data.creator_id !== user?.id && !isAdmin) {
          alert('PROTOCOLO VIOLADO: VOCÊ NÃO TEM AUTORIZAÇÃO PARA MODIFICAR ESTE ARSENAL.');
          navigate('/drop');
          return;
        }

        const drawDate = new Date(data.draw_date).toISOString().slice(0, 16);
        setFormData({
          title: data.title,
          description: data.description,
          ticket_price: data.ticket_price.toString(),
          total_tickets: data.total_tickets.toString(),
          draw_date: drawDate,
          rules: data.rules || '',
          image_url: data.image_url || '',
          images: data.images || [],
          logistics_description: data.logistics_description || 'Envio segurado para todo o Brasil via transportadora tática especializada.',
          slug: data.slug || ''
        });
      }
    } catch (err: any) {
      alert(`ERRO AO CARREGAR DADOS: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploads = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('raffles')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('raffles')
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      if (!formData.image_url && newUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          image_url: newUrls[0],
          images: [...prev.images, ...newUrls.slice(1)]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...newUrls]
        }));
      }
    } catch (error: any) {
      alert(`ERRO NO UPLOAD: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const isAdmin = user?.email === 'admin@perfectionairsoft.com.br';
    if (!hasPixKey && !isAdmin) {
      alert('PROTOCOLO BLOQUEADO: VOCÊ PRECISA CONCLUIR O PROTOCOLO DE VERIFICAÇÃO TÁTICA.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        ticket_price: parseFloat(formData.ticket_price),
        total_tickets: parseInt(formData.total_tickets),
        draw_date: new Date(formData.draw_date).toISOString(),
        rules: formData.rules,
        image_url: formData.image_url,
        images: formData.images,
        logistics_description: formData.logistics_description,
        slug: formData.slug || undefined,
      };

      if (id) {
        const { error } = await supabase
          .from('raffles')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('raffles').insert([
          { ...payload, creator_id: user.id, status: 'ativo' }
        ]);
        if (error) throw error;
      }
      
      navigate('/drop');
    } catch (err: any) {
      alert(`FALHA NO PROTOCOLO: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background-dark pt-12">
      <SEO title="Configuração de Drop | Perfection Airsoft" />

      <div className="max-w-3xl mx-auto px-6">
        <div className="mb-12 border-l-4 border-primary pl-8 py-4 bg-surface/10">
            <span className="text-primary font-black uppercase tracking-[0.4em] text-[10px] block mb-2">
                {id ? 'EDITAR DROP: ATUALIZAR PRÊMIO' : 'PROTOCOLO DE COMANDO'}
            </span>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                {id ? 'EDIÇÃO DE DROP' : 'LANÇAR NOVO DROP'}
            </h1>
        </div>

        {!user ? (
          <div className="py-10">
            <div className="bg-primary/5 border border-primary/20 p-12 flex flex-col items-center text-center gap-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_15px_rgba(255,193,7,0.5)] animate-pulse"></div>
              
              <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mb-2">
                <span className="material-symbols-outlined text-primary text-5xl animate-pulse">shield_person</span>
              </div>

              <div>
                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">IDENTIDADE NÃO VERIFICADA</h2>
                <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] max-w-md mx-auto leading-relaxed">
                  PARA ACESSAR O PROTOCOLO DE CONCESSÃO DE DROPS, VOCÊ PRECISA ESTAR NO SISTEMA.
                </p>
              </div>

              <Link
                to="/login?redirect=/drop/criar"
                className="bg-primary text-background-dark font-black py-4 px-12 text-[11px] uppercase tracking-[0.3em] hover:bg-white transition-all shadow-[0_0_30px_rgba(255,193,7,0.2)] hover:scale-105 active:scale-95 mt-4"
              >
                REGISTRE-SE PARA COMANDAR
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {hasPixKey === false && user.email !== 'admin@perfectionairsoft.com.br' && (
              <div className={!isVerifying ? "bg-red-500/10 border border-red-500/50 p-8 flex flex-col items-center text-center gap-4 mb-8 shadow-[0_0_50px_rgba(239,68,68,0.1)]" : "mb-8 w-full"}>
                {!isVerifying ? (
                  <>
                    <div className="size-16 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                      <span className="material-symbols-outlined text-red-500 text-4xl">warning</span>
                    </div>
                    <div>
                      <h3 className="text-white font-black uppercase tracking-[0.2em] mb-2 font-display italic text-xl">PERFIL FINANCEIRO NÃO VERIFICADO</h3>
                      <p className="text-slate-400 text-[10px] uppercase font-mono max-w-md mx-auto leading-relaxed tracking-widest">
                        PARA LANÇAR UM DROP NO MARKETPLACE, VOCÊ PRECISA CONCLUIR O PROTOCOLO DE VERIFICAÇÃO TÁTICA.
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        // Toca o som aqui — interação direta do usuário garante autoplay
                        const a = new Audio('/sounds/uav.mp3');
                        a.volume = 0.6;
                        a.play().catch(() => {});
                        setIsVerifying(true);
                      }}
                      className="bg-red-500 text-white font-black py-4 px-10 text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-red-500 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    >
                      INICIAR VERIFICAÇÃO AGORA
                    </button>
                  </>
                ) : (
                  <div className="w-full">
                    <OperatorKYCForm onComplete={() => {
                        setIsVerifying(false);
                        checkPixKey();
                    }} />
                  </div>
                )}
              </div>
            )}
            
            <div className={`space-y-8 transition-all duration-500 ${(hasPixKey === false && user.email !== 'admin@perfectionairsoft.com.br') ? 'opacity-20 pointer-events-none grayscale blur-[2px]' : ''}`}>
                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">NOME DO EQUIPAMENTO / PRÊMIO</label>
                    <input 
                        type="text" 
                        required
                        placeholder="EX: RIFLE M4A1 GBB FULL METAL"
                        className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>

                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">DESCRIÇÃO TÉCNICA (PRODUCT BRIEFING)</label>
                    <textarea 
                        required
                        rows={4}
                        placeholder="DESCRIÇÃO TÉCNICA E DETALHES DO EQUIPAMENTO..."
                        className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20 resize-none"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">LINK AMIGÁVEL (URL SLUG)</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-mono text-[10px]">/drop/</span>
                        <input 
                            type="text" 
                            placeholder="ex: rifle-sniper-pro"
                            className="w-full bg-black/40 border border-white/10 p-4 pl-16 text-primary font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20"
                            value={formData.slug}
                            onChange={e => {
                                const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                setFormData({ ...formData, slug: clean });
                            }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">VALOR UNITÁRIO (PREÇO DO TICKET)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-xs">R$</span>
                            <input 
                                type="number" 
                                required
                                step="0.01"
                                placeholder="0.00"
                                className="w-full bg-black/40 border border-white/10 p-4 pl-12 text-white font-mono text-sm focus:border-primary outline-none transition-all"
                                value={formData.ticket_price}
                                onChange={e => setFormData({ ...formData, ticket_price: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">UNIDADES TOTAIS (TICKETS)</label>
                        <input 
                            type="number" 
                            required
                            placeholder="MAX: 1000"
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all"
                            value={formData.total_tickets}
                            onChange={e => setFormData({ ...formData, total_tickets: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">DATA DO SORTEIO</label>
                        <input 
                            type="datetime-local" 
                            required
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all"
                            value={formData.draw_date}
                            onChange={e => setFormData({ ...formData, draw_date: e.target.value })}
                        />
                    </div>
                    <div>
                         <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">REGULAMENTO</label>
                         <input 
                            type="text" 
                            placeholder="REGRAS DO SORTEIO..."
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20"
                            value={formData.rules}
                            onChange={e => setFormData({ ...formData, rules: e.target.value })}
                        />
                    </div>
                </div>
            </div>
            
            <div className="bg-surface/20 border border-white/5 p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">LOGÍSTICA</h3>
                </div>
                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">DETALHES DE ENVIO</label>
                    <textarea 
                        rows={2}
                        placeholder="DETALHES DA ENTREGA..."
                        className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20 resize-none"
                        value={formData.logistics_description}
                        onChange={e => setFormData({ ...formData, logistics_description: e.target.value })}
                    />
                </div>
            </div>

            <div className="bg-surface/20 border border-white/5 p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">PAINEL DE MÍDIA</h3>
                    <span className={`text-[8px] font-mono ${uploading ? 'text-primary animate-pulse' : 'text-primary/60'}`}>
                        {uploading ? 'ENVIANDO...' : 'STATUS: PRONTO'}
                    </span>
                </div>

                <div className="relative group">
                    <input 
                        type="file" 
                        multiple 
                        accept="image/*"
                        onChange={handleFileUploads}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                    />
                    <div className="border-2 border-dashed border-white/10 group-hover:border-primary/40 transition-all p-12 flex flex-col items-center justify-center gap-4 bg-black/20">
                        <span className="material-symbols-outlined text-4xl text-primary/40 group-hover:text-primary transition-all">cloud_upload</span>
                        <div className="text-center">
                            <span className="text-[10px] text-white font-black uppercase tracking-widest block mb-1">CLIQUE OU ARRASTE AS FOTOS</span>
                            <span className="text-[8px] text-slate-500 font-mono uppercase">JPG, PNG</span>
                        </div>
                    </div>
                </div>

                {(formData.image_url || formData.images.length > 0) && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                             {formData.image_url && (
                                <div className="relative aspect-video bg-black/40 border-2 border-primary group">
                                    <img src={formData.image_url} alt="Capa" className="w-full h-full object-cover" />
                                    <div className="absolute top-0 left-0 bg-primary text-background-dark text-[8px] font-black px-2 py-1 uppercase scale-75 origin-top-left">CAPA</div>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                        className="absolute top-1 right-1 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <span className="material-symbols-outlined text-xs">close</span>
                                    </button>
                                </div>
                            )}

                            {formData.images.map((img, idx) => (
                                <div key={idx} className="relative aspect-video bg-black/40 border border-white/10 group">
                                    <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const oldCapa = formData.image_url;
                                                const newGallery = formData.images.filter((_, i) => i !== idx);
                                                if (oldCapa) newGallery.push(oldCapa);
                                                setFormData({ ...formData, image_url: img, images: newGallery });
                                            }}
                                            className="bg-primary text-background-dark p-1 hover:scale-110 transition-transform"
                                        >
                                            <span className="material-symbols-outlined text-xs">star</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== idx) })}
                                            className="bg-red-500 text-white p-1 hover:scale-110 transition-transform"
                                        >
                                            <span className="material-symbols-outlined text-xs">close</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-surface/40 p-10 border border-white/5 flex flex-col items-center text-center gap-8">
                <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest leading-relaxed">
                   AO PUBLICAR, VOCÊ CONFIRMA A AUTENTICIDADE DO PRÊMIO E A RESPONSABILIDADE.
                </span>
                
                <button 
                   type="submit"
                   disabled={loading || uploading}
                   className="bg-primary text-background-dark font-black py-5 px-16 text-[11px] uppercase tracking-[0.4em] hover:bg-white transition-all shadow-[0_0_30px_rgba(255,193,7,0.2)] disabled:opacity-50"
                >
                   {loading ? 'PROCESSING...' : id ? 'UPDATE DROP PROTOCOL' : 'INITIALIZE DROP PROTOCOL'}
                </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
