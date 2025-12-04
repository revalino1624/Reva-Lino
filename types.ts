export enum Role {
  ADMIN = 'ADMIN',
  KASIR = 'KASIR',
  GUDANG = 'GUDANG',
}

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number; // Selling price
  cost: number; // Buying price from supplier
  stock: number;
  minStock: number;
  unit: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  items: CartItem[];
  total: number;
  paymentMethod: 'CASH' | 'TEMPO';
  customerName?: string;
  cashierName: string;
  status: 'PAID' | 'PENDING'; // Pending for Tempo
  amountPaid: number;
}

export interface SupplierOrder {
  id: string;
  supplierName: string;
  date: string;
  items: { productName: string; quantity: number; cost: number }[];
  total: number;
  status: 'RECEIVED' | 'PENDING';
}

export type ViewState = 'DASHBOARD' | 'POS' | 'INVENTORY' | 'TRANSACTIONS' | 'DEBTS' | 'SETTINGS';
