import React, { useState, useMemo } from 'react';
import { AppState, TransactionCategory, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { FileDown, Calendar, ArrowRight, Calculator, Info, TrendingUp, WalletMinimal, CalendarDays } from 'lucide-react';
import * as XLSX from 'xlsx';

// 1. Tambahkan businessName di Interface Props
interface Props {
  state: AppState;
  businessName: string; 
}

const Reports: React.FC<Props> = ({ state, businessName }) => {
  // Default range: Start of month to Today
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); 
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const reportData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const transactionsInPeriod = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    const salesInPeriod = state.sales.filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });

    const productionUsageInPeriod = state.productionUsages.filter(u => {
      const d = new Date(u.date);
      return d >= start && d <= end;
    });

    const totalRevenue = transactionsInPeriod
      .filter(t => t.category === TransactionCategory.PENJUALAN && t.type === TransactionType.IN)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalHPP = salesInPeriod.reduce((sum, s) => sum + s.totalCOGS, 0);
    
    const totalCashExpenses = transactionsInPeriod
      .filter(t => t.category === TransactionCategory.BIAYA)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalMaterialUsageCost = productionUsageInPeriod.reduce((sum, u) => sum + u.totalCost, 0);
    const totalExpenses = totalCashExpenses + totalMaterialUsageCost;
    const labaBersih = totalRevenue - totalHPP - totalExpenses;

    const cashIn = transactionsInPeriod.filter(t => t.type === TransactionType.IN).reduce((sum, t) => sum + t.amount, 0);
    const cashOut = transactionsInPeriod.filter(t => t.type === TransactionType.OUT).reduce((sum, t) => sum + t.amount, 0);
    
    const totalModal = transactionsInPeriod
      .filter(t => t.category === TransactionCategory.MODAL)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalStockBuy = transactionsInPeriod
      .filter(t => t.category === TransactionCategory.BELI_STOK)
      .reduce((sum, t) => sum + t.amount, 0);

    return { 
      totalRevenue, totalHPP, totalExpenses, totalMaterialUsageCost,
      totalCashExpenses, labaBersih, cashIn, cashOut, totalModal, totalStockBuy
    };
  }, [state, startDate, endDate]);

  const exportToExcel = () => {
    // 2. Gunakan businessName di dalam isi Excel
    const ws_data = [
      [`LAPORAN KEUANGAN ${businessName.toUpperCase()}`],
      ["Periode Laporan:", `${formatDate(startDate)} s/d ${formatDate(endDate)}`],
      ["Tanggal Cetak:", new Date().toLocaleString('id-ID')],
      [],
      ["I. LAPORAN LABA RUGI (PROFIT & LOSS)"],
      ["A. PENDAPATAN"],
      ["   (+) Total Uang Masuk Penjualan", reportData.totalRevenue],
      ["B. BEBAN POKOK"],
      ["   (-) Total HPP (Metode FIFO)", reportData.totalHPP],
      ["C. BIAYA OPERASIONAL & PRODUKSI"],
      ["   (-) Total Biaya Kas Operasional", reportData.totalCashExpenses],
      ["   (-) Total Nilai Pemakaian Bahan Baku", reportData.totalMaterialUsageCost],
      ["D. HASIL AKHIR"],
      ["   (=) LABA BERSIH (UNTUNG/RUGI)", reportData.labaBersih],
      [],
      ["II. RINGKASAN ARUS KAS (CASH FLOW)"],
      ["   Total Seluruh Kas Masuk", reportData.cashIn],
      ["   Total Seluruh Kas Keluar", reportData.cashOut],
      ["   Saldo Kas Bersih Periode Ini", reportData.cashIn - reportData.cashOut],
      [],
      ["III. INFORMASI MODAL & ASET"],
      ["   Total Injeksi Modal", reportData.totalModal],
      ["   Total Pembelian Stok Barang (Aset)", reportData.totalStockBuy],
      [],
      ["IV. RINCIAN TRANSAKSI KAS (MASUK & KELUAR)"],
      ["Tanggal", "Keterangan", "Kategori", "Tipe", "Nominal (IDR)"]
    ];

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    state.transactions
      .filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(t => {
        ws_data.push([formatDate(t.date), t.description, t.category, t.type, t.amount]);
      });

    ws_data.push([], ["V. RINCIAN PEMAKAIAN BAHAN BAKU (NON-KAS)"], ["Tanggal", "Nama Bahan", "Jumlah", "Nilai Biaya (IDR)"]);
    
    state.productionUsages
      .filter(u => {
        const d = new Date(u.date);
        return d >= start && d <= end;
      })
      .forEach(u => {
        ws_data.push([formatDate(u.date), u.productName, u.qty, u.totalCost]);
      });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    const wscols = [{wch: 15}, {wch: 40}, {wch: 20}, {wch: 10}, {wch: 20}];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan");
    
    // 3. Nama File Excel sekarang Dinamis: Laporan_NamaUMKM_Tanggal.xlsx
    const cleanName = businessName.replace(/[^a-z0-9]/gi, '_').toUpperCase();
    XLSX.writeFile(wb, `Laporan_${cleanName}_${startDate}_ke_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <CalendarDays size={16} /> Pilih Rentang Waktu
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-sm font-bold outline-none text-slate-700" />
              </div>
              <ArrowRight size={16} className="text-slate-300" />
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-2">
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-sm font-bold outline-none text-slate-700" />
              </div>
            </div>
          </div>
          <button 
            onClick={exportToExcel} 
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-100 whitespace-nowrap"
          >
            <FileDown size={18} /> Ekspor Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Tampilan Laba Rugi Dll tetap sama seperti sebelumnya */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-2
