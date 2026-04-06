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
