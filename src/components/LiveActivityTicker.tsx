import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Activity {
  id: string;
  user_name?: string;
  amount: number;
  type: string;
  timestamp: string;
}

export function LiveActivityTicker() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetchRecentActivity();

    // Realtime: escuta novos tickets confirmados
    const channel = supabase
      .channel('live-activity')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        (payload) => {
          if (payload.new.status === 'confirmed') {
            const newActivity: Activity = {
              id: payload.new.id,
              amount: payload.new.price_paid,
              type: 'ticket_confirmed',
              user_name: payload.new.buyer_name,
              timestamp: payload.new.created_at
            };
            setActivities(prev => [newActivity, ...prev].slice(0, 5));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchRecentActivity = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('id, price_paid, buyer_name, created_at, status')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setActivities(data.map(d => ({
        id: d.id,
        amount: d.price_paid,
        type: 'ticket_confirmed',
        user_name: d.buyer_name,
        timestamp: d.created_at
      })));
    }
  };

  if (activities.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-6 z-50 flex flex-col gap-3 pointer-events-none">
      {activities.map((activity, idx) => (
        <div 
          key={activity.id}
          className="bg-background-dark/95 border-l-2 border-primary p-4 shadow-2xl animate-in slide-in-from-left duration-500 overflow-hidden group"
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <div className="flex items-center gap-4">
             <div className="bg-primary/20 p-2">
                <span className="material-symbols-outlined text-primary text-sm animate-pulse">
                  {activity.type === 'fee_platform' ? 'security' : 'shopping_cart'}
                </span>
             </div>
             <div>
                 <span className="text-[10px] text-white font-black uppercase tracking-widest block">
                   {activity.user_name || 'Operador'} — Ingresso Confirmado
                 </span>
                 <span className="text-[9px] text-primary font-mono uppercase">
                    R$ {(activity.amount || 0).toFixed(2)} // {new Date(activity.timestamp).toLocaleTimeString()}
                 </span>
             </div>
          </div>
          
          {/* Scanline Effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-1 opacity-20 animate-scan" />
        </div>
      ))}
    </div>
  );
}
