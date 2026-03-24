import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { Search, Package, Loader2, AlertTriangle, TrendingDown, TrendingUp, BarChart2 } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, PRODUCTS_COLLECTION, Query } from '../../lib/appwrite';

export default function StockReport({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProducts();
    }, [shop.$id]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await databases.listDocuments(DB_ID, PRODUCTS_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.limit(100)
            ]);
            setProducts(res.documents);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const lowStockProducts = filteredProducts.filter(p => p.stock <= (p.min_stock || 5));
    const totalInventoryValue = filteredProducts.reduce((acc, p) => acc + (p.stock * (p.purchase_price || 0)), 0);
    const totalPotentialValue = filteredProducts.reduce((acc, p) => acc + (p.stock * (p.sale_price || 0)), 0);

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader title={t.stockReport || "Stock Report"} onBack={onBack} />

            <div className="p-4 space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center text-blue-600 mb-1">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Inventory Value</span>
                        </div>
                        <div className="text-xl font-black text-slate-800">{formatCurrency(totalInventoryValue)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center text-emerald-600 mb-1">
                            <TrendingDown className="h-4 w-4 mr-1" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Potential Value</span>
                        </div>
                        <div className="text-xl font-black text-slate-800">{formatCurrency(totalPotentialValue)}</div>
                    </div>
                </div>

                {/* Low Stock Alert */}
                {lowStockProducts.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-bold text-amber-800">Low Stock Alert</h4>
                            <p className="text-xs text-amber-700 mt-0.5">{lowStockProducts.length} items are running low on stock.</p>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search products..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none shadow-sm"
                    />
                </div>

                {/* Stock List */}
                <div className="space-y-3 pb-20">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText} mb-2`} />
                            <p className="text-sm text-slate-500">Loading stock data...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                            <Package className="h-12 w-12 text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-500">No products found</p>
                        </div>
                    ) : (
                        filteredProducts.map(product => (
                            <div key={product.$id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 text-sm truncate">{product.name}</h3>
                                    <div className="flex items-center mt-1">
                                        <span className={`text-[10px] font-bold ${themeClasses.lightBg} ${themeClasses.primaryText} px-2 py-0.5 rounded-md mr-2`}>
                                            {product.category || 'Uncategorized'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            Unit: {product.unit || 'pcs'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right ml-4">
                                    <div className={`text-lg font-black ${product.stock <= (product.min_stock || 5) ? 'text-rose-600' : 'text-slate-800'}`}>
                                        {product.stock}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Stock</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
