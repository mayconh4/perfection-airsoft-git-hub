import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function CreateEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [maps, setMaps] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
    ticket_price: '0',
    capacity: '50',
    image_url: '',
    status: 'draft' as 'draft' | 'published' | 'closed'
  });

  useEffect(() => {
    loadMaps();
    if (id) {
      loadEventData();
    }
  }, [id]);

  const loadMaps = async () => {
    const { data } = await supabase.from('maps').select('id, name, city, state').order('name');
    if (data) setMaps(data);
  };

  const loadEventData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        // Formatar data para input datetime-local
        const eventDate = new Date(data.event_date).toISOString().slice(0, 16);
        setFormData({
          title: data.title,
          description: data.description || '',
          location: data.location || '',
          event_date: eventDate,
          ticket_price: data.ticket_price.toString(),
          capacity: data.capacity.toString(),
          image_url: data.image_url || '',
          status: data.status
        });
      }
    } catch (err: any) {
      console.error(err);
      alert(`ERRO AO CARREGAR DADOS: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `events/${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('events')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error: any) {
      alert(`ERRO NO UPLOAD: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('LOGIN NECESSÁRIO PARA ESTA OPERAÇÃO.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        organizer_id: user.id,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        event_date: new Date(formData.event_date).toISOString(),
        ticket_price: parseFloat(formData.ticket_price),
        capacity: parseInt(formData.capacity),
        image_url: formData.image_url,
        status: formData.status
      };

      if (id) {
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
        alert('MISSÃO ATUALIZADA COM SUCESSO.');
      } else {
        const { error } = await supabase.from('events').insert([payload]);
        if (error) throw error;
        alert('MISSÃO PUBLICADA COM SUCESSO.');
      }
      
      navigate('/organizador');
    } catch (err: any) {
      alert(`FALHA NO PROTOCOLO: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background-dark pt-12">
      <SEO title="Configuração de Missão | Perfection Airsoft" />

      <div className="max-w-3xl mx-auto px-6">
        {/* Header HUD */}
        <div className="mb-12 border-l-4 border-primary pl-8 py-4 bg-surface/10">
            <span className="text-primary font-black uppercase tracking-[0.4em] text-[10px] block mb-2">
                {id ? 'EDITAR MISSÃO: ATUALIZAR INTEL' : 'NOVA MISSÃO: CONFIGURAR OPERAÇÃO'}
            </span>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                {id ? 'EDIÇÃO DE MISSÃO' : 'CRIAÇÃO DE MISSÃO'}
            </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-surface/20 border border-white/5 p-8 space-y-8">
                {/* Title */}
                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">CODENOME DA MISSÃO (TÍTULO)</label>
                    <input 
                        type="text" 
                        required
                        placeholder="EX: OPERAÇÃO BLACKOUT"
                        className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">SITREP (DESCRIÇÃO)</label>
                    <textarea 
                        required
                        rows={6}
                        placeholder="DETALHES DA MISSÃO, CRONOGRAMA, REGRAS ESPECÍFICAS..."
                        className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20 resize-none"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                {/* Location Selection */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block italic">L.Z. (LOCALIZAÇÃO / CAMPO)</label>
                      <Link to="/mapas?register=true" className="text-[9px] text-primary hover:underline uppercase font-bold tracking-widest">
                        + Registrar Novo Campo
                      </Link>
                    </div>
                    <select 
                        required
                        className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all"
                        value={formData.location}
                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                    >
                        <option value="">SELECIONE UM CAMPO REGISTRADO</option>
                        {maps.map(map => (
                          <option key={map.id} value={map.name}>
                            {map.name} ({map.city} - {map.state})
                          </option>
                        ))}
                    </select>
                    <p className="text-[9px] text-slate-600 mt-2 uppercase font-bold">
                      * O campo deve estar previamente cadastrado para garantir a precisão do GPS para os operadores.
                    </p>
                </div>

                {/* Date & Capacity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">DATA DE MOBILIZAÇÃO (DATA/HORA)</label>
                        <input 
                            type="datetime-local" 
                            required
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all"
                            value={formData.event_date}
                            onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">MÁX. OPERADORES (CAPACIDADE)</label>
                        <input 
                            type="number" 
                            required
                            placeholder="EX: 40"
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all"
                            value={formData.capacity}
                            onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                        />
                    </div>
                </div>

                {/* Price & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">VALOR DO TICKET (PREÇO)</label>
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
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">STATUS DA MISSÃO</label>
                        <select 
                            required
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all"
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                        >
                            <option value="draft">RASCUNHO</option>
                            <option value="published">PUBLICADO (ATIVO NO SITE)</option>
                            <option value="closed">ENCERRADO</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Media Panel */}
            <div className="bg-surface/20 border border-white/5 p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">CAPA DA MISSÃO // VISUAL INTEL</h3>
                    <span className={`text-[8px] font-mono ${uploading ? 'text-primary animate-pulse' : 'text-primary/60'}`}>
                        {uploading ? 'ENVIANDO...' : 'STATUS: PRONTO'}
                    </span>
                </div>

                <div className="flex gap-8">
                    <div className="relative flex-1 group">
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="border-2 border-dashed border-white/10 group-hover:border-primary/40 transition-all p-12 flex flex-col items-center justify-center gap-4 bg-black/20 text-center">
                            <span className="material-symbols-outlined text-4xl text-primary/40">add_photo_alternate</span>
                            <span className="text-[10px] text-white font-black uppercase tracking-widest">UPLOAD BANNER DA MISSÃO</span>
                        </div>
                    </div>
                    
                    {formData.image_url && (
                        <div className="w-48 aspect-video border border-primary overflow-hidden relative">
                            <img src={formData.image_url} alt="Cover" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <button type="button" onClick={() => setFormData({...formData, image_url: ''})} className="bg-red-500 p-2">
                                    <span className="material-symbols-outlined text-white text-xs">delete</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Submit HUD */}
            <div className="bg-surface/40 p-10 border border-white/5 flex flex-col items-center text-center gap-8">
                <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest leading-relaxed">
                   CERTIFIQUE-SE DE QUE TODAS AS INFORMAÇÕES TÁTICAS ESTÃO CORRETAS.<br />
                   MISSÕES PUBLICADAS FICARÃO VISÍVEIS PARA TODOS OS OPERADORES.
                </span>
                
                <button 
                   type="submit"
                   disabled={loading || uploading}
                   className="bg-primary text-background-dark font-black py-5 px-16 text-[11px] uppercase tracking-[0.4em] hover:bg-white transition-all shadow-[0_0_30px_rgba(255,193,7,0.2)] disabled:opacity-50"
                >
                   {loading ? 'PROCESSANDO...' : id ? 'ATUALIZAR DADOS DA MISSÃO' : 'CONFIRMAR DEPLOY DA MISSÃO'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}
