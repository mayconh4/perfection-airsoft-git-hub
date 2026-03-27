import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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
    rules_title: 'RULES & ENGAGEMENT',
    logistics_title: 'LOGISTICS',
    logistics_description: 'Envio segurado para todo o Brasil via transportadora tática especializada.'
  });

  useEffect(() => {
    if (id) {
      loadRaffleData();
    }
  }, [id]);

  const loadRaffleData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq(id ? 'id' : '', id)
        .single();

      if (error) throw error;
      if (data) {
        // Formatar data para input datetime-local
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
          rules_title: data.rules_title || 'RULES & ENGAGEMENT',
          logistics_title: data.logistics_title || 'LOGISTICS',
          logistics_description: data.logistics_description || 'Envio segurado para todo o Brasil via transportadora tática especializada.'
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

      // Se não houver imagem de capa, a primeira vira a capa
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
    if (!user) {
      alert('IDENTIDADE NÃO VERIFICADA: ACESSO NEGADO.');
      return;
    }

    setLoading(true);
    try {
      if (id) {
        // UPDATE MODE
        const { error } = await supabase
          .from('raffles')
          .update({
            title: formData.title,
            description: formData.description,
            ticket_price: parseFloat(formData.ticket_price),
            total_tickets: parseInt(formData.total_tickets),
            draw_date: new Date(formData.draw_date).toISOString(),
            rules: formData.rules,
            image_url: formData.image_url,
            images: formData.images,
            rules_title: formData.rules_title,
            logistics_title: formData.logistics_title,
            logistics_description: formData.logistics_description,
          })
          .eq('id', id);
        if (error) throw error;
        alert('OPERACIONAL: DROP ATUALIZADO COM SUCESSO.');
      } else {
        // INSERT MODE
        const { error } = await supabase.from('raffles').insert([
          {
            creator_id: user.id,
            title: formData.title,
            description: formData.description,
            ticket_price: parseFloat(formData.ticket_price),
            total_tickets: parseInt(formData.total_tickets),
            draw_date: new Date(formData.draw_date).toISOString(),
            rules: formData.rules,
            image_url: formData.image_url,
            images: formData.images,
            rules_title: formData.rules_title,
            logistics_title: formData.logistics_title,
            logistics_description: formData.logistics_description,
            status: 'ativo'
          }
        ]);
        if (error) throw error;
        alert('OPERACIONAL: DROP PUBLICADO COM SUCESSO.');
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
        {/* Header HUD */}
        <div className="mb-12 border-l-4 border-primary pl-8 py-4 bg-surface/10">
            <span className="text-primary font-black uppercase tracking-[0.4em] text-[10px] block mb-2">
                {id ? 'EDIT MISSION: UPDATE INTEL' : 'NEW MISSION: SETUP DROP'}
            </span>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                {id ? 'EDIÇÃO DE DROP' : 'CONFIGURAÇÃO DE DROP'}
            </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-surface/20 border border-white/5 p-8 space-y-8">
                {/* Title */}
                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">TITLE / DESIGNATION</label>
                    <input 
                        type="text" 
                        required
                        placeholder="EX: RIFLE M4A1 GBB FULL METAL"
                        className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">INTEL BRIEFING (DESCRIPTION)</label>
                    <textarea 
                        required
                        rows={4}
                        placeholder="DESCRIÇÃO TÉCNICA E DETALHES DO EQUIPAMENTO..."
                        className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20 resize-none"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                {/* Pricing & Units */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">UNIT VALUE (TICKET PRICE)</label>
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
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">TOTAL UNITS (TICKETS)</label>
                        <input 
                            type="number" 
                            required
                            placeholder="MAX: 1000"
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all px-12"
                            value={formData.total_tickets}
                            onChange={e => setFormData({ ...formData, total_tickets: e.target.value })}
                        />
                    </div>
                </div>

                {/* Date & Rules */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">DRAW WINDOW (DRAW DATE)</label>
                        <input 
                            type="datetime-local" 
                            required
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all"
                            value={formData.draw_date}
                            onChange={e => setFormData({ ...formData, draw_date: e.target.value })}
                        />
                    </div>
                    <div>
                         <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">REGULAMENTO (REGRAS)</label>
                         <input 
                            type="text" 
                            placeholder="EX: DATA DO SORTEIO PODE VARIAR..."
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20"
                            value={formData.rules}
                            onChange={e => setFormData({ ...formData, rules: e.target.value })}
                        />
                    </div>
                </div>
            </div>
            
            {/* Custom Mission Intel */}
            <div className="bg-surface/20 border border-white/5 p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">CUSTOM MISSION INTEL // LABELS</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">RULES SECTION HEADER</label>
                        <input 
                            type="text" 
                            placeholder="EX: RULES & ENGAGEMENT ou LIVRE"
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20"
                            value={formData.rules_title}
                            onChange={e => setFormData({ ...formData, rules_title: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">LOGISTICS SECTION HEADER</label>
                        <input 
                            type="text" 
                            placeholder="EX: LOGISTICS ou ENVIO"
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20"
                            value={formData.logistics_title}
                            onChange={e => setFormData({ ...formData, logistics_title: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">LOGISTICS BRIEFING (SHIPPING INFO)</label>
                    <textarea 
                        rows={2}
                        placeholder="EX: ENVIO SEGURADO PARA TODO O BRASIL..."
                        className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20 resize-none"
                        value={formData.logistics_description}
                        onChange={e => setFormData({ ...formData, logistics_description: e.target.value })}
                    />
                </div>
            </div>

            {/* Media Panel - Fazer Upload de Fotos */}
            <div className="bg-surface/20 border border-white/5 p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">MEDIA PANEL // ARSENAL VISUAL</h3>
                    <span className={`text-[8px] font-mono ${uploading ? 'text-primary animate-pulse' : 'text-primary/60'}`}>
                        {uploading ? 'UPLOADING FILES...' : 'STATUS: READY FOR FILES'}
                    </span>
                </div>

                {/* Upload Zone */}
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
                            <span className="text-[10px] text-white font-black uppercase tracking-widest block mb-1">CLIQUE OU ARRASTE AS FOTOS DO PRÊMIO</span>
                            <span className="text-[8px] text-slate-500 font-mono uppercase">SUPORTA MULTIPLOS ARQUIVOS (JPG, PNG)</span>
                        </div>
                    </div>
                </div>

                {/* Preview e Gestão de Galeria */}
                {(formData.image_url || formData.images.length > 0) && (
                    <div className="space-y-6">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block italic">COMMAND REVIEW (GALERIA PREVIEW)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                             {/* Imagem de Capa */}
                             {formData.image_url && (
                                <div className="relative aspect-video bg-black/40 border-2 border-primary group">
                                    <img src={formData.image_url} alt="Capa" className="w-full h-full object-cover" />
                                    <div className="absolute top-0 left-0 bg-primary text-background-dark text-[8px] font-black px-2 py-1 uppercase scale-75 origin-top-left">PRIMARY (CAPA)</div>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                        className="absolute top-1 right-1 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <span className="material-symbols-outlined text-xs">close</span>
                                    </button>
                                </div>
                            )}

                            {/* Resto da Galeria */}
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
                                            title="Tornar Capa"
                                        >
                                            <span className="material-symbols-outlined text-xs">star</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== idx) })}
                                            className="bg-red-500 text-white p-1 hover:scale-110 transition-transform"
                                            title="Remover"
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

            {/* Submit HUD */}
            <div className="bg-surface/40 p-10 border border-white/5 flex flex-col items-center text-center gap-8">
                <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest leading-relaxed">
                   AO PUBLICAR, VOCÊ CONFIRMA A AUTENTICIDADE DO PRÊMIO E A RESPONSABILIDADE<br />
                   SOBRE O ENVIO DO EQUIPAMENTO AO VENCEDOR.
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
      </div>
    </div>
  );
}
