
import { AppState } from '../types';

const STORAGE_KEY = 'umkm_pro_data_v2';

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const loadState = (): AppState => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return { transactions: [], batches: [], sales: [], productionUsages: [] };
  try {
    const parsed = JSON.parse(data);
    return {
      transactions: parsed.transactions || [],
      batches: parsed.batches || [],
      sales: parsed.sales || [],
      productionUsages: parsed.productionUsages || []
    };
  } catch {
    return { transactions: [], batches: [], sales: [], productionUsages: [] };
  }
};
