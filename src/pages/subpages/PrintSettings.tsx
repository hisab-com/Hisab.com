import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { useAppConfig } from '../../context/AppConfigContext';
import { Printer, Check, Layout, Image, Type, FileText, Settings, Eye } from 'lucide-react';

export default function PrintSettings({ onBack, shop }: any) {
    const { t, themeClasses, printConfig, setPrintConfig, formatCurrency } = useAppConfig();
    const [activeTab, setActiveTab] = useState<'settings' | 'templates'>('settings');

    const toggleSetting = (key: keyof typeof printConfig) => {
        if (typeof printConfig[key] === 'boolean') {
            setPrintConfig({
                ...printConfig,
                [key]: !printConfig[key]
            });
        }
    };

    const setTemplate = (id: number) => {
        setPrintConfig({
            ...printConfig,
            templateId: id
        });
    };

    const templates = [
        { id: 1, name: 'Classic POS', desc: 'Standard 80mm thermal receipt' },
        { id: 2, name: 'Modern Minimal', desc: 'Clean design with focus on total' },
        { id: 3, name: 'Detailed A4', desc: 'Full width layout for A4 printers' },
        { id: 4, name: 'Compact', desc: 'Space saving layout for small rolls' },
        { id: 5, name: 'Elegant Serif', desc: 'Classic look with serif fonts' },
        { id: 6, name: 'Bold Header', desc: 'Large shop name and logo' },
        { id: 7, name: 'Grid Style', desc: 'Table based layout with borders' },
        { id: 8, name: 'Challan Focus', desc: 'Optimized for delivery challans' },
        { id: 9, name: 'Voucher Style', desc: 'Payment voucher format' },
        { id: 10, name: 'Dark Mode', desc: 'High contrast for digital receipts' },
    ];

    const SettingToggle = ({ label, icon: Icon, value, onClick }: any) => (
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center">
                <div className={`p-2 rounded-xl ${value ? themeClasses.lightBg : 'bg-slate-100'} ${value ? themeClasses.primaryText : 'text-slate-400'} mr-3`}>
                    <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-slate-700">{label}</span>
            </div>
            <button 
                onClick={onClick}
                className={`w-12 h-6 rounded-full transition-colors relative ${value ? themeClasses.primaryBg : 'bg-slate-200'}`}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${value ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
        </div>
    );

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader title="Print & Receipt Settings" onBack={onBack} />

            {/* Tabs */}
            <div className="flex p-4 space-x-2 bg-white border-b border-slate-100">
                <button 
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center transition-all ${activeTab === 'settings' ? `${themeClasses.primaryBg} text-white shadow-md` : 'bg-slate-50 text-slate-500'}`}
                >
                    <Settings className="h-4 w-4 mr-2" /> Settings
                </button>
                <button 
                    onClick={() => setActiveTab('templates')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center transition-all ${activeTab === 'templates' ? `${themeClasses.primaryBg} text-white shadow-md` : 'bg-slate-50 text-slate-500'}`}
                >
                    <Layout className="h-4 w-4 mr-2" /> Templates
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4 custom-scrollbar">
                {activeTab === 'settings' ? (
                    <div className="space-y-3">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Visibility Toggles</h3>
                        <SettingToggle label="Shop Logo" icon={Image} value={printConfig.showLogo} onClick={() => toggleSetting('showLogo')} />
                        <SettingToggle label="Description" icon={FileText} value={printConfig.showDescription} onClick={() => toggleSetting('showDescription')} />
                        <SettingToggle label="Header Info" icon={Layout} value={printConfig.showHeader} onClick={() => toggleSetting('showHeader')} />
                        <SettingToggle label="Product Image" icon={Image} value={printConfig.showProductImage} onClick={() => toggleSetting('showProductImage')} />
                        <SettingToggle label="Challan View" icon={FileText} value={printConfig.showChallan} onClick={() => toggleSetting('showChallan')} />
                        <SettingToggle label="Bill Details" icon={Printer} value={printConfig.showBill} onClick={() => toggleSetting('showBill')} />
                        <SettingToggle label="Previous Due" icon={FileText} value={printConfig.showPreviousDue} onClick={() => toggleSetting('showPreviousDue')} />
                        <SettingToggle label="Voucher Info" icon={FileText} value={printConfig.showVoucherInfo} onClick={() => toggleSetting('showVoucherInfo')} />
                        
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
                            <div className="flex items-center mb-4">
                                <Type className={`h-5 w-5 mr-2 ${themeClasses.primaryText}`} />
                                <span className="text-sm font-bold text-slate-700">Font Size: {printConfig.fontSize}px</span>
                            </div>
                            <input 
                                type="range" 
                                min="8" 
                                max="24" 
                                value={printConfig.fontSize} 
                                onChange={(e) => setPrintConfig({...printConfig, fontSize: parseInt(e.target.value)})}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Select Receipt Style</h3>
                        {templates.map((tpl) => (
                            <button 
                                key={tpl.id}
                                onClick={() => setTemplate(tpl.id)}
                                className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${printConfig.templateId === tpl.id ? `border-indigo-500 bg-indigo-50/30` : 'border-white bg-white shadow-sm hover:border-slate-200'}`}
                            >
                                <div className="flex items-center">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center mr-4 ${printConfig.templateId === tpl.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <span className="font-black text-lg">{tpl.id}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{tpl.name}</h4>
                                        <p className="text-xs text-slate-500">{tpl.desc}</p>
                                    </div>
                                </div>
                                {printConfig.templateId === tpl.id && (
                                    <div className="h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                                        <Check className="h-4 w-4" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Preview Card */}
                <div className="mt-8 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center mb-4">
                        <Eye className={`h-5 w-5 mr-2 ${themeClasses.primaryText}`} /> 
                        Live Preview (Template {printConfig.templateId})
                    </h4>
                    <div 
                        className="border border-slate-200 p-4 rounded-xl bg-slate-50 overflow-hidden"
                        style={{ fontSize: `${printConfig.fontSize}px` }}
                    >
                        {printConfig.showLogo && (
                            <div className="text-center mb-2">
                                <div className="h-10 w-10 bg-slate-300 rounded-full mx-auto mb-1"></div>
                                <p className="text-[10px] text-slate-400">Shop Logo</p>
                            </div>
                        )}
                        {printConfig.showHeader && (
                            <div className="text-center mb-4 border-b border-dashed border-slate-300 pb-2">
                                <h5 className="font-black uppercase tracking-wider">{shop.name}</h5>
                                <p className="text-[10px] text-slate-500">Address, Phone Number</p>
                            </div>
                        )}
                        <div className="space-y-2">
                            <div className="flex justify-between border-b border-slate-200 pb-1 font-bold text-[10px]">
                                <span>Item</span>
                                <span>Total</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                                <div className="flex items-center">
                                    {printConfig.showProductImage && <div className="h-4 w-4 bg-slate-200 rounded mr-1"></div>}
                                    <span>Sample Product x 2</span>
                                </div>
                                <span>{formatCurrency(500)}</span>
                            </div>
                        </div>
                        {printConfig.showBill && (
                            <div className="mt-4 pt-2 border-t border-slate-300 space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(500)}</span>
                                </div>
                                <div className="flex justify-between font-black">
                                    <span>Grand Total:</span>
                                    <span>{formatCurrency(500)}</span>
                                </div>
                            </div>
                        )}
                        {printConfig.showPreviousDue && (
                            <div className="mt-2 text-[10px] text-rose-500 font-bold">
                                Previous Due: {formatCurrency(200)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
