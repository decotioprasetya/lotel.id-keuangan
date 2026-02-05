
import React, { useState } from 'react';
import { Transaction, TransactionType, TransactionCategory, StockBatch, StockType } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { PlusCircle, MinusCircle, Trash2, Package } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  onAddBatch: (b: Omit<StockBatch, 'id' | 'currentQty' | 'totalCost'>) => void;
  onDelete: (id: string) => void;
}

const CashBook: React.FC<Props> = ({ transactions, onAdd, onAddBatch, onDelete }) => {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<TransactionCategory>(TransactionCategory.PENJUALAN);
  
  // Extra fields for stock purchase
  const [productName, setProductName] = useState('');
  const [qty, setQty] = useState('');
  const [stockType, setStockType] = useState<StockType>(StockType.FOR_SALE);

  const isBeliStok = category === TransactionCategory.BELI_STOK;

  const handleSubmit = (type: TransactionType) => {
    if (!amount || !desc) return;

    if (type === TransactionType.OUT && isBeliStok) {
      if (!productName || !qty) {
        alert("Harap isi Nama Barang dan Jumlah untuk pembelian stok.");
        return;
      }
      
      const totalAmount = parseFloat(amount);
      const quantity = parseInt(qty);
      
      onAddBatch({
        date,
        productName,
        initialQty: quantity,
        buyPrice: totalAmount / quantity,
        stockType: stockType
      });

      setProductName('');
      setQty('');
    } else {
      onAdd({
        date,
        amount: parseFloat(amount),
        description: desc,
        category,
        type
      });
    }

    setAmount('');
    setDesc('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Input Kas</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Tanggal</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg p-2" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Kategori</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value as TransactionCategory)} 
                className="w-full border rounded-lg p-2"
              >
                <optgroup label="Pemasukan">
                  <option value={TransactionCategory.PENJUALAN}>Penjualan</option>
                  <option value={TransactionCategory.MODAL}>Modal</option>
                </optgroup>
                <optgroup label="Pengeluaran">
                  <option value={TransactionCategory.BIAYA}>Biaya Operasional</option>
                  <option value={TransactionCategory.BELI_STOK}>Beli Stok</option>
                </optgroup>
              </select>
            </div>

            {isBeliStok && (
              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase mb-1">
                  <Package size={14} /> Informasi Barang
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Jenis Stok</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setStockType(StockType.FOR_SALE)}
                      className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold uppercase border transition ${stockType === StockType.FOR_SALE ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}
                    >
                      Untuk Dijual
                    </button>
                    <button 
                      onClick={() => setStockType(StockType.FOR_PRODUCTION)}
                      className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold uppercase border transition ${stockType === StockType.FOR_PRODUCTION ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}
                    >
                      Produksi
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Nama Barang</label>
                  <input 
                    type="text" 
                    value={productName} 
                    onChange={e => setProductName(e.target.value)} 
                    placeholder="Contoh: Kopi Bubuk" 
                    className="w-full border border-indigo-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Jumlah (Qty)</label>
                  <input 
                    type="number" 
                    value={qty} 
                    onChange={e => setQty(e.target.value)} 
                    placeholder="0" 
                    className="w-full border border-indigo-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                {isBeliStok ? 'Total Bayar (Rp)' : 'Nominal (Rp)'}
              </label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full border rounded-lg p-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Keterangan</label>
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Misal: Bayar Listrik" className="w-full border rounded-lg p-2" />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button 
                onClick={() => handleSubmit(TransactionType.IN)}
                disabled={isBeliStok}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg transition ${
                  isBeliStok ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <PlusCircle size={18} /> Kas Masuk
              </button>
              <button 
                onClick={() => handleSubmit(TransactionType.OUT)}
                className="flex items-center justify-center gap-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition"
              >
                <MinusCircle size={18} /> {isBeliStok ? 'Simpan & Stok' : 'Kas Keluar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Riwayat Kas</h3>
            <span className="text-xs text-slate-400 font-mono italic">Menampilkan semua transaksi</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Keterangan</th>
                  <th className="px-6 py-3">Kategori</th>
                  <th className="px-6 py-3 text-right">Nominal</th>
                  <th className="px-6 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...transactions].reverse().map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{t.description}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        t.type === TransactionType.IN ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.category}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${
                      t.type === TransactionType.IN ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {t.type === TransactionType.IN ? '+' : '-'} {formatCurrency(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => onDelete(t.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400">Belum ada data kas</td>
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

export default CashBook;
