import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  History, 
  Wallet, 
  LogOut, 
  User as UserIcon,
  Search,
  Plus,
  AlertTriangle,
  TrendingUp,
  BrainCircuit,
  Trash2,
  CheckCircle,
  X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Role, User, Product, Transaction, ViewState, CartItem } from './types';
import { analyzeBusinessData } from './services/geminiService';

// --- MOCK DATA ---
const MOCK_USERS: User[] = [
  { id: '1', name: 'Budi (Admin)', role: Role.ADMIN },
  { id: '2', name: 'Siti (Kasir)', role: Role.KASIR },
  { id: '3', name: 'Joko (Gudang)', role: Role.GUDANG },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Semen Tiga Roda 50kg', category: 'Material Dasar', price: 65000, cost: 58000, stock: 150, minStock: 20, unit: 'Sak' },
  { id: '2', name: 'Cat Tembok Dulux Putih 5kg', category: 'Cat & Pelapis', price: 145000, cost: 120000, stock: 15, minStock: 5, unit: 'Kaleng' },
  { id: '3', name: 'Paku Beton 5cm', category: 'Perkakas', price: 25000, cost: 15000, stock: 8, minStock: 10, unit: 'Box' },
  { id: '4', name: 'Pasir Beton', category: 'Material Dasar', price: 250000, cost: 200000, stock: 40, minStock: 5, unit: 'Pick Up' },
  { id: '5', name: 'Bata Merah', category: 'Material Dasar', price: 800, cost: 600, stock: 5000, minStock: 1000, unit: 'Pcs' },
  { id: '6', name: 'Thinner A Special', category: 'Cat & Pelapis', price: 35000, cost: 28000, stock: 24, minStock: 10, unit: 'Kaleng' },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { 
    id: 'TRX-001', date: new Date().toISOString(), items: [{...INITIAL_PRODUCTS[0], quantity: 2}], 
    total: 130000, paymentMethod: 'CASH', cashierName: 'Siti', status: 'PAID', amountPaid: 130000 
  },
  { 
    id: 'TRX-002', date: new Date(Date.now() - 86400000).toISOString(), items: [{...INITIAL_PRODUCTS[4], quantity: 500}], 
    total: 400000, paymentMethod: 'TEMPO', customerName: 'Pak Ahmad (Proyek)', cashierName: 'Siti', status: 'PENDING', amountPaid: 100000 
  },
];

// --- COMPONENTS ---

const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

const Card = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-6 ${className}`}>{children}</div>
);

const Badge = ({ children, type }: { children?: React.ReactNode; type: 'success' | 'warning' | 'danger' | 'neutral' }) => {
  const colors = {
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-rose-100 text-rose-800',
    neutral: 'bg-slate-100 text-slate-800',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[type]}`}>{children}</span>;
};

