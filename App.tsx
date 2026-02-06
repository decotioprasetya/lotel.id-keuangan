import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Transaction, TransactionType, TransactionCategory, StockBatch, Sale, SaleItemUsage, ProductionUsage } from './types';
import Dashboard from './components/Dashboard';
import CashBook from './components/CashBook';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Reports from './components/Reports';
import Login from './components/Login';
import Settings from './components/Settings';
import Production from './components/Production'; // Import Komponen Baru
import { supabase } from './utils/supabase';
import { LayoutDashboard, Wallet, Package, ShoppingCart, BarChart3, Menu, X, Cloud, LogOut, Settings as SettingsIcon, CloudCheck, PackagePlus } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [state, setState] = useState<AppState>({ transactions: [], batches: [], sales: [], productionUsages: [] });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [businessName, setBusinessName] = useState('UMKM PRO');

  const mapBatch = (b: any): StockBatch => ({ id: b.id, date: b.date, productName: b.product_name, initialQty: b.initial_qty, currentQty: b.current_qty, buyPrice: Number(b.buy_price), totalCost: Number(b.total_cost), stockType: b.stock_type });
  const mapTrans = (t: any): Transaction => ({ id: t.id, date: t.date, amount: Number(t.amount), description: t.description, category: t.category, type: t.type, relatedSaleId: t.related_sale_id, relatedStockBatchId: t.related_stock_batch_id });
  const mapSale = (s: any): Sale => ({ id: s.id, date: s.date, productName: s.product_name, qty: s.qty, sellPrice: Number(s.sell_price), totalRevenue: Number(s.total_revenue), totalCOGS: Number(s.total_cogs), batchUsages: s.batch_usages });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: prof } = await supabase.from('profile').select('business_name').maybeSingle();
      if (prof) setBusinessName(prof.business_name);
      const [t, b, s, p] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('batches').select('*').order('date', { ascending: true }),
        supabase.from('sales').select('*').order('date', { ascending: false }),
        supabase.from('production_usages').select('*').order('date', { ascending: false })
      ]);
      setState({
        transactions: (t.data || []).map(mapTrans),
        batches: (b.data || []).map(mapBatch),
        sales: (s.data || []).map(mapSale),
        productionUsages: (p.data || []).map((u: any) => ({ ...u, totalCost: Number(u.total_cost) }))
      });
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) fetchData(); else setIsLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (session) fetchData(); });
    return () => subscription.unsubscribe();
  }, []);

  const addBatch = async (b: any) => {
    const cost = b.initialQty * b.buyPrice;
    const { data: bD } = await supabase.from('batches').insert([{ date: b.date, product_name: b.productName, initial_qty: b.initialQty, current_qty: b.initialQty, buy_price: b.buyPrice, total_cost: cost, stock_type: b.stockType }]).select();
    if (bD) await supabase.from('transactions').insert([{ date: b.date, amount: cost, description: `Beli: ${b.productName}`, category: TransactionCategory.BELI_STOK, type: TransactionType.OUT, related_stock_batch_id: bD[0].id }]);
    fetchData();
  };

  const addSale = async (s: any) => {
    let rem = s.qty; let cogs = 0; const usg: any[] = [];
    const pB = [...state.batches].filter(b => b.productName === s.productName && b.currentQty > 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (pB.reduce((sum, b) => sum + b.currentQty, 0) < s.qty) return alert("Stok kurang!");
    for (const b of pB) { if (rem <= 0) break; const take = Math.min(b.currentQty, rem); rem -= take; cogs += take * b.buyPrice; usg.push({ batchId: b.id, qtyUsed: take, costPerUnit: b.buyPrice }); await supabase.from('batches').update({ current_qty: b.currentQty - take }).eq('id', b.id); }
    const { data: sD } = await supabase.from('sales').insert([{ date: s.date, product_name: s.product_name, qty: s.qty, sell_price: s.sellPrice, total_revenue: s.qty * s.sellPrice, total_cogs: cogs, batch_usages: usg }]).select();
    if (sD) await supabase.from('transactions').insert([{ date: s.date, amount: s.qty * s.sellPrice, description: `Jual: ${s.productName}`, category: TransactionCategory.PENJUALAN, type: TransactionType.IN, related_sale_id: sD[0].id }]);
    fetchData();
  };

  // FUNGSI PRODUKSI BARU
  const addProduction = async (p: any) => {
    setIsLoading(true);
    try {
      // 1. Potong Stok Bahan Baku
      for (const ing of p.ingredients) {
        const { data: b } = await supabase.from('batches').select('current_qty').eq('id', ing.batchId).single();
        if (b) await supabase.from('batches').update({ current_qty: b.current_qty - ing.qty }).eq('id', ing.batchId);
      }
      // 2. Tambah Stok Barang Jadi (Batch Baru)
      await supabase.from('batches').insert([{ 
        date: new Date().toISOString().split('T')[0], 
        product_name: p.productName, 
        initial_qty: p.qty, 
        current_qty: p.qty, 
        buy_price: p.hpp, 
        total_cost: p.hpp * p.qty, 
        stock_type: 'HASIL_PRODUKSI' 
      }]);
      // 3. Catat Biaya Operasional di Buku Kas
      if (p.totalOpCost > 0) {
        await supabase.from('transactions').insert([{ 
          date: new Date().toISOString().split('T')[0], 
          amount: p.totalOpCost, 
          description: `Biaya Produksi: ${p.productName}`, 
          category: TransactionCategory.OPERASIONAL, 
          type: TransactionType.OUT 
        }]);
      }
      // 4. Simpan Riwayat Produksi ke tabel productions
      await supabase.from('productions').insert([{ 
        result_product_name: p.productName, 
        result_qty: p.qty, 
        total_ingredient_cost: (p.hpp * p.qty) - p.totalOpCost, 
        total_op_cost: p.totalOpCost, 
        hpp_per_unit: p.hpp, 
        op_costs_detail: p.opCosts, 
        ingredients_detail: p.ingredients, 
        user_id: session?.user.id 
      }]);
      
      await fetchData();
      setActiveTab('inventory'); // Pindah ke inventory buat liat hasilnya
    } catch (e) { 
      console.error(e); 
      alert("Gagal memproses produksi!"); 
    } finally { 
      setIsLoading(false); 
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold">Menghubungkan ke Cloud...</div>;
  if (!session) return <Login onLoginSuccess={() => {}} />;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cash', label: 'Buku Kas', icon: Wallet },
    { id: 'inventory', label: 'Stok Barang', icon: Package },
    { id: 'production', label: 'Produksi', icon: PackagePlus }, // Tab Baru
    { id: 'sales', label: 'Penjualan', icon: ShoppingCart },
    { id: 'reports', label: 'Laporan', icon: BarChart3 },
    { id: 'settings', label: 'Pengaturan', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 transform transition-transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 text-white font-black italic flex items-center gap-2"><Cloud className="text-indigo-500" /> {businessName}</div>
        <nav className="p-4 space-y-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
              <tab.icon size={20} /> {tab.label}
            </button>
          ))}
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="absolute bottom-6 left-6 text-slate-500 hover:text-red-400 flex items-center gap-2 text-xs font-bold"><LogOut size={14} /> Keluar</button>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard state={state} />}
          {activeTab === 'cash' && (
            <CashBook 
              transactions={state.transactions} 
              onAdd={(t:any) => supabase.from('transactions').insert([t]).then(() => fetchData())} 
              onAddBatch={addBatch} 
              onDelete={(id) => window.confirm("Hapus transaksi ini, Bre?") && supabase.from('transactions').delete().eq('id', id).then(() => fetchData())} 
            />
          )}
          {activeTab === 'inventory' && (
            <Inventory 
              batches={state.batches} 
              productionUsages={state.productionUsages} 
              onAddBatch={addBatch} 
              onDeleteBatch={(id) => window.confirm("Hapus data stok ini?") && supabase.from('batches').delete().eq('id', id).then(() => fetchData())} 
              onUseProductionStock={() => {}} 
              onDeleteProductionUsage={() => {}} 
            />
          )}
          {activeTab === 'production' && (
            <Production 
              batches={state.batches} 
              onAddProduction={addProduction} 
            />
          )}
          {activeTab === 'sales' && (
            <Sales 
              sales={state.sales} 
              batches={state.batches} 
              onAddSale={addSale} 
              onDeleteSale={(id) => window.confirm("Hapus penjualan? Stok otomatis kembali.") && supabase.from('sales').delete().eq('id', id).then(() => fetchData())} 
            />
          )}
          {activeTab === 'reports' && <Reports state={state} businessName={businessName} />}
          {activeTab === 'settings' && <Settings userId={session.user.id} onNameUpdated={(n) => setBusinessName(n)} />}
        </div>
      </main>
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden fixed bottom-4 right-4 p-4 bg-indigo-600 text-white rounded-full shadow-lg z-50"><Menu size={24} /></button>
    </div>
  );
};

export default App;
