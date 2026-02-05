import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Save, Building2, Loader2, CheckCircle, ShieldCheck } from 'lucide-react';

interface Props {
  userId: string;
  onNameUpdated: (newName: string) => void;
}

const Settings: React.FC<Props> = ({ userId, onNameUpdated }) => {
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile')
        .select('business_name')
        .eq('user_id', userId)
        .maybeSingle(); // Pakai maybeSingle biar gak error kalau data belum ada
      
      if (data) setBusinessName(data.business_name);
    } catch (err) {
      console.error("Gagal ambil profil:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!businessName.trim()) return alert("Nama UMKM tidak boleh kosong!");
    
    setSaving(true);
    setStatus('');
    
    try {
      // Logic UPSERT dengan patokan ON CONFLICT user_id
      const { error } = await supabase
        .from('profile')
        .upsert(
          { 
            user_id: userId, 
            business_name: businessName,
            updated_at: new Date().toISOString() 
          }, 
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      onNameUpdated(businessName);
      setStatus('Pengaturan berhasil disimpan!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-slate-400">
      <Loader2 className="animate-spin mb-2" />
      <p className="text-sm font-medium">Memuat pengaturan...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Header Section */}
        <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-black flex items-center gap-2 italic tracking-tighter">
              <Building2 size={24} className="not-italic" /> PENGATURAN BISNIS
            </h3>
            <p className="text-indigo-100 text-xs mt-1 font-medium">Identitas Brand untuk Dashboard dan Laporan Excel.</p>
          </div>
          <ShieldCheck className="absolute right-[-20px] top-[-20px] text-white/10 w-40 h-40" />
        </div>
        
        <div className="p-8 space-y-8">
          {/* Input Section */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Nama UMKM / Nama Brand
            </label>
            <input 
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition font-bold text-slate-700 text-lg"
              placeholder="Contoh: Kopi Kenangan Mantan"
            />
            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 font-medium italic">
              <ShieldCheck size={12} /> Perubahan akan langsung sinkron ke seluruh perangkat.
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg ${
