
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Transaction, TransactionType, TransactionCategory, StockBatch, Sale, SaleItemUsage, ProductionUsage } from './types';
import Dashboard from './components/Dashboard';
import CashBook from './components/CashBook';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Reports from './components/Reports';
import Login from './components/Login';
import { supabase } from './utils/supabase';
import { LayoutDashboard, Wallet, Package, ShoppingCart, BarChart3, Menu, X, Cloud, LogOut, CloudCheck } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [state, setState] = useState<AppState>({ transactions: [], batches: [], sales: [], productionUsages: [] });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Mappers to bridge Application (camelCase) and Database (snake_case)
  const mapBatchFromDB = (b: any): StockBatch => ({
    id: b.id,
    date: b.date,
    productName: b.product_name,
    initialQty: b.initial_qty,
    currentQty: b.current_qty,
    buyPrice: Number(b.buy_price),
    totalCost: Number(b.total_cost),
    stockType: b.stock_type
  });

  const mapTransactionFromDB = (t: any): Transaction => ({
    id: t.id,
    date: t.date,
    amount: Number(t.amount),
    description: t.description,
    category: t.category,
    type: t.type,
    relatedSaleId: t.related_sale_id,
    relatedStockBatchId: t.related_stock_batch_id
  });

  const mapSaleFromDB = (s: any): Sale => ({
    id: s.id,
    date: s.date,
    productName: s.product_name,
    qty: s.qty,
    sellPrice: Number(s.sell_price),
    totalRevenue: Number(s.total_revenue),
    totalCOGS: Number(s.total_cogs),
    batchUsages: s.batch_usages
  });

  const mapProductionFromDB = (p: any): ProductionUsage => ({
    id: p.id,
    date: p.date,
    productName: p.product_name,
    qty: p.qty,
    totalCost: Number(p.total_cost),
    batchUsages: p.batch_usages
  });

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [transRes, batchRes, saleRes, prodRes] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('batches').select('*').order('date', { ascending: true }),
        supabase.from('sales').select('*').order('date', { ascending: false }),
        supabase.from('production_usages').select('*').order('date', { ascending: false })
      ]);

      setState({
        transactions: (transRes.data || []).map(mapTransactionFromDB),
        batches: (batchRes.data || []).map(mapBatchFromDB),
        sales: (saleRes.data || []).map(mapSaleFromDB),
        productionUsages: (prodRes.data || []).map(mapProductionFromDB)
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAllData();
      else setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAllData();
      else {
        setState({ transactions: [], batches: [], sales: [], productionUsages: [] });
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
    const dbData: any = {
      date: t.date,
      amount: t.amount,
      description: t.description,
      category: t.category,
      type: t.type
    };

    if (t.relatedSaleId) dbData.related_sale_id = t.relatedSaleId;
    if (t.relatedStockBatchId) dbData.related_stock_batch_id = t.relatedStockBatchId;

    const { data, error } = await supabase.from('transactions').insert([dbData]).select();
    if (error) { alert(error.message); return; }
    setState(prev => ({ ...prev, transactions: [mapTransactionFromDB(data[0]), ...prev.transactions] }));
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    const trans = state.transactions.find(t => t.id === id);
    if (!trans) return;

    if (trans.relatedSaleId || trans.relatedStockBatchId) {
      alert("Transaksi ini terhubung dengan Penjualan atau Stok. Silakan hapus data di menu Penjualan atau Stok Barang untuk membatalkan.");
      return;
    }

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
  }, [state.transactions]);

  const addBatch = useCallback(async (b: Omit<StockBatch, 'id' | 'currentQty' | 'totalCost'>) => {
    const totalCost = b.initialQty * b.buyPrice;
    const dbBatch = {
      date: b.date,
      product_name: b.productName,
      initial_qty: b.initialQty,
      current_qty: b.initialQty,
      buy_price: b.buyPrice,
      total_cost: totalCost,
      stock_type: b.stockType
    };

    const { data: batchData, error: batchError } = await supabase.from('batches').insert([dbBatch]).select();
    if (batchError) { alert(batchError.message); return; }

    const dbTrans = {
      date: b.date,
      amount: totalCost,
      description: `Beli Stok: ${b.productName} (${b.initialQty} unit)`,
      category: TransactionCategory.BELI_STOK,
      type: TransactionType.OUT,
      related_stock_batch_id: batchData[0].id
    };

    const { data: transData } = await supabase.from('transactions').insert([dbTrans]).select();
    
    setState(prev => ({
      ...prev,
      batches: [...prev.batches, mapBatchFromDB(batchData[0])],
      transactions: [mapTransactionFromDB(transData![0]), ...prev.transactions]
    }));
  }, []);

  const deleteBatch = useCallback(async (id: string) => {
    const batch = state.batches.find(b => b.id === id);
    if (!batch) return;
    if (batch.currentQty < batch.initialQty) {
      alert("Batch ini sudah ada yang terjual/terpakai. Tidak bisa dihapus.");
      return;
    }
    
    await supabase.from('transactions').delete().eq('related_stock_batch_id', id);
    const { error } = await supabase.from('batches').delete().eq('id', id);
    
    if (error) { alert(error.message); return; }
    setState(prev => ({ 
      ...prev, 
      batches: prev.batches.filter(b => b.id !== id),
      transactions: prev.transactions.filter(t => t.relatedStockBatchId !== id)
    }));
  }, [state.batches]);

  const addProductionUsage = useCallback(async (u: { date: string, productName: string, qty: number }) => {
    let remaining = u.qty;
    let totalUsageCost = 0;
    const usages: SaleItemUsage[] = [];
    const productBatches = [...state.batches]
      .filter(b => b.productName === u.productName && b.currentQty > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (productBatches.reduce((s, b) => s + b.currentQty, 0) < u.qty) {
      alert("Stok bahan tidak cukup.");
      return;
    }

    for (const batch of productBatches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.currentQty, remaining);
      remaining -= take;
      totalUsageCost += take * batch.buyPrice;
      usages.push({ batchId: batch.id, qtyUsed: take, costPerUnit: batch.buyPrice });
      
      await supabase.from('batches').update({ current_qty: batch.currentQty - take }).eq('id', batch.id);
    }

    await supabase.from('production_usages').insert([{
      date: u.date,
      product_name: u.productName,
      qty: u.qty,
      total_cost: totalUsageCost,
      batch_usages: usages
    }]);

    fetchAllData();
  }, [state.batches]);

  const addSale = useCallback(async (s: { date: string, productName: string, qty: number, sellPrice: number }) => {
    let remaining = s.qty;
    let totalCOGS = 0;
    const usages: SaleItemUsage[] = [];
    const productBatches = [...state.batches]
      .filter(b => b.productName === s.productName && b.currentQty > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (productBatches.reduce((sum, b) => sum + b.currentQty, 0) < s.qty) {
      alert("Stok barang tidak cukup.");
      return;
    }

    for (const batch of productBatches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.currentQty, remaining);
      remaining -= take;
      totalCOGS += take * batch.buyPrice;
      usages.push({ batchId: batch.id, qtyUsed: take, costPerUnit: batch.buyPrice });
      
      await supabase.from('batches').update({ current_qty: batch.currentQty - take }).eq('id', batch.id);
    }

    const totalRevenue = s.qty * s.sellPrice;
    const { data: saleData } = await supabase.from('sales').insert([{
      date: s.date,
      product_name: s.productName,
      qty: s.qty,
      sell_price: s.sellPrice,
      total_revenue: totalRevenue,
      total_cogs: totalCOGS,
      batch_usages: usages
    }]).select();

    await supabase.from('transactions').insert([{
      date: s.date,
      amount: totalRevenue,
      description: `Jual: ${s.productName} (${s.qty} unit)`,
      category: TransactionCategory.PENJUALAN,
      type: TransactionType.IN,
      related_sale_id: saleData![0].id
    }]);

    fetchAllData();
  }, [state.batches]);

  const deleteSale = async (id: string) => {
    const sale = state.sales.find(s => s.id === id);
    if (!sale) return;

    if (confirm("Hapus penjualan? Stok akan dikembalikan otomatis.")) {
      for (const usage of sale.batchUsages) {
        const batch = state.batches.find(b => b.id === usage.batchId);
        if (batch) {
          await supabase.from('batches').update({ current_qty: batch.currentQty + usage.qtyUsed }).eq('id', batch.id);
        }
      }
      
      await supabase.from('transactions').delete().eq('related_sale_id', id);
      await supabase.from('sales').delete().eq('id', id);
      fetchAllData();
    }
  };

  const handleLogout = () => supabase.auth.signOut();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 mb-6 animate-bounce">
           <Cloud className="text-white w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Menghubungkan ke Cloud...</h2>
        <p className="text-slate-400 text-sm mt-2 font-medium">Sinkronisasi database sedang berlangsung</p>
      </div>
    );
  }

  if (!session) return <Login onLoginSuccess={() => {}} />;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cash', label: 'Buku Kas', icon: Wallet },
    { id: 'inventory', label: 'Stok Barang', icon: Package },
    { id: 'sales', label: 'Penjualan', icon: ShoppingCart },
    { id: 'reports', label: 'Laporan', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="md:hidden bg-indigo-900 text-white p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold italic tracking-tighter">UMKM PRO CLOUD</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 hidden md:block">
            <h1 className="text-2xl font-black text-white italic tracking-tighter flex items-center gap-2">
              <Cloud className="text-indigo-500" /> UMKM PRO
            </h1>
            <p className="text-[10px] text-slate-500 uppercase font-bold mt-1 tracking-widest">Enterprise Cloud Edition</p>
          </div>
          
          <nav className="flex-1 px-4 mt-4 space-y-2">
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

          <div className="p-6 border-t border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold border-2 border-indigo-500/30">U</div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{session.user.email}</p>
                <p className="text-[9px] text-green-500 flex items-center gap-1 font-bold uppercase tracking-widest"><CloudCheck size={10} /> Terhubung</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:bg-red-600 hover:text-white transition text-xs font-bold"
            >
              <LogOut size={14} /> Keluar Akun
            </button>
          </div>
        </div>
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50">
        <header className="mb-8 hidden md:flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 capitalize tracking-tight">{activeTab.replace('-', ' ')}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <CloudCheck size={14} className="text-indigo-500" />
              Tersinkronisasi otomatis ke cloud: <span className="font-bold">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}</span>
            </div>
          </div>
          <div className="text-sm text-slate-400 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Online
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
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
              onDeleteProductionUsage={async (id) => {
                await supabase.from('production_usages').delete().eq('id', id);
                fetchAllData();
              }}
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
