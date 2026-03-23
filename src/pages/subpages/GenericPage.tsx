import React from 'react';
import PageHeader from '../../components/PageHeader';
import { Construction, ArrowLeft } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';

export default function GenericPage({ view, onBack }: any) {
    const { t, themeClasses } = useAppConfig();
    const title = (t as any)[view] || view.charAt(0).toUpperCase() + view.slice(1);

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader title={title} onBack={onBack} />
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className={`h-24 w-24 rounded-full ${themeClasses.lightBg} flex items-center justify-center mb-6`}>
                    <Construction className={`h-12 w-12 ${themeClasses.primaryText}`} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Coming Soon</h2>
                <p className="text-slate-500 mb-8 max-w-xs">
                    We are currently building the <strong>{title}</strong> page. It will be available in the next update.
                </p>
                <button onClick={onBack} className={`px-6 py-3 rounded-xl font-bold ${themeClasses.primaryBg} text-white shadow-md flex items-center`}>
                    <ArrowLeft className="h-5 w-5 mr-2" /> Go Back
                </button>
            </div>
        </div>
    );
}
