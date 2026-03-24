import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { Search, Calendar, Download, Loader2, DollarSign, Plus, X, Trash2, Edit } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, EXPENSES_COLLECTION, ID, Query } from '../../lib/appwrite';

export default function ExpenseReports({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [editId, setEditId] = useState('');
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('General');
    const [note, setNote] = useState('');

    useEffect(() => {
        fetchExpenses();
    }, [shop.$id]);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const res = await databases.listDocuments(DB_ID, EXPENSES_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]);
            setExpenses(res.documents);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const expenseData = {
                shop_id: shop.$id,
                title,
                amount: Number(amount),
                category,
                note,
            };

            if (editId) {
                await databases.updateDocument(DB_ID, EXPENSES_COLLECTION, editId, expenseData);
            } else {
                await databases.createDocument(DB_ID, EXPENSES_COLLECTION, ID.unique(), expenseData);
            }
            
            await fetchExpenses();
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('খরচ সেভ করতে সমস্যা হয়েছে।');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await databases.deleteDocument(DB_ID, EXPENSES_COLLECTION, id);
            setExpenses(expenses.filter(e => e.$id !== id));
        } catch (error) {
            alert('Delete failed.');
        }
    };

    const resetForm = () => {
        setEditId('');
        setTitle('');
        setAmount('');
        setCategory('General');
        setNote('');
    };

    const openEdit = (exp: any) => {
        setEditId(exp.$id);
        setTitle(exp.title);
        setAmount((exp.amount ?? 0).toString());
        setCategory(exp.category);
        setNote(exp.note || '');
        setShowAddModal(true);
    };

    const filteredExpenses = expenses.filter(e => 
        e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalExpense = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader 
                title={t.expenseReports || "Expense Reports"} 
                onBack={onBack} 
                rightContent={
                    <button onClick={() => { resetForm(); setShowAddModal(true); }} className={`p-2 bg-white ${themeClasses.primaryText} rounded-xl shadow-sm`}>
                        <Plus className="h-5 w-5" />
                    </button>
                }
            />

            <div className="p-4 space-y-4">
                {/* Total Expense Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Expense</p>
                        <h2 className="text-2xl font-black text-slate-800">{formatCurrency(totalExpense)}</h2>
                    </div>
                    <div className={`h-12 w-12 rounded-full ${themeClasses.lightBg} ${themeClasses.primaryText} flex items-center justify-center`}>
                        <DollarSign className="h-6 w-6" />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search expenses..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                        />
                    </div>
                    <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600">
                        <Calendar className="h-5 w-5" />
                    </button>
                </div>

                {/* Expense List */}
                <div className="space-y-3 pb-20">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText} mb-2`} />
                            <p className="text-sm text-slate-500">Loading expenses...</p>
                        </div>
                    ) : filteredExpenses.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                            <DollarSign className="h-12 w-12 text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-500">No expenses found</p>
                        </div>
                    ) : (
                        filteredExpenses.map(exp => (
                            <div key={exp.$id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">{exp.title}</h3>
                                    <div className="flex items-center mt-1">
                                        <span className={`text-[10px] font-bold ${themeClasses.lightBg} ${themeClasses.primaryText} px-2 py-0.5 rounded-md mr-2`}>
                                            {exp.category}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {new Date(exp.$createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className="text-sm font-black text-rose-600">{formatCurrency(exp.amount)}</div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openEdit(exp)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDeleteExpense(exp.$id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg">
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
                            <h3 className="text-lg font-bold text-slate-800">{editId ? 'Edit Expense' : 'Add Expense'}</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveExpense} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expense Title</label>
                                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="e.g. Shop Rent, Electricity" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount</label>
                                <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                                    <option value="General">General</option>
                                    <option value="Rent">Rent</option>
                                    <option value="Electricity">Electricity</option>
                                    <option value="Salary">Salary</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Food">Food</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Note (Optional)</label>
                                <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none h-24" placeholder="Add some details..." />
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-3.5 rounded-xl ${themeClasses.primaryBg} text-white font-bold shadow-md flex justify-center items-center`}>
                                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Expense'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
