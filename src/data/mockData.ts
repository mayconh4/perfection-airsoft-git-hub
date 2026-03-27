// Mock data for the entire Perfection Airsoft e-commerce

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  oldPrice?: number;
  image: string;
  badge?: string;
  category: string;
  system?: string;
}

export const categories = [
  { slug: 'rifles', label: 'Rifles', icon: 'deployed_code' },
  { slug: 'pistolas', label: 'Pistolas', icon: 'handyman' },
  { slug: 'snipers', label: 'Snipers', icon: 'target' },
  { slug: 'acessorios', label: 'Acessórios', icon: 'build' },
  { slug: 'equipamentos', label: 'Equipamentos', icon: 'shield' },
  { slug: 'bbs', label: 'BBs & Gas', icon: 'science' },
  { slug: 'pecas', label: 'Peças', icon: 'settings' },
  { slug: 'promocoes', label: 'Promoções', icon: 'local_offer' },
];

export const products: Product[] = [
  { id: '1', name: 'M4A1 MK18 MOD 1 NGRS', brand: 'TOKYO MARUI', price: 6450, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCY1PwNb2SmrJV1Gh1UJLsczLU7V5sLxcbPQyslLwEWWzJaYzdTITtqLWTcSF9It8jxagyZ6rOF39PCJn6VedrcA2w56-XTw2E5aK_PkjSB-vk1jZv6RxFgX1aFYN90SQR59SX6IGumKQEOszB2fBIdqrt4XcL7EphFHL2qByBhhmrrW8W7iVzjorR0rTGK22TpIxdeaHMU2t3m3yj5ChJk__6rv2-vFrSgYmfI43YXdJjtcE64CjSkyyBcCt1NFPG8oX-BIFG9qg', badge: 'Destaque', category: 'rifles', system: 'AEG' },
  { id: '2', name: 'HK416 A5 AEG - RAL8000', brand: 'UMAREX / VFC', price: 4890, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvO7eSmNcSbHmNGmvwVCUgjgfWCdqaav_spARRKPyT2POA1e2iuPruDsW3a7XG1L171QcN3Bo0UboUAudTpWMjVqADw12cia_LZrvqHfNHigrKdtdRBoK8l6I3LeoYe5NicIAjPgfDPNgy1Zigj-CBWoKJwm04_dkFcQtaHt1dSG4JNwxdHRDFHxIg3jy3rfHyg7_IRqr_OUH1p2TTW6eoW-BnKsYiJD1PoehMOERwfxx0nPBP3lGOlw7V-ApWtsCMjNMK1CjnsrA', badge: 'Novo', category: 'rifles', system: 'AEG' },
  { id: '3', name: 'WARSPORT LVOA-C FDE', brand: 'KRYTAC', price: 5200, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAp92IyHep9vKntZq_uTrHOJd4D80475NEYWW0lY9xEry1Msx6lEtgIhqmzQx_sTPMub3VXYy7Oppz6VouQzOAiCjtyr4xWeBXRs4DASeF8bkGMf67KoXKYRmMoOwmQSecjIdPdBrBkI3w6dPpqyme94NiBZ80b8oYrY2vNNroXAtiPTX1_9ORr65FY7RlxGQY8Ivk4kzpa_UnlcC6lEXp5NkX9UUN1nDUXS6PPSCQTohITEyimPS9Do-BtlEwQ8VaWc9sZ7tMmi8', category: 'rifles', system: 'AEG' },
  { id: '4', name: 'AK-105 ZENTICO CUSTOM', brand: 'LCT AIRSOFT', price: 4250, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCdrN4ncmY23Zg4lHG-fiqwK60FoDalaLxu0cLL4eFelyknims58jxWxEbeSotee4ALD1_jkewmAp99ecUamm7eEDQ6-SIrnUbwIVRIS13HKlKf_9gfY81IrG11LILtZXnUEBhpnkd0SWD3-YrhVFD-QAmHXoHyNV26ZjDpEX6MiQiYcAx9CX-cqYs-uzXJwU3o59Ul1k3_7UOirYPdzzynZxWbIUGo7A-9efztk2fe2lI1n4AHjqd7hO5z2d5ZeDyNqn_z2EmQYo', category: 'rifles', system: 'AEG' },
  { id: '5', name: 'ARP9 2.0 PDW AEG', brand: 'G&G ARMAMENT', price: 2950, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCm-xJOYl15JqS-OBXk4UpWxY_jKqf0XqGyvcxHxpymk-BZtcu7e-5AM1lFCw7JSOWsgkJMnkO3q9533pO44ivsUOig6yqwP6oCJ7TqRMzN2PehwbMld26OEWiNQyiCqpMDBysEncSWfX-ZZA4y-_yeSycVyGdxc332ZfeW3qe1cXhdeFIr-gGX3X_acrh940o_rDq_FUNHAbPX1qAGJiRy7LasZIDyqTB8h0bOWXTYTRrmOQHTZeGnrHJjLKvOTj_fDAo8E039n-c', category: 'rifles', system: 'AEG' },
  { id: '6', name: 'M4A1 MWS GBBR ZET', brand: 'TOKYO MARUI', price: 8900, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-M5kcXl9yjnnDyQQ8hBboQMNIcwbrs1otGNEfKh7HKqvQvRT7rgA9xPty5YvsXRxLRBoIpMy8TqtSCQMd0pB_VDLFgAiv9V2K6qaA0ZmAngVfubbPSn0W5CSC307J0XmTt-6v83zLh0VAv7r5Z6fJO2damXNPIa8cn9hQsmTx96-FaRKOu1fYyMiAbnP30GzmfGCoQs35f7vueQ1WbGgoDjHQ3Mp3DX3M8fvvYF_6sE5QI7WIaIZvswfhQvJ_2a_IJB2bM3KJ_QM', category: 'rifles', system: 'GBB' },
  { id: '7', name: 'GLOCK 17 GEN5 MOS GBB', brand: 'TOKYO MARUI', price: 1890, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCY1PwNb2SmrJV1Gh1UJLsczLU7V5sLxcbPQyslLwEWWzJaYzdTITtqLWTcSF9It8jxagyZ6rOF39PCJn6VedrcA2w56-XTw2E5aK_PkjSB-vk1jZv6RxFgX1aFYN90SQR59SX6IGumKQEOszB2fBIdqrt4XcL7EphFHL2qByBhhmrrW8W7iVzjorR0rTGK22TpIxdeaHMU2t3m3yj5ChJk__6rv2-vFrSgYmfI43YXdJjtcE64CjSkyyBcCt1NFPG8oX-BIFG9qg', category: 'pistolas', system: 'GBB' },
  { id: '8', name: 'M40A5 BOLT ACTION', brand: 'TOKYO MARUI', price: 3500, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAp92IyHep9vKntZq_uTrHOJd4D80475NEYWW0lY9xEry1Msx6lEtgIhqmzQx_sTPMub3VXYy7Oppz6VouQzOAiCjtyr4xWeBXRs4DASeF8bkGMf67KoXKYRmMoOwmQSecjIdPdBrBkI3w6dPpqyme94NiBZ80b8oYrY2vNNroXAtiPTX1_9ORr65FY7RlxGQY8Ivk4kzpa_UnlcC6lEXp5NkX9UUN1nDUXS6PPSCQTohITEyimPS9Do-BtlEwQ8VaWc9sZ7tMmi8', category: 'snipers', system: 'Spring' },
  { id: '9', name: 'RED DOT HOLOSIGHT', brand: 'ELEMENT', price: 450, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCdrN4ncmY23Zg4lHG-fiqwK60FoDalaLxu0cLL4eFelyknims58jxWxEbeSotee4ALD1_jkewmAp99ecUamm7eEDQ6-SIrnUbwIVRIS13HKlKf_9gfY81IrG11LILtZXnUEBhpnkd0SWD3-YrhVFD-QAmHXoHyNV26ZjDpEX6MiQiYcAx9CX-cqYs-uzXJwU3o59Ul1k3_7UOirYPdzzynZxWbIUGo7A-9efztk2fe2lI1n4AHjqd7hO5z2d5ZeDyNqn_z2EmQYo', category: 'acessorios' },
  { id: '10', name: 'PLATE CARRIER TACTICAL', brand: 'EMERSON', price: 890, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvO7eSmNcSbHmNGmvwVCUgjgfWCdqaav_spARRKPyT2POA1e2iuPruDsW3a7XG1L171QcN3Bo0UboUAudTpWMjVqADw12cia_LZrvqHfNHigrKdtdRBoK8l6I3LeoYe5NicIAjPgfDPNgy1Zigj-CBWoKJwm04_dkFcQtaHt1dSG4JNwxdHRDFHxIg3jy3rfHyg7_IRqr_OUH1p2TTW6eoW-BnKsYiJD1PoehMOERwfxx0nPBP3lGOlw7V-ApWtsCMjNMK1CjnsrA', category: 'equipamentos' },
  { id: '11', name: 'BLS BBS 0.28G 3500UN', brand: 'BLS', price: 120, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCm-xJOYl15JqS-OBXk4UpWxY_jKqf0XqGyvcxHxpymk-BZtcu7e-5AM1lFCw7JSOWsgkJMnkO3q9533pO44ivsUOig6yqwP6oCJ7TqRMzN2PehwbMld26OEWiNQyiCqpMDBysEncSWfX-ZZA4y-_yeSycVyGdxc332ZfeW3qe1cXhdeFIr-gGX3X_acrh940o_rDq_FUNHAbPX1qAGJiRy7LasZIDyqTB8h0bOWXTYTRrmOQHTZeGnrHJjLKvOTj_fDAo8E039n-c', category: 'bbs' },
  { id: '12', name: 'GEARBOX V2 COMPLETA', brand: 'SHS', price: 650, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-M5kcXl9yjnnDyQQ8hBboQMNIcwbrs1otGNEfKh7HKqvQvRT7rgA9xPty5YvsXRxLRBoIpMy8TqtSCQMd0pB_VDLFgAiv9V2K6qaA0ZmAngVfubbPSn0W5CSC307J0XmTt-6v83zLh0VAv7r5Z6fJO2damXNPIa8cn9hQsmTx96-FaRKOu1fYyMiAbnP30GzmfGCoQs35f7vueQ1WbGgoDjHQ3Mp3DX3M8fvvYF_6sE5QI7WIaIZvswfhQvJ_2a_IJB2bM3KJ_QM', category: 'pecas' },
  { id: '13', name: 'M4A1 CQBR BLOCK 1 GBB', brand: 'TOKYO MARUI', price: 4299, oldPrice: 4890, badge: 'Promoção', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6ca2V_ljfg0mveleYhDIXFR_bZOjb2jgyNN_5gMXYMlccE9ufQ8-AApmQKKbjACtg4YMteP2vkpxpwnXvkCksYilqpCMTKnecgtEH1z2laA-qXVPQda4cmD05R134oHxPEtCq811_dXHbBGl6M5bWpVua09FYTMI614CF0qJl0wWmck_ZR8_r7ylYE_Ba6TOhDiz4WmwfHuYQRf9pVuWXGITxAb9MuAxenBje0vVNt-oLmrKEUjWO-iihoSB8M3JREm2Y_w0ZF0I', category: 'promocoes', system: 'GBB' },
];

export const formatPrice = (price: number) =>
  `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
