import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, resendConfirmation, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleResendEmail = async () => {
    if (!email) {
      setMessage('Por favor, insira seu e-mail primeiro.');
      return;
    }
    setLoading(true);
    const { error } = await resendConfirmation(email);
    if (error) setMessage(error.message);
    else setMessage('E-mail de confirmação reenviado! Verifique sua caixa de entrada e seu SPAM.');
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage('Insira seu e-mail para recuperar a senha.');
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) setMessage(error.message);
    else setMessage('Link de recuperação enviado para seu e-mail.');
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) { 
        if (error.message.includes('confirmed')) {
          setMessage('Seu e-mail ainda não foi confirmado.');
        } else {
          setMessage('Credenciais inválidas. Tente novamente.');
        }
      }
      else { navigate('/'); }
    } else {
      const { error } = await signUp(email, password, name);
      if (error) { setMessage(error.message); }
      else { setMessage('🛡️ OPERADOR EM ASCENSÃO! Verifique seu e-mail e a sua caixa de SPAM.'); }
    }
    setLoading(false);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 flex items-start justify-center min-h-[70vh]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="material-symbols-outlined text-primary text-5xl mb-4 block">shield_person</span>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{isLogin ? 'Login' : 'Cadastro'}</h2>
          <p className="text-slate-500 text-xs uppercase tracking-widest mt-2">{isLogin ? 'Acesse seu painel operacional' : 'Crie sua conta de operador'}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border-tactical p-6 space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-widest uppercase">Nome</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                     className="w-full bg-background-dark border border-border-tactical text-white px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary text-xs tracking-tight"
                     placeholder="NOME DO OPERADOR"/>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-widest uppercase">E-mail</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                   className="w-full bg-background-dark border border-border-tactical text-white px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary text-xs tracking-tight"
                   placeholder="EMAIL@REDE.COM"/>
          </div>
          <div className="relative">
            <div className="flex justify-between items-end mb-1">
                <label className="block text-[10px] font-bold text-slate-500 tracking-widest uppercase">Senha</label>
                {isLogin && (
                    <button 
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[9px] text-primary hover:underline uppercase font-black"
                    >
                        Esqueci minha senha
                    </button>
                )}
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-background-dark border border-border-tactical text-white px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary text-xs tracking-tight pr-12"
              placeholder="••••••••" 
              minLength={6}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 bottom-3 text-slate-500 hover:text-primary transition-colors focus:outline-none"
            >
              <span className="material-symbols-outlined text-sm">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          {message && (
            <div className={`p-3 text-xs text-center uppercase tracking-widest border ${message.includes('enviado') || message.includes('ascensão') || message.includes('reenviado') ? 'border-green-500/30 text-green-400 bg-green-500/5' : 'border-red-500/30 text-red-400 bg-red-500/5'}`}>
              <p>{message}</p>
              {(message.includes('confirmado') || message.includes('exist')) && (
                <button 
                    type="button"
                    onClick={handleResendEmail}
                    className="mt-2 text-[10px] text-primary underline font-black block w-full"
                >
                    REENVIAR E-MAIL DE CONFIRMAÇÃO
                </button>
              )}
            </div>
          )}

          <button type="submit" disabled={loading}
                  className="w-full bg-primary text-background-dark font-black py-4 uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50">
            {loading ? 'Processando...' : isLogin ? 'Acessar Painel' : 'Criar Conta'}
          </button>

          <p className="text-center text-xs text-slate-500 uppercase tracking-widest">
            {isLogin ? 'Não tem conta?' : 'Já tem conta?'}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setMessage(''); }}
                    className="text-primary ml-2 hover:underline font-bold">{isLogin ? 'Cadastre-se' : 'Faça Login'}</button>
          </p>
        </form>
      </div>
    </div>
  );
}
