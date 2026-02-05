import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Transaction, TransactionType, TransactionCategory, StockBatch, Sale, SaleItemUsage, ProductionUsage } from './types';
import Dashboard from './components/Dashboard';
import CashBook from './components/CashBook';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Reports from './components/Reports';
import Login from './components/Login';
import Settings from './components/Settings';
import { supabase } from './utils/supabase';
import { LayoutDashboard, Wallet, Package, ShoppingCart, BarChart3, Menu, LogOut, Settings as SettingsIcon, Cloud } from 'lucide-react';

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
    const { data: prof } = await supabase.from('profile').select('business_name').maybeSingle();
    if (prof) setBusinessName(prof.business_name);
    const [t, b, s, p] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('batches').select('*').order('date', { ascending: true }),
      supabase.from('sales').select('*').order('date', { ascending: false }),
      supabase.from('production_usages').select('*').order('date', { ascending: false })
    ]);
    setState({ transactions: (t.data || []).map(mapTrans), batches: (b.data || []).map(mapBatch), sales: (s.data || []).map(mapSale), productionUsages: p.data || [] });
    setIsLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) fetchData(); else setIsLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (session) fetchData(); });
    return () => subscription.unsubscribe();
  }, []);

  const addBatch = async (b: any) => {
    const cost = b.initialQty * b.buyPrice;
    const { data: bD } = await supabase.from('batches').insert([{ date: b.date, product_name: b.productName, initial_qty: b.initialQty, current_qty: b.initialQty, buy_price: b.buyPrice, total_cost: cost, stock_type: b.stockType }]).select();
    await supabase.from('transactions').insert([{ date: b.date, amount: cost, description: `Beli: ${b.productName}`, category: TransactionCategory.BELI_STOK, type: TransactionType.OUT, related_stock_batch_id: bD![0].id }]);
    fetchData();
  };

  const addSale = async (s: any) => {
    let rem = s.qty; let cogs = 0; const usg: any[] = [];
    const pB = [...state.batches].filter(b => b.productName === s.productName && b.currentQty > 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const b of pB) { if (rem <= 0) break; const t = Math.min(b.currentQty, rem); rem -= t; cogs += t * b.buyPrice; usg.push({ batchId: b.id, qtyUsed: t, costPerUnit: b.buyPrice }); await supabase.from('batches').update({ current_qty: b.currentQty - t }).eq('id', b.id); }
    const rev = s.qty * s.sellPrice;
    const { data: sD } = await supabase.from('sales').insert([{ date: s.date, product_name: s.productName, qty: s.qty, sell_price: s.sellPrice, total_revenue: rev, total_cogs: cogs, batch_usages: usg }]).select();
    await supabase.from('transactions').insert([{ date: s.date, amount: rev, description: `Jual: ${s.productName}`, category: TransactionCategory.PENJUALAN, type: TransactionType.IN, related_sale_id: sD![0].id }]);
    fetchData();
  };

  if (isLoading) return <div className="p-20 text-center">Loading...</div>;
  if (!session) return <Login onLoginSuccess={() => {}} />;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cash', label: 'Kas', icon: Wallet },
    { id: 'inventory', label: 'Stok', icon: Package },
    { id: 'sales', label: 'Jual', icon: ShoppingCart },
    { id: 'reports', label: 'Laporan', icon: BarChart3 },
    { id: 'settings', label: 'Setting', icon: SettingsIcon }
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 transform transition-transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 text-white font-bold flex items-center gap-2"><Cloud className="text-indigo-400" /> {businessName}</div>
        <nav className="p-4 space-y-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${activeTab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <t.icon size={18} /> {t.label}
            </button>
          ))}
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="absolute bottom-4 left-6 text-slate-500 text-xs flex items-center gap-2"><LogOut size={14}/> Logout</button>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {activeTab === 'dashboard' && <Dashboard state={state} />}
        {activeTab === 'cash' && <CashBook transactions={state.transactions} onAdd={(t:any) => { supabase.from('transactions').insert([t]).then(() => fetchData()); }} onAddBatch={addBatch} onDelete={() => {}} />}
        {activeTab === 'inventory' && <Inventory batches={state.batches} productionUsages={state.productionUsages} onAddBatch={addBatch} onDeleteBatch={() => {}} onUseProductionStock={() => {}} onDeleteProductionUsage={() => {}} />}
        {activeTab === 'sales' && <Sales sales={state.sales} batches={state.batches} onAddSale={addSale} onDeleteSale={() => {}} />}
        {activeTab === 'reports' && <Reports state={state} businessName={businessName} />}
        {activeTab === 'settings' && <Settings userId={session.user.id} onNameUpdated={(n) => setBusinessName(n)} />}
      </main>
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden fixed bottom-4 right-4 p-4 bg-indigo-600 text-white rounded-full shadow-lg"><Menu size={24} /></button>
    </div>
  );
};

export default App;
