import React, { useState } from 'react';
import { Sale, StockBatch, StockType } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { ShoppingCart, Trash2, Package, Tag } from 'lucide-react';

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

  // LOGIKA FILTER: Sinkron dengan Enum "Dijual"
  const productsWithStock = batches.reduce((acc, b) => {
    // Memastikan hanya mengambil stok yang tersedia dan tipenya "Dijual"
    if (b.currentQty > 0 && b.stockType === StockType.FOR_SALE) {
      if (!acc[b.productName]) {
        acc[b.productName] = { 
          total: 0, 
          oldestBatchDate: b.date, 
          oldestPrice: b.buyPrice 
        };
      }
      acc[b.productName].total += b.currentQty;
      
      // Logika FIFO: Mencari harga modal dari batch paling lama
      if (new Date(b.date) < new Date(acc[b.productName].oldestBatchDate)) {
        acc[b.productName].oldestBatchDate = b.date;
        acc[b.productName].oldestPrice = b.buyPrice;
      }
    }
    return acc;
  }, {} as Record<string, { total: number, oldestBatchDate: string, oldestPrice: number }>);

  const availableProducts = Object.keys(productsWithStock).sort(); // Urutkan nama produk A-Z

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !qty || !sellPrice) return;
    
    const totalAvailable = productsWithStock[productName]?.total || 0;
    const inputQty = parseInt(qty);

    if (inputQty <= 0) return alert("Jumlah harus lebih dari 0");
    if (inputQty > totalAvailable) {
      alert(`Stok tidak mencukupi! Tersedia: ${totalAvailable}`);
      return;
    }

    onAddSale({
      date,
      productName, 
      qty: inputQty,
      sellPrice: parseFloat(sellPrice)
    });

    // Reset Form
    setProductName('');
    setQty('');
    setSellPrice('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {/* FORM KASIR */}
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
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pilih Produk (Tersedia)</label>
              <select value={productName} onChange={e => setProductName(e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl p-3 font-bold focus:bg-white focus:border-emerald-500 outline-none transition appearance-none">
                <option value="">-- Pilih Barang --</option>
                {availableProducts.map(p => (
                  <option key={p} value={p}>{p} ({productsWithStock[p].total} unit)</option>
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
                  <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Total Stok</p>
                  <p className="text-sm font-black text-emerald-900">{productsWithStock[productName].total} Unit</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Qty Jual</label>
                <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl p-3 font-bold focus:bg-white focus:border-emerald-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Harga Jual / Unit</label>
                <input type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="Rp" className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl p-3 font-bold focus:bg-white focus:border-emerald-500 outline-none transition" />
              </div>
            </div>

            <button type="submit" className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-white p-4 rounded-xl hover:bg-emerald-700 transition font-black uppercase tracking-widest shadow-xl shadow-emerald-100 active:scale-95">
              <ShoppingCart size={20} /> Simpan Penjualan
            </button>
          </form>
        </div>
      </div>

      {/* TABEL RIWAYAT */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-100">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-800 italic uppercase tracking-tighter">Riwayat Penjualan</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metode Antrian FIFO</p>
            </div>
            <div className="p-2 bg-white rounded-lg border shadow-sm text-slate-300">
              <Package size={20} />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Produk</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-right">Total Jual</th>
                  <th className="px-6 py-4 text-right text-rose-400">Total Modal (HPP)</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700 text-sm">
                {[...sales].reverse().map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition group">
                    <td className="px-6 py-4 text-[11px] whitespace-nowrap text-slate-500">{formatDate(s.date)}</td>
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-800">{s.productName}</div>
                      <div className="text-[9px] text-slate-400 font-mono uppercase">ID: {s.id.slice(0,8)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">{s.qty}</td>
                    <td className="px-6 py-4 text-right text-emerald-600">{formatCurrency(s.totalRevenue)}</td>
                    <td className="px-6 py-4 text-right text-slate-400 italic font-medium">{formatCurrency(s.totalCOGS)}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => onDeleteSale(s.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-300">
                       <ShoppingCart size={40} className="mx-auto mb-2 opacity-10" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Belum ada transaksi</p>
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
