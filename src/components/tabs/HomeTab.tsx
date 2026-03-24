import React from 'react';
import { useAppConfig } from '../../context/AppConfigContext';
import { ShoppingCart, Tag, FileText, TrendingUp, AlertCircle, DollarSign, Users, Package, BarChart2, Briefcase, Lock, RotateCcw, Trash2, Shield, QrCode, Printer, StickyNote, Globe, User } from 'lucide-react';

export default function HomeTab({ onNavigate }: { onNavigate: (view: string) => void }) {
    const { t, themeClasses, formatCurrency } = useAppConfig();

    const ActionButton = ({ icon: Icon, label, colorClass, view }: any) => (
        <button onClick={() => onNavigate(view)} className={`flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-95`}>
            <div className={`p-3 rounded-full mb-2 ${colorClass}`}>
                <Icon className="h-6 w-6" />
            </div>
            <span className="text-xs font-medium text-slate-700 text-center leading-tight">{label}</span>
        </button>
    );

    const StatCard = ({ title, amount, bg, border, text, valueText }: any) => (
        <div className={`${bg} p-3 rounded-xl border ${border} flex flex-col justify-center min-w-[110px] sm:min-w-[130px] snap-center`}>
            <div className={`text-[10px] sm:text-xs font-medium mb-1 ${text} whitespace-nowrap`}>{title}</div>
            <div className={`text-sm sm:text-lg font-bold ${valueText}`}>{formatCurrency(amount)}</div>
        </div>
    );

    return (
        <div className="pb-24 pt-4 px-4 max-w-md mx-auto sm:max-w-3xl space-y-6">
            
            {/* Daily Summary */}
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">{t.dailySummary}</h3>
                <div className="flex overflow-x-auto gap-3 pb-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <StatCard title={t.sale} amount="0" bg="bg-emerald-50" border="border-emerald-100" text="text-emerald-600" valueText="text-emerald-700" />
                    <StatCard title={t.purchase} amount="0" bg="bg-blue-50" border="border-blue-100" text="text-blue-600" valueText="text-blue-700" />
                    <StatCard title={t.incomes} amount="0" bg="bg-teal-50" border="border-teal-100" text="text-teal-600" valueText="text-teal-700" />
                    <StatCard title={t.expense} amount="0" bg="bg-rose-50" border="border-rose-100" text="text-rose-600" valueText="text-rose-700" />
                    <StatCard title={t.cash} amount="0" bg="bg-indigo-50" border="border-indigo-100" text="text-indigo-600" valueText="text-indigo-700" />
                    <StatCard title={t.dueGiven} amount="0" bg="bg-orange-50" border="border-orange-100" text="text-orange-600" valueText="text-orange-700" />
                    <StatCard title={t.dueTaken} amount="0" bg="bg-purple-50" border="border-purple-100" text="text-purple-600" valueText="text-purple-700" />
                </div>
            </div>

            {/* Primary Actions */}
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => onNavigate('purchase')} className={`${themeClasses.primaryBg} text-white p-4 rounded-2xl shadow-md flex flex-col items-center justify-center active:scale-95 transition-transform`}>
                    <ShoppingCart className="h-8 w-8 mb-2" />
                    <span className="font-bold text-lg">{t.purchase}</span>
                </button>
                <button onClick={() => onNavigate('sale')} className={`${themeClasses.primaryBg} text-white p-4 rounded-2xl shadow-md flex flex-col items-center justify-center active:scale-95 transition-transform`}>
                    <Tag className="h-8 w-8 mb-2" />
                    <span className="font-bold text-lg">{t.sale}</span>
                </button>
            </div>

            {/* Ledger Reports */}
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">{t.ledgerReports}</h3>
                <div className="grid grid-cols-4 gap-3">
                    <ActionButton view="purchaseReports" icon={FileText} label={t.purchaseReports} colorClass="bg-blue-50 text-blue-600" />
                    <ActionButton view="salesReports" icon={TrendingUp} label={t.salesReports} colorClass="bg-emerald-50 text-emerald-600" />
                    <ActionButton view="dueReports" icon={AlertCircle} label={t.dueReports} colorClass="bg-red-50 text-red-600" />
                    <ActionButton view="expenseReports" icon={DollarSign} label={t.expenseReports} colorClass="bg-amber-50 text-amber-600" />
                </div>
            </div>

            {/* Business Management */}
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">{t.businessManagement}</h3>
                <div className="grid grid-cols-4 gap-3">
                    <ActionButton view="contacts" icon={Users} label={t.contacts} colorClass="bg-indigo-50 text-indigo-600" />
                    <ActionButton view="productList" icon={Package} label={t.productList} colorClass="bg-purple-50 text-purple-600" />
                    <ActionButton view="stockReport" icon={BarChart2} label={t.stockReport} colorClass="bg-cyan-50 text-cyan-600" />
                    <ActionButton view="businessReport" icon={Briefcase} label={t.businessReport} colorClass="bg-teal-50 text-teal-600" />
                </div>
            </div>

            {/* Utilities & Security */}
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">{t.utilitiesSecurity}</h3>
                <div className="grid grid-cols-4 gap-3">
                    <ActionButton view="cashBox" icon={Lock} label={t.cashBox} colorClass="bg-slate-100 text-slate-700" />
                    <ActionButton view="salesReturn" icon={RotateCcw} label={t.salesReturn} colorClass="bg-orange-50 text-orange-600" />
                    <ActionButton view="purchaseReturn" icon={RotateCcw} label={t.purchaseReturn} colorClass="bg-rose-50 text-rose-600" />
                    <ActionButton view="expireItems" icon={Trash2} label={t.expireItems} colorClass="bg-red-50 text-red-600" />
                    <ActionButton view="appAccess" icon={Shield} label={t.appAccess} colorClass="bg-emerald-50 text-emerald-600" />
                    <ActionButton view="community" icon={Globe} label={t.community || "Community"} colorClass="bg-indigo-50 text-indigo-600" />
                    <ActionButton view="profile" icon={User} label={t.myProfile || "My Profile"} colorClass="bg-slate-100 text-slate-600" />
                    <ActionButton view="barcodeGen" icon={QrCode} label={t.barcodeGen} colorClass="bg-slate-100 text-slate-700" />
                    <ActionButton view="printer" icon={Printer} label={t.printer} colorClass="bg-slate-100 text-slate-700" />
                    <ActionButton view="note" icon={StickyNote} label={t.note} colorClass="bg-yellow-50 text-yellow-600" />
                </div>
            </div>
        </div>
    );
}
