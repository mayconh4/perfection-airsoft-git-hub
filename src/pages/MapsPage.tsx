import React, { useState, useEffect } from 'react';
import { MapBackgroundSequence } from '../components/MapBackgroundSequence';
import { supabase } from '../lib/supabase';

export function MapsPage() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  
  const [mapsList, setMapsList] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);

  // States para Avaliações
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchData = async () => {
    setLoadingData(true);
    const { data: maps } = await supabase.from('maps').select('*').order('created_at', { ascending: false });
    const { data: reviews } = await supabase.from('map_reviews').select('*').order('created_at', { ascending: false });
    
    if (maps) {
      const enhancedMaps = maps.map(m => {
        const mReviews = reviews?.filter(r => r.map_id === m.id) || [];
        const avg = mReviews.length > 0 
          ? Math.round(mReviews.reduce((acc, r) => acc + r.rating, 0) / mReviews.length) 
          : 0;
        return { ...m, average_rating: avg, total_reviews: mReviews.length, reviews: mReviews };
      });
      
      setMapsList(enhancedMaps);
    }
    setLoadingData(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // States para o form
  const GAME_MODES = [
    'Team Deathmatch',
    'Capture the Flag',
    'Bomb Defuse',
    'VIP Escort',
    'Domination',
    'MilSim',
    'SpeedQB',
    'Free for All (Mata-Mata)'
  ];

  const [formData, setFormData] = useState({
    nome: '',
    operadores: '',
    convidados: '',
    estrutura: false,
    modos: [] as string[],
    arbitro: false,
    testeFps: false,
    cidade: '',
    estado: '',
    cep: '',
    googleMapsLink: '',
    image_url: ''
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => setImagePreview(event.target?.result as string);
      reader.readAsDataURL(file);

      // Usar a mesma estrat\u00e9gia de convers\u00e3o usando canvas se quiser minificar
      // Mas para manter simples aqui, vamos direto
      const fileName = `map-${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('maps').upload(fileName, file);
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('maps').getPublicUrl(data.path);
      setFormData(f => ({ ...f, image_url: publicUrl }));
    } catch (err: any) {
      alert('Falha no upload da foto: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleModeToggle = (mode: string) => {
    setFormData(prev => ({
      ...prev,
      modos: prev.modos.includes(mode)
        ? prev.modos.filter(m => m !== mode)
        : [...prev.modos, mode]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name: formData.nome,
      operators_limit: parseInt(formData.operadores) || null,
      guests_limit: parseInt(formData.convidados) || null,
      has_structure: formData.estrutura,
      game_modes: formData.modos,
      has_referee: formData.arbitro,
      requires_fps_test: formData.testeFps,
      city: formData.cidade,
      state: formData.estado,
      zip_code: formData.cep,
      maps_url: formData.googleMapsLink,
      image_url: formData.image_url
    };

    try {
      if (editingMapId) {
        const { data, error } = await supabase.from('maps').update(payload).eq('id', editingMapId).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Sem permissão para atualizar mapas ou restrição de segurança ativa.");
        alert('Campo Tático atualizado com sucesso na base de dados global!');
      } else {
        const { data, error } = await supabase.from('maps').insert([payload]).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Sem permissão para criar mapas.");
        alert('Campo Tático registrado com sucesso na base de dados global!');
      }
      
      setShowForm(false);
      setEditingMapId(null);
      
      // Reseta form
      setFormData({
        nome: '', operadores: '', convidados: '', estrutura: false,
        modos: [], arbitro: false, testeFps: false,
        cidade: '', estado: '', cep: '', googleMapsLink: '', image_url: ''
      });
      setImagePreview(null);
      
      fetchData();
    } catch (err: any) {
      alert(`Falha ao ${editingMapId ? 'atualizar' : 'registrar'} mapa: ` + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMap = (map: any) => {
    setFormData({
      nome: map.name || '',
      operadores: map.operators_limit ? String(map.operators_limit) : '',
      convidados: map.guests_limit ? String(map.guests_limit) : '',
      estrutura: map.has_structure || false,
      modos: map.game_modes || [],
      arbitro: map.has_referee || false,
      testeFps: map.requires_fps_test || false,
      cidade: map.city || '',
      estado: map.state || '',
      cep: map.zip_code || '',
      googleMapsLink: map.maps_url || '',
      image_url: map.image_url || ''
    });
    setEditingMapId(map.id);
    setImagePreview(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData({ ...formData, [target.name]: value });
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedMapId || selectedRating === 0 || !reviewComment.trim()) return;
    setSubmittingReview(true);
    
    try {
      const { error } = await supabase.from('map_reviews').insert([{
        map_id: expandedMapId,
        rating: selectedRating,
        comment: reviewComment,
        user_name: 'Comandante Local'
      }]);
      
      if (error) throw error;
      
      alert('Experiência compartilhada na central com sucesso!');
      setReviewComment('');
      setSelectedRating(0);
      setHoveredRating(0);
      
      await fetchData();
    } catch (err: any) {
      alert('Falha ao enviar relatório: ' + err.message);
    } finally {
       setSubmittingReview(false);
    }
  };

  return (
    <div className="py-12 lg:py-20 animate-fade-in relative px-4 lg:px-8 min-h-screen">
      <MapBackgroundSequence />

      <div className="hidden lg:block absolute top-0 left-0 w-1/3 h-full bg-primary/5 blur-[120px] pointer-events-none z-0" />

      <div className="mb-12 border-b border-white/5 pb-8 relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="absolute left-0 top-0 w-1 h-full bg-primary" />
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter uppercase text-white ml-6">
            Mapas & <span className="text-primary">Campos</span>
          </h1>
          <p className="text-white/40 mt-4 tracking-widest uppercase text-sm max-w-2xl ml-6">
            Descubra os melhores campos de operação para suas batalhas de airsoft.
          </p>
        </div>
        
        <button onClick={() => {
                  if (showForm) {
                    setEditingMapId(null);
                    setFormData({
                      nome: '', operadores: '', convidados: '', estrutura: false,
                      modos: [], arbitro: false, testeFps: false,
                      cidade: '', estado: '', cep: '', googleMapsLink: '', image_url: ''
                    });
                  }
                  setShowForm(!showForm);
                }} 
                className="bg-primary text-black font-black py-4 px-8 uppercase tracking-widest hover:bg-white transition-all ml-6 md:ml-0 shadow-[0_0_20px_rgba(255,193,7,0.3)] flex items-center gap-2">
          {showForm ? 'Voltar' : 'Adicionar Mapa'}
          <span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="bg-surface border border-primary/20 p-8 rounded-sm max-w-3xl mx-auto shadow-2xl relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 border-b border-white/10 pb-4">
            Intel: <span className="text-primary">{editingMapId ? 'Atualização' : 'Registro'} de Campo</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-2">Nome do Campo/Mapa</label>
              <input required name="nome" value={formData.nome} onChange={handleChange}
                     className="w-full bg-background-dark border border-white/10 p-4 text-xs text-white uppercase outline-none focus:border-primary/50" 
                     placeholder="EX: BASE ALFA, CQB ABANDONADO..." />
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-2">Operadores Permitidos</label>
              <input required type="number" name="operadores" value={formData.operadores} onChange={handleChange}
                     className="w-full bg-background-dark border border-white/10 p-4 text-xs text-white uppercase outline-none focus:border-primary/50" 
                     placeholder="EX: 40" />
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-2">Convidados Permitidos</label>
              <input required type="number" name="convidados" value={formData.convidados} onChange={handleChange}
                     className="w-full bg-background-dark border border-white/10 p-4 text-xs text-white uppercase outline-none focus:border-primary/50" 
                     placeholder="EX: 10" />
            </div>

            <div className="md:col-span-2 border-t border-white/5 pt-6 mt-2">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-4">Modos de Jogo Suportados</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {GAME_MODES.map(mode => (
                  <label key={mode} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="peer hidden" 
                      checked={formData.modos.includes(mode)}
                      onChange={() => handleModeToggle(mode)}
                    />
                    <div className="w-5 h-5 border-2 border-primary/50 peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[14px] text-black opacity-0 peer-checked:opacity-100">check</span>
                    </div>
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest group-hover:text-primary transition-colors">
                      {mode}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 md:col-span-2 border-t border-white/5">
               <label className="flex items-center gap-3 cursor-pointer group">
                 <input type="checkbox" name="estrutura" checked={formData.estrutura} onChange={handleChange} className="peer hidden" />
                 <div className="w-5 h-5 border-2 border-primary/50 peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                   <span className="material-symbols-outlined text-[14px] text-black opacity-0 peer-checked:opacity-100">check</span>
                 </div>
                 <span className="text-xs font-bold text-white/70 uppercase tracking-widest group-hover:text-white transition-colors">Estrutura para convidados acompanharem o jogo?</span>
               </label>

               <label className="flex items-center gap-3 cursor-pointer group">
                 <input type="checkbox" name="arbitro" checked={formData.arbitro} onChange={handleChange} className="peer hidden" />
                 <div className="w-5 h-5 border-2 border-primary/50 peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                   <span className="material-symbols-outlined text-[14px] text-black opacity-0 peer-checked:opacity-100">check</span>
                 </div>
                 <span className="text-xs font-bold text-white/70 uppercase tracking-widest group-hover:text-white transition-colors">Contém Árbitro / Ranger no local?</span>
               </label>
               
               <label className="flex items-center gap-3 cursor-pointer group">
                 <input type="checkbox" name="testeFps" checked={formData.testeFps} onChange={handleChange} className="peer hidden" />
                 <div className="w-5 h-5 border-2 border-primary/50 peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
                   <span className="material-symbols-outlined text-[14px] text-black opacity-0 peer-checked:opacity-100">check</span>
                 </div>
                 <span className="text-xs font-bold text-white/70 uppercase tracking-widest group-hover:text-white transition-colors">Teste de FPS obrigatório / Cronógrafo disponível?</span>
               </label>
            </div>
            
            
            <div className="md:col-span-2 border-t border-white/5 pt-6 mt-2">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-4">Mídia Confidencial</label>
              <div className="flex gap-4">
                <label className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed transition-all cursor-pointer p-8 bg-background-dark ${uploadingImage ? 'opacity-50 border-white/10' : 'border-primary/20 hover:border-primary hover:bg-primary/5'}`}>
                  <span className="material-symbols-outlined text-3xl text-primary mb-2">{uploadingImage ? 'sync' : 'add_photo_alternate'}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{uploadingImage ? 'Processando Upload...' : 'Anexar Foto da Operação'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage}/>
                </label>
                {(imagePreview || formData.image_url) && (
                  <div className="w-32 h-auto border border-primary/30 relative overflow-hidden flex-shrink-0">
                    <img src={imagePreview || formData.image_url} alt="Preview do Mapa" className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 bg-primary/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="text-[9px] font-black text-white uppercase shadow-sm">Preview</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-white/5 pt-6 mt-2">
              <div className="md:col-span-3">
                <h3 className="text-primary font-black uppercase tracking-widest text-[10px]">Coordenadas & Localização</h3>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-2">Cidade</label>
                <input required name="cidade" value={formData.cidade} onChange={handleChange}
                       className="w-full bg-background-dark border border-white/10 p-4 text-xs text-white uppercase outline-none focus:border-primary/50" 
                       placeholder="EX: SÃO PAULO" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-2">UF/Estado</label>
                <input required name="estado" value={formData.estado} onChange={handleChange}
                       className="w-full bg-background-dark border border-white/10 p-4 text-xs text-white uppercase outline-none focus:border-primary/50" 
                       placeholder="EX: SP" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-2">CEP</label>
                <input required name="cep" value={formData.cep} onChange={handleChange}
                       className="w-full bg-background-dark border border-white/10 p-4 text-xs text-white uppercase outline-none focus:border-primary/50" 
                       placeholder="EX: 00000-000" />
              </div>
              <div className="md:col-span-3">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-2">Link do Google Maps (Embed/URL)</label>
                <input required name="googleMapsLink" value={formData.googleMapsLink} onChange={handleChange}
                       className="w-full bg-background-dark border border-white/10 p-4 text-[10px] text-primary/80 outline-none focus:border-primary/50 font-mono tracking-widest" 
                       placeholder="COLE O LINK AQUI PARA GERAR O VIEW NATIVO..." />
                <p className="text-[9px] text-white/30 uppercase mt-2 tracking-widest">A ferramenta tática irá interpretar este link e gerar a visão de Satélite automaticamente na página do Mapa.</p>
              </div>

              {formData.googleMapsLink && (
                <div className="md:col-span-3 h-48 border border-primary/20 bg-[#161613] relative overflow-hidden flex flex-col items-center justify-center shadow-inner mt-4 group">
                  <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background-dark to-background-dark"></div>
                  <span className="material-symbols-outlined text-4xl text-primary/40 mb-2 group-hover:text-primary group-hover:scale-110 transition-all duration-500">satellite_alt</span>
                  <span className="relative z-10 text-[9px] font-black text-primary uppercase tracking-[0.2em]">Sinal de Satélite Capiturado (Preview View)</span>
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="mt-8 w-full bg-primary text-black font-black py-4 uppercase tracking-[0.2em] hover:bg-white transition-all disabled:opacity-50">
            {loading ? 'Processando envio...' : editingMapId ? 'Atualizar Mapa na Base' : 'Registrar Mapa na Base'}
          </button>
        </form>
      ) : loadingData ? (
        <div className="flex flex-col items-center justify-center py-32 z-10 relative">
          <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-primary font-black uppercase text-xs mt-6 tracking-[0.3em] animate-pulse">Estabelecendo Conexão Satélite...</p>
        </div>
      ) : (
        <>
          {mapsList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {mapsList.map(map => (
                <div key={map.id} className="bg-surface/60 backdrop-blur-md border border-primary/20 flex flex-col relative overflow-hidden group shadow-2xl">
                  {/* BACKGROUND IMAGE (FITS ENTIRE CARD) */}
                  {map.image_url && (
                    <>
                      <img src={map.image_url} alt={map.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 z-0 pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-b from-[#10100c]/40 via-[#10100c]/90 to-[#10100c] z-0 pointer-events-none"></div>
                    </>
                  )}
                  {/* DEFAULT ICON IF NO IMAGE */}
                  {!map.image_url && (
                     <div className="absolute inset-x-0 top-0 h-40 flex items-start justify-end p-8 overflow-hidden z-0 pointer-events-none opacity-5">
                        <span className="material-symbols-outlined text-9xl group-hover:scale-110 transition-transform duration-700">satellite_alt</span>
                     </div>
                  )}

                  <div className="absolute top-4 right-4 flex gap-2 z-20">
                     <button onClick={() => handleEditMap(map)} className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/50 hover:text-primary hover:border-primary transition-all pointer-events-auto shadow-xl" title="Editar Mapa">
                       <span className="material-symbols-outlined text-[16px]">edit</span>
                     </button>
                  </div>
                  
                  <div className="p-6 pt-16 flex flex-col flex-1 gap-4 relative z-10">
                    <div className="relative z-10 flex justify-between items-start gap-2">
                    <div className="flex-1 overflow-hidden">
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter truncate" title={map.name}>{map.name}</h3>
                      <p className="text-[10px] text-primary/80 font-bold uppercase tracking-widest">{map.city} - {map.state}</p>
                    </div>
                    {/* Average Rating Display */}
                    <div className="flex mt-1 items-center" title={`Classificação: ${map.average_rating || 0} Foguinhos`}>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(b => (
                          <div key={b} className={b <= (map.average_rating || 0) ? "text-primary drop-shadow-[0_0_5px_rgba(255,193,7,0.5)]" : "text-white/20"}>
                              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: b <= (map.average_rating || 0) ? "'FILL' 1" : "'FILL' 0" }}>local_fire_department</span>
                          </div>
                        ))}
                      </div>
                      <span className="text-[9px] text-white/40 ml-2 mt-0.5 font-bold">({map.total_reviews || 0})</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 relative z-10 flex-1">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-[9px] text-white/40 uppercase tracking-widest">Operadores Max.</span>
                      <span className="text-[10px] text-white font-bold">{map.operators_limit || 'Ilimitado'}</span>
                    </div>
                    {map.guests_limit > 0 && (
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest">Convidados Max.</span>
                        <span className="text-[10px] text-white font-bold">{map.guests_limit}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-[9px] text-white/40 uppercase tracking-widest">Modos de Jogo</span>
                      <span className="text-[10px] text-primary font-bold max-w-[150px] truncate text-right border-b border-transparent hover:border-primary/50 cursor-default" title={map.game_modes?.join(', ')}>
                        {map.game_modes?.slice(0, 2).join(', ')} {map.game_modes?.length > 2 && '...'}
                        {!map.game_modes?.length && 'Variados'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-4">
                      {map.has_structure && <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[7px] uppercase font-black tracking-widest rounded-sm border border-green-500/20 shadow-inner">Área de Lazer</span>}
                      {map.requires_fps_test && <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[7px] uppercase font-black tracking-widest rounded-sm border border-red-500/20 shadow-inner">Cronógrafo Obrigado</span>}
                      {map.has_referee && <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[7px] uppercase font-black tracking-widest rounded-sm border border-blue-500/20 shadow-inner">Ranger Presente</span>}
                   </div>
                  </div>
                  
                  <div className="flex gap-2 mt-auto pt-6 border-t border-white/5 relative z-10">
                    <button onClick={() => {
                              setExpandedMapId(expandedMapId === map.id ? null : map.id);
                              // Reset state when opening a new one
                              if (expandedMapId !== map.id) {
                                setReviewComment(''); 
                                setSelectedRating(0); 
                                setHoveredRating(0);
                              }
                            }} 
                            className={`flex flex-1 items-center justify-center gap-2 text-center border border-white/20 hover:border-primary hover:text-primary py-3 px-2 text-[9px] font-black uppercase tracking-widest transition-colors shadow-inner ${expandedMapId === map.id ? 'bg-primary/10 border-primary text-primary' : ''}`}>
                      Ler Experiências
                      <span className={`material-symbols-outlined text-[14px] transition-transform duration-300 ${expandedMapId === map.id ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
                    </button>
                    {map.maps_url ? (
                      <a href={map.maps_url} target="_blank" rel="noopener noreferrer" 
                         className="flex flex-1 items-center justify-center gap-1 text-center border border-primary/20 bg-background-dark/50 hover:bg-primary hover:text-black py-3 px-2 text-[9px] font-black uppercase tracking-widest transition-all">
                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                        GPS
                      </a>
                    ) : (
                      <button disabled className="flex flex-1 items-center justify-center gap-1 text-center border border-white/10 text-white/20 py-3 px-2 text-[9px] font-black uppercase tracking-widest cursor-not-allowed w-full">
                        <span className="material-symbols-outlined text-[12px]">location_off</span>
                        Sem GPS
                      </button>
                    )}
                  </div>

                  {/* INLINE REVIEWS EXPANDED SECTION */}
                  {expandedMapId === map.id && (
                     <div className="animate-fade-in mt-6 border-t border-primary/20 pt-6 relative z-10 flex flex-col gap-8">
                       {/* Rating Form */}
                       <div className="bg-background-dark/50 p-4 border border-white/5">
                         <h4 className="text-[10px] font-black uppercase text-primary tracking-widest mb-4">Adicionar Experiência de Combate</h4>
                         <form onSubmit={submitReview} className="space-y-4">
                            <div className="flex flex-col gap-2">
                               <label className="text-[8px] uppercase tracking-widest text-primary/80">Avalie (1 a 5 Foguinhos)</label>
                               <div className="flex gap-2 items-center h-8">
                                 {[1, 2, 3, 4, 5].map(b => {
                                   const active = b <= (hoveredRating || selectedRating);
                                   return (
                                     <button 
                                       type="button" 
                                       key={b} 
                                       onClick={() => setSelectedRating(b)}
                                       onMouseEnter={() => setHoveredRating(b)}
                                       onMouseLeave={() => setHoveredRating(0)}
                                       className={`transition-all flex items-center justify-center ${active ? 'text-primary scale-125 drop-shadow-[0_0_5px_rgba(255,193,7,0.5)]' : 'text-white/20 hover:text-white/50'}`}
                                     >
                                       <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>local_fire_department</span>
                                     </button>
                                   );
                                 })}
                                 <span className="text-[8px] uppercase font-bold text-white/30 ml-2">
                                   {selectedRating > 0 && `${selectedRating} Selecionado${selectedRating > 1 ? 's' : ''}`}
                                 </span>
                               </div>
                            </div>
                            
                            <textarea required value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Comente sobre a organização, terreno e staff..." 
                                      className="w-full bg-black border border-white/10 p-3 text-[9px] text-white uppercase outline-none focus:border-primary/50 min-h-[80px] tracking-wider resize-none"></textarea>
                            
                            <button type="submit" disabled={selectedRating === 0 || submittingReview || !reviewComment.trim()} 
                                    className="w-full bg-primary text-black font-black py-3 uppercase tracking-widest hover:bg-white transition-all text-[9px] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                               {submittingReview ? <span className="material-symbols-outlined text-sm animate-spin">sync</span> : <span className="material-symbols-outlined text-sm">send</span>}
                               {submittingReview ? 'Enviando Experiência...' : 'Compartilhar Experiência'}
                            </button>
                         </form>
                       </div>

                       {/* Comentários Feed */}
                       {map.reviews?.length > 0 && (
                          <div className="border-t border-white/5 pt-4 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mb-2">
                             <h4 className="text-[9px] font-black uppercase text-white/50 tracking-widest flex items-center gap-2 sticky top-0 bg-[#0c0c09] py-2 z-10 w-full mb-0 border-b border-white/5">
                               <span className="material-symbols-outlined text-sm">history</span>
                               Histórico de Experiências ({map.reviews.length})
                             </h4>
                             <div className="flex flex-col gap-3 pt-2">
                               {map.reviews.map((r: any) => (
                                 <div key={r.id} className="bg-[#10100c] border border-white/5 p-4 relative text-left">
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="text-[8px] text-primary font-black uppercase tracking-widest">{r.user_name}</span>
                                      <div className="flex gap-0.5 text-primary scale-75 origin-top-right">
                                        {[1,2,3,4,5].map(b => (
                                           <span key={b} className={`material-symbols-outlined text-[12px] ${b <= r.rating ? 'opacity-100 drop-shadow-[0_0_2px_rgba(255,193,7,0.5)]' : 'opacity-20'}`} style={{ fontVariationSettings: b <= r.rating ? "'FILL' 1" : "'FILL' 0" }}>local_fire_department</span>
                                        ))}
                                      </div>
                                    </div>
                                    <p className="text-[9px] text-white/80 uppercase leading-relaxed tracking-wider break-words">{r.comment}</p>
                                    <span className="absolute bottom-2 right-2 text-[7px] text-white/20 font-mono">{new Date(r.created_at).toLocaleDateString()}</span>
                                 </div>
                               ))}
                             </div>
                          </div>
                       )}
                     </div>
                  )}
                 </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-32 border border-white/5 bg-surface/30 relative z-10 shadow-2xl backdrop-blur-sm">
               <span className="material-symbols-outlined text-6xl text-primary/20 mb-4 animate-pulse">satellite_alt</span>
               <h3 className="text-xl font-black text-white uppercase tracking-tighter">Nenhum mapa registrado</h3>
               <p className="text-white/40 text-xs tracking-widest uppercase mt-2">Nenhum sinal satélite detectado na rede global.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
