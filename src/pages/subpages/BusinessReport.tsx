import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { TrendingUp, TrendingDown, DollarSign, Briefcase, Loader2, BarChart2, PieChart, Activity, ShoppingCart, Users } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, SALES_COLLECTION, EXPENSES_COLLECTION, PRODUCTS_COLLECTION, Query } from '../../lib/appwrite';

export default function BusinessReport({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSales: 0,
        totalProfit: 0,
        totalExpenses: 0,
        totalProducts: 0,
        inventoryValue: 0,
        netProfit: 0
    });

    useEffect(() => {
        fetchBusinessStats();
    }, [shop.$id]);

    const fetchBusinessStats = async () => {
        setLoading(true);
        try {
            // Fetch Sales
            const salesRes = await databases.listDocuments(DB_ID, SALES_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.limit(100)
            ]);
            const totalSales = salesRes.documents.reduce((acc, s) => acc + (s.total || 0), 0);
            const totalProfit = salesRes.documents.reduce((acc, s) => acc + (s.profit || 0), 0);

            // Fetch Expenses
            const expensesRes = await databases.listDocuments(DB_ID, EXPENSES_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.limit(100)
            ]);
            const totalExpenses = expensesRes.documents.reduce((acc, e) => acc + (e.amount || 0), 0);

            // Fetch Products
            const productsRes = await databases.listDocuments(DB_ID, PRODUCTS_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.limit(100)
            ]);
            const totalProducts = productsRes.total;
            const inventoryValue = productsRes.documents.reduce((acc, p) => acc + (p.stock * (p.purchase_price || 0)), 0);

            setStats({
                totalSales,
                totalProfit,
                totalExpenses,
                totalProducts,
                inventoryValue,
                netProfit: totalProfit - totalExpenses
            });
        } catch (error) {
            console.error('Error fetching business stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatBox = ({ icon: Icon, label, value, colorClass, bgClass }: any) => (
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className={`p-3 rounded-2xl mb-3 ${bgClass} ${colorClass}`}>
                <Icon className="h-6 w-6" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <h3 className="text-xl font-black text-slate-800">{value}</h3>
        </div>
    );

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader title={t.businessReport || "Business Report"} onBack={onBack} />

            <div className="p-4 space-y-6 pb-24 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className={`h-10 w-10 animate-spin ${themeClasses.primaryText} mb-4`} />
                        <p className="text-slate-500 font-medium tracking-wide">Analyzing business data...</p>
                    </div>
                ) : (
                    <>
                        {/* Main Performance Card */}
                        <div className={`${themeClasses.primaryBg} p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden`}>
                            <div className="absolute -right-10 -top-10 h-40 w-40 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="absolute -left-10 -bottom-10 h-40 w-40 bg-white/10 rounded-full blur-3xl"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Net Profit</p>
                                        <h2 className="text-4xl font-black">{formatCurrency(stats.netProfit)}</h2>
                                    </div>
                                    <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                        <Activity className="h-6 w-6" />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                                    <div>
                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Gross Profit</p>
                                        <p className="text-lg font-bold">{formatCurrency(stats.totalProfit)}</p>
                                    </div>
                                    <div>
                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Expenses</p>
                                        <p className="text-lg font-bold">{formatCurrency(stats.totalExpenses)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <StatBox 
                                icon={ShoppingCart} 
                                label="Total Sales" 
                                value={formatCurrency(stats.totalSales)} 
                                colorClass="text-blue-600" 
                                bgClass="bg-blue-50" 
                            />
                            <StatBox 
                                icon={TrendingUp} 
                                label="Inventory Value" 
                                value={formatCurrency(stats.inventoryValue)} 
                                colorClass="text-emerald-600" 
                                bgClass="bg-emerald-50" 
                            />
                            <StatBox 
                                icon={BarChart2} 
                                label="Total Products" 
                                value={stats.totalProducts} 
                                colorClass="text-purple-600" 
                                bgClass="bg-purple-50" 
                            />
                            <StatBox 
                                icon={PieChart} 
                                label="Profit Margin" 
                                value={`${stats.totalSales > 0 ? ((stats.totalProfit / stats.totalSales) * 100).toFixed(1) : 0}%`} 
                                colorClass="text-orange-600" 
                                bgClass="bg-orange-50" 
                            />
                        </div>

                        {/* Insights Section */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center mb-4">
                                <Briefcase className={`h-5 w-5 mr-2 ${themeClasses.primaryText}`} /> 
                                Business Insights
                            </h4>
                            <div className="space-y-4">
                                <div className="flex items-start">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 mr-3 flex-shrink-0"></div>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        Your net profit is <strong>{formatCurrency(stats.netProfit)}</strong> after deducting expenses.
                                    </p>
                                </div>
                                <div className="flex items-start">
                                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 mr-3 flex-shrink-0"></div>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        You have <strong>{stats.totalProducts}</strong> unique products in your inventory.
                                    </p>
                                </div>
                                <div className="flex items-start">
                                    <div className="h-2 w-2 rounded-full bg-orange-500 mt-1.5 mr-3 flex-shrink-0"></div>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        Inventory value is <strong>{formatCurrency(stats.inventoryValue)}</strong> based on purchase prices.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
