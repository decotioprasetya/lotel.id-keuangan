
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

  // IMPORTANT: Filter ONLY batches marked as FOR_SALE
  const productsWithStock = batches.reduce((acc, b) => {
    if (b.currentQty > 0 && b.stockType === StockType.FOR_SALE) {
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
      productName,
      qty: parseInt(qty),
      sellPrice: parseFloat(sellPrice)
    });
    setProductName('');
    setQty('');
    setSellPrice('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={20} className="text-emerald-600" />
            <h3 className="text-lg font-semibold">Kasir Penjualan</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Tanggal</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Pilih Produk (Stok Siap Jual)</label>
              <select value={productName} onChange={e => setProductName(e.target.value)} className="w-full border rounded-lg p-2">
                <option value="">-- Pilih Produk --</option>
                {availableProducts.map(p => (
                  <option key={p} value={p}>{p} ({productsWithStock[p].total} unit)</option>
                ))}
              </select>
            </div>
            
            {productName && productsWithStock[productName] && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">HPP Terkini (FIFO)</p>
                  <p className="text-sm font-black text-emerald-800">{formatCurrency(productsWithStock[productName].oldestPrice)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">Sisa Gudang</p>
                  <p className="text-sm font-black text-emerald-800">{productsWithStock[productName].total} unit</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Jumlah Jual</label>
                <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" className="w-full border rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Harga Jual</label>
                <input type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="0" className="w-full border rounded-lg p-2" />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 transition font-bold shadow-lg shadow-emerald-100"
            >
              <ShoppingCart size={18} /> Simpan Penjualan
            </button>
          </form>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-[10px] text-slate-400 leading-tight">
            *Menu ini hanya menampilkan barang dengan kategori <strong>Untuk Dijual</strong>. Bahan baku/produksi tidak muncul di sini.
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/30">
            <h3 className="text-lg font-semibold text-slate-800">Riwayat Penjualan</h3>
            <p className="text-xs text-slate-500 mt-1">Stok dikurangi secara otomatis menggunakan metode FIFO</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Produk</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-right">Total Jual</th>
                  <th className="px-6 py-4 text-right">HPP (FIFO)</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...sales].reverse().map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition group">
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{formatDate(s.date)}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-800">{s.productName}</div>
                      <div className="text-[10px] text-slate-400">ID: {s.id.slice(0,8)}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-medium">{s.qty}</td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-emerald-600">{formatCurrency(s.totalRevenue)}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-400 italic">
                      {formatCurrency(s.totalCOGS)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => onDeleteSale(s.id)}
                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                       <ShoppingCart size={40} className="mx-auto mb-2 opacity-20" />
                       <p className="text-sm">Belum ada transaksi penjualan</p>
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
