import React, { useState } from 'react';
import { StockBatch, StockType } from '../types'; 
import { Plus, Trash2, Save, PackagePlus, Calculator } from 'lucide-react';

interface Props {
  batches: StockBatch[];
  onAddProduction: (data: any) => void;
}

const Production: React.FC<Props> = ({ batches, onAddProduction }) => {
  const [resName, setResName] = useState(''); 
  const [resQty, setResQty] = useState(1);
  const [ops, setOps] = useState([{ name: '', amount: 0 }]);
  const [ings, setIngs] = useState([{ batchId: '', qty: 0 }]);

  const calculateHPP = () => {
    let ingT = 0;
    ings.forEach(i => {
      const b = batches.find(x => x.id === i.batchId);
      if (b) ingT += b.buyPrice * i.qty;
    });
    const opT = ops.reduce((s, x) => s + x.amount, 0);
    return (ingT + opT) / (resQty || 1);
  };

  const submit = () => {
    if (!resName || resQty <= 0 || ings.some(i => !i.batchId || i.qty <= 0)) {
      return alert("Isi Nama Produk Jadi, Jumlah, dan Bahan Baku!");
    }
    
    onAddProduction({
      productName: resName,
      qty: resQty,
      opCosts: ops.filter(o => o.name.trim() !== '' && o.amount > 0),
      ingredients: ings,
      totalOpCost: ops.reduce((s, x) => s + x.amount, 0),
      hpp: calculateHPP()
    });

    setResName(''); setResQty(1); setOps([{ name: '', amount: 0 }]); setIngs([{ batchId: '', qty: 0 }]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100 grid md:grid-cols-2 gap-8">
        
        {/* SISI KIRI: BAHAN & BIAYA */}
        <div className="space-y-6 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-8">
          <h3 className="font-black italic text-indigo-600 flex items-center gap-2 uppercase text-sm tracking-tighter">
            <PackagePlus size={18} /> Resep & Operasional
          </h3>
          
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Pilih Bahan Baku</label>
            {ings.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select 
                  className="flex-1 bg-slate-50 border rounded-xl px-2 py-2 text-xs font-bold" 
                  value={item.batchId} 
                  onChange={e => { const n = [...ings]; n[i].batchId = e.target.value; setIngs(n); }}
                >
                  <option value="">Pilih Stok...</option>
                  {/* UPDATE FILTER: Pakai FOR_PRODUCTION biar sinkron sama CashBook */}
                  {batches
                    .filter(b => b.currentQty > 0 && b.stockType === StockType.FOR_PRODUCTION)
                    .map(b => (
                      <option key={b.id} value={b.id}>
                        {b.productName} ({b.currentQty})
                      </option>
                    ))
                  }
                </select>
                <input type="number" placeholder="Qty" className="w-16 bg-slate-50 border rounded-xl px-2 py-2 text-xs font-bold text-center" value={item.qty} onChange={e => { const n = [...ings]; n[i].qty = Number(e.target.value); setIngs(n); }} />
                <button onClick={() => setIngs(ings.filter((_, idx) => idx !== i))} className="text-red-400 hover:bg-red-50 p-1 rounded-lg transition"><Trash2 size={16}/></button>
              </div>
            ))}
            <button onClick={() => setIngs([...ings, {batchId:'', qty:0}])} className="text-[10px] font-bold text-indigo-600">+ TAMBAH BAHAN</button>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Biaya Tambahan (Lain-lain)</label>
            {ops.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input placeholder="Contoh: Ongkos Jahit" className="flex-1 bg-slate-50 border rounded-xl px-2 py-2 text-xs font-bold" value={item.name} onChange={e => { const n = [...ops]; n[i].name = e.target.value; setOps(n); }} />
                <input type="number" placeholder="Rp" className="w-24 bg-slate-50 border rounded-xl px-2 py-2 text-xs font-bold" value={item.amount} onChange={e => { const n = [...ops]; n[i].amount = Number(e.target.value); setOps(n); }} />
                <button onClick={() => setOps(ops.filter((_, idx) => idx !== i))} className="text-red-400 hover:bg-red-50 p-1 rounded-lg transition"><Trash2 size={16}/></button>
              </div>
            ))}
            <button onClick={() => setOps([...ops, {name:'', amount:0}])} className="text-[10px] font-bold text-indigo-600">+ TAMBAH BIAYA</button>
          </div>
        </div>

        {/* SISI KANAN: HASIL JADI */}
        <div className="space-y-6 flex flex-col justify-between bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-200">
          <div className="space-y-4">
            <h3 className="font-black italic text-emerald-600 flex items-center gap-2 uppercase text-sm tracking-tighter">
              <Calculator size={18} /> Ringkasan Hasil
            </h3>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nama Barang Jadi (Siap Jual)</label>
              <input 
                placeholder="Contoh: Jersey Polos A1" 
                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 focus:border-indigo-500 outline-none transition" 
                value={resName} 
                onChange={e => setResName(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Jumlah Jadi</p>
                <input type="number" className="w-full bg-transparent text-xl font-black outline-none" value={resQty} onChange={e => setResQty(Number(e.target.value))} />
              </div>
              <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200">
                <p className="text-[10px] font-black text-indigo-200 uppercase mb-1 text-white/70">HPP / Unit</p>
                <p className="text-xl font-black text-white">Rp {calculateHPP().toLocaleString()}</p>
              </div>
            </div>
          </div>

          <button onClick={submit} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 active:scale-[0.98]">
            <Save size={20}/> SELESAI & SIMPAN STOK
          </button>
        </div>

      </div>
    </div>
  );
};

export default Production;
