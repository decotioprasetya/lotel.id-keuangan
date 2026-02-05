
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Transaction, TransactionType, TransactionCategory, StockBatch, Sale, SaleItemUsage, ProductionUsage } from './types';
import { loadState, saveState } from './utils/storage';
import Dashboard from './components/Dashboard';
import CashBook from './components/CashBook';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Reports from './components/Reports';
import { LayoutDashboard, Wallet, Package, ShoppingCart, BarChart3, Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(loadState());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: crypto.randomUUID(),
    };
    setState(prev => ({
      ...prev,
      transactions: [...prev.transactions, newTransaction]
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    const trans = state.transactions.find(t => t.id === id);
    if (!trans) return;

    if (trans.relatedSaleId) {
      if (confirm("Transaksi ini terkait dengan Penjualan. Hapus penjualannya saja untuk membatalkan stok dan kas?")) {
        deleteSale(trans.relatedSaleId);
      }
      return;
    }

    if (trans.relatedStockBatchId) {
       if (confirm("Transaksi ini terkait dengan Stok Masuk. Hapus batch stok tersebut?")) {
         deleteBatch(trans.relatedStockBatchId);
       }
       return;
    }

    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
  }, [state.transactions]);

  const addBatch = useCallback((b: Omit<StockBatch, 'id' | 'currentQty' | 'totalCost'>) => {
    const id = crypto.randomUUID();
    const newBatch: StockBatch = {
      ...b,
      id,
      currentQty: b.initialQty,
      totalCost: b.initialQty * b.buyPrice
    };

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      date: b.date,
      amount: newBatch.totalCost,
      description: `Beli Stok: ${b.productName} (${b.initialQty} unit)`,
      category: TransactionCategory.BELI_STOK,
      type: TransactionType.OUT,
      relatedStockBatchId: id
    };

    setState(prev => ({
      ...prev,
      batches: [...prev.batches, newBatch],
      transactions: [...prev.transactions, newTransaction]
    }));
  }, []);

  const deleteBatch = useCallback((id: string) => {
    const batch = state.batches.find(b => b.id === id);
    if (!batch) return;

    if (batch.currentQty < batch.initialQty) {
      alert("Batch ini tidak bisa dihapus karena sudah ada barang yang digunakan/terjual. Hapus transaksi terkait terlebih dahulu.");
      return;
    }

    setState(prev => ({
      ...prev,
      batches: prev.batches.filter(b => b.id !== id),
      transactions: prev.transactions.filter(t => t.relatedStockBatchId !== id)
    }));
  }, [state.batches]);

  const addProductionUsage = useCallback((u: { date: string, productName: string, qty: number }) => {
    let remainingToUse = u.qty;
    let totalUsageCost = 0;
    const usages: SaleItemUsage[] = [];

    const productBatches = [...state.batches]
      .filter(b => b.productName === u.productName && b.currentQty > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const updatedBatches = [...state.batches];

    for (const batch of productBatches) {
      if (remainingToUse <= 0) break;
      const batchIndex = updatedBatches.findIndex(b => b.id === batch.id);
      const take = Math.min(batch.currentQty, remainingToUse);
      remainingToUse -= take;
      totalUsageCost += take * batch.buyPrice;
      usages.push({ batchId: batch.id, qtyUsed: take, costPerUnit: batch.buyPrice });
      updatedBatches[batchIndex] = { ...updatedBatches[batchIndex], currentQty: updatedBatches[batchIndex].currentQty - take };
    }

    if (remainingToUse > 0) {
      alert("Stok bahan tidak cukup.");
      return;
    }

    const usageId = crypto.randomUUID();
    const newUsage: ProductionUsage = {
      id: usageId,
      date: u.date,
      productName: u.productName,
      qty: u.qty,
      totalCost: totalUsageCost,
      batchUsages: usages
    };

    setState(prev => ({
      ...prev,
      batches: updatedBatches,
      productionUsages: [...prev.productionUsages, newUsage]
    }));
  }, [state.batches]);

  const deleteProductionUsage = useCallback((id: string) => {
    const usage = state.productionUsages.find(u => u.id === id);
    if (!usage) return;

    const updatedBatches = [...state.batches];
    usage.batchUsages.forEach(item => {
      const idx = updatedBatches.findIndex(b => b.id === item.batchId);
      if (idx !== -1) updatedBatches[idx].currentQty += item.qtyUsed;
    });

    setState(prev => ({
      ...prev,
      batches: updatedBatches,
      productionUsages: prev.productionUsages.filter(u => u.id !== id)
    }));
  }, [state.productionUsages, state.batches]);

  const addSale = useCallback((s: { date: string, productName: string, qty: number, sellPrice: number }) => {
    let remainingToSell = s.qty;
    let totalCOGS = 0;
    const usages: SaleItemUsage[] = [];

    const productBatches = [...state.batches]
      .filter(b => b.productName === s.productName && b.currentQty > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const updatedBatches = [...state.batches];

    for (const batch of productBatches) {
      if (remainingToSell <= 0) break;
      const batchIndex = updatedBatches.findIndex(b => b.id === batch.id);
      const take = Math.min(batch.currentQty, remainingToSell);
      remainingToSell -= take;
      totalCOGS += take * batch.buyPrice;
      usages.push({ batchId: batch.id, qtyUsed: take, costPerUnit: batch.buyPrice });
      updatedBatches[batchIndex] = { ...updatedBatches[batchIndex], currentQty: updatedBatches[batchIndex].currentQty - take };
    }

    if (remainingToSell > 0) {
      alert("Kesalahan: Stok tidak cukup.");
      return;
    }

    const saleId = crypto.randomUUID();
    const totalRevenue = s.qty * s.sellPrice;

    const newSale: Sale = {
      id: saleId,
      date: s.date,
      productName: s.productName,
      qty: s.qty,
      sellPrice: s.sellPrice,
      totalRevenue,
      totalCOGS,
      batchUsages: usages
    };

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      date: s.date,
      amount: totalRevenue,
      description: `Jual: ${s.productName} (${s.qty} unit)`,
      category: TransactionCategory.PENJUALAN,
      type: TransactionType.IN,
      relatedSaleId: saleId
    };

    setState(prev => ({
      ...prev,
      batches: updatedBatches,
      sales: [...prev.sales, newSale],
      transactions: [...prev.transactions, newTransaction]
    }));
  }, [state.batches]);

  const deleteSale = useCallback((id: string) => {
    const sale = state.sales.find(s => s.id === id);
    if (!sale) return;

    const updatedBatches = [...state.batches];
    sale.batchUsages.forEach(usage => {
      const idx = updatedBatches.findIndex(b => b.id === usage.batchId);
      if (idx !== -1) updatedBatches[idx].currentQty += usage.qtyUsed;
    });

    setState(prev => ({
      ...prev,
      batches: updatedBatches,
      sales: prev.sales.filter(s => s.id !== id),
      transactions: prev.transactions.filter(t => t.relatedSaleId !== id)
    }));
  }, [state.sales, state.batches]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cash', label: 'Buku Kas', icon: Wallet },
    { id: 'inventory', label: 'Stok Barang', icon: Package },
    { id: 'sales', label: 'Penjualan', icon: ShoppingCart },
    { id: 'reports', label: 'Laporan', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header - Tetap Sticky */}
      <div className="md:hidden bg-indigo-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <h1 className="text-xl font-bold italic tracking-tighter">UMKM PRO</h1>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1 hover:bg-white/10 rounded-lg transition"
        >
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar - z-index dinaikkan ke 60 agar di atas Mobile Header saat terbuka */}
      <aside className={`
        fixed inset-y-0 left-0 z-[60] w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 hidden md:block">
            <h1 className="text-2xl font-black text-white italic tracking-tighter">UMKM PRO</h1>
            <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Sistem Kelola Usaha Mandiri</p>
          </div>
          
          <nav className="flex-1 px-4 mt-8 md:mt-4 space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium text-sm
                  ${activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' 
                    : 'hover:bg-slate-800 hover:text-white'}
                `}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold border border-slate-600">U</div>
              <div>
                <p className="text-sm font-bold text-white">Owner UMKM</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Basic Tier</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay - z-index disesuaikan di bawah Sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Main Content - Spacing dirapikan untuk mobile */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-6 hidden md:flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-sm text-slate-500 font-medium">Monitoring operasional bisnis Anda</p>
          </div>
          <div className="text-sm text-slate-400 font-semibold px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Jarak tambahan untuk mobile agar tidak mepet dengan header sticky */}
        <div className="max-w-7xl mx-auto pt-2 md:pt-0">
          {activeTab === 'dashboard' && <Dashboard state={state} />}
          {activeTab === 'cash' && (
            <CashBook 
              transactions={state.transactions} 
              onAdd={addTransaction} 
              onAddBatch={addBatch}
              onDelete={deleteTransaction} 
            />
          )}
          {activeTab === 'inventory' && (
            <Inventory 
              batches={state.batches} 
              productionUsages={state.productionUsages}
              onAddBatch={addBatch} 
              onDeleteBatch={deleteBatch} 
              onUseProductionStock={addProductionUsage}
              onDeleteProductionUsage={deleteProductionUsage}
            />
          )}
          {activeTab === 'sales' && (
            <Sales 
              sales={state.sales} 
              batches={state.batches} 
              onAddSale={addSale} 
              onDeleteSale={deleteSale} 
            />
          )}
          {activeTab === 'reports' && <Reports state={state} />}
        </div>
      </main>
    </div>
  );
};

export default App;
