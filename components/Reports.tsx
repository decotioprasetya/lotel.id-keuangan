import React, { useState, useMemo } from 'react';
import { AppState, TransactionCategory, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { FileDown, ArrowRight, Calculator, TrendingUp, CalendarDays, Percent } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props { state: AppState; businessName: string; }

const Reports: React.FC<Props> = ({ state, businessName }) => {
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const data = useMemo(() => {
    const s = new Date(startDate); const e = new Date(endDate); e.setHours(23, 59, 59, 999);
    const trans = state.transactions.filter(t => { const d = new Date(t.date); return d >= s && d <= e; });
    const sales = state.sales.filter(sl => { const d = new Date(sl.date); return d >= s && d <= e; });
    const prod = state.productionUsages.filter(u => { const d = new Date(u.date); return d >= s && d <= e; });

    const rev = trans.filter(t => t.category === TransactionCategory.PENJUALAN && t.type === TransactionType.IN).reduce((a, b) => a + b.amount, 0);
    const hpp = sales.reduce((a, b) => a + b.totalCOGS, 0);
    const cashExp = trans.filter(t => t.category === TransactionCategory.BIAYA).reduce((a, b) => a + b.amount, 0);
    const matExp = prod.reduce((a, b) => a + b.totalCost, 0);
    const laba = rev - hpp - (cashExp + matExp);
    const cIn = trans.filter(t => t.type === TransactionType.IN).reduce((a, b) => a + b.amount, 0);
    const cOut = trans.filter(t => t.type === TransactionType.OUT).reduce((a, b) => a + b.amount, 0);

    return { rev, hpp, exp: cashExp + matExp, laba, cIn, cOut };
  }, [state, startDate, endDate]);

  const exportExcel = () => {
    const rows = [
      [`LAPORAN KEUANGAN: ${businessName.toUpperCase()}`],
      [`Periode: ${startDate} s/d ${endDate}`],
      [],
      ["KETERANGAN", "NOMINAL"],
      ["Total Penjualan", data.rev],
      ["Total HPP", data.hpp],
      ["Total Biaya Operasional", data.exp],
      ["LABA BERSIH", data.laba],
      [],
      ["RINGKASAN KAS"],
      ["Total Kas Masuk", data.cIn],
      ["Total Kas Keluar", data.cOut],
      ["Saldo Bersih", data.cIn - data.cOut]
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `Laporan_${businessName}_${startDate}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-3">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-50 p-2 rounded-xl text-sm font-bold border-none outline-none" />
          <ArrowRight size={16} className="text-slate-300" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-50 p-2 rounded-xl text-sm font-bold border-none outline-none" />
        </div>
        <button onClick={exportExcel} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">
          <FileDown size={18} /> Ekspor Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="PENJUALAN" val={data.rev} icon={<TrendingUp />} color="text-emerald-600" bg="bg-emerald-50" />
        <Card title="HPP & BIAYA" val={data.hpp + data.exp} icon={<Calculator />} color="text-red-600" bg="bg-red-50" />
        <Card title="LABA BERSIH" val={data.laba} icon={<Percent />} color="text-indigo-600" bg="bg-indigo-50" border="border-2 border-indigo-100" />
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl text-white">
        <h4 className="font-bold mb-4 flex items-center gap-2 italic">RINGKASAN ARUS KAS</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-slate-800 pb-2"><span>Total Kas Masuk</span><span className="text-emerald-400 font-bold">{formatCurrency(data.cIn)}</span></div>
          <div className="flex justify-between border-b border-slate-800 pb-2"><span>Total Kas Keluar</span><span className="text-red-400 font-bold">{formatCurrency(data.cOut)}</span></div>
          <div className="flex justify-between pt-2 text-base font-black"><span>SALDO AKHIR</span><span className="text-indigo-400">{formatCurrency(data.cIn - data.cOut)}</span></div>
        </div>
      </div>
    </div>
  );
};

const Card = ({ title, val, icon, color, bg, border = "border border-slate-200" }: any) => (
  <div className={`p-6 rounded-2xl shadow-sm ${bg} ${border}`}>
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-white ${color}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className={`text-xl font-black ${color}`}>{formatCurrency(val)}</p>
      </div>
    </div>
  </div>
);

export default Reports;
