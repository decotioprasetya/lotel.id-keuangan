import React, { useState, useEffect } from 'react';
import { AppState, Transaction, TransactionType, TransactionCategory, StockBatch, Sale, ProductionUsage } from './types';
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
    const { data: sD } = await supabase.from('sales').insert([{ date: s.date, product_name: s.productName, qty: s.qty, sell_price: s.sellPrice, total_revenue: s.qty * s.sellPrice, total_cogs: cogs, batch_usages: usg }]).select();
    if (sD) await supabase.from('transactions').insert([{ date: s.date, amount: s.qty * s.sellPrice, description: `Jual: ${s.productName}`, category: TransactionCategory.PENJUALAN, type: TransactionType.IN, related_sale_id: sD[0].id }]);
    fetchData();
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold">Menghubungkan ke Cloud...</div>;
  if (!session) return <Login onLoginSuccess={() => {}} />;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cash', label: 'Buku Kas', icon: Wallet },
    { id: 'inventory', label: 'Stok Barang', icon: Package },
