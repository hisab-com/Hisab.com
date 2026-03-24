import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { Printer as PrinterIcon, Bluetooth, Wifi, Settings, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';

export default function Printer({ onBack, shop }: any) {
    const { t, themeClasses } = useAppConfig();
    const [isScanning, setIsScanning] = useState(false);
    const [connectedPrinter, setConnectedPrinter] = useState<any>(null);

    const scanForPrinters = () => {
        setIsScanning(true);
        setTimeout(() => {
            setIsScanning(false);
            setConnectedPrinter({
                name: "POS-80-Thermal",
                type: "Bluetooth",
                status: "Online"
            });
        }, 2000);
    };

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader title={t.printer || "Printer Settings"} onBack={onBack} />
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status Card */}
                <div className={`p-8 rounded-[40px] shadow-xl border border-slate-100 flex flex-col items-center text-center ${connectedPrinter ? 'bg-emerald-50 border-emerald-100' : 'bg-white'}`}>
                    <div className={`h-24 w-24 rounded-full flex items-center justify-center mb-6 shadow-inner ${connectedPrinter ? 'bg-white text-emerald-500' : 'bg-slate-50 text-slate-300'}`}>
                        <PrinterIcon className="h-12 w-12" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">
                        {connectedPrinter ? connectedPrinter.name : "No Printer Connected"}
                    </h3>
                    <div className="flex items-center justify-center space-x-2 mb-8">
                        {connectedPrinter ? (
                            <span className="flex items-center text-emerald-600 text-xs font-bold uppercase tracking-widest">
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Connected via {connectedPrinter.type}
                            </span>
                        ) : (
                            <span className="flex items-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                <XCircle className="h-4 w-4 mr-1" /> Disconnected
                            </span>
                        )}
                    </div>

                    <button 
                        onClick={scanForPrinters} 
                        disabled={isScanning}
                        className={`w-full py-4 rounded-3xl font-black text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center ${connectedPrinter ? 'bg-white text-slate-800 border-2 border-slate-100' : `${themeClasses.primaryBg} text-white`}`}
                    >
                        {isScanning ? (
                            <>
                                <Loader2 className="h-6 w-6 animate-spin mr-3" /> Scanning...
                            </>
                        ) : (
                            connectedPrinter ? "Reconnect Printer" : "Scan for Printers"
                        )}
                    </button>
                </div>

                {/* Connection Options */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-4 mb-2">Connection Methods</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
                            <Bluetooth className="h-8 w-8 text-blue-500" />
                            <span className="text-sm font-bold text-slate-700">Bluetooth</span>
                        </button>
                        <button className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
                            <Wifi className="h-8 w-8 text-indigo-500" />
                            <span className="text-sm font-bold text-slate-700">Wi-Fi / IP</span>
                        </button>
                    </div>
                </div>

                {/* Settings */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center">
                            <Settings className="h-5 w-5 text-slate-400 mr-3" />
                            <span className="font-bold text-slate-800">Printer Configuration</span>
                        </div>
                    </div>
                    <div className="p-4 space-y-1">
                        <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer">
                            <span className="text-sm font-medium text-slate-600">Paper Width</span>
                            <span className="text-sm font-bold text-slate-800">80mm</span>
                        </div>
                        <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer">
                            <span className="text-sm font-medium text-slate-600">Auto-Print Receipt</span>
                            <div className={`h-6 w-11 rounded-full p-1 transition-colors ${themeClasses.primaryBg}`}>
                                <div className="h-4 w-4 bg-white rounded-full translate-x-5" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer">
                            <span className="text-sm font-medium text-slate-600">Print Logo</span>
                            <div className={`h-6 w-11 rounded-full p-1 transition-colors bg-slate-200`}>
                                <div className="h-4 w-4 bg-white rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="p-6 bg-white border-t border-slate-100">
                <button className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold active:scale-95 transition-all">
                    Print Test Page
                </button>
            </div>
        </div>
    );
}
