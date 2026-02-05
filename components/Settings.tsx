import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Save, Building2, Loader2, CheckCircle, ShieldCheck } from 'lucide-react';

interface Props { userId: string; onNameUpdated: (newName: string) => void; }

const Settings: React.FC<Props> = ({ userId, onNameUpdated }) => {
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data } = await supabase.from('profile').select('business_name').eq('user_id', userId).maybeSingle();
      if (data) setBusinessName(data.business_name);
      setLoading(false);
    };
    fetchProfile();
  }, [userId]);

  const handleSave = async () => {
    if (!businessName.trim()) return alert("Nama tidak boleh kosong!");
    setSaving(true);
    try {
      const { error } = await supabase.from('profile').upsert(
        { user_id: userId, business_name: businessName, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      onNameUpdated(businessName);
      setStatus('Berhasil disimpan!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-slate-400">
      <Loader2 className="animate-spin mb-2" /> <p className="text-sm font-medium">Memuat...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white relative">
          <h3 className="text-xl font-black flex items-center gap-2 italic tracking-tighter relative z-10">
            <Building2 size={24} className="not-italic" /> PENGATURAN BISNIS
          </h3>
          <ShieldCheck className="absolute right-[-20px] top-[-20px] text-white/10 w-40 h-40" />
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama UMKM / Brand</label>
            <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition font-bold text-slate-700 text-lg" 
            />
          </div>

          <button onClick={handleSave} disabled={saving}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg ${saving ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
            {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Simpan Perubahan</>}
          </button>

          {status && (
            <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-black animate-bounce">
              <CheckCircle size={18} /> {status}
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center gap-4 text-slate-400">
          <div className="p-3 bg-white rounded-xl border border-slate-200"><Building2 size={20} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider">Cloud Sync</p>
            <p className="text-xs font-bold text-slate-600">Terhubung ke Database</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
