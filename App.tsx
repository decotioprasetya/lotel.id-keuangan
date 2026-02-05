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
import { LayoutDashboard, Wallet, Package, ShoppingCart, BarChart3, Menu, X, Cloud, LogOut, Settings as SettingsIcon } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [state, setState] = useState<AppState>({ transactions: [], batches: [], sales: [], productionUsages: [] });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [businessName, setBusinessName] = useState('UMKM PRO');

  const mapBatchFromDB = (b: any): StockBatch => ({
    id: b.id, date: b.date, productName: b.product_name, initialQty: b.initial_qty,
    currentQty: b.current_qty, buyPrice: Number(b.buy_price), totalCost: Number(b.total_cost), stockType: b.stock_type
  });

  const mapTransactionFromDB = (t: any): Transaction => ({
    id: t.id, date: t.date, amount: Number(t.amount), description: t.description,
    category: t.category, type: t.type, relatedSaleId: t.related_sale_id, relatedStockBatchId: t.related_stock_batch_id
  });

  const mapSaleFromDB = (s: any): Sale => ({
    id: s.id, date: s.date, productName: s.product_name, qty: s.qty, sellPrice: Number(s.sell_price),
    totalRevenue: Number(s.total_revenue), totalCOGS: Number(s.total_cogs), batchUsages: s.batch_usages
  });

  const mapProductionFromDB = (p: any): ProductionUsage => ({
    id: p.id, date: p.date, productName: p.product_name, qty: p.qty, totalCost: Number(p.total_cost), batchUsages: p.batch_usages
  });

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const { data: profileData } = await supabase.from('profile').select('business_name').maybeSingle();
      if (profileData) setBusinessName(profileData.business_name);

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
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
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
    const dbData: any = { date: t.date, amount: t.amount, description: t.description, category: t.category, type: t.type };
    if (t.relatedSaleId) dbData.related_sale_id = t.relatedSaleId;
    if (t.relatedStockBatchId) dbData.related_stock_batch_id = t.relatedStockBatchId;
    const { data, error } = await supabase.from('transactions').insert([dbData]).select();
    if (error) { alert(error.message); return; }
    setState(prev => ({ ...prev, transactions: [mapTransactionFromDB(data[0]), ...prev.transactions] }));
  }, []);

  const addBatch = useCallback(async (b: Omit<StockBatch, 'id' | 'currentQty' | 'totalCost'>) => {
    const totalCost = b.initialQty * b.buyPrice;
    const dbBatch = { date: b.date, product_name: b.productName, initial_qty: b.initialQty, current_qty: b.initialQty, buy_price: b.buyPrice, total_cost: totalCost, stock_type: b.stockType };
    const { data: batchData, error: batchError } = await supabase.from('batches').insert([dbBatch]).select();
    if (batchError) { alert(batchError.message); return; }
    const dbTrans = { date: b.date, amount: totalCost, description: `Beli Stok: ${b.productName}`, category: TransactionCategory.BELI_STOK, type: TransactionType.OUT, related_stock_batch_id: batchData[0].id };
    const { data: transData } = await supabase.from('transactions').insert([dbTrans]).select();
    setState(prev => ({ ...prev, batches: [...prev.batches, mapBatchFromDB(batchData[0])], transactions: [mapTransactionFromDB(transData![0]), ...prev.transactions] }));
  }, []);

  const addProductionUsage = useCallback(async (u: { date: string, productName: string, qty: number }) => {
    let remaining = u.qty; let totalCost = 0; const usages: SaleItemUsage[] = [];
    const pBatches = [...state.batches].filter(b => b.productName === u.productName && b.currentQty > 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (pBatches.reduce((s, b) => s + b.currentQty, 0) < u.qty) { alert("Stok kurang!"); return; }
    for (const b of pBatches) {
      if (remaining <= 0) break;
      const take = Math.min(b.currentQty, remaining);
      remaining -= take; totalCost += take * b.buyPrice;
      usages.push({ batchId: b.id, qtyUsed: take, costPerUnit: b.buyPrice });
      await supabase.from('batches').update({ current_qty: b.currentQty - take }).eq('id', b.id);
    }
    await supabase.from('production_usages').insert([{ date: u.date, product_name: u.productName, qty: u.qty, total_cost: totalCost, batch_usages: usages }]);
    fetchAllData();
  }, [state.batches]);

  const addSale = useCallback(async (s: { date: string, productName: string, qty: number, sellPrice: number }) => {
    let remaining = s.qty; let totalCOGS = 0; const usages: SaleItemUsage[] = [];
    const pBatches = [...state.batches].filter(b => b.productName === s.productName && b.currentQty > 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (pBatches.reduce((sum, b) => sum + b.currentQty, 0) < s.qty) { alert("Stok kurang!"); return; }
    for (const b of pBatches) {
      if (remaining <= 0) break;
      const take = Math.min(b.currentQty, remaining);
      remaining -= take; totalCOGS += take * b.buyPrice;
      usages.push({ batchId: b.id, qtyUsed: take, costPerUnit: b.buyPrice });
      await supabase.from('batches').update({ current_qty: b.currentQty - take }).eq('id', b.id);
    }
    const rev = s.qty * s.sellPrice;
    const { data: sData } = await supabase.from('sales').insert([{ date: s.date, product_name: s.productName, qty: s.qty, sell_price: s.sellPrice, total_revenue: rev, total_cogs: totalCOGS, batch_usages: usages }]).select();
    await supabase.from('transactions').insert([{ date: s.date, amount: rev, description: `Jual: ${s.productName}`, category: TransactionCategory.PENJUALAN, type: TransactionType.IN, related_sale_id: sData![0].id }]);
    fetchAllData();
  }, [state.batches]);

  const deleteSale = async (id: string) => {
    const sale = state.sales.find(s => s.id === id);
    if (!sale || !confirm("Hapus penjualan? Stok akan balik.")) return;
    for (const u of sale.batchUsages) {
      const b = state.batches.find(bt => bt.id === u.batchId);
      if (b) await supabase.from('batches').update({ current_qty: b.currentQty + u.qtyUsed }).eq('id', b.id);
    }
    await supabase.from('transactions').delete().eq('related_sale_id', id);
    await supabase.from('sales').delete().eq('id', id);
    fetchAllData();
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  if (!session) return <Login onLoginSuccess={() => {}} />;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cash', label: 'Buku Kas', icon: Wallet },
    { id: 'inventory', label: 'Stok Barang', icon: Package },
    { id: 'sales', label: 'Penjualan', icon: ShoppingCart },
    { id: 'reports', label: 'Laporan', icon: BarChart3 },
    { id: 'settings', label: 'Pengaturan', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transform transition-transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <h1 className="text-xl font-black text-white italic truncate flex items-center gap-2"><Cloud className="text-indigo-500" /> {businessName.toUpperCase()}</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap
