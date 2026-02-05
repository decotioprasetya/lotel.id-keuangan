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
import { LayoutDashboard, Wallet, Package, ShoppingCart, BarChart3, Menu, X, Cloud, LogOut, CloudCheck, Settings as SettingsIcon } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [state, setState] = useState<AppState>({ transactions: [], batches: [], sales: [], productionUsages: [] });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [businessName, setBusinessName] = useState('UMKM PRO');

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
      alert("Transaksi ini terhubung dengan Penjualan atau Stok. Silakan hapus data di menu Penjualan atau Stok Barang.");
      return;
    }
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
  }, [state.transactions]);

  const addBatch = useCallback(async (b: Omit<StockBatch, 'id' | 'currentQty' | 'totalCost'>) => {
    const totalCost = b.initialQty * b.buyPrice;
    const dbBatch = {
      date: b.date, product_name: b.productName, initial_qty: b.initialQty,
      current_qty: b.initialQty, buy_price: b.buyPrice, total_cost: totalCost, stock_type: b.stockType
    };

    const { data: batchData, error: batchError } = await supabase.from('batches').insert([dbBatch]).select();
    if (batchError) { alert(batchError.message); return; }

    const dbTrans = {
      date: b.date, amount: totalCost, description: `Beli Stok: ${b.productName}`,
      category: TransactionCategory.BELI_STOK, type: TransactionType.OUT, related_stock_batch_id: batchData[0].id
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
    if (!batch || batch.currentQty < batch.initialQty) {
      alert("Stok sudah terpakai, tidak bisa dihapus.");
      return;
    }
    await supabase.from('transactions').delete().eq('related_stock_batch_id', id);
    await supabase.from('batches').delete().eq('id', id);
    fetchAllData();
  }, [state.batches]);

  const addProductionUsage = useCallback(async (u: { date: string, productName: string, qty: number }) => {
    let remaining = u.qty;
    let totalUsageCost = 0;
    const usages: SaleItemUsage[] = [];
    const productBatches = [...state.batches]
      .filter(b => b.productName === u.productName && b.currentQty > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (productBatches.reduce((s, b) => s + b.currentQty, 0) < u.qty) {
      alert("Stok tidak cukup."); return;
    }

    for (const batch of productBatches) {
      if (remaining <= 0)
