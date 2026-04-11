import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database';
import { useCategories } from '../../hooks/useProducts';
import { scrapeProduct } from '../../services/firecrawl';
import { usePricing } from '../../context/PricingContext';
import { useBrands, ensureBrandExists, ensureCategoryExists } from '../../hooks/useBrands';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
};

const autoClassify = (name: string, desc: string) => {
  const text = (name + ' ' + desc).toLowerCase();
  
  let wType = 'Acessório';
  if (text.includes('revolver') || text.includes('revólver')) wType = 'Pistola Revólver';
  else if (text.includes('aep') || text.includes('elétrica')) wType = 'Pistola Elétrica';
  else if (text.includes('co2')) wType = 'Pistolas CO2';
  else if (text.includes('gbb') || text.includes('gás')) {
    if (text.includes('rifle') || text.includes('m4') || text.includes('ak')) wType = 'Rifles GBB';
    else wType = 'Pistolas a Gás';
  }
  else if (text.includes('sniper')) wType = 'Sniper';
  else if (text.includes('shotgun') || text.includes('escopeta') || text.includes('pump')) wType = 'Shotguns';
  else if (text.includes('smg') || text.includes('submetralhadora') || text.includes('mp5') || text.includes('kriss')) wType = 'SMG';
  else if (text.includes('lmg') || text.includes('m249') || text.includes('mk46')) wType = 'LMG';
  else if (text.includes('assault') || text.includes('aeg') || text.includes('m4') || text.includes('ak47')) wType = 'Rifles de Assault';
  else if (text.includes('pistola')) wType = 'Pistolas a Gás';
  else if (text.includes('rifle')) wType = 'Rifles de Assault';

  // Extract model ignoring common brand strings
  const words = name.split(' ');
  const knownBrands = ['g&g', 'vfc', 'tokyo', 'marui', 'krytac', 'lancer', 'tactical', 'cybergun', 'rossi', 'ares', 'kwa', 'cyma', 'we', 'armament', 'classic', 'army'];
  let model = words.filter(w => !knownBrands.includes(w.toLowerCase())).slice(0, 3).join(' ');

  return { wType, model: model || 'Modelo: N/D' };
};

