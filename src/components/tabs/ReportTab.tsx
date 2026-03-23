import React from 'react';
import { useAppConfig } from '../../context/AppConfigContext';
import { FileText, TrendingUp, AlertCircle, DollarSign, BarChart2, Briefcase } from 'lucide-react';

export default function ReportTab({ onNavigate }: { onNavigate: (view: string) => void }) {
    const { t, themeClasses } = useAppConfig();

    const ReportItem = ({ icon: Icon, label, desc, view }: any) => (
        <div onClick={() => onNavigate(view)} className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-slate-100 mb-3 hover:shadow-md transition-shadow cursor-pointer">
            <div className={`p-3 rounded-full mr-4 ${themeClasses.lightBg} ${themeClasses.primaryText}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <h4 className="font-bold text-slate-800">{label}</h4>
                <p className="text-xs text-slate-500">{desc}</p>
            </div>
        </div>
    );

    return (
        <div className="pb-24 pt-4 px-4 max-w-md mx-auto sm:max-w-3xl">
            <h2 className="text-xl font-bold text-slate-800 mb-4">{t.report}</h2>
            <ReportItem view="purchaseReports" icon={FileText} label={t.purchaseReports} desc="View all purchase history" />
            <ReportItem view="salesReports" icon={TrendingUp} label={t.salesReports} desc="View all sales history" />
            <ReportItem view="dueReports" icon={AlertCircle} label={t.dueReports} desc="Track customer and supplier dues" />
            <ReportItem view="expenseReports" icon={DollarSign} label={t.expenseReports} desc="Monitor your daily expenses" />
            <ReportItem view="stockReport" icon={BarChart2} label={t.stockReport} desc="Check current inventory levels" />
            <ReportItem view="businessReport" icon={Briefcase} label={t.businessReport} desc="Overall business performance" />
        </div>
    );
}
