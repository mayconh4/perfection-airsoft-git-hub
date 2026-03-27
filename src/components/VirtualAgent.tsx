import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

export function VirtualAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: 'Olá Operador. Aqui é o Ghost. Perímetro assegurado. Como posso orientar sua navegação hoje?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: `Minha Rede Neural está em modo de recepção passiva. Para suporte imediato ou dúvidas técnicas, ative a conexão direta via WhatsApp com nossa base de comando.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
      
      // Add the contact button message
      setTimeout(() => {
        const contactMsg: Message = {
          id: `msg-${Date.now() + 2}`,
          sender: 'ai',
          text: `[CONEXÃO DIRETA DISPONÍVEL]`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, contactMsg]);
      }, 500);
    }, 1500);
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.text === '[CONEXÃO DIRETA DISPONÍVEL]') {
      return (
        <a 
          href={`https://wa.me/5537991065120?text=${encodeURIComponent('Olá! Preciso de ajuda com um equipamento.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-sm font-black text-[9px] uppercase tracking-widest hover:bg-white hover:text-[#25D366] transition-all shadow-[0_0_15px_rgba(37,211,102,0.3)] group/wa"
        >
          <svg viewBox="0 0 24 24" className="size-4 fill-current group-hover/wa:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Chamar no WhatsApp
        </a>
      );
    }
    return <p className="font-bold">{msg.text}</p>;
  };

  return (
    <>
      <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 transition-all duration-300 ${isOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
        <div className="w-[280px] sm:w-[320px] h-[350px] sm:h-[400px] bg-background-dark/95 backdrop-blur-xl border border-primary/30 flex flex-col overflow-hidden shadow-[0_0_30px_rgba(255,193,7,0.15)] rounded-t-xl rounded-bl-xl">
          {/* Header */}
          <div className="bg-[#10100c] border-b border-primary/20 p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="size-8 drop-shadow-[0_0_5px_rgba(255,193,7,0.8)]">
                  <img src="/mask-branca.webp" alt="Ghost" className="w-full h-full object-contain" />
                </div>
                <div className="absolute -bottom-1 -right-1 size-3 bg-green-500 rounded-full border border-background-dark animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">GHOST</span>
                <span className="text-[8px] text-green-500 font-mono tracking-widest uppercase opacity-80">Na Escuta // Online</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar relative">
             <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:100%_4px] pointer-events-none z-0"></div>
             
             {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} relative z-10 animate-fade-in`}>
                  <div className={`max-w-[85%] p-3 rounded-lg text-[11px] uppercase tracking-wider leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-primary text-black rounded-br-none shadow-[0_0_15px_rgba(255,193,7,0.2)]' 
                      : 'bg-surface/80 text-white/80 border border-white/10 rounded-tl-none backdrop-blur-sm'
                  }`}>
                     {renderMessageContent(msg)}
                     <span className={`text-[8px] block mt-2 text-right ${msg.sender === 'user' ? 'text-black/50' : 'text-primary/40'}`}>
                       {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </span>
                  </div>
                </div>
             ))}

             {isTyping && (
               <div className="flex justify-start relative z-10 animate-fade-in">
                 <div className="bg-surface/80 border border-white/10 p-3 rounded-lg rounded-tl-none flex items-center gap-1 backdrop-blur-sm">
                   <div className="size-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                   <div className="size-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                   <div className="size-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                 </div>
               </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-surface/50 border-t border-white/10 shrink-0">
             <form onSubmit={handleSend} className="relative flex items-center">
               <input 
                 type="text" 
                 value={inputValue}
                 onChange={e => setInputValue(e.target.value)}
                 placeholder="INSERIR COMANDO TEXTUAL..." 
                 className="w-full bg-[#10100c] border border-white/20 rounded-full py-3 pl-4 pr-12 text-[10px] text-white uppercase tracking-widest outline-none focus:border-primary/50 focus:bg-background-dark transition-all"
               />
               <button 
                 type="submit" 
                 disabled={!inputValue.trim() || isTyping}
                 className="absolute right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black disabled:opacity-50 disabled:bg-white/20 disabled:text-white/50 hover:scale-105 transition-all"
               >
                 <span className="material-symbols-outlined text-[16px]">send</span>
               </button>
             </form>
          </div>
        </div>
      </div>

      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[60] size-16 flex items-center justify-center transition-all duration-500 ${isOpen ? 'bg-surface border border-primary/50 text-primary scale-90 rounded-full shadow-[0_0_20px_rgba(255,193,7,0.4)]' : 'hover:scale-110 drop-shadow-[0_0_15px_rgba(255,193,7,0.6)]'}`}
      >
        {isOpen ? (
          <span className="material-symbols-outlined text-2xl relative z-10">keyboard_arrow_down</span>
        ) : (
          <img src="/mask-branca.webp" alt="Ghost" className="w-full h-full object-contain opacity-90 transition-opacity hover:opacity-100" />
        )}
      </button>
    </>
  );
}
