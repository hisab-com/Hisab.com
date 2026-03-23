import React from 'react';
import PageHeader from '../../components/PageHeader';
import { Plus, Package, Edit, Trash2, Search } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';

export default function ProductList({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    
    const products = [
        { id: 1, name: 'Rice (1kg)', price: 65, stock: 100, category: 'Grocery' },
        { id: 2, name: 'Oil (1L)', price: 160, stock: 50, category: 'Grocery' },
        { id: 3, name: 'Sugar (1kg)', price: 130, stock: 80, category: 'Grocery' },
        { id: 4, name: 'Salt (1kg)', price: 40, stock: 200, category: 'Grocery' },
    ];

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader 
                title={t.productList} 
                onBack={onBack} 
                rightContent={
                    <button className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                        <Plus className="h-5 w-5" />
                    </button>
                } 
            />
            
            <div className="p-4 bg-white border-b border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input type="text" placeholder="Search products..." className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-xl focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {products.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div className="flex items-center">
                            <div className={`h-10 w-10 rounded-lg ${themeClasses.lightBg} ${themeClasses.primaryText} flex items-center justify-center mr-3`}>
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{p.name}</h3>
                                <div className="text-xs text-slate-500 flex space-x-2">
                                    <span>{formatCurrency(p.price)}</span>
                                    <span>•</span>
                                    <span>Stock: {p.stock}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <button className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Edit className="h-4 w-4" /></button>
                            <button className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
