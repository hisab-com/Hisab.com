import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { Wallet, ArrowUpRight, ArrowDownLeft, History, Loader2, DollarSign, TrendingUp, TrendingDown, Calendar, Search, Filter } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, SALES_COLLECTION, PURCHASES_COLLECTION, EXPENSES_COLLECTION, DUES_COLLECTION, Query } from '../../lib/appwrite';

export default function CashBox({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSales: 0,
        totalPurchases: 0,
        totalExpenses: 0,
        totalDueGiven: 0,
        totalDueTaken: 0,
        cashInHand: 0
    });
    const [history, setHistory] = useState<any[]>([]);
    const [filter, setFilter] = useState('all'); // all, income, expense

    useEffect(() => {
        fetchCashData();
    }, [shop.$id]);

    const fetchCashData = async () => {
        setLoading(true);
        try {
            const queries = [Query.equal('shop_id', shop.$id), Query.limit(1000)];
            
            const [salesRes, purchasesRes, expensesRes, duesRes] = await Promise.all([
                databases.listDocuments(DB_ID, SALES_COLLECTION, queries),
                databases.listDocuments(DB_ID, PURCHASES_COLLECTION, queries),
                databases.listDocuments(DB_ID, EXPENSES_COLLECTION, queries),
                databases.listDocuments(DB_ID, DUES_COLLECTION, queries)
            ]);

            const totalSales = salesRes.documents.reduce((acc, curr) => acc + (curr.paid_amount || 0), 0);
            const totalPurchases = purchasesRes.documents.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
            const totalExpenses = expensesRes.documents.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            
            const totalDueGiven = duesRes.documents
                .filter(d => d.type === 'given')
                .reduce((acc, curr) => acc + (curr.amount || 0), 0);
            
            const totalDueTaken = duesRes.documents
                .filter(d => d.type === 'taken')
                .reduce((acc, curr) => acc + (curr.amount || 0), 0);

            const cashInHand = (totalSales + totalDueTaken) - (totalPurchases + totalExpenses + totalDueGiven);

            setStats({
                totalSales,
                totalPurchases,
                totalExpenses,
                totalDueGiven,
                totalDueTaken,
                cashInHand
            });

            // Combine into a history list
            const combinedHistory: any[] = [
                ...salesRes.documents.map(d => ({ ...d, type: 'income', category: 'Sale', amount: d.paid_amount, date: d.date || d.$createdAt })),
                ...purchasesRes.documents.map(d => ({ ...d, type: 'expense', category: 'Purchase', amount: d.total_amount, date: d.date || d.$createdAt })),
                ...expensesRes.documents.map(d => ({ ...d, type: 'expense', category: 'Expense', amount: d.amount, date: d.date || d.$createdAt })),
                ...duesRes.documents.map(d => ({ 
                    ...d, 
                    type: d.type === 'taken' ? 'income' : 'expense', 
                    category: d.type === 'taken' ? 'Due Taken' : 'Due Given', 
                    amount: d.amount, 
                    date: d.date || d.$createdAt 
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setHistory(combinedHistory);
        } catch (error) {
            console.error('Error fetching cash data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(item => {
        if (filter === 'income') return item.type === 'income';
        if (filter === 'expense') return item.type === 'expense';
        return true;
    });

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader title={t.cashBox || "Cash Box"} onBack={onBack} />
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {/* Cash Balance Card */}
                <div className={`${themeClasses.primaryBg} rounded-3xl p-8 text-white shadow-xl relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet className="h-32 w-32" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-white/80 font-medium mb-1">{t.cashInHand || "Cash In Hand"}</p>
                        <h2 className="text-4xl font-black mb-6">{formatCurrency(stats.cashInHand)}</h2>
                        
                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
                            <div>
                                <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">{t.totalIncome || "Total Income"}</p>
                                <div className="flex items-center text-emerald-300 font-bold">
                                    <ArrowUpRight className="h-4 w-4 mr-1" />
                                    <span>{formatCurrency(stats.totalSales + stats.totalDueTaken)}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">{t.totalExpense || "Total Expense"}</p>
                                <div className="flex items-center text-rose-300 font-bold">
                                    <ArrowDownLeft className="h-4 w-4 mr-1" />
                                    <span>{formatCurrency(stats.totalPurchases + stats.totalExpenses + stats.totalDueGiven)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center text-emerald-600 mb-2">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            <span className="text-xs font-bold uppercase tracking-wider">{t.sales || "Sales"}</span>
                        </div>
                        <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalSales)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center text-rose-600 mb-2">
                            <TrendingDown className="h-4 w-4 mr-2" />
                            <span className="text-xs font-bold uppercase tracking-wider">{t.expenses || "Expenses"}</span>
                        </div>
                        <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalExpenses)}</p>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center">
                            <History className="h-4 w-4 mr-2" /> {t.transactionHistory || "Transaction History"}
                        </h3>
                        <div className="flex bg-slate-200 p-1 rounded-lg">
                            <button 
                                onClick={() => setFilter('all')}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${filter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                            >
                                All
                            </button>
                            <button 
                                onClick={() => setFilter('income')}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${filter === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Income
                            </button>
                            <button 
                                onClick={() => setFilter('expense')}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${filter === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Expense
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText} mb-3`} />
                            <p className="text-slate-500 text-sm font-medium">Loading history...</p>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <History className="h-8 w-8 text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-medium">No transactions found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredHistory.map((item, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                                    <div className="flex items-center">
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center mr-4 ${item.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {item.type === 'income' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{item.category}</p>
                                            <p className="text-[10px] text-slate-400 font-medium flex items-center">
                                                <Calendar className="h-3 w-3 mr-1" /> {new Date(item.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-black ${item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
