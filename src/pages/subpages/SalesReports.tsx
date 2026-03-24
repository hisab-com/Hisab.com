import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { Search, Calendar, Download, FileText, Loader2, TrendingUp, User, ShoppingBag, DollarSign } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, SALES_COLLECTION, Query } from '../../lib/appwrite';

export default function SalesReports({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        fetchSales();
    }, [shop.$id, dateFilter]);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const queries = [
                Query.equal('shop_id', shop.$id),
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ];

            if (dateFilter) {
                // Appwrite doesn't have a direct date filter like this easily without complex queries
                // For now we'll just fetch and filter client side or use a simple query if possible
                // But let's assume we fetch the latest 100
            }

            const res = await databases.listDocuments(DB_ID, SALES_COLLECTION, queries);
            setSales(res.documents);
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSales = sales.filter(s => 
        s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.$id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalSalesAmount = filteredSales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const totalProfit = filteredSales.reduce((acc, s) => acc + (s.total_profit || 0), 0);

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader title={t.salesReports || "Sales Reports"} onBack={onBack} />

            <div className="p-4 space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center text-emerald-600 mb-1">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Total Sales</span>
                        </div>
                        <div className="text-xl font-black text-slate-800">{formatCurrency(totalSalesAmount)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center text-blue-600 mb-1">
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Total Profit</span>
                        </div>
                        <div className="text-xl font-black text-slate-800">{formatCurrency(totalProfit)}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search customer or ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                    </div>
                    <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600">
                        <Calendar className="h-5 w-5" />
                    </button>
                    <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600">
                        <Download className="h-5 w-5" />
                    </button>
                </div>

                {/* Sales List */}
                <div className="space-y-3 pb-20">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText} mb-2`} />
                            <p className="text-sm text-slate-500">Loading sales...</p>
                        </div>
                    ) : filteredSales.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                            <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-500">No sales found</p>
                        </div>
                    ) : (
                        filteredSales.map(sale => (
                            <div key={sale.$id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                                <div>
                                    <div className="flex items-center mb-1">
                                        <User className="h-3 w-3 text-slate-400 mr-1" />
                                        <span className="text-sm font-bold text-slate-800">{sale.customer_name || 'Walking Customer'}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                        {new Date(sale.$createdAt).toLocaleString()} • ID: {sale.$id.slice(-6).toUpperCase()}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-slate-900">{formatCurrency(sale.total_amount)}</div>
                                    <div className="text-[10px] font-bold text-emerald-600">Profit: {formatCurrency(sale.total_profit || 0)}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
