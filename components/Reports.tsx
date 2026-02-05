
import React, { useState, useMemo } from 'react';
import { AppState, TransactionCategory, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { FileDown, Calendar, ArrowRight, Calculator, Info, TrendingUp, ReceiptText, WalletMinimal, Banknote, CalendarDays } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  state: AppState;
}

const Reports: React.FC<Props> = ({ state }) => {
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

    // Filter transactions by date range
    const transactionsInPeriod = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    // Filter sales by date range (for HPP/FIFO calculation)
    const salesInPeriod = state.sales.filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });

    // Filter production usages by date range (Non-cash expenses)
    const productionUsageInPeriod = state.productionUsages.filter(u => {
      const d = new Date(u.date);
      return d >= start && d <= end;
    });

    // 1. Total Penjualan (Revenue) - From Cash In category Penjualan
    const totalRevenue = transactionsInPeriod
      .filter(t => t.category === TransactionCategory.PENJUALAN && t.type === TransactionType.IN)
      .reduce((sum, t) => sum + t.amount, 0);
    
    // 2. Total HPP (COGS) - Value of inventory sold from FIFO records
    const totalHPP = salesInPeriod.reduce((sum, s) => sum + s.totalCOGS, 0);
    
    // 3. Total Biaya Operasional (Cash Expenses + Non-cash Production Usage)
    const totalCashExpenses = transactionsInPeriod
      .filter(t => t.category === TransactionCategory.BIAYA)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalMaterialUsageCost = productionUsageInPeriod.reduce((sum, u) => sum + u.totalCost, 0);
    
    const totalExpenses = totalCashExpenses + totalMaterialUsageCost;

    // Core Logic: Untung = (Penjualan) - (HPP) - (Biaya)
    const labaBersih = totalRevenue - totalHPP - totalExpenses;

    // Cash Flow Summary (Actual Money)
    const cashIn = transactionsInPeriod.filter(t => t.type === TransactionType.IN).reduce((sum, t) => sum + t.amount, 0);
    const cashOut = transactionsInPeriod.filter(t => t.type === TransactionType.OUT).reduce((sum, t) => sum + t.amount, 0);
    
    // Non-P&L Balance Sheet Items
    const totalModal = transactionsInPeriod
      .filter(t => t.category === TransactionCategory.MODAL)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalStockBuy = transactionsInPeriod
      .filter(t => t.category === TransactionCategory.BELI_STOK)
      .reduce((sum, t) => sum + t.amount, 0);

    return { 
      totalRevenue, 
      totalHPP, 
      totalExpenses,
      totalMaterialUsageCost,
      totalCashExpenses,
      labaBersih,
      cashIn,
      cashOut,
      totalModal,
      totalStockBuy
    };
  }, [state, startDate, endDate]);

  const exportToExcel = () => {
    const ws_data = [
      ["LAPORAN KEUANGAN UMKM PRO"],
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

    const filteredTransactions = state.transactions
      .filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    filteredTransactions.forEach(t => {
      ws_data.push([
        formatDate(t.date), 
        t.description, 
        t.category, 
        t.type, 
        t.amount
      ]);
    });

    // Add Production Usage details as a separate section for completeness
    ws_data.push([]);
    ws_data.push(["V. RINCIAN PEMAKAIAN BAHAN BAKU (NON-KAS)"]);
    ws_data.push(["Tanggal", "Nama Bahan", "Jumlah", "Nilai Biaya (IDR)"]);
    
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
    
    // Auto-width columns for better readability
    const wscols = [
      {wch: 15}, // Tanggal
      {wch: 40}, // Keterangan
      {wch: 20}, // Kategori
      {wch: 10}, // Tipe
      {wch: 20}, // Nominal
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan");
    XLSX.writeFile(wb, `Laporan_Keuangan_UMKM_${startDate}_ke_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Date Filter & Export Section */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit and Loss Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Calculator size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Laba Rugi Periode</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Metode Penjualan - HPP - Biaya</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-indigo-50 rounded-full text-[10px] font-black text-indigo-700 uppercase">
                {formatDate(startDate)} - {formatDate(endDate)}
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Formula Visualization */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs">+</div>
                    <span className="text-slate-600 font-medium text-sm">Penjualan (Kas Masuk Penjualan)</span>
                  </div>
                  <span className="font-bold text-slate-900 text-lg">{formatCurrency(reportData.totalRevenue)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold text-xs">-</div>
                    <span className="text-slate-600 font-medium text-sm">HPP (Modal Barang FIFO)</span>
                  </div>
                  <span className="font-bold text-red-500 text-lg">{formatCurrency(reportData.totalHPP)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold text-xs">-</div>
                    <span className="text-slate-600 font-medium text-sm">Biaya (Operasional & Bahan Baku)</span>
                  </div>
                  <span className="font-bold text-red-500 text-lg">{formatCurrency(reportData.totalExpenses)}</span>
                </div>
              </section>

              {/* Final Result */}
              <div className="pt-8 border-t-2 border-dashed border-slate-100">
                <div className={`p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 ${reportData.labaBersih >= 0 ? 'bg-emerald-600' : 'bg-red-600'} shadow-xl shadow-opacity-20`}>
                  <div>
                    <h4 className="text-white/80 text-[11px] font-black uppercase tracking-[0.2em] mb-1">UNTUNG / LABA BERSIH</h4>
                    <p className="text-4xl font-black text-white leading-tight">{formatCurrency(reportData.labaBersih)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-4 py-2 bg-white/20 rounded-xl backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest border border-white/10">
                      Status: {reportData.labaBersih >= 0 ? 'MENGUNTUNGKAN' : 'KERUGIAN'}
                    </span>
                    <div className="text-white/60 text-[10px] font-medium italic">Berdasarkan data {formatDate(startDate)} - {formatDate(endDate)}</div>
                  </div>
                </div>
              </div>

              {/* Explanatory Note */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <div className="p-1">
                  <Info size={16} className="text-slate-400 mt-0.5" />
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] text-slate-500 leading-relaxed font-semibold uppercase tracking-tight">Informasi Logika Laporan</p>
                   <p className="text-[10px] text-slate-400 leading-relaxed">
                     Laba Bersih dihitung berdasarkan total kas masuk yang dikategorikan sebagai 'Penjualan'. 
                     HPP dihitung otomatis dari nilai beli barang yang keluar sesuai urutan waktu (FIFO). 
                     Biaya mencakup biaya operasional tunai dan nilai pemakaian stok produksi internal.
                   </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Summary & Asset Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <WalletMinimal size={18} className="text-slate-400" />
              <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Ringkasan Arus Kas</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Total Kas Masuk (Actual)</span>
                <span className="font-bold text-green-600">{formatCurrency(reportData.cashIn)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Total Kas Keluar (Actual)</span>
                <span className="font-bold text-red-600">{formatCurrency(reportData.cashOut)}</span>
              </div>
              <div className="h-px bg-slate-100"></div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 uppercase">Arus Kas Bersih</span>
                <span className={`text-lg font-black ${reportData.cashIn - reportData.cashOut >= 0 ? 'text-slate-900' : 'text-red-700'}`}>
                  {formatCurrency(reportData.cashIn - reportData.cashOut)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-950 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <TrendingUp size={80} />
            </div>
            <h3 className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-6 border-b border-white/10 pb-2">Informasi Lainnya</h3>
            <div className="space-y-6 relative z-10">
              <div>
                <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Injeksi Modal (Non-Laba)</p>
                <p className="text-xl font-black text-white">{formatCurrency(reportData.totalModal)}</p>
                <p className="text-[9px] text-indigo-500 mt-1 italic">Dana modal tidak dihitung sebagai keuntungan.</p>
              </div>
              <div>
                <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Pengadaan Stok (Aset)</p>
                <p className="text-xl font-black text-white">{formatCurrency(reportData.totalStockBuy)}</p>
                <p className="text-[9px] text-indigo-500 mt-1 italic">Pembelian stok adalah pemindahan kas ke aset.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