export function AdminProducts() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const { categories } = useCategories();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const { config, updateConfig, calculateFinalPrice } = usePricing();

  const initialForm = {
    name: '', 
    brand: 'G&G Armament', 
    price: '', 
    category_id: '', 
    image_url: '', 
    description: '', 
    system: 'Eletrica (AEG)', 
    condition: 'novo' as const, 
    specs: {}, 
    usd_price: '',
    tax_importer: 25,
    tax_admin: 25,
    tax_nf: 3,
    source_url: '',
    is_available: true,
    stock: 10,
    images: [] as string[]
  };

  const [form, setForm] = useState(initialForm);
  const [uploading, setUploading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [firecrawlUrl, setFirecrawlUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { brands: dbBrands } = useBrands();

  useEffect(() => {
    fetchData();
    if (searchParams.get('action') === 'new') {
      setShowForm(true);
    }
  }, [searchParams]);

  // Cálculo em Tempo Real
  useEffect(() => {
    if (form.usd_price) {
      const usd = parseFloat(form.usd_price);
      if (!isNaN(usd)) {
        const overrides = {
          tax_importer: form.tax_importer,
          tax_admin: form.tax_admin,
          tax_nf: form.tax_nf
        };
        const final = calculateFinalPrice(usd, overrides).toFixed(2);
        if (final !== form.price) {
          setForm(prev => ({ ...prev, price: final }));
        }
      }
    }
  }, [form.usd_price, form.tax_importer, form.tax_admin, form.tax_nf, config.dollarRate]);

  // Seleciona a primeira categoria por padrão para evitar erro de UUID: ""
  useEffect(() => {
    if (categories.length > 0 && !form.category_id) {
      setForm(prev => ({ ...prev, category_id: categories[0].id }));
    }
  }, [categories, form.category_id]);

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error) setProducts(data || []);
    setLoading(false);
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => setImagePreview(event.target?.result as string);
      reader.readAsDataURL(file);

      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(resolve => img.onload = resolve);
      
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.8));
      if (!blob) throw new Error('Falha na compressão');

      const fileName = `${Date.now()}-${file.name.replace(/\.[^/.]+$/, "")}.webp`;
      const { data, error } = await supabase.storage.from('products').upload(fileName, blob);
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(data.path);
      setForm(f => ({ ...f, image_url: publicUrl }));
    } catch (err: any) {
      alert('Falha no upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image_url) return alert('Carregue a imagem primeiro!');
    if (!form.category_id) return alert('Selecione uma categoria válida!');
    setLoading(true);

    // Auto-register brand in DB (fire and forget — won't block save)
    if (form.brand) ensureBrandExists(form.brand).catch(() => {});

    const classification = autoClassify(form.name, form.description);

    const productData = {
      ...form,
      price: parseFloat(form.price),
      usd_price: form.usd_price ? parseFloat(form.usd_price) : null,
      stock: parseInt(form.stock as any, 10),
      slug: form.name.toLowerCase().replace(/ /g, '-'),
      images: form.images, // Adicionado para persistência
      specs: {
        ...form.specs,
        model: classification.model,
        weapon_type: classification.wType
      }
    };

    const { error } = editingId 
      ? await supabase.from('products').update(productData).eq('id', editingId)
      : await supabase.from('products').insert([productData]);
    
    if (error) alert('Erro ao processar: ' + error.message);
    else {
      setShowForm(false);
      setEditingId(null);
      setForm(initialForm);
      setImagePreview(null);
      fetchData();
    }
    setLoading(false);
  };

  const handleEdit = (p: Product) => {
    setForm({
      name: p.name,
      brand: p.brand || 'G&G Armament',
      price: String(p.price),
      category_id: p.category_id || '',
      image_url: p.image_url || '',
      description: p.description || '',
      system: (p as any).system || 'Eletrica (AEG)',
      condition: (p as any).condition || 'novo',
      specs: (p as any).specs || {},
      usd_price: (p as any).usd_price ? String((p as any).usd_price) : '',
      tax_importer: (p as any).tax_importer || config.tax_importer,
      tax_admin: (p as any).tax_admin || config.tax_admin,
      tax_nf: (p as any).tax_nf || config.tax_nf,
      source_url: (p as any).source_url || '',
      is_available: (p as any).is_available ?? true,
      stock: p.stock ?? 10,
      images: p.images || [] // Corrigido erro de lint: adicionado campo images
    });
    setEditingId(p.id);
    setImagePreview(p.image_url || null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este item do arsenal?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchData();
  };

  const handleFirecrawlImport = async () => {
    if (!firecrawlUrl) return alert('Insira a URL do produto!');
    setScraping(true);
    try {
      const result = await scrapeProduct(firecrawlUrl);
      if (result?.success && result.data.json) {
        const p = result.data.json;
        const finalPrice = p.price ? calculateFinalPrice(p.price).toFixed(2) : form.price;
        const scrapedName = (p.name as string) || form.name;
        const scrapedDesc = (p.description as string) || form.description;
        const scrapedBrand = (p.brand as string) || form.brand;

        // Auto-classify to detect category
        const { wType } = autoClassify(scrapedName, scrapedDesc);

        // Register brand + ensure category exist in parallel (silent)
        const [, categoryId] = await Promise.all([
          scrapedBrand ? ensureBrandExists(scrapedBrand).catch(() => null) : Promise.resolve(null),
          ensureCategoryExists(wType).catch(() => null)
        ]);

        setForm(f => ({
          ...f,
          name: scrapedName,
          price: finalPrice,
          usd_price: p.price ? String(p.price) : f.usd_price,
          brand: scrapedBrand,
          description: scrapedDesc,
          image_url: (p.image_url as string) || f.image_url,
          images: (p.images as string[]) || [(p.image_url as string)],
          source_url: firecrawlUrl,
          ...(categoryId ? { category_id: categoryId } : {})
        }));
        if (p.image_url) setImagePreview(p.image_url as string);
        alert('Nossa IA Ghost atualizou o banco de dados');
      } else {
        alert('Falha na extração inteligente.');
      }
    } catch (err) {
      alert('Falha na comunicação com o Firecrawl.');
    } finally {
      setScraping(false);
    }
  };

  const handleGlobalSync = async () => {
    if (!confirm(`Sincronizar todo o arsenal com o dólar a R$ ${config.dollarRate.toFixed(2)}?`)) return;
    setLoading(true);
    try {
      const updates = products.map(async (p) => {
        let isAvailable = (p as any).is_available ?? true;
        let newPrice = p.price;
        let usdPrice = (p as any).usd_price;

        // Se tiver URL de origem, verifica disponibilidade e atualiza preço
        if ((p as any).source_url) {
          try {
            const result = await scrapeProduct((p as any).source_url);
            if (result?.success && result.data.json) {
              const freshData = result.data.json;
              isAvailable = true; // Se o link abriu e trouxe dado, está disponível
              if (freshData.price) usdPrice = freshData.price;
            } else {
              isAvailable = false; // Link quebrado ou falha na extração
            }
          } catch (e) {
             isAvailable = false;
          }
        }

        const overrides = {
          tax_importer: (p as any).tax_importer,
          tax_admin: (p as any).tax_admin,
          tax_nf: (p as any).tax_nf
        };
        
        if (usdPrice) {
          newPrice = parseFloat(calculateFinalPrice(usdPrice, overrides).toFixed(2));
        }

        return supabase.from('products').update({ 
          price: newPrice,
          usd_price: usdPrice,
          is_available: isAvailable,
          last_synced_at: new Date().toISOString()
        }).eq('id', p.id);
      });
      await Promise.all(updates);
      alert('Sincronização concluída!');
      fetchData();
    } catch (err) {
      alert('Erro na sincronização global.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Arsenal (Produtos)</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Controle de Estoque e Precificação</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} 
                className="bg-primary text-background-dark font-black py-3 px-6 uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2">
          {showForm ? 'Fechar' : 'Novo Item'}<span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
        </button>
      </div>

      {showForm && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Settings Panel */}
          <div className="bg-surface border border-primary/20 p-4 space-y-4 rounded-sm shadow-xl">
            <div className="flex justify-between items-center bg-primary/5 p-3 border-b border-primary/10">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">settings_suggest</span> Painel de Taxas de Importação
              </h3>
              <button type="button" onClick={handleGlobalSync}
                className="bg-primary text-background-dark px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">sync</span> Sincronizar Arsenal (4:30 AM)
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Dólar do Dia (R$)</label>
                <input type="number" step="0.01" value={config.dollarRate} onChange={e => updateConfig({ dollarRate: parseFloat(e.target.value) })}
                       className="w-full bg-background-dark border border-white/10 px-3 py-2 text-xs font-black text-white outline-none focus:border-primary/50"/>
              </div>
              <div className="space-y-1">
                <label className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Taxa do Importador (%)</label>
                <input type="number" value={config.tax_importer} onChange={e => updateConfig({ tax_importer: parseFloat(e.target.value) })}
                       className="w-full bg-background-dark border border-white/10 px-3 py-2 text-xs font-black text-white outline-none focus:border-primary/50"/>
              </div>
              <div className="space-y-1">
                <label className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Taxa do Adm (%)</label>
                <input type="number" value={config.tax_admin} onChange={e => updateConfig({ tax_admin: parseFloat(e.target.value) })}
                       className="w-full bg-background-dark border border-white/10 px-3 py-2 text-xs font-black text-white outline-none focus:border-primary/50"/>
              </div>
              <div className="space-y-1">
                <label className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Taxa da Nota Fiscal (%)</label>
                <input type="number" value={config.tax_nf} onChange={e => updateConfig({ tax_nf: parseFloat(e.target.value) })}
                       className="w-full bg-background-dark border border-white/10 px-3 py-2 text-xs font-black text-white outline-none focus:border-primary/50"/>
              </div>
            </div>
            
            <div className="pt-2 flex justify-end">
               <div className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                 Dólar Base: <span className="text-primary italic">R$ {config.dollarRate.toFixed(2)}</span>
               </div>
            </div>
          </div>
          
          {/* Firecrawl Section */}
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-sm">
            <div className="flex gap-2">
              <input value={firecrawlUrl} onChange={e => setFirecrawlUrl(e.target.value)}
                placeholder="URL ARSENAL SPORTS..." 
                className="flex-1 bg-background-dark border border-primary/10 p-3 text-[10px] text-white focus:border-primary outline-none uppercase tracking-widest"
              />
              <button type="button" onClick={handleFirecrawlImport} disabled={scraping}
                className="bg-primary text-black font-black px-6 text-[10px] uppercase tracking-widest hover:bg-white disabled:opacity-50 transition-all"
              >
                {scraping ? 'Analisando...' : 'Extrair'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-surface border border-primary/30 p-6 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-sm shadow-2xl">
            <div className="md:col-span-2 text-xs font-bold text-primary uppercase border-b border-primary/20 pb-2 mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">inventory_2</span> 
                {editingId ? 'Editar Equipamento do Arsenal' : 'Ficha Técnica do Equipamento'}
              </div>
              {editingId && <span className="text-[8px] bg-primary/20 px-2 py-0.5 tracking-widest">ID: {editingId.slice(0,8)}...</span>}
            </div>
            
            <input placeholder="NOME DO EQUIPAMENTO" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} 
                   className="bg-background-dark border border-white/5 p-3 text-xs text-white uppercase outline-none focus:border-primary/40"/>
            
            <input
              list="brands-list"
              placeholder="MARCA"
              value={form.brand}
              onChange={e => setForm({...form, brand: e.target.value})}
              className="bg-background-dark border border-white/5 p-3 text-xs text-white uppercase font-bold outline-none focus:border-primary/40"
            />
            <datalist id="brands-list">
              {dbBrands.map(b => <option key={b.id} value={b.name} />)}
            </datalist>

            <div className="grid grid-cols-3 gap-2">
              <input placeholder="VALOR ESTIMADO (R$)" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} 
                     className="bg-background-dark border border-white/5 p-3 text-xs text-primary font-black outline-none focus:border-primary/40"/>
              <input placeholder="CUSTO USD" value={form.usd_price} onChange={e => setForm({...form, usd_price: e.target.value})} 
                     className="bg-background-dark border border-white/5 p-3 text-xs text-white outline-none focus:border-primary/40"/>
              <input type="number" placeholder="ESTOQUE" required value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value, 10)})} 
                     className="bg-background-dark border border-white/5 p-3 text-xs text-white font-black outline-none focus:border-primary/40"/>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[7px] text-slate-500 font-bold uppercase tracking-widest px-1">Taxa Importador (%)</label>
                <input type="number" value={form.tax_importer} onChange={e => setForm({...form, tax_importer: parseFloat(e.target.value)})} 
                       className="w-full bg-background-dark border border-white/5 p-3 text-xs text-white outline-none focus:border-primary/40"/>
              </div>
              <div className="space-y-1">
                <label className="text-[7px] text-slate-500 font-bold uppercase tracking-widest px-1">Taxa Adm (%)</label>
                <input type="number" value={form.tax_admin} onChange={e => setForm({...form, tax_admin: parseFloat(e.target.value)})} 
                       className="w-full bg-background-dark border border-white/5 p-3 text-xs text-white outline-none focus:border-primary/40"/>
              </div>
              <div className="space-y-1">
                <label className="text-[7px] text-slate-500 font-bold uppercase tracking-widest px-1">Taxa NF (%)</label>
                <input type="number" value={form.tax_nf} onChange={e => setForm({...form, tax_nf: parseFloat(e.target.value)})} 
                       className="w-full bg-background-dark border border-white/5 p-3 text-xs text-white outline-none focus:border-primary/40"/>
              </div>
            </div>

            <div className="md:col-span-2 bg-primary/10 border border-primary/20 p-2 text-center rounded-sm">
              <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">
                {form.usd_price ? `Cálculo Real-Time: USD $ ${form.usd_price} -> R$ ${form.price}` : 'Aguardando Custo USD...'}
              </span>
            </div>

            <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} 
                    className="bg-background-dark border border-white/5 p-3 text-xs text-white uppercase font-bold outline-none focus:border-primary/40">
              {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Upload de Imagem (WebP Otimizado)</label>
              <div className="flex gap-4">
                <label className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed transition-all cursor-pointer p-6 rounded-sm ${uploading ? 'opacity-50 border-slate-700' : 'border-primary/20 hover:border-primary hover:bg-primary/5'}`}>
                  <span className="material-symbols-outlined text-3xl text-primary mb-2">{uploading ? 'sync' : 'cloud_upload'}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{uploading ? 'Processando...' : 'Arquivos Locais'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading}/>
                </label>
                {(imagePreview || form.image_url) && (
                  <div className="w-24 h-24 border border-primary/20 rounded-sm overflow-hidden group relative">
                    <img src={imagePreview || form.image_url} alt="Preview" className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="text-[9px] font-black text-white uppercase shadow-sm">Preview</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Carrossel de Fotos Extraídas */}
              {form.images && form.images.length > 0 && (
                <div className="mt-4 space-y-2">
                  <label className="text-[8px] font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">photo_library</span> Carrossel Disponível ({form.images.length})
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-black/40 border border-white/5">
                    {form.images.map((img, idx) => (
                      <div key={idx} className={`relative size-12 border cursor-pointer hover:border-primary transition-all ${form.image_url === img ? 'border-primary' : 'border-white/10'}`}
                           onClick={() => setForm(f => ({ ...f, image_url: img }))}>
                        <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                        {form.image_url === img && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[10px] text-white">check</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <textarea placeholder="DESCRIÇÃO TÁTICA DO PRODUTO..." required value={form.description} 
                      onChange={e => setForm({...form, description: e.target.value})} 
                      className="bg-background-dark border border-white/5 p-3 text-xs text-white md:col-span-2 outline-none focus:border-primary/40" rows={3}></textarea>
            
            <div className="md:col-span-2 flex gap-3">
              <button type="button" onClick={() => { setForm(initialForm); setEditingId(null); setImagePreview(null); }}
                      className="bg-white/5 text-white/40 hover:text-white px-6 py-4 uppercase font-bold text-[10px] tracking-widest transition-all">
                {editingId ? 'Cancelar' : 'Resetar Link'}
              </button>
              <button className="flex-1 bg-primary text-background-dark font-black py-4 uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50" disabled={uploading || loading}>
                {uploading ? 'Processando Imagem...' : editingId ? 'Salvar Alterações' : 'Incorporar ao Arsenal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-primary font-black uppercase text-xs animate-pulse tracking-[0.3em]">Sincronizando Arsenal...</p>
        </div>
      ) : (
        <div className="bg-surface border border-primary/10 rounded-sm overflow-hidden shadow-2xl">
          <table className="w-full text-left text-[10px]">
            <thead className="bg-background-dark text-white/40 uppercase font-black border-b border-primary/10">
              <tr>
                <th className="p-4 tracking-widest">Identificação</th>
                <th className="p-4 tracking-widest">Categoria</th>
                <th className="p-4 tracking-widest">Preço Arsenal</th>
                <th className="p-4 tracking-widest text-right">Comandos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="size-10 object-cover border border-primary/10 rounded-sm"/>
                      ) : (
                        <div className="size-10 bg-background-dark flex items-center justify-center text-primary/20"><span className="material-symbols-outlined text-sm">image_not_supported</span></div>
                      )}
                      <div>
                        <p className="text-white font-bold uppercase tracking-wide">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[8px] text-primary/60 font-black uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">store</span> {p.brand} 
                            <span className="text-white/20">|</span> 
                            <span className="text-white/60">{(p as any).specs?.model || 'Auto-Model'}</span>
                            <span className="text-white/20">|</span> 
                            <span className="text-secondary">{(p as any).specs?.weapon_type || 'Auto-Type'}</span>
                          </p>
                          <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${p.stock && p.stock > 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            {p.stock && p.stock > 0 ? `Disponível (${p.stock})` : 'Esgotado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="bg-white/5 px-3 py-1 text-white/60 font-black uppercase tracking-widest text-[8px] rounded-full">
                      {categories.find(c => c.id === p.category_id)?.label || 'Sem Categoria'}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-primary font-black text-xs">{formatPrice(p.price)}</p>
                    {(p as any).usd_price && (
                      <p className="text-[8px] text-white/30 uppercase mt-0.5">Base: $ {(p as any).usd_price.toFixed(2)}</p>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(p)} className="bg-primary/10 text-primary p-2 hover:bg-primary hover:text-background-dark transition-all rounded-sm flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="bg-red-500/10 text-red-500 p-2 hover:bg-red-500 hover:text-white transition-all rounded-sm flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.length && (
            <div className="text-center py-20 text-white/20 uppercase tracking-[0.5em] font-black italic">Arsenal sem munição (Vazio)</div>
          )}
        </div>
      )}
    </div>
  );
}
