import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PricingConfig {
  dollarRate: number;
  tax_importer: number; // 25%
  tax_admin: number; // 25%
  tax_nf: number; // 3%
}

interface PricingContextType {
  config: PricingConfig;
  updateConfig: (newConfig: Partial<PricingConfig>) => void;
  calculateFinalPrice: (usdPrice: number, overrides?: Partial<PricingConfig>) => number;
  getEffectiveRate: () => number;
}

const DEFAULT_CONFIG: PricingConfig = {
  dollarRate: 5.70,
  tax_importer: 25,
  tax_admin: 25,
  tax_nf: 3
};

const DOLLAR_MARKUP = 0.50; // Margem operacional fixa adicionada à cotação do dia

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PricingConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    // Carregar do Banco de Dados na inicialização
    const loadConfig = async () => {
      const { data, error } = await supabase.from('admin_config').select('*').eq('id', 'global').single();
      if (!error && data) {
        setConfig({
          dollarRate: Number(data.dollar_rate),
          tax_importer: Number(data.tax_importer),
          tax_admin: Number(data.tax_admin),
          tax_nf: Number(data.tax_nf)
        });
      }
    };
    loadConfig();

    // Inscrição em Tempo Real para mudanças na nuvem
    const channel = supabase.channel('admin_config_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_config' }, payload => {
        const data = payload.new;
        setConfig({
          dollarRate: Number(data.dollar_rate),
          tax_importer: Number(data.tax_importer),
          tax_admin: Number(data.tax_admin),
          tax_nf: Number(data.tax_nf)
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateConfig = async (newConfig: Partial<PricingConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    
    // Persistir no Banco de Dados
    await supabase.from('admin_config').update({
      dollar_rate: updated.dollarRate,
      tax_importer: updated.tax_importer,
      tax_admin: updated.tax_admin,
      tax_nf: updated.tax_nf,
      updated_at: new Date().toISOString()
    }).eq('id', 'global');
  };

  const calculateFinalPrice = (usdPrice: number, overrides?: Partial<PricingConfig>) => {
    const activeConfig = { ...config, ...overrides };
    // Sempre aplica a margem operacional de +0,50 sobre a cotação base
    const operationalRate = activeConfig.dollarRate + DOLLAR_MARKUP;
    // 1. Conversão Base (USD * Dólar Operacional)
    const base = usdPrice * operationalRate;
    // 2. Taxa do Importador (compounding)
    const withImporter = base * (1 + activeConfig.tax_importer / 100);
    // 3. Taxa do Adm (compounding)
    const withAdmin = withImporter * (1 + activeConfig.tax_admin / 100);
    // 4. Taxa da Nota Fiscal (final)
    const Final = withAdmin * (1 + activeConfig.tax_nf / 100);

    return Final;
  };

  const getEffectiveRate = () => {
    // Dólar operacional = cotação real + margem R$0,50
    return config.dollarRate + DOLLAR_MARKUP;
  };

  return (
    <PricingContext.Provider value={{ config, updateConfig, calculateFinalPrice, getEffectiveRate }}>
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing() {
  const context = useContext(PricingContext);
  if (!context) throw new Error('usePricing must be used within PricingProvider');
  return context;
}
