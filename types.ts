
export enum TransactionCategory {
  PENJUALAN = 'Penjualan',
  MODAL = 'Modal',
  BIAYA = 'Biaya',
  BELI_STOK = 'Beli Stok'
}

export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT'
}

export enum StockType {
  FOR_SALE = 'Dijual',
  FOR_PRODUCTION = 'Produksi'
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: TransactionCategory;
  type: TransactionType;
  relatedSaleId?: string;
  relatedStockBatchId?: string;
}

export interface StockBatch {
  id: string;
  date: string;
  productName: string;
  initialQty: number;
  currentQty: number;
  buyPrice: number;
  totalCost: number;
  stockType: StockType;
}

export interface SaleItemUsage {
  batchId: string;
  qtyUsed: number;
  costPerUnit: number;
}

export interface ProductionUsage {
  id: string;
  date: string;
  productName: string;
  qty: number;
  totalCost: number;
  batchUsages: SaleItemUsage[];
}

export interface Sale {
  id: string;
  date: string;
  productName: string;
  qty: number;
  sellPrice: number;
  totalRevenue: number;
  totalCOGS: number; // HPP
  batchUsages: SaleItemUsage[];
}

export interface AppState {
  transactions: Transaction[];
  batches: StockBatch[];
  sales: Sale[];
  productionUsages: ProductionUsage[];
}
