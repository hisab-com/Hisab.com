import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { Search, ShoppingCart } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';

export default function Sale({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    const [cart, setCart] = useState<any[]>([]);
    
    // Mock products
    const products = [
        { id: 1, name: 'Rice (1kg)', price: 65, stock: 100 },
        { id: 2, name: 'Oil (1L)', price: 160, stock: 50 },
        { id: 3, name: 'Sugar (1kg)', price: 130, stock: 80 },
        { id: 4, name: 'Salt (1kg)', price: 40, stock: 200 },
    ];

    const addToCart = (product: any) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
        } else {
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader title={t.sale} onBack={onBack} />
            
            {/* Search Bar */}
            <div className="p-4 bg-white border-b border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input type="text" placeholder="Search products..." className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-xl focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all" />
                </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-3">
                    {products.map(p => (
                        <div key={p.id} onClick={() => addToCart(p)} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm active:scale-95 transition-transform cursor-pointer">
                            <h3 className="font-bold text-slate-800 text-sm mb-1">{p.name}</h3>
                            <div className="flex justify-between items-center">
                                <span className={`font-bold ${themeClasses.primaryText}`}>{formatCurrency(p.price)}</span>
                                <span className="text-xs text-slate-500">Stock: {p.stock}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cart Summary Bottom Bar */}
            <div className="bg-white border-t border-slate-200 p-4 pb-safe">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center text-slate-600">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        <span className="font-medium">{cart.length} Items</span>
                    </div>
                    <div className="text-xl font-bold text-slate-900">Total: {formatCurrency(total)}</div>
                </div>
                <button className={`w-full py-3 rounded-xl font-bold text-white ${themeClasses.primaryBg} ${themeClasses.primaryHoverBg} transition-colors shadow-md`}>
                    Checkout
                </button>
            </div>
        </div>
    );
}
