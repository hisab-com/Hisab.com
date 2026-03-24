import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { Trash2, Calendar, AlertTriangle, Package, Loader2, Search, Filter, CheckCircle2 } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, PRODUCTS_COLLECTION, Query } from '../../lib/appwrite';

export default function ExpireItems({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'expired' | 'upcoming'>('all');

    useEffect(() => {
        fetchExpiredProducts();
    }, [shop.$id]);

    const fetchExpiredProducts = async () => {
        setLoading(true);
        try {
            const res = await databases.listDocuments(DB_ID, PRODUCTS_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.equal('has_expiry', 'true'),
                Query.orderAsc('expire_date'),
                Query.limit(1000)
            ]);
            setProducts(res.documents);
        } catch (error) {
            console.error('Error fetching expired products:', error);
        } finally {
            setLoading(false);
        }
    };

    const isExpired = (dateStr: string) => {
        if (!dateStr) return false;
        const expireDate = new Date(dateStr);
        const today = new Date();
        return expireDate < today;
    };

    const isUpcoming = (dateStr: string) => {
        if (!dateStr) return false;
        const expireDate = new Date(dateStr);
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        return expireDate >= today && expireDate <= thirtyDaysFromNow;
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (filter === 'expired') return matchesSearch && isExpired(p.expire_date);
        if (filter === 'upcoming') return matchesSearch && isUpcoming(p.expire_date);
        return matchesSearch;
    });

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader title={t.expireItems || "Expire Items"} onBack={onBack} />
            
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-10">
                <div className="flex flex-col space-y-3">
                    <div className="relative group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:${themeClasses.primaryText.split(' ')[0]} transition-colors`} />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t.searchPlaceholder || "Search products..."} 
                            className="w-full pl-12 pr-4 py-3 bg-slate-100 border border-transparent rounded-2xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-100 outline-none transition-all text-sm font-medium" 
                        />
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setFilter('all')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setFilter('expired')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filter === 'expired' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            Expired
                        </button>
                        <button 
                            onClick={() => setFilter('upcoming')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filter === 'upcoming' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            Upcoming (30d)
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText} mb-3`} />
                        <p className="text-slate-500 text-sm font-medium">Checking expiry dates...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm">
                        <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">All Good!</h3>
                        <p className="text-slate-500 text-sm">No expired or upcoming items found.</p>
                    </div>
                ) : (
                    filteredProducts.map(p => {
                        const expired = isExpired(p.expire_date);
                        const upcoming = isUpcoming(p.expire_date);
                        
                        return (
                            <div key={p.$id} className={`bg-white p-4 rounded-2xl border ${expired ? 'border-red-100' : upcoming ? 'border-orange-100' : 'border-slate-100'} shadow-sm flex items-center`}>
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mr-4 ${expired ? 'bg-red-50 text-red-600' : upcoming ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                                    <Package className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 text-sm truncate">{p.name}</h3>
                                    <div className="flex items-center mt-1">
                                        <Calendar className={`h-3 w-3 mr-1 ${expired ? 'text-red-500' : upcoming ? 'text-orange-500' : 'text-slate-400'}`} />
                                        <span className={`text-[10px] font-bold ${expired ? 'text-red-600' : upcoming ? 'text-orange-600' : 'text-slate-500'}`}>
                                            {expired ? 'Expired on' : 'Expires on'}: {new Date(p.expire_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right ml-4">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Stock</p>
                                    <p className={`text-sm font-black ${expired ? 'text-red-600' : upcoming ? 'text-orange-600' : 'text-slate-800'}`}>
                                        {p.stock} {p.unit}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
