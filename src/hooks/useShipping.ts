import { useState } from 'react';

export interface ShippingOption {
  id: number;
  name: string;
  company: string;
  logo: string;
  price: number;
  delivery_time: number;
}

export function useShipping() {
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<ShippingOption | null>(null);

  const calculateShipping = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setError('CEP inválido. Digite 8 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);
    setOptions([]);
    setSelectedOption(null);

    try {
      // Em desenvolvimento usa o proxy local (Vite). Em produção usa a Edge Function do Supabase.
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const shippingUrl = isDev
        ? '/api/shipping'
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shipping-calculate`;

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (!isDev) headers['apikey'] = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(shippingUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ to: cleanCep }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (data.options?.length > 0) {
        setOptions(data.options);
        setSelectedOption(data.options[0]); // select cheapest by default
      } else {
        setError('Nenhuma opção de frete disponível para este CEP.');
      }
    } catch (err) {
      setError('Erro ao calcular frete. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const lookupCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    try {
      const cepUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cep-lookup?cep=${cleanCep}`;

      const response = await fetch(cepUrl, {
        method: 'GET',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });

      // Se a Edge Function falhar (404 ou erro), usamos o fallback ViaCEP para efeito em tempo real
      if (!response.ok) {
        console.warn('[useShipping] Edge Function não respondeu. Ativando fallback ViaCEP...');
        const fallbackResp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const viaData = await fallbackResp.json();
        
        if (viaData.erro) return null;
        
        return {
          street: viaData.logradouro,
          district: viaData.bairro,
          city: viaData.localidade,
          state: viaData.uf
        };
      }
      
      return await response.json();
    } catch (err) {
      console.error('[useShipping] Erro ao consultar CEP. Tentando fallback ViaCEP...', err);
      try {
        const fallbackResp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const viaData = await fallbackResp.json();
        if (viaData.erro) return null;
        return {
          street: viaData.logradouro,
          district: viaData.bairro,
          city: viaData.localidade,
          state: viaData.uf
        };
      } catch (fErr) {
        return null;
      }
    }
  };

  return { options, loading, error, selectedOption, setSelectedOption, calculateShipping, lookupCep };
}
