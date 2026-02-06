import React, { useState } from 'react';
import { StockBatch, StockType, ProductionUsage } from '../types'; 
import { Trash2, Save, PackagePlus, Calculator, History, ArrowRight, Box } from 'lucide-react';

interface Props {
  batches: StockBatch[];
  productionUsages: ProductionUsage[];
  onAddProduction: (data: any) => void;
}

const Production: React.FC<Props> = ({ batches, productionUsages = [], onAddProduction }) => {
  const [resName, setResName] = useState(''); 
  const [resQty, setResQty] = useState(1);
  const [ings, setIngs] = useState([{ batchId: '', qty: 0 }]);

  const calculateHPP = () => {
    let ingT = 0;
    ings.forEach(i => {
      const b = batches.find(x => x.id === i.batchId);
      if (b) ingT += b.buyPrice * i.qty;
    });
    return ingT / (resQty || 1);
  };

  const submit = () => {
    if (!resName || resQty <= 0 || ings.some(i => !i.batchId || i.qty <= 0)) return alert("Lengkapi data!");
    onAddProduction({ productName: resName, qty: resQty, ingredients: ings, totalOpCost: 0, hpp: calculateHPP() });
    setResName(''); setResQty(1); setIngs([{ batchId: '', qty: 0 }]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100 grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="font-black italic text-indigo-600 flex items-center gap-2 uppercase text-sm"><PackagePlus size={18} /> Bahan Baku</h3>
          {ings.map((item, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <select className="flex-1 bg-slate-50 border rounded-xl px-2 py-2 text-xs font-bold" value={item.batchId} onChange={e => { const n = [...ings]; n[i].batchId = e.target.value; setIngs(n); }}>
                <option value="">Pilih Bahan...</option>
                {batches.filter(b => b.currentQty > 0 && b.stockType === StockType.FOR_PRODUCTION).map(b => (
                  <option key={b.id} value={b.id}>{b.productName} ({b.currentQty})</option>
                ))}
              </select>
              <input type="number" className="w-16 bg-slate-50 border rounded-xl px-2 py-2 text-xs font-bold" value={item.qty} onChange={e => { const n = [...ings]; n[i].qty = Number(e.target.value); setIngs(n); }} />
              <button onClick={() => setIngs(ings.filter((_, idx) => idx !== i))} className="text-red-400 p-1"><Trash2 size={16}/></button>
            </div>
          ))}
          <button onClick={() => setIngs([...ings, {batchId:'', qty:0}])} className="text-[10px] font-bold text-indigo-600">+ BAHAN</button>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl">
          <h3 className="font-black italic text-emerald-600 flex items-center gap-2 uppercase text-sm mb-4"><Calculator size={18} /> Produk Jadi</h3>
          <input placeholder="Nama Produk Hasil" className="w-full bg-white border-2 rounded-2xl px-4 py-3 font-bold mb-4 outline-none focus:border-indigo-500" value={resName} onChange={e => setResName(e.target.value)} />
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-2xl border"><p className="text-[9px] font-black text-slate-400 uppercase">Qty</p><input type="number" className="w-full text-xl font-black" value={resQty} onChange={e => setResQty(Number(e.target.value))} /></div>
            <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg"><p className="text-[9px] font-black uppercase">HPP</p><p className="text-xl font-black">Rp {calculateHPP().toLocaleString()}</p></div>
          </div>
          <button onClick={submit} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition">SIMPAN PRODUKSI</button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
        <h3 className="font-black italic text-slate-800 flex items-center gap-2 uppercase text-sm mb-6"><History size={18} className="text-indigo-600" /> Jurnal Konversi</h3>
        <div className="space-y-4">
          {batches.filter(b => b.stockType === StockType.FOR_SALE).reverse().slice(0, 5).map((b, idx) => {
            const materials = productionUsages.filter(u => u.targetProduct?.toLowerCase() === b.productName?.toLowerCase() && u.date === b.date);
            return (
              <div key={idx} className="bg-slate-50 border rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                  <div className="text-[9px] font-black text-red-500 uppercase mb-2">Bahan Keluar:</div>
                  {materials.map((m, i) => (
                    <div key={i} className="flex justify-between bg-white px-3 py-1 rounded-lg border mb-1 text-xs font-bold"><span>{m.productName}</span><span>{m.qty}</span></div>
                  ))}
                </div>
                <ArrowRight className="text-slate-300" />
                <div className="flex-1 w-full bg-indigo-50 p-3 rounded-2xl border border-indigo-100">
                  <div className="text-[9px] font-black text-indigo-600 uppercase">Produk Masuk: {b.productName}</div>
                  <div className="flex justify-between mt-1"><span className="text-xs font-bold">+{b.initialQty} Unit</span><span className="text-[10px] font-black">HPP: Rp {b.buyPrice.toLocaleString()}</span></div>
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
