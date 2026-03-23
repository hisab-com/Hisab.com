import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { Search, Plus, User, Phone, MapPin, Edit, Trash2 } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';

export default function Contacts({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
    
    const contacts = [
        { id: 1, name: 'Rahim Uddin', phone: '01711223344', type: 'customer', balance: 500 },
        { id: 2, name: 'Karim Store', phone: '01822334455', type: 'supplier', balance: -1200 },
        { id: 3, name: 'Jamal Hasan', phone: '01933445566', type: 'customer', balance: 0 },
    ];

    const filteredContacts = contacts.filter(c => c.type === (activeTab === 'customers' ? 'customer' : 'supplier'));

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader 
                title={t.contacts} 
                onBack={onBack} 
                rightContent={
                    <button className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                        <Plus className="h-5 w-5" />
                    </button>
                } 
            />
            
            {/* Tabs */}
            <div className="bg-white border-b border-slate-200 flex">
                <button 
                    onClick={() => setActiveTab('customers')}
                    className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${activeTab === 'customers' ? `border-current ${themeClasses.primaryText}` : 'border-transparent text-slate-500'}`}
                >
                    Customers
                </button>
                <button 
                    onClick={() => setActiveTab('suppliers')}
                    className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${activeTab === 'suppliers' ? `border-current ${themeClasses.primaryText}` : 'border-transparent text-slate-500'}`}
                >
                    Suppliers
                </button>
            </div>

            <div className="p-4 bg-white border-b border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input type="text" placeholder="Search contacts..." className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-xl focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredContacts.map(c => (
                    <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div className="flex items-center">
                            <div className={`h-10 w-10 rounded-full ${themeClasses.lightBg} ${themeClasses.primaryText} flex items-center justify-center mr-3`}>
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{c.name}</h3>
                                <div className="text-xs text-slate-500 flex items-center mt-0.5">
                                    <Phone className="h-3 w-3 mr-1" /> {c.phone}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`font-bold ${c.balance > 0 ? 'text-emerald-600' : c.balance < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                {formatCurrency(Math.abs(c.balance))}
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase">
                                {c.balance > 0 ? 'Receivable' : c.balance < 0 ? 'Payable' : 'Settled'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
