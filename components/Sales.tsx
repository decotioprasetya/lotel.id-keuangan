import React, { useState } from 'react';
import { Sale, StockBatch, StockType } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { ShoppingCart, Trash2, Package, ArrowRightCircle, Tag } from 'lucide-react';

interface Props {
  sales: Sale[];
  batches: StockBatch[];
  onAddSale: (s: { date: string, productName: string, qty: number, sellPrice: number }) => void;
  onDeleteSale: (id: string) => void;
}

const Sales: React.FC<Props> = ({ sales, batches, onAddSale, onDeleteSale }) => {
  const [productName, setProductName] = useState('');
  const [qty, setQty] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // FIX: Izinkan tipe FOR_SALE DAN HASIL_PRODUKSI untuk muncul di kasir
  const productsWithStock = batches.reduce((acc, b) => {
    const isSalable = b.stockType === StockType.FOR_SALE || b.stockType === 'HASIL_PRODUKSI' || b.stock_type === 'HASIL_PRODUKSI';
    
    if (b.currentQty > 0 && isSalable) {
      if (!acc[b.productName]) {
        acc[b.productName] = { 
          total: 0, 
          oldestBatchDate: b.date, 
          oldestPrice: b.buyPrice 
        };
      }
      acc[b.productName].total += b.currentQty;
      if (new Date(b.date) < new Date(acc[b.productName].oldestBatchDate)) {
        acc[b.productName].oldestBatchDate = b.date;
        acc[b.productName].oldestPrice = b.buyPrice;
      }
    }
    return acc;
  }, {} as Record<string, { total: number, oldestBatchDate: string, oldestPrice: number }>);

  const availableProducts = Object.keys(productsWithStock);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !qty || !sellPrice) return;
    
    const totalAvailable = productsWithStock[productName]?.total || 0;

    if (parseInt(qty) > totalAvailable) {
      alert(`Stok tidak mencukupi! Tersedia: ${totalAvailable}`);
      return;
    }

    onAddSale({
      date,
      productName, // Pastikan productName (camelCase) agar sinkron dengan App.tsx
      qty: parseInt(qty),
      sellPrice: parseFloat(sellPrice)
    });

    setProductName('');
    setQty('');
    setSellPrice('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <Tag size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-800 italic uppercase tracking-tighter">Kasir Penjualan</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal Transaksi</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl p-3 font-bold focus:bg-white focus:border-emerald-500 outline-none transition" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pilih Barang Jadi</label>
              <select value={productName} onChange={e => setProductName(e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl p-3 font-bold focus:bg-white focus:border-emerald-500 outline-none transition appearance-none">
                <option value="">-- Pilih Produk --</option>
                {availableProducts.map(p => (
                  <option key={p} value={p}>{p} (Stok: {productsWithStock[p].total})</option>
                ))}
              </select>
            </div>
            
            {productName && productsWithStock[productName] && (
              <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100/50 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Modal (FIFO)</p>
                  <p className="text-sm font-black text-emerald-900">{formatCurrency(productsWithStock[productName].oldestPrice)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Tersedia</p>
                  <p className="text-sm font-black text-emerald-900">{productsWithStock[productName].total} Unit</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jumlah</label>
                <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl p-3 font-bold focus:bg-white focus:border-emerald-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Harga Jual</label>
                <input type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="0" className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl p-3 font-bold focus:bg-white focus:border-emerald-500 outline-none transition" />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-white p-4 rounded-xl hover:bg-emerald-700 transition font-black uppercase tracking-widest shadow-xl shadow-emerald-100 active:scale-95"
            >
              <ShoppingCart size={20} /> Simpan Penjualan
            </button>
          </form>
          
          <div className="mt-6 p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[10px] text-slate-400 font-medium italic leading-relaxed">
            *Daftar ini mencakup barang kulakan (Stock) dan barang hasil produksi sendiri.
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-100">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-800 italic uppercase tracking-tighter">Riwayat Penjualan</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metode Antrian FIFO</p>
            </div>
            <div className="p-2 bg-white rounded-lg border shadow-sm">
              <Package size={20} className="text-slate-300" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Produk</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-right">Total Revenue</th>
                  <th className="px-6 py-4 text-right text-rose-400">Total HPP</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {[...sales].reverse().map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition group">
                    <td className="px-6 py-4 text-[11px] whitespace-nowrap">{formatDate(s.date)}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-slate-800">{s.productName}</div>
                      <div className="text-[9px] text-slate-400 font-mono uppercase">REF-{s.id.slice(0,6)}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm">{s.qty}</td>
                    <td className="px-6 py-4 text-sm font-black text-right text-emerald-600">{formatCurrency(s.totalRevenue)}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-400 italic">
                      {formatCurrency(s.totalCOGS)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => onDeleteSale(s.id)}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                       <div className="flex flex-col items-center opacity-20">
                         <ShoppingCart size={48} />
                         <p className="text-sm font-black uppercase mt-2">Belum ada penjualan hari ini</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;
