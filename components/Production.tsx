import React, { useState } from 'react';
import { StockBatch, StockType, ProductionUsage } from '../types'; 
import { Trash2, Save, PackagePlus, Calculator, History, ArrowRight, Box, ChevronRight } from 'lucide-react';

interface Props {
  batches: StockBatch[];
  productionUsages: ProductionUsage[]; // Tambahkan ini supaya bisa baca detail bahan
  onAddProduction: (data: any) => void;
}

const Production: React.FC<Props> = ({ batches, productionUsages, onAddProduction }) => {
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
      {/* FORM INPUT PRODUKSI */}
      <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100 grid md:grid-cols-2 gap-8">
        <div className="space-y-6 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-8">
          <h3 className="font-black italic text-indigo-600 flex items-center gap-2 uppercase text-sm tracking-tighter">
            <PackagePlus size={18} /> Resep & Operasional
          </h3>
          
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Bahan Baku Keluar</label>
            {ings.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select 
                  className="flex-1 bg-slate-50 border rounded-xl px-2 py-2 text-xs font-bold" 
                  value={item.batchId} 
                  onChange={e => { const n = [...ings]; n[i].batchId = e.target.value; setIngs(n); }}
                >
                  <option value="">Pilih Bahan...</option>
                  {batches
                    .filter(b => b.currentQty > 0 && b.stockType === StockType.FOR_PRODUCTION)
                    .map(b => (
                      <option key={b.id} value={b.id}>{b.productName} (Sisa: {b.currentQty})</option>
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
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Biaya Tambahan</label>
            {ops.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input placeholder="Ongkos/Listrik" className="flex-1 bg-slate-50 border rounded-xl px-2 py-2 text-xs font-bold" value={item.name} onChange={e => { const n = [...ops]; n[i].name = e.target.value; setOps(n); }} />
                <input type="number" placeholder="Rp" className="w-24 bg-slate-50 border rounded-xl px-2 py-2 text-xs font-bold" value={item.amount} onChange={e => { const n = [...ops]; n[i].amount = Number(e.target.value); setOps(n); }} />
                <button onClick={() => setOps(ops.filter((_, idx) => idx !== i))} className="text-red-400 hover:bg-red-50 p-1 rounded-lg transition"><Trash2 size={16}/></button>
              </div>
            ))}
            <button onClick={() => setOps([...ops, {name:'', amount:0}])} className="text-[10px] font-bold text-indigo-600">+ TAMBAH BIAYA</button>
          </div>
        </div>

        <div className="space-y-6 flex flex-col justify-between bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-200">
          <div className="space-y-4">
            <h3 className="font-black italic text-emerald-600 flex items-center gap-2 uppercase text-sm tracking-tighter">
              <Calculator size={18} /> Produk Jadi
            </h3>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nama Hasil Produksi</label>
              <input placeholder="Gayung, Baju, dll" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 focus:border-indigo-500 outline-none transition" value={resName} onChange={e => setResName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Unit</p>
                <input type="number" className="w-full bg-transparent text-xl font-black outline-none" value={resQty} onChange={e => setResQty(Number(e.target.value))} />
              </div>
              <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200">
                <p className="text-[10px] font-black text-indigo-200 uppercase mb-1 text-white/70">HPP / Unit</p>
                <p className="text-xl font-black text-white">Rp {calculateHPP().toLocaleString()}</p>
              </div>
            </div>
          </div>
          <button onClick={submit} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-200">
            <Save size={20}/> SELESAI & SIMPAN STOK
          </button>
        </div>
      </div>

      {/* JURNAL KONVERSI DENGAN TRACEABILITY BAHAN */}
      <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
        <h3 className="font-black italic text-slate-800 flex items-center gap-2 uppercase text-sm tracking-tighter mb-6">
          <History size={18} className="text-indigo-600" /> Jurnal Konversi Bahan Ke Barang Jadi
        </h3>
        
        <div className="space-y-4">
          {batches
            .filter(b => b.stockType === StockType.FOR_SALE)
            .reverse()
            .slice(0, 5)
            .map((b, idx) => {
              // Cari bahan apa aja yang dipake buat produk ini
              const materialList = productionUsages
                .filter(u => u.targetProduct === b.productName && u.date === b.date);

              return (
                <div key={idx} className="group bg-slate-50/50 hover:bg-white hover:shadow-md transition-all border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
                  {/* BAHAN BAKU (KELUAR) */}
                  <div className="flex-1 w-full">
                    <div className="text-[9px] font-black text-red-500 uppercase mb-2 flex items-center gap-1">
                      <Box size={10} /> Bahan Baku Digunakan
                    </div>
                    <div className="space-y-1">
                      {materialList.length > 0 ? (
                        materialList.map((m, i) => (
                          <div key={i} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-100">
                            <span className="text-xs font-bold text-slate-700">{m.productName}</span>
                            <span className="text-[10px] font-black text-slate-400">{m.qty} Unit</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] italic text-slate-400 px-3">Detail bahan baku diproses...</div>
                      )}
                    </div>
                  </div>

                  {/* PANAH PROSES */}
                  <div className="flex flex-col items-center">
                    <div className="bg-indigo-600 p-2 rounded-full text-white shadow-lg shadow-indigo-100 group-hover:scale-110 transition">
                      <ArrowRight size={16} />
                    </div>
                    <span className="text-[8px] font-black text-indigo-500 mt-1 uppercase">Proses</span>
                  </div>

                  {/* BARANG JADI (MASUK) */}
                  <div className="flex-1 w-full bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
                    <div className="text-[9px] font-black text-indigo-600 uppercase mb-1">Hasil Jadi (Stok In)</div>
                    <div className="font-black text-slate-800 uppercase text-sm leading-none mb-1">
                      {b.productName}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-indigo-600">+{b.initialQty} Pcs</span>
                      <span className="text-xs font-black text-slate-700">Rp {b.totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default Production;
