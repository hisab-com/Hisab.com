import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { Search, RotateCcw, Calendar, User, Hash, DollarSign, Package, Loader2 } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, PURCHASES_COLLECTION, Query } from '../../lib/appwrite';

export default function PurchaseReturn({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    const [loading, setLoading] = useState(true);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPurchases();
    }, [shop.$id]);

    const fetchPurchases = async () => {
        try {
            setLoading(true);
            const res = await databases.listDocuments(DB_ID, PURCHASES_COLLECTION || 'purchases', [
                Query.equal('shop_id', shop.$id),
                Query.orderDesc('date'),
                Query.limit(50)
            ]);
            setPurchases(res.documents);
        } catch (error) {
            console.error('Error fetching purchases for return:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPurchases = purchases.filter(p => 
        p.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader title={t.purchaseReturn || "Purchase Return"} onBack={onBack} />
            
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
                <div className="relative group">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:${themeClasses.primaryText.split(' ')[0]} transition-colors`} />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by Invoice or Supplier..." 
                        className="w-full pl-12 pr-4 py-3 bg-slate-100 border border-transparent rounded-2xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-100 outline-none transition-all text-sm font-medium" 
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 className="h-10 w-10 animate-spin mb-4" />
                        <p className="font-medium">Loading purchase history...</p>
                    </div>
                ) : filteredPurchases.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <RotateCcw className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No purchases found to return</p>
                    </div>
                ) : filteredPurchases.map(purchase => (
                    <div key={purchase.$id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer group">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                                    <Hash className="h-3 w-3 mr-1" /> {purchase.invoice_no}
                                </div>
                                <h3 className="font-bold text-slate-800 flex items-center">
                                    <User className="h-4 w-4 mr-2 text-slate-400" /> {purchase.supplier_name}
                                </h3>
                            </div>
                            <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                Returnable
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                            <div className="flex items-center">
                                <Calendar className="h-4 w-4 text-slate-400 mr-2" />
                                <span className="text-xs font-medium text-slate-600">{new Date(purchase.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-end">
                                <DollarSign className="h-4 w-4 text-rose-500 mr-1" />
                                <span className="text-sm font-black text-slate-800">{formatCurrency(purchase.total_amount)}</span>
                            </div>
                        </div>

                        <div className="mt-3 flex justify-between items-center">
                            <div className="flex items-center text-slate-400">
                                <Package className="h-4 w-4 mr-1" />
                                <span className="text-xs font-medium">Click to process return</span>
                            </div>
                            <button className={`p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-opacity-80 transition-all`}>
                                <RotateCcw className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="p-4 bg-white border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Select a purchase to initiate a return process</p>
            </div>
        </div>
    );
}
