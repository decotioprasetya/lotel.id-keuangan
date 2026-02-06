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
    if (!resName || resQty <= 0 || ings.some(i => !i.batchId || i.qty <= 0)) return alert("Lengkapi Form!");
    onAddProduction({ productName: resName, qty: resQty, ingredients: ings, totalOpCost: ops.reduce((s, x) => s + x.amount, 0), hpp: calculateHPP() });
    setResName(''); setResQty(1); setOps([{ name: '', amount: 0 }]); setIngs([{ batchId: '', qty: 0 }]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100 grid md:grid-cols-2 gap-8">
        <div className="space-y-6 md:border-r border-slate-100 md:pr-8">
          <h3 className="font-black italic text-indigo-600 flex items-center gap-2 uppercase text-sm"><PackagePlus size={18} /> Resep</h3>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Bahan Baku</label>
            {ings.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select className="flex-1 bg-slate-50 border rounded-xl px-2 py-2 text-xs font-bold" value={item.batchId} onChange={e => { const n = [...ings]; n[i].batchId = e.target.value; setIngs(n); }}>
                  <option value="">Pilih...</option>
                  {batches.filter(b => b.currentQty > 0 && b.stockType === StockType.FOR_PRODUCTION).map(b => (
                    <option key={b.id} value={b.id}>{b.productName} ({b.currentQty})</option>
                  ))}
                </select>
                <input type="number" className="w-16 bg-slate-50 border rounded-xl px-2 py-2 text-xs font-bold" value={item.qty} onChange={e => { const n = [...ings]; n[i].qty = Number(e.target.value); setIngs(n); }} />
                <button onClick={() => setIngs(ings.filter((_, idx) => idx !== i))} className="text-red-400"><Trash2 size={16}/></button>
              </div>
            ))}
            <button onClick={() => setIngs([...ings, {batchId:'', qty:0}])} className="text-[10px] font-bold text-indigo-600">+ TAMBAH BAHAN</button>
          </div>
        </div>

        <div className="bg-slate-50/50 p-6 rounded-2xl flex flex-col justify-between border border-dashed border-slate-200">
          <div className="space-y-4">
            <h3 className="font-black italic text-emerald-600 flex items-center gap-2 uppercase text-sm"><Calculator size={18} /> Produk Jadi</h3>
            <input placeholder="Nama Produk Jadi" className="w-full bg-white border-2 rounded-2xl px-4 py-3 font-bold outline-none focus:border-indigo-500" value={resName} onChange={e => setResName(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 mb-1 uppercase">Total Jadi</p><input type="number" className="w-full text-xl font-black" value={resQty} onChange={e => setResQty(Number(e.target.value))} /></div>
              <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg"><p className="text-[9px] font-black mb-1 uppercase">HPP</p><p className="text-xl font-black">Rp {calculateHPP().toLocaleString()}</p></div>
            </div>
          </div>
          <button onClick={submit} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition flex items-center justify-center gap-2 mt-6"><Save size={18}/> SIMPAN</button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
        <h3 className="font-black italic text-slate-800 flex items-center gap-2 uppercase text-sm mb-6"><History size={18} className="text-indigo-600" /> Jurnal Konversi</h3>
        <div className="space-y-4">
          {batches.filter(b => b.stockType === StockType.FOR_SALE).reverse().slice(0, 5).map((b, idx) => {
            const materialList = productionUsages.filter(u => u.targetProduct?.toLowerCase().trim() === b.productName?.toLowerCase().trim() && u.date === b.date);
            return (
              <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                  <div className="text-[9px] font-black text-red-500 uppercase mb-2 flex items-center gap-1"><Box size={10} /> Bahan Keluar:</div>
                  {materialList.length > 0 ? materialList.map((m, i) => (
                    <div key={i} className="flex justify-between bg-white px-3 py-1 rounded-lg border mb-1 shadow-sm text-xs font-bold"><span>{m.productName}</span><span>{m.qty}</span></div>
                  )) : <div className="text-[10px] italic text-slate-400">Data bahan tidak ditemukan.</div>}
                </div>
                <div className="bg-indigo-600 p-2 rounded-full text-white shadow-md"><ArrowRight size={14} /></div>
                <div className="flex-1 w-full bg-indigo-50 p-3 rounded-2xl border border-indigo-100">
                  <div className="text-[9px] font-black text-indigo-600 uppercase mb-1">Jadi: {b.productName}</div>
                  <div className="flex justify-between items-center"><span className="text-xs font-bold">+{b.initialQty} Unit</span><span className="text-[10px] font-black">HPP: Rp {b.buyPrice.toLocaleString()}</span></div>
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
