
import React, { useState } from 'react';
import { StockBatch, StockType, ProductionUsage } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { Box, Trash2, History, Info, ArrowDownRight, Zap, X, FlaskConical } from 'lucide-react';

interface Props {
  batches: StockBatch[];
  productionUsages: ProductionUsage[];
  onAddBatch: (b: Omit<StockBatch, 'id' | 'currentQty' | 'totalCost'>) => void;
  onDeleteBatch: (id: string) => void;
  onUseProductionStock: (u: { date: string, productName: string, qty: number }) => void;
  onDeleteProductionUsage: (id: string) => void;
}

const Inventory: React.FC<Props> = ({ 
  batches, 
  productionUsages,
  onAddBatch, 
  onDeleteBatch,
  onUseProductionStock,
  onDeleteProductionUsage
}) => {
  const [productName, setProductName] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [stockType, setStockType] = useState<StockType>(StockType.FOR_SALE);
  const [filterType, setFilterType] = useState<'ALL' | StockType>('ALL');

  const [usageTarget, setUsageTarget] = useState<{name: string, available: number} | null>(null);
  const [usageQty, setUsageQty] = useState('');
  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !qty || !price) return;
    onAddBatch({
      date,
      productName,
      initialQty: parseInt(qty),
      buyPrice: parseFloat(price),
      stockType: stockType
    });
    setProductName('');
    setQty('');
    setPrice('');
  };

  const handleUseSubmit = () => {
    if (!usageTarget || !usageQty) return;
    const q = parseInt(usageQty);
    if (q > usageTarget.available) {
      alert("Stok tidak mencukupi");
      return;
    }
    onUseProductionStock({
      date: usageDate,
      productName: usageTarget.name,
      qty: q
    });
    setUsageTarget(null);
    setUsageQty('');
  };

  // AGAR HASIL PRODUKSI MUNCUL DI TAB "DIJUAL"
  const filteredBatches = filterType === 'ALL' 
    ? batches 
    : batches.filter(b => {
        if (filterType === StockType.FOR_SALE) {
          return b.stockType === StockType.FOR_SALE || b.stockType === 'HASIL_PRODUKSI';
        }
        return b.stockType === filterType;
      });

  const saleValue = batches.filter(b => b.stockType === StockType.FOR_SALE || b.stockType === 'HASIL_PRODUKSI').reduce((sum, b) => sum + (b.currentQty * b.buyPrice), 0);
  const prodValue = batches.filter(b => b.stockType === StockType.FOR_PRODUCTION).reduce((sum, b) => sum + (b.currentQty * b.buyPrice), 0);

  const getNextBatchPerProduct = () => {
    const nextBatches: Record<string, string> = {};
    const sorted = [...batches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach(b => {
      if (b.currentQty > 0 && !nextBatches[b.productName]) {
        nextBatches[b.productName] = b.id;
      }
    });
    return nextBatches;
  };

  const nextBatches = getNextBatchPerProduct();

  const productionProducts = batches.reduce((acc, b) => {
    if (b.stockType === StockType.FOR_PRODUCTION && b.currentQty > 0) {
      acc[b.productName] = (acc[b.productName] || 0) + b.currentQty;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Input Stok Masuk</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Tanggal Masuk</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Jenis Stok</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStockType(StockType.FOR_SALE)} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase border transition ${stockType === StockType.FOR_SALE ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}>Dijual</button>
                  <button type="button" onClick={() => setStockType(StockType.FOR_PRODUCTION)} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase border transition ${stockType === StockType.FOR_PRODUCTION ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}>Bahan Produksi</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nama Barang</label>
                <input type="text" value={productName} onChange={e => setProductName(e.target.value)} placeholder="Nama Produk" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Jumlah</label>
                  <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Harga Beli</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Rp" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-200"><Box size={18} /> Simpan Batch</button>
            </form>
          </div>

          <div className="space-y-3">
            <div className="bg-indigo-900 p-5 rounded-xl text-white shadow-lg">
              <h4 className="text-indigo-300 text-[10px] font-bold uppercase mb-1 tracking-widest">Nilai Barang Siap Jual</h4>
              <div className="text-2xl font-black">{formatCurrency(saleValue)}</div>
            </div>
            <div className="bg-slate-800 p-5 rounded-xl text-white shadow-lg">
              <h4 className="text-slate-400 text-[10px] font-bold uppercase mb-1 tracking-widest">Nilai Bahan Baku Produksi</h4>
              <div className="text-2xl font-black">{formatCurrency(prodValue)}</div>
            </div>
          </div>
        </div>

        {/* Batch Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><History size={20} className="text-slate-400" /> Daftar Batch Stok</h3>
              <div className="flex bg-slate-200 p-1 rounded-lg self-start">
                {['ALL', StockType.FOR_SALE, StockType.FOR_PRODUCTION].map(type => (
                  <button key={type} onClick={() => setFilterType(type as any)} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition ${filterType === type ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {type === 'ALL' ? 'Semua' : (type === StockType.FOR_SALE ? 'Dijual' : 'Produksi')}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Status & Jenis</th>
                    <th className="px-6 py-4">Barang & Tgl</th>
                    <th className="px-6 py-4">Sisa Stok</th>
                    <th className="px-6 py-4 text-right">HPP / Unit</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBatches.map((b) => {
                    const isNext = nextBatches[b.productName] === b.id;
                    const percentLeft = (b.currentQty / b.initialQty) * 100;
                    const isFromProduction = b.stockType === 'HASIL_PRODUKSI';

                    return (
                      <tr key={b.id} className={`${b.currentQty === 0 ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'} transition group`}>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase w-fit ${isFromProduction ? 'bg-purple-100 text-purple-700 border border-purple-200' : (b.stockType === StockType.FOR_SALE ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700')}`}>
                              {isFromProduction ? 'HASIL PRODUKSI' : b.stockType}
                            </span>
                            {isNext && b.currentQty > 0 && <span className="text-[9px] text-amber-600 font-bold uppercase">Antrian FIFO</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-800">{b.productName}</div>
                          <div className="text-[10px] text-slate-500">{formatDate(b.date)}</div>
                        </td>
                        <td className="px-6 py-4 min-w-[120px]">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-700">{b.currentQty} / {b.initialQty}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div className={`h-full ${percentLeft < 20 ? 'bg-red-500' : 'bg-indigo-600'}`} style={{ width: `${percentLeft}%` }} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-right text-slate-700">{formatCurrency(b.buyPrice)}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {b.stockType === StockType.FOR_PRODUCTION && b.currentQty > 0 && (
                              <button onClick={() => setUsageTarget({name: b.productName, available: productionProducts[b.productName]})} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Gunakan untuk Produksi Manual"><Zap size={16} /></button>
                            )}
                            {/* TOMBOL DELETE: Kita izinkan delete jika ini hasil produksi (biar gak ghaib) atau stok belum tersentuh */}
                            <button 
                              onClick={() => onDeleteBatch(b.id)} 
                              className="p-2 rounded-lg transition text-slate-300 hover:text-red-600 hover:bg-red-50"
                              title="Hapus Batch"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabel Riwayat Pemakaian - Sekarang terintegrasi dengan data produksi */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
               <FlaskConical size={18} className="text-slate-400" />
               <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Riwayat Penggunaan Bahan Baku</h3>
            </div>
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-500 font-bold">
                  <tr>
                    <th className="px-6 py-3">Tanggal</th>
                    <th className="px-6 py-3">Bahan / Produk Jadi</th>
                    <th className="px-6 py-3 text-center">Jumlah</th>
                    <th className="px-6 py-3 text-right">Nilai</th>
                    <th className="px-6 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productionUsages.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Belum ada pemakaian bahan terekam</td></tr>
                  ) : (
                    [...productionUsages].reverse().map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 whitespace-nowrap">{formatDate(u.date || new Date().toISOString())}</td>
                        <td className="px-6 py-3 font-bold text-slate-800">{u.productName || (u as any).result_product_name}</td>
                        <td className="px-6 py-3 text-center">{(u as any).qty || (u as any).result_qty} unit</td>
                        <td className="px-6 py-3 text-right font-bold text-red-600">{formatCurrency(u.totalCost || (u as any).hpp_per_unit)}</td>
                        <td className="px-6 py-3 text-center">
                          <button onClick={() => onDeleteProductionUsage(u.id)} className="text-slate-300 hover:text-red-600"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Modal */}
      {usageTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Gunakan Bahan Produksi</h3>
              <button onClick={() => setUsageTarget(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-xs text-indigo-600 font-bold uppercase">Material</p>
                <p className="text-lg font-black text-indigo-900">{usageTarget.name}</p>
                <p className="text-xs text-indigo-500 mt-1">Stok Gudang: <span className="font-bold">{usageTarget.available} unit</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Tanggal Keluar</label>
                <input type="date" value={usageDate} onChange={e => setUsageDate(e.target.value)} className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Jumlah yang Dikeluarkan</label>
                <input type="number" value={usageQty} onChange={e => setUsageQty(e.target.value)} placeholder="0" className="w-full border rounded-lg p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="pt-2">
                <button onClick={handleUseSubmit} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"><Zap size={18} /> Konfirmasi Keluar</button>
                <p className="text-[10px] text-slate-400 text-center mt-3 uppercase font-medium italic">Data ini akan dicatat sebagai biaya pemakaian material.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
