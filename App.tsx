import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Transaction, TransactionType, TransactionCategory, StockBatch, Sale, SaleItemUsage, ProductionUsage } from './types';
import Dashboard from './components/Dashboard';
import CashBook from './components/CashBook';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Reports from './components/Reports';
import Login from './components/Login';
import Settings from './components/Settings'; // 1. Pastikan lo buat file ini ya Bre!
import { supabase } from './utils/supabase';
import { LayoutDashboard, Wallet, Package, ShoppingCart, BarChart3, Menu, X, Cloud, LogOut, CloudCheck, Settings as SettingsIcon } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [state, setState] = useState<AppState>({ transactions: [], batches: [], sales: [], productionUsages: [] });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 2. State untuk Nama UMKM Dinamis
  const [businessName, setBusinessName] = useState('UMKM PRO');

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
      // 3. Tarik Nama Bisnis dari Supabase
      const { data: profileData } = await supabase.from('profile').select('business_name').single();
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
      related_stock_batch_id
