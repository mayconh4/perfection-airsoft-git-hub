/**
 * Numerologia de preços — Raiz Digital
 * Soma os dígitos do número recursivamente até obter 1 dígito (1-9).
 * Exemplo: 1727 → 1+7+2+7 = 17 → 1+7 = 8 (vibração da abundância)
 */
export function digitalRoot(n: number): number {
  const sum = Math.round(n).toString().split('').reduce((s, d) => s + parseInt(d), 0);
  return sum >= 10 ? digitalRoot(sum) : sum;
}

/**
 * Precificação numerológica — ajusta o preço para raiz digital 8 (abundância).
 */
export function numerologyPrice(price: number): number {
  if (!price || price <= 0) return 0;
  const base = Math.floor(price / 10) * 10;
  for (let offset = 0; offset <= 17; offset++) {
    if (digitalRoot(base + offset) === 8) return base + offset;
  }
  return base + 9;
}

/**
 * Gera slug limpo para produto: remove acentos, caracteres especiais,
 * converte espaços em hífens e adiciona sufixo curto único.
 */
export function generateProductSlug(name: string): string {
  const shortId = Date.now().toString(36).slice(-5);
  const base = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 55)
    .replace(/-$/, '');
  return `${base}-${shortId}`;
}

/**
 * Normaliza chave de spec para um label amigável em PT-BR.
 */
function prettifySpecLabel(key: string): string {
  const map: Record<string, string> = {
    sku: 'SKU',
    fps: 'FPS',
    bbs: 'Calibre',
    calibre: 'Calibre',
    peso: 'Peso',
    weight: 'Peso',
    cano: 'Cano',
    barrel: 'Cano',
    rosca: 'Rosca',
    thread: 'Rosca',
    gearbox: 'Gearbox',
    motor: 'Motor',
    magazine: 'Capacidade Magazine',
    capacidade_do_magazine: 'Capacidade Magazine',
    'capacidade do magazine': 'Capacidade Magazine',
    blowback: 'Blowback',
    'modos de disparo': 'Modos',
    'modos de tiro': 'Modos',
    modos: 'Modos',
    'hop-up': 'Hop-Up',
    hop_up: 'Hop-Up',
    hopup: 'Hop-Up',
    material: 'Material',
    comprimento: 'Comprimento',
    length: 'Comprimento',
    marca: 'Marca',
    brand: 'Marca',
    sistema: 'Sistema',
    system: 'Sistema',
    tipo: 'Tipo',
    type: 'Tipo',
  };
  const k = key.toLowerCase().trim();
  if (map[k]) return map[k];
  // Title-case fallback
  return key
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '')
    .join(' ')
    .trim();
}

/**
 * Gera descrição tática para produto de airsoft a partir dos dados raspados.
 * Combina texto narrativo com bloco de specs detectados/estimados.
 * Quando recebe `specifications` ou `features` estruturados, usa-os para enriquecer
 * a descrição (em vez de inferir tudo via regex).
 */
