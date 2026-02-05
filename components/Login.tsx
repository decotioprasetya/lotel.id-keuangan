
import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { LogIn, UserPlus, ShieldCheck, Cloud, Loader2 } from 'lucide-react';

interface Props {
  onLoginSuccess: () => void;
}

const Login: React.FC<Props> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        alert('Cek email Anda untuk konfirmasi pendaftaran!');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 mb-4">
            <Cloud className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter">UMKM PRO <span className="text-indigo-600 not-italic">CLOUD</span></h1>
          <p className="text-slate-500 mt-2 font-medium">Kelola usaha Anda di mana saja, kapan saja.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            {isRegister ? <UserPlus className="text-indigo-600" /> : <LogIn className="text-indigo-600" />}
            {isRegister ? 'Buat Akun Baru' : 'Masuk ke Cloud'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Bisnis</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition"
                placeholder="email@bisnisanda.com"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Kata Sandi</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg font-bold border border-red-100 flex items-center gap-2">
                <ShieldCheck size={14} /> {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : (isRegister ? 'Daftar Sekarang' : 'Masuk Sekarang')}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition"
            >
              {isRegister ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar gratis'}
            </button>
          </div>
        </div>

        <div className="text-center mt-8 space-y-2">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <ShieldCheck size={12} /> Data Terenkripsi & Aman di Cloud
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