// --- MAIN APP ---

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Gemini State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // POS State
  const [searchTerm, setSearchTerm] = useState('');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TEMPO'>('CASH');
  const [amountPaid, setAmountPaid] = useState(0);

  // Computed Data
  const lowStockProducts = products.filter(p => p.stock <= p.minStock);
  const totalRevenue = transactions.reduce((acc, curr) => acc + curr.total, 0);
  const totalProfit = transactions.reduce((acc, curr) => {
    const cost = curr.items.reduce((c, i) => c + (i.cost * i.quantity), 0);
    return acc + (curr.total - cost);
  }, 0);
  const pendingDebts = transactions.filter(t => t.paymentMethod === 'TEMPO' && t.status === 'PENDING');

  // Login Handler
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4">
              <Package className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">BangunanPro</h1>
            <p className="text-slate-500">Sistem Manajemen Toko Bangunan</p>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-center text-slate-400 mb-4">Pilih peran untuk simulasi login:</p>
            {MOCK_USERS.map((u) => (
              <button
                key={u.id}
                onClick={() => { setUser(u); setView(u.role === Role.KASIR ? 'POS' : 'DASHBOARD'); }}
                className="w-full p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-4 group"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  u.role === Role.ADMIN ? 'bg-purple-100 text-purple-600' :
                  u.role === Role.KASIR ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  <UserIcon size={20} />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-700 group-hover:text-blue-700">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- LOGIC HANDLERS ---

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        if (newQty > (products.find(p => p.id === id)?.stock || 0)) return item; // Prevent overselling
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  const handleCheckout = () => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newTx: Transaction = {
      id: `TRX-${Date.now()}`,
      date: new Date().toISOString(),
      items: [...cart],
      total,
      paymentMethod,
      customerName: paymentMethod === 'TEMPO' ? customerName : 'Umum',
      cashierName: user.name,
      status: paymentMethod === 'CASH' || amountPaid >= total ? 'PAID' : 'PENDING',
      amountPaid: amountPaid
    };

    // Update Stock
    setProducts(prev => prev.map(p => {
      const inCart = cart.find(c => c.id === p.id);
      return inCart ? { ...p, stock: p.stock - inCart.quantity } : p;
    }));

    setTransactions([newTx, ...transactions]);
    setCart([]);
    setCheckoutModalOpen(false);
    setAmountPaid(0);
    setCustomerName('');
    alert("Transaksi Berhasil!");
  };

  const handleAiAsk = async () => {
    if (!aiPrompt) return;
    setIsAiThinking(true);
    const response = await analyzeBusinessData(products, transactions, aiPrompt);
    setAiResponse(response);
    setIsAiThinking(false);
  };

  // --- VIEWS ---

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Penjualan</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatRupiah(totalRevenue)}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><TrendingUp size={20} /></div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
           <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Keuntungan Bersih</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatRupiah(totalProfit)}</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Wallet size={20} /></div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
           <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Stok Menipis</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{lowStockProducts.length} Item</h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><AlertTriangle size={20} /></div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-rose-500">
           <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Piutang Belum Lunas</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {formatRupiah(pendingDebts.reduce((sum, t) => sum + (t.total - t.amountPaid), 0))}
              </h3>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><History size={20} /></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <Card className="h-full">
            <h3 className="font-bold text-slate-700 mb-6">Grafik Penjualan</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transactions.slice(0, 5).reverse()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="id" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
           </Card>
        </div>
        
        {/* Gemini AI Widget */}
        <div className="lg:col-span-1">
          <Card className="h-full bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
            <div className="flex items-center gap-2 mb-4">
              <BrainCircuit className="text-indigo-600" />
              <h3 className="font-bold text-indigo-900">AI Business Assistant</h3>
            </div>
            <div className="h-[200px] overflow-y-auto mb-4 bg-white/50 rounded-lg p-3 text-sm text-slate-700 border border-indigo-50">
               {aiResponse ? (
                 <div className="prose prose-sm"><p>{aiResponse}</p></div>
               ) : (
                 <p className="text-slate-400 italic">Tanyakan tentang data penjualan, stok, atau strategi bisnis...</p>
               )}
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Misal: Barang apa paling laris?"
                className="flex-1 text-sm rounded-lg border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button 
                onClick={handleAiAsk}
                disabled={isAiThinking}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isAiThinking ? '...' : 'Tanya'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderPOS = () => {
    const totalCart = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
      <div className="flex h-[calc(100vh-140px)] gap-6">
        {/* Product Grid */}
        <div className="flex-1 flex flex-col">
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Cari produk..." 
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-4 pr-2">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => handleAddToCart(product)}
                className={`bg-white p-4 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all group relative overflow-hidden ${product.stock <= 0 ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="absolute top-2 right-2 bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-medium">
                  {product.stock} {product.unit}
                </div>
                <div className="h-24 bg-slate-50 rounded-lg mb-3 flex items-center justify-center text-slate-300">
                  <Package size={32} />
                </div>
                <h4 className="font-semibold text-slate-700 text-sm mb-1 leading-tight h-10 overflow-hidden">{product.name}</h4>
                <p className="text-blue-600 font-bold">{formatRupiah(product.price)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className="w-[380px] bg-white rounded-2xl shadow-xl flex flex-col border border-slate-200">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart size={20} className="text-blue-600" />
              Keranjang Belanja
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <ShoppingCart size={48} className="mb-2 opacity-20" />
                <p>Keranjang kosong</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex gap-3 bg-slate-50 p-3 rounded-xl">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-700 text-sm truncate">{item.name}</h4>
                    <p className="text-blue-600 font-bold text-sm">{formatRupiah(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-lg px-1 border border-slate-200">
                    <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 hover:text-red-500">-</button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 hover:text-green-500">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-5 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
            <div className="flex justify-between mb-4">
              <span className="text-slate-500">Total</span>
              <span className="text-2xl font-bold text-slate-800">{formatRupiah(totalCart)}</span>
            </div>
            <button 
              onClick={() => setCheckoutModalOpen(true)}
              disabled={cart.length === 0}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-200"
            >
              Bayar Sekarang
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderInventory = () => (
    <Card>
      <div className="flex justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800">Stok Gudang</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={18} /> Tambah Produk
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">Produk</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Harga Beli</th>
              <th className="px-4 py-3">Harga Jual</th>
              <th className="px-4 py-3">Stok</th>
              <th className="px-4 py-3 rounded-r-lg">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-500">{p.category}</td>
                <td className="px-4 py-3 text-slate-500">{formatRupiah(p.cost)}</td>
                <td className="px-4 py-3 text-slate-500">{formatRupiah(p.price)}</td>
                <td className="px-4 py-3 font-medium">{p.stock} {p.unit}</td>
                <td className="px-4 py-3">
                  {p.stock <= 0 ? <Badge type="danger">Habis</Badge> : 
                   p.stock <= p.minStock ? <Badge type="warning">Menipis</Badge> : 
                   <Badge type="success">Aman</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderDebts = () => (
    <Card>
      <h3 className="text-xl font-bold text-slate-800 mb-6">Manajemen Piutang (Hutang Pelanggan)</h3>
      <div className="space-y-4">
        {pendingDebts.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Tidak ada data piutang.</p>
        ) : (
          pendingDebts.map(t => (
            <div key={t.id} className="flex flex-col md:flex-row justify-between items-center p-4 border border-slate-100 rounded-xl hover:shadow-sm bg-white">
              <div className="mb-4 md:mb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-800">{t.customerName}</span>
                  <span className="text-xs text-slate-400">#{t.id}</span>
                </div>
                <div className="text-sm text-slate-500">
                  Total: {formatRupiah(t.total)} • Terbayar: {formatRupiah(t.amountPaid)}
                </div>
                <div className="text-sm font-semibold text-rose-600 mt-1">
                  Sisa: {formatRupiah(t.total - t.amountPaid)}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Detail</button>
                <button 
                  onClick={() => {
                    const payAmount = t.total - t.amountPaid;
                    // Mock payment update
                    setTransactions(prev => prev.map(tr => 
                      tr.id === t.id ? { ...tr, amountPaid: tr.total, status: 'PAID' } : tr
                    ));
                  }}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Lunasi
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-600">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 fixed h-full z-10 hidden md:block">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-blue-700 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Package size={18} />
            </div>
            BangunanPro
          </h1>
        </div>
        <nav className="p-4 space-y-1">
          {user.role === Role.ADMIN && (
            <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${view === 'DASHBOARD' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
              <LayoutDashboard size={20} /> Dashboard
            </button>
          )}
          {(user.role === Role.ADMIN || user.role === Role.KASIR) && (
            <button onClick={() => setView('POS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${view === 'POS' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
              <ShoppingCart size={20} /> Kasir (POS)
            </button>
          )}
          {(user.role === Role.ADMIN || user.role === Role.GUDANG) && (
            <button onClick={() => setView('INVENTORY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${view === 'INVENTORY' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
              <Package size={20} /> Stok Gudang
            </button>
          )}
          <button onClick={() => setView('DEBTS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${view === 'DEBTS' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
            <Wallet size={20} /> Hutang & Piutang
          </button>
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <UserIcon size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
          <button onClick={() => setUser(null)} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-rose-200 text-rose-600 rounded-lg text-sm hover:bg-rose-50">
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 overflow-x-hidden">
        <header className="flex justify-between items-center mb-8 md:hidden">
          <h1 className="font-bold text-lg">BangunanPro</h1>
          <button className="p-2 bg-slate-100 rounded-lg"><UserIcon size={20}/></button>
        </header>

        {view === 'DASHBOARD' && renderDashboard()}
        {view === 'POS' && renderPOS()}
        {view === 'INVENTORY' && renderInventory()}
        {view === 'DEBTS' && renderDebts()}
      </main>

      {/* Checkout Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Pembayaran</h3>
              <button onClick={() => setCheckoutModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl text-center">
                <p className="text-slate-500 text-sm mb-1">Total Tagihan</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatRupiah(cart.reduce((sum, i) => sum + (i.price * i.quantity), 0))}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Metode Bayar</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2 rounded-lg border text-sm font-medium ${paymentMethod === 'CASH' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}
                  >
                    Cash / Tunai
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('TEMPO')}
                    className={`py-2 rounded-lg border text-sm font-medium ${paymentMethod === 'TEMPO' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200'}`}
                  >
                    Tempo (Hutang)
                  </button>
                </div>
              </div>

              {paymentMethod === 'TEMPO' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nama Pelanggan</label>
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Contoh: Pak Ahmad"
                  />
                  <label className="block text-sm font-medium text-slate-700 mt-3 mb-2">DP (Uang Muka)</label>
                  <input 
                    type="number" 
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100">
              <button 
                onClick={handleCheckout}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
              >
                Selesaikan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;