export function generateTacticalDescription(
  name: string,
  brand: string,
  rawDesc: string,
  system: string,
  specifications?: Record<string, string> | null,
  externalFeatures?: string[] | null,
  internalFeatures?: string[] | null
): string {
  const text = (name + ' ' + rawDesc).toLowerCase();
  const specs = specifications || {};
  const specLookup = (...keys: string[]): string | null => {
    const lower: Record<string, string> = {};
    Object.keys(specs).forEach(k => { lower[k.toLowerCase().trim()] = String(specs[k]); });
    for (const k of keys) {
      const v = lower[k.toLowerCase()];
      if (v && v.trim()) return v.trim();
    }
    return null;
  };

  // Tipo / sistema (prioriza spec estruturada)
  let tipo = specLookup('tipo', 'type', 'sistema', 'system') || 'AEG (Elétrica)';
  if (!specLookup('tipo', 'type', 'sistema', 'system')) {
    const s = (system || '').toLowerCase();
    if (s.includes('gbb') || s.includes('gas') || text.includes('gas blowback') || text.includes('gás blowback'))
      tipo = 'GBB (Gás Blowback)';
    else if (s.includes('co2') || text.includes('co2'))
      tipo = 'CO2';
    else if (s.includes('spring') || text.includes('spring') || text.includes(' mola'))
      tipo = 'Spring (Mola)';
    else if (s.includes('hpa') || text.includes('hpa'))
      tipo = 'HPA (Alta Pressão)';
  }

  // FPS
  let fps: string;
  const fpsSpec = specLookup('fps', 'velocidade');
  if (fpsSpec) {
    fps = fpsSpec.match(/\d/) && !/\(/.test(fpsSpec) ? `${fpsSpec} (0.20g)` : fpsSpec;
  } else {
    const fpsRange = rawDesc.match(/(\d{3,4})\s*[-–]\s*(\d{3,4})\s*(?:fps|FPS)/i);
    const fpsSingle = rawDesc.match(/(\d{3,4})\s*(?:fps|FPS)/i);
    if (fpsRange) fps = `~${fpsRange[1]}–${fpsRange[2]} (0.20g)`;
    else if (fpsSingle) fps = `~${fpsSingle[1]} (0.20g)`;
    else if (text.includes('sniper')) fps = '~400–500 (0.20g)';
    else if (tipo.includes('GBB')) fps = '~310–380 (0.20g)';
    else if (tipo.includes('CO2')) fps = '~380–430 (0.20g)';
    else fps = '~350–400 (0.20g)';
  }

  // Modos de disparo
  let modos = specLookup('modos', 'modos de disparo', 'modos de tiro', 'fire modes') || 'Semi / Full';
  if (!specLookup('modos', 'modos de disparo', 'modos de tiro', 'fire modes')) {
    if (tipo.includes('Spring') || text.includes('sniper')) modos = 'Single';
    else if (text.includes('burst') || text.includes('rajada')) modos = 'Semi / Burst / Full';
    else if (tipo.includes('GBB') && (text.includes('pistol') || text.includes('pistola'))) modos = 'Semi';
  }

  // Cano
  const barrelSpec = specLookup('cano', 'barrel', 'cano interno', 'inner barrel');
  let barrel: string;
  if (barrelSpec) {
    barrel = barrelSpec;
  } else {
    const barrelMatch = rawDesc.match(/(\d{2,3})\s*mm\s*[/|]\s*(\d+\.\d+)\s*mm/i)
      || rawDesc.match(/barrel[:\s]+(\d{2,3})\s*mm/i);
    barrel = barrelMatch ? `~${barrelMatch[0]}` : (text.includes('pistol') || text.includes('pistola') ? '~90 mm' : '~455 mm / 6.03 mm');
  }

  // Gearbox
  let gearbox = specLookup('gearbox') || '';
  if (!gearbox) {
    const gbMatch = rawDesc.match(/[Gg]ear\s*[Bb]ox\s*[Vv](\d)/i) || rawDesc.match(/[Vv](\d)\s*[Gg]ear/i);
    if (gbMatch) gearbox = `V${gbMatch[1]}`;
    else if (tipo.includes('AEG')) gearbox = (text.includes(' ak') || text.includes('p90') || text.includes('g36')) ? 'V3' : 'V2';
  }

  // Rosca
  let rosca = specLookup('rosca', 'thread') || '14mm CCW';
  if (!specLookup('rosca', 'thread')) {
    if (text.includes('14mm cw') || text.includes('14 cw')) rosca = '14mm CW';
    else if (text.includes('11mm') || text.includes('11 mm')) rosca = '11mm CW';
  }

  // Peso
  let peso: string;
  const pesoSpec = specLookup('peso', 'weight');
  if (pesoSpec) {
    peso = pesoSpec;
  } else {
    const kgMatch = rawDesc.match(/(\d+[.,]\d{1,3})\s*kg/i);
    const gMatch = rawDesc.match(/(\d{3,4})\s*g(?:rams?|ramas?)?\b/i);
    if (kgMatch) peso = `~${kgMatch[1].replace(',', '.')} kg`;
    else if (gMatch) peso = `~${(parseInt(gMatch[1]) / 1000).toFixed(1)} kg`;
    else peso = (text.includes('pistol') || text.includes('pistola')) ? '~0.8 – 1.2 kg' : '~2.0 – 2.8 kg';
  }

  // Material
  let material = specLookup('material') || 'Polímero reforçado + partes metálicas';
  if (!specLookup('material')) {
    if (text.includes('full metal') || text.includes('metal body')) material = 'Full Metal';
    else if (text.includes('nylon fiber') || text.includes('fibra de nylon')) material = 'Nylon reforçado + partes metálicas';
  }

  // Capacidade do magazine (extra)
  const magCap = specLookup('magazine', 'capacidade do magazine', 'capacidade_do_magazine', 'capacidade');
  // Motor (extra para AEG)
  const motor = specLookup('motor');
  // Hop-up
  const hopup = specLookup('hop-up', 'hop_up', 'hopup');
  // Comprimento
  const comprimento = specLookup('comprimento', 'length');

  // Texto narrativo completo (sem cortar frases)
  let narrative = rawDesc?.trim() || '';
  // Remove o rodapé padrão do fabricante/loja se presente
  narrative = narrative
    .replace(/\*?As descrições e especificações dos produtos são de responsabilidade[\s\S]*$/i, '')
    .replace(/\*?As especificações são de responsabilidade[\s\S]*$/i, '')
    .trim();
  if (!narrative) narrative = `${name}${brand ? ` — ${brand}` : ''} — equipamento tático de alta performance para uso profissional em campo.`;

  // Se temos especificações estruturadas do Firecrawl, exibimos elas diretamente no formato original
  // (mais fiel ao fabricante) e omitimos o bloco gerado por heurística
  let specBlock: string;
  const hasStructuredSpecs = specifications && Object.keys(specifications).length > 0;

  if (hasStructuredSpecs) {
    // Exibe specs reais na ordem que chegaram
    specBlock = 'Especificações:\n' + Object.entries(specs)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `${prettifySpecLabel(k)}: ${String(v).trim()}`)
      .join('\n');
  } else {
    // Fallback: spec block gerado por heurística
    const specLines: string[] = [
      `Tipo: ${tipo} | Calibre: 6mm BB`,
      `FPS: ${fps} | Modos: ${modos}`,
      `Cano: ${barrel} | Alcance: ~40–50 m`,
      gearbox ? `Gearbox: ${gearbox} | Rosca: ${rosca}` : `Rosca: ${rosca}`,
      `Peso: ${peso}`,
      `Material: ${material}`,
    ];
    if (magCap) specLines.push(`Magazine: ${magCap}`);
    if (motor) specLines.push(`Motor: ${motor}`);
    if (hopup) specLines.push(`Hop-Up: ${hopup}`);
    if (comprimento) specLines.push(`Comprimento: ${comprimento}`);

    const usedKeys = new Set([
      'tipo', 'type', 'sistema', 'system', 'fps', 'velocidade',
      'modos', 'modos de disparo', 'modos de tiro', 'fire modes',
      'cano', 'barrel', 'cano interno', 'inner barrel',
      'gearbox', 'rosca', 'thread', 'peso', 'weight', 'material',
      'magazine', 'capacidade do magazine', 'capacidade_do_magazine', 'capacidade',
      'motor', 'hop-up', 'hop_up', 'hopup', 'comprimento', 'length',
      'marca', 'brand',
    ]);
    Object.entries(specs).forEach(([k, v]) => {
      if (!v || !String(v).trim()) return;
      if (usedKeys.has(k.toLowerCase().trim())) return;
      specLines.push(`${prettifySpecLabel(k)}: ${String(v).trim()}`);
    });
    specBlock = specLines.join('\n');
  }

  // Blocos de features (externas / internas)
  const ext = (externalFeatures || []).filter(f => f && f.trim());
  const int = (internalFeatures || []).filter(f => f && f.trim());
  const featureBlocks: string[] = [];
  if (ext.length) {
    featureBlocks.push('CARACTERÍSTICAS EXTERNAS:\n' + ext.map(f => `• ${f.trim()}`).join('\n'));
  }
  if (int.length) {
    featureBlocks.push('CARACTERÍSTICAS INTERNAS:\n' + int.map(f => `• ${f.trim()}`).join('\n'));
  }

  const parts = [narrative, specBlock];
  if (featureBlocks.length) parts.push(featureBlocks.join('\n\n'));
  return parts.join('\n\n');
}

