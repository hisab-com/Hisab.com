import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { Search, Calendar, Download, Loader2, ShoppingCart, User, Package, DollarSign } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, PURCHASES_COLLECTION, Query } from '../../lib/appwrite';

export default function PurchaseReports({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPurchases();
    }, [shop.$id]);

    const fetchPurchases = async () => {
        setLoading(true);
        try {
            const res = await databases.listDocuments(DB_ID, PURCHASES_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]);
            setPurchases(res.documents);
        } catch (error) {
            console.error('Error fetching purchases:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPurchases = purchases.filter(p => 
        p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.$id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPurchaseAmount = filteredPurchases.reduce((acc, p) => acc + (p.total_amount || 0), 0);

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader title={t.purchaseReports || "Purchase Reports"} onBack={onBack} />

            <div className="p-4 space-y-4">
                {/* Summary Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Purchase</p>
                        <h2 className="text-2xl font-black text-slate-800">{formatCurrency(totalPurchaseAmount)}</h2>
                    </div>
                    <div className={`h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center`}>
                        <ShoppingCart className="h-6 w-6" />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search supplier or ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                        />
                    </div>
                    <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600">
                        <Calendar className="h-5 w-5" />
                    </button>
                </div>

                {/* Purchase List */}
                <div className="space-y-3 pb-20">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText} mb-2`} />
                            <p className="text-sm text-slate-500">Loading purchases...</p>
                        </div>
                    ) : filteredPurchases.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                            <ShoppingCart className="h-12 w-12 text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-500">No purchases found</p>
                        </div>
                    ) : (
                        filteredPurchases.map(purchase => (
                            <div key={purchase.$id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center">
                                        <User className="h-3 w-3 mr-1 text-slate-400" /> {purchase.supplier_name || 'Unknown Supplier'}
                                    </h3>
                                    <div className="text-[10px] text-slate-400 font-medium mt-1">
                                        {new Date(purchase.$createdAt).toLocaleString()} • ID: {purchase.$id.slice(-6).toUpperCase()}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-blue-600">{formatCurrency(purchase.total_amount)}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Paid</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
