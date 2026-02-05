
import React from 'react';
import { AppState, TransactionType, TransactionCategory, StockType } from '../types';
import { formatCurrency } from '../utils/format';
import { TrendingUp, TrendingDown, Package, Wallet, Factory } from 'lucide-react';

interface Props {
  state: AppState;
}

const Dashboard: React.FC<Props> = ({ state }) => {
  const totalCashIn = state.transactions
    .filter(t => t.type === TransactionType.IN)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCashOut = state.transactions
    .filter(t => t.type === TransactionType.OUT)
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = totalCashIn - totalCashOut;

  const saleStockValue = state.batches
    .filter(b => b.stockType === StockType.FOR_SALE)
    .reduce((sum, b) => sum + (b.currentQty * b.buyPrice), 0);

  const productionStockValue = state.batches
    .filter(b => b.stockType === StockType.FOR_PRODUCTION)
    .reduce((sum, b) => sum + (b.currentQty * b.buyPrice), 0);

  const totalSalesRevenue = state.transactions
    .filter(t => t.category === TransactionCategory.PENJUALAN && t.type === TransactionType.IN)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCOGS = state.sales.reduce((sum, s) => sum + s.totalCOGS, 0);
  
  const totalCashExpenses = state.transactions
    .filter(t => t.category === TransactionCategory.BIAYA)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalProductionUsage = state.productionUsages.reduce((sum, u) => sum + u.totalCost, 0);
  
  const estimatedProfit = totalSalesRevenue - totalCOGS - totalCashExpenses - totalProductionUsage;

  const cards = [
    { title: 'Saldo Kas', value: currentBalance, icon: Wallet, color: 'bg-blue-600' },
    { title: 'Stok Jual', value: saleStockValue, icon: Package, color: 'bg-emerald-600' },
    { title: 'Stok Produksi', value: productionStockValue, icon: Factory, color: 'bg-indigo-600' },
    { title: 'Estimasi Laba', value: estimatedProfit, icon: TrendingUp, color: 'bg-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500">{card.title}</span>
              <div className={`${card.color} p-2 rounded-lg`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(card.value)}</div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold mb-4 text-slate-800">Arus Kas & Margin</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 uppercase font-bold mb-1">Total Pemasukan</span>
            <div className="flex items-center text-green-600 font-bold text-xl">
              <TrendingUp className="w-5 h-5 mr-2" />
              {formatCurrency(totalCashIn)}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 uppercase font-bold mb-1">Total Pengeluaran</span>
            <div className="flex items-center text-red-600 font-bold text-xl">
              <TrendingDown className="w-5 h-5 mr-2" />
              {formatCurrency(totalCashOut)}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 uppercase font-bold mb-1">Kas Masuk Penjualan</span>
            <div className="flex items-center text-indigo-600 font-bold text-xl">
              <TrendingUp className="w-5 h-5 mr-2" />
              {formatCurrency(totalSalesRevenue)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