/**
 * Gera um código de operação tático curto e memorável (8 caracteres + separadores)
 * a partir de um UUID. Formato: XX-ABC-XXX
 */
export function getTacticalCode(uuid: string): string {
  if (!uuid) return '00-OPS-000';
  
  // Remove hifens e foca na primeira parte do UUID
  const hash = uuid.replace(/-/g, '').toUpperCase();
  
  // Parte 1: 2 primeiros dígitos
  let p1 = hash.slice(0, 2);
  
  // Parte 2: 3 letras (converte números para letras se necessário para garantir o visual)
  let p2 = hash.slice(2, 5).split('').map(char => {
    if (/[0-9]/.test(char)) {
      // Converte 0-9 para letras A-J (ou variações táticas)
      const tacticalLetters = ['X', 'T', 'O', 'P', 'R', 'S', 'B', 'W', 'M', 'Q'];
      return tacticalLetters[parseInt(char)];
    }
    return char;
  }).join('');
  
  // Parte 3: 3 últimos dígitos do bloco
  let p3 = hash.slice(5, 8);
  
  return `${p1}-${p2}-${p3}`;
}

/**
 * Formata um timestamp para o padrão militar consolidado
 */
export function formatTacticalTimestamp(date: string | Date): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const time = d.toTimeString().split(' ')[0];
  return `${day}/${month}/${year} - ${time}`;
}
