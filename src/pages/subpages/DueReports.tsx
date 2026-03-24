import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { Search, Calendar, Download, Loader2, AlertCircle, Plus, X, Trash2, Edit, Phone, User, DollarSign } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, DUES_COLLECTION, ID, Query } from '../../lib/appwrite';

export default function DueReports({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    const [dues, setDues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [editId, setEditId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'given' | 'taken'>('given');
    const [note, setNote] = useState('');

    useEffect(() => {
        fetchDues();
    }, [shop.$id]);

    const fetchDues = async () => {
        setLoading(true);
        try {
            const res = await databases.listDocuments(DB_ID, DUES_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]);
            setDues(res.documents);
        } catch (error) {
            console.error('Error fetching dues:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDue = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const dueData = {
                shop_id: shop.$id,
                customer_name: customerName,
                customer_phone: customerPhone,
                amount: Number(amount),
                type,
                note,
                status: 'pending'
            };

            if (editId) {
                await databases.updateDocument(DB_ID, DUES_COLLECTION, editId, dueData);
            } else {
                await databases.createDocument(DB_ID, DUES_COLLECTION, ID.unique(), dueData);
            }
            
            await fetchDues();
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error('Error saving due:', error);
            alert('বাকি সেভ করতে সমস্যা হয়েছে।');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDue = async (id: string) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await databases.deleteDocument(DB_ID, DUES_COLLECTION, id);
            setDues(dues.filter(d => d.$id !== id));
        } catch (error) {
            alert('Delete failed.');
        }
    };

    const resetForm = () => {
        setEditId('');
        setCustomerName('');
        setCustomerPhone('');
        setAmount('');
        setType('given');
        setNote('');
    };

    const openEdit = (due: any) => {
        setEditId(due.$id);
        setCustomerName(due.customer_name);
        setCustomerPhone(due.customer_phone || '');
        setAmount((due.amount ?? 0).toString());
        setType(due.type);
        setNote(due.note || '');
        setShowAddModal(true);
    };

    const filteredDues = dues.filter(d => 
        d.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.customer_phone?.includes(searchTerm)
    );

    const totalDueGiven = filteredDues.filter(d => d.type === 'given').reduce((acc, d) => acc + (d.amount || 0), 0);
    const totalDueTaken = filteredDues.filter(d => d.type === 'taken').reduce((acc, d) => acc + (d.amount || 0), 0);

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader 
                title={t.dueReports || "Due Reports"} 
                onBack={onBack} 
                rightContent={
                    <button onClick={() => { resetForm(); setShowAddModal(true); }} className={`p-2 bg-white ${themeClasses.primaryText} rounded-xl shadow-sm`}>
                        <Plus className="h-5 w-5" />
                    </button>
                }
            />

            <div className="p-4 space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center text-orange-600 mb-1">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Due Given</span>
                        </div>
                        <div className="text-xl font-black text-slate-800">{formatCurrency(totalDueGiven)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center text-purple-600 mb-1">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Due Taken</span>
                        </div>
                        <div className="text-xl font-black text-slate-800">{formatCurrency(totalDueTaken)}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search customers..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                        />
                    </div>
                </div>

                {/* Due List */}
                <div className="space-y-3 pb-20">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText} mb-2`} />
                            <p className="text-sm text-slate-500">Loading dues...</p>
                        </div>
                    ) : filteredDues.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                            <AlertCircle className="h-12 w-12 text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-500">No dues found</p>
                        </div>
                    ) : (
                        filteredDues.map(due => (
                            <div key={due.$id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center">
                                        <User className="h-3 w-3 mr-1 text-slate-400" /> {due.customer_name}
                                    </h3>
                                    <div className="flex items-center mt-1">
                                        <span className={`text-[10px] font-bold ${due.type === 'given' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'} px-2 py-0.5 rounded-md mr-2`}>
                                            {due.type === 'given' ? 'Due Given' : 'Due Taken'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium flex items-center">
                                            <Phone className="h-2.5 w-2.5 mr-1" /> {due.customer_phone || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className={`text-sm font-black ${due.type === 'given' ? 'text-orange-600' : 'text-purple-600'}`}>{formatCurrency(due.amount)}</div>
                                        <div className="text-[10px] text-slate-400 font-medium">{new Date(due.$createdAt).toLocaleDateString()}</div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openEdit(due)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDeleteDue(due.$id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800">{editId ? 'Edit Due' : 'Add Due'}</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveDue} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer/Supplier Name</label>
                                <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Enter name" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="01XXXXXXXXX" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount</label>
                                <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setType('given')} className={`flex-1 py-3 rounded-xl font-bold border ${type === 'given' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                        Due Given
                                    </button>
                                    <button type="button" onClick={() => setType('taken')} className={`flex-1 py-3 rounded-xl font-bold border ${type === 'taken' ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                        Due Taken
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Note (Optional)</label>
                                <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none h-24" placeholder="Add some details..." />
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-3.5 rounded-xl ${themeClasses.primaryBg} text-white font-bold shadow-md flex justify-center items-center`}>
                                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Due'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
