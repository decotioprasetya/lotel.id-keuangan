import React, { useState, useEffect } from 'react';
import { AppState, Transaction, TransactionType, TransactionCategory, StockBatch, Sale, StockType } from './types';
import Dashboard from './components/Dashboard';
import CashBook from './components/CashBook';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Reports from './components/Reports';
import Login from './components/Login';
import Settings from './components/Settings';
import Production from './components/Production'; 
import { supabase } from './utils/supabase';
import { LayoutDashboard, Wallet, Package, ShoppingCart, BarChart3, Menu, Cloud, LogOut, Settings as SettingsIcon, PackagePlus } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [state, setState] = useState<AppState>({ transactions: [], batches: [], sales: [], productionUsages: [] });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [businessName, setBusinessName] = useState('UMKM PRO');

  // Mapping Data Database ke State
  const mapBatch = (b: any): StockBatch => ({ id: b.id, date: b.date, productName: b.product_name, initialQty: b.initial_qty, currentQty: b.current_qty, buyPrice: Number(b.buy_price), totalCost: Number(b.total_cost), stockType: b.stock_type });
  const mapTrans = (t: any): Transaction => ({ id: t.id, date: t.date, amount: Number(t.amount), description: t.description, category: t.category, type: t.type, relatedSaleId: t.related_sale_id, relatedStockBatchId: t.related_stock_batch_id });
  const mapSale = (s: any): Sale => ({ id: s.id, date: s.date, productName: s.product_name, qty: s.qty, sell_price: s.sell_price, totalRevenue: Number(s.total_revenue), totalCOGS: Number(s.total_cogs), batchUsages: s.batch_usages });

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
        productionUsages: (p.data || []).map((u: any) => ({ 
          id: u.id, date: u.date, productName: u.product_name, targetProduct: u.target_product, 
          qty: u.qty, totalCost: Number(u.total_cost), batchId: u.batch_id 
        }))
      });
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) fetchData(); else setIsLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (session) fetchData(); });
    return () => subscription.unsubscribe();
  }, []);

  const addProduction = async (p: any) => {
    setIsLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const targetName = p.productName.trim();
    try {
      let totalIngCost = 0;
      let summary: string[] = [];

      for (const ing of p.ingredients) {
        const { data: b } = await supabase.from('batches').select('current_qty, buy_price, product_name').eq('id', ing.batchId).single();
        if (b) {
          const cost = Number(b.buy_price) * Number(ing.qty);
          totalIngCost += cost;
          summary.push(`${b.product_name} (${ing.qty})`);
          await supabase.from('batches').update({ current_qty: b.current_qty - ing.qty }).eq('id', ing.batchId);
          await supabase.from('production_usages').insert([{
            date: today, product_name: b.product_name, target_product: targetName, 
            qty: Number(ing.qty), total_cost: cost, batch_id: ing.batchId, user_id: session?.user.id 
          }]);
        }
      }
      
      await supabase.from('batches').insert([{ 
        date: today, product_name: targetName, initial_qty: p.qty, current_qty: p.qty, 
        buy_price: p.hpp, total_cost: p.hpp * p.qty, stock_type: StockType.FOR_SALE 
      }]);

      await supabase.from('transactions').insert([{ 
        date: today, amount: p.totalOpCost + totalIngCost, 
        description: `Produksi: ${targetName}. Bahan: ${summary.join(', ')}`, 
        category: TransactionCategory.BIAYA, type: TransactionType.OUT 
      }]);

      await fetchData();
      setActiveTab('production');
      alert(`Produksi ${targetName} Berhasil!`);
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  const addBatch = async (b: any) => {
    const cost = b.initialQty * b.buyPrice;
    const { data: bD } = await supabase.from('batches').insert([{ date: b.date, product_name: b.productName, initial_qty: b.initialQty, current_qty: b.initialQty, buy_price: b.buyPrice, total_cost: cost, stock_type: b.stock_type }]).select();
    if (bD) await supabase.from('transactions').insert([{ date: b.date, amount: cost, description: `Beli: ${b.productName}`, category: TransactionCategory.BELI_STOK, type: TransactionType.OUT, related_stock_batch_id: bD[0].id }]);
    fetchData();
  };

  const addSale = async (s: any) => {
    let rem = s.qty; let cogs = 0; const usg: any[] = [];
    const pB = [...state.batches].filter(b => b.productName === s.productName && b.currentQty > 0 && b.stockType === StockType.FOR_SALE).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (pB.reduce((sum, b) => sum + b.currentQty, 0) < s.qty) return alert("Stok kurang!");
    for (const b of pB) { if (rem <= 0) break; const take = Math.min(b.currentQty, rem); rem -= take; cogs += take * b.buyPrice; usg.push({ batchId: b.id, qtyUsed: take, costPerUnit: b.buyPrice }); await supabase.from('batches').update({ current_qty: b.current_qty - take }).eq('id', b.id); }
    const { data: sD } = await supabase.from('sales').insert([{ date: s.date, product_name: s.productName, qty: s.qty, sell_price: s.sellPrice, total_revenue: s.qty * s.sellPrice, total_cogs: cogs, batch_usages: usg }]).select();
    if (sD) await supabase.from('transactions').insert([{ date: s.date, amount: s.qty * s.sellPrice, description: `Jual: ${s.productName}`, category: TransactionCategory.PENJUALAN, type: TransactionType.IN, related_sale_id: sD[0].id }]);
    fetchData();
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-black italic text-slate-400">MEMUAT...</div>;
  if (!session) return <Login onLoginSuccess={() => {}} />;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 transform transition-transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 text-white font-black italic flex items-center gap-2 border-b border-slate-800 uppercase tracking-tighter"><Cloud className="text-indigo-500" /> {businessName}</div>
        <nav className="p-4 space-y-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-800'}`}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-auto h-screen">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard state={state} />}
          {activeTab === 'cash' && <CashBook transactions={state.transactions} onAdd={(t:any) => fetchData()} onAddBatch={addBatch} onDelete={() => fetchData()} />}
          {activeTab === 'inventory' && <Inventory batches={state.batches} productionUsages={state.productionUsages} onAddBatch={addBatch} onDeleteBatch={() => fetchData()} onUseProductionStock={() => {}} onDeleteProductionUsage={() => fetchData()} />}
          {activeTab === 'production' && <Production batches={state.batches} productionUsages={state.productionUsages} onAddProduction={addProduction} />}
          {activeTab === 'sales' && <Sales sales={state.sales} batches={state.batches} onAddSale={addSale} onDeleteSale={() => fetchData()} />}
          {activeTab === 'reports' && <Reports state={state} businessName={businessName} />}
          {activeTab === 'settings' && <Settings userId={session.user.id} onNameUpdated={(n) => setBusinessName(n)} />}
        </div>
      </main>
    </div>
  );
};

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'cash', label: 'Buku Kas', icon: Wallet },
  { id: 'inventory', label: 'Stok Barang', icon: Package },
  { id: 'production', label: 'Produksi', icon: PackagePlus },
  { id: 'sales', label: 'Penjualan', icon: ShoppingCart },
  { id: 'reports', label: 'Laporan', icon: BarChart3 },
  { id: 'settings', label: 'Pengaturan', icon: SettingsIcon },
];

export default App;
