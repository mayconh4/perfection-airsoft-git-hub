import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { OperatorKYCForm } from '../components/OperatorKYCForm';
import { MISSION_TYPES, GAME_MODES } from '../data/missionCatalog';
import type { MissionContent } from '../data/missionCatalog';
import { TacticalInfoPopup } from '../components/TacticalInfoPopup';

export default function CreateEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [maps, setMaps] = useState<any[]>([]);
  const [hasVerifiedProfile, setHasVerifiedProfile] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Som MW2: UAV quando gate de verificação aparece
  useEffect(() => {
    if (hasVerifiedProfile === false) {
      const audio = new Audio('/sounds/uav.mp3');
      audio.volume = 0.6;
      audio.play().catch(() => {});
    }
  }, [hasVerifiedProfile]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
    ticket_price: '0',
    capacity: '50',
    image_url: '',
    status: 'draft' as 'draft' | 'published' | 'closed',
    engagement_rules: [] as string[],
    mission_type: '',
    game_mode: ''
  });
  const [newRule, setNewRule] = useState('');
  const [popupContent, setPopupContent] = useState<MissionContent | null>(null);

  useEffect(() => {
    if (user) {
      checkVerificationStatus();
      loadMaps();
      if (id) {
        loadEventData();
      }
    }
  }, [id, user, navigate]);

  const checkVerificationStatus = async () => {
    if (!user) return;
    try {
      const isAdmin = user.email === 'admin@perfectionairsoft.com.br';
      if (isAdmin) {
        setHasVerifiedProfile(true);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('asaas_wallet_id')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setHasVerifiedProfile(!!data?.asaas_wallet_id);
    } catch (err) {
      console.error('Erro ao verificar Status Financeiro:', err);
      setHasVerifiedProfile(false);
    }
  };

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
        // SEGURANÇA: Somente o criador pode editar a missão
        if (data.organizer_id !== user?.id) {
          alert('PROTOCOLO NEGADO: VOCÊ NÃO É O ORGANIZADOR DESTA MISSÃO.');
          navigate('/organizador');
          return;
        }

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
          status: data.status,
          engagement_rules: data.engagement_rules || [],
          mission_type: data.mission_type || '',
          game_mode: data.game_mode || ''
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
      const filePath = `${user?.id}/${fileName}`;

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

    const isAdmin = user.email === 'admin@perfectionairsoft.com.br';
    if (!hasVerifiedProfile && !isAdmin) {
      alert('PROTOCOLO BLOQUEADO: VOCÊ PRECISA CONCLUIR O PROTOCOLO DE VERIFICAÇÃO TÁTICA PARA PROSSEGUIR.');
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
        status: formData.status,
        engagement_rules: formData.engagement_rules,
        mission_type: formData.mission_type,
        game_mode: formData.game_mode
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

      {!user ? (
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="bg-primary/5 border border-primary/20 p-12 flex flex-col items-center text-center gap-6 relative overflow-hidden group">
            {/* Linha de scan tático */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_15px_rgba(255,193,7,0.5)] animate-pulse"></div>
            
            <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mb-2">
              <span className="material-symbols-outlined text-primary text-5xl animate-pulse">shield_person</span>
            </div>

            <div>
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">IDENTIDADE NÃO VERIFICADA</h2>
              <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] max-w-md mx-auto leading-relaxed">
                PARA ACESSAR O PROTOCOLO DE CONFIGURAÇÃO DE MISSÕES, VOCÊ PRECISA ESTAR NO SISTEMA.
              </p>
            </div>

            <Link 
              to="/login?redirect=/criar-evento"
              className="bg-primary text-background-dark font-black py-4 px-12 text-[11px] uppercase tracking-[0.3em] hover:bg-white transition-all shadow-[0_0_30px_rgba(255,193,7,0.2)] hover:scale-105 active:scale-95 mt-4"
            >
              REGISTRE-SE PARA COMANDAR
            </Link>
          </div>
        </div>
      ) : (
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

        {hasVerifiedProfile === false && user?.email !== 'admin@perfectionairsoft.com.br' && (
          <div className={!isVerifying ? "bg-red-500/10 border border-red-500/50 p-8 flex flex-col items-center text-center gap-4 mb-12 shadow-[0_0_50px_rgba(239,68,68,0.1)]" : "mb-12 w-full"}>
            {!isVerifying ? (
              <>
                <div className="size-16 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                  <span className="material-symbols-outlined text-red-500 text-4xl">warning</span>
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-[0.2em] mb-2 font-display italic text-xl">PERFIL FINANCEIRO NÃO VERIFICADO</h3>
                  <p className="text-slate-400 text-[10px] uppercase font-mono max-w-md mx-auto leading-relaxed tracking-widest">
                    PARA CRIAR UMA MISSÃO NO MARKETPLACE, VOCÊ PRECISA CONCLUIR O PROTOCOLO DE VERIFICAÇÃO TÁTICA.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsVerifying(true)}
                  className="bg-red-500 text-white font-black py-4 px-10 text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-red-500 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  INICIAR VERIFICAÇÃO AGORA
                </button>
              </>
            ) : (
              <div className="w-full">
                <OperatorKYCForm onComplete={() => {
                  setIsVerifying(false);
                  checkVerificationStatus();
                }} />
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className={`space-y-8 transition-all duration-500 ${(hasVerifiedProfile === false && user?.email !== 'admin@perfectionairsoft.com.br') ? 'opacity-20 pointer-events-none grayscale blur-[2px]' : ''}`}>
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

            {/* Classification: Type & Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/5">
              {/* Mission Type */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">TIPO DE MISSÃO</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      const type = MISSION_TYPES.find(t => t.id === formData.mission_type);
                      if (type) setPopupContent(type);
                    }}
                    disabled={!formData.mission_type}
                    className="size-4 flex items-center justify-center bg-primary/20 text-primary rounded-full hover:bg-primary hover:text-black transition-all disabled:opacity-20 translate-y-[-2px]"
                  >
                    <span className="material-symbols-outlined text-[12px] font-bold">help</span>
                  </button>
                </div>
                <select
                  required
                  className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all"
                  value={formData.mission_type}
                  onChange={e => setFormData({ ...formData, mission_type: e.target.value })}
                >
                  <option value="">SELECIONE A MODALIDADE</option>
                  {MISSION_TYPES.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.label} {type.subtitle ? `(${type.subtitle})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Game Mode */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">MODO DE JOGO</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      const mode = GAME_MODES.find(m => m.id === formData.game_mode);
                      if (mode) setPopupContent(mode);
                    }}
                    disabled={!formData.game_mode}
                    className="size-4 flex items-center justify-center bg-primary/20 text-primary rounded-full hover:bg-primary hover:text-black transition-all disabled:opacity-20 translate-y-[-2px]"
                  >
                    <span className="material-symbols-outlined text-[12px] font-bold">help</span>
                  </button>
                </div>
                <select
                  required
                  className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all"
                  value={formData.game_mode}
                  onChange={e => setFormData({ ...formData, game_mode: e.target.value })}
                >
                  <option value="">SELECIONE O MODO OPERACIONAL</option>
                  {GAME_MODES.map(mode => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
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

            {/* Regras de Engajamento (Obrigatoriedades) */}
            <div className="pt-8 border-t border-white/5">
              <div className="flex items-center justify-between mb-6">
                <div>
                   <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1 italic">PAINEL DE OBRIGATORIEDADES</label>
                   <h3 className="text-sm font-black text-white uppercase tracking-widest">REGRAS DE ENGAJAMENTO</h3>
                </div>
                <span className="text-[8px] bg-primary/10 text-primary border border-primary/20 px-2 py-1 font-mono uppercase tracking-widest">Protocolo de Segurança</span>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="EX: USO OBRIGATÓRIO DE ÓCULOS DE PROTEÇÃO"
                    className="flex-1 bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20 uppercase"
                    value={newRule}
                    onChange={e => setNewRule(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), newRule && (setFormData(f => ({ ...f, engagement_rules: [...f.engagement_rules, newRule] })), setNewRule('')))}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newRule) {
                        setFormData(f => ({ ...f, engagement_rules: [...f.engagement_rules, newRule] }));
                        setNewRule('');
                      }
                    }}
                    className="bg-primary text-background-dark font-black px-6 hover:bg-white transition-all uppercase text-[10px] tracking-widest"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.engagement_rules.map((rule, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/5 p-4 group">
                      <div className="flex items-center gap-4">
                        <span className="text-primary font-black font-mono text-xs">{(idx + 1).toString().padStart(2, '0')}</span>
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">{rule}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, engagement_rules: f.engagement_rules.filter((_, i) => i !== idx) }))}
                        className="text-red-500/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ))}
                  {formData.engagement_rules.length === 0 && (
                    <p className="text-[9px] text-slate-600 italic uppercase font-mono py-4 text-center border border-dashed border-white/5 bg-black/10">
                      Nenhuma regra de engajamento definida para esta missão.
                    </p>
                  )}
                </div>
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
                    <button type="button" onClick={() => setFormData({ ...formData, image_url: '' })} className="bg-red-500 p-2">
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
              {loading ? 'PROCESSANDO...' : id ? 'ATUALIZAR DADOS DA MISSÃO' : 'CONFIRMAR MISSÃO'}
            </button>
          </div>
        </form>

        <TacticalInfoPopup 
          content={popupContent} 
          onClose={() => setPopupContent(null)} 
        />
        </div>
      )}
    </div>
  );
}
