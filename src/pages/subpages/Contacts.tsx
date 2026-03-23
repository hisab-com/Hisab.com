import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { Plus, Search, Phone, Mail, MapPin, Briefcase, DollarSign, Edit, Trash2, X, Camera, Loader2, User, Clock, CheckCircle, Package } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, ID, Query } from '../../lib/appwrite';
// NOTE: Make sure to export CONTACTS_COLLECTION from your appwrite.ts file
import { CONTACTS_COLLECTION } from '../../lib/appwrite'; 
import { uploadToCloudinary } from '../../utils/cloudinary';

export default function Contacts({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    
    const [currentTab, setCurrentTab] = useState<'customers' | 'suppliers' | 'employees'>('customers');
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [showContactModal, setShowContactModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeProfile, setActiveProfile] = useState<any>(null);

    // Form State
    const [editId, setEditId] = useState('');
    const [cName, setCName] = useState('');
    const [cPhone, setCPhone] = useState('');
    const [cAddress, setCAddress] = useState('');
    const [cEmail, setCEmail] = useState('');
    const [cItems, setCItems] = useState('');
    const [cPosition, setCPosition] = useState('');
    const [cSalary, setCSalary] = useState('');
    const [cImage, setCImage] = useState<File | null>(null);
    const [cImageUrl, setCImageUrl] = useState('');

    useEffect(() => {
        fetchContacts();
    }, [shop.$id, currentTab]);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const res = await databases.listDocuments(DB_ID, CONTACTS_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.equal('type', currentTab),
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]);
            setContacts(res.documents);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredContacts = contacts.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone?.includes(searchTerm)
    );

    const handleSaveContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let finalImageUrl = cImageUrl;
            
            if (cImage) {
                let cloudName = '';
                let uploadPreset = '';
                if (shop.uploadme_api_key) {
                    try {
                        const parsed = JSON.parse(shop.uploadme_api_key);
                        cloudName = parsed.cloudName || '';
                        uploadPreset = parsed.uploadPreset || '';
                    } catch (e) {}
                }
                const uploadRes = await uploadToCloudinary(cImage, cloudName, uploadPreset);
                finalImageUrl = uploadRes.url;
            }

            const contactData = {
                shop_id: shop.$id,
                type: currentTab,
                name: cName,
                phone: cPhone,
                address: cAddress,
                email: cEmail,
                image_url: finalImageUrl,
                items: currentTab === 'suppliers' ? cItems : '',
                position: currentTab === 'employees' ? cPosition : '',
                salary: currentTab === 'employees' ? Number(cSalary) : 0,
            };

            if (editId) {
                await databases.updateDocument(DB_ID, CONTACTS_COLLECTION, editId, contactData);
            } else {
                await databases.createDocument(DB_ID, CONTACTS_COLLECTION, ID.unique(), contactData);
            }
            
            await fetchContacts();
            setShowContactModal(false);
            if (activeProfile && editId === activeProfile.$id) {
                setActiveProfile({ ...activeProfile, ...contactData });
            }
        } catch (error: any) {
            console.error('Error saving contact:', error);
            alert('কন্টাক্ট সেভ করতে সমস্যা হয়েছে।');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteContact = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this contact?")) return;
        try {
            await databases.deleteDocument(DB_ID, CONTACTS_COLLECTION, id);
            setContacts(contacts.filter(c => c.$id !== id));
            setShowProfileModal(false);
        } catch (error) {
            alert('Delete failed.');
        }
    };

    const openModal = (mode: 'add' | 'edit', contact?: any) => {
        if (mode === 'add') {
            setEditId('');
            setCName('');
            setCPhone('');
            setCAddress('');
            setCEmail('');
            setCItems('');
            setCPosition('');
            setCSalary('');
            setCImage(null);
            setCImageUrl('');
        } else if (contact) {
            setEditId(contact.$id);
            setCName(contact.name);
            setCPhone(contact.phone || '');
            setCAddress(contact.address || '');
            setCEmail(contact.email || '');
            setCItems(contact.items || '');
            setCPosition(contact.position || '');
            setCSalary(contact.salary?.toString() || '');
            setCImage(null);
            setCImageUrl(contact.image_url || '');
        }
        setShowContactModal(true);
    };

    const openProfile = (contact: any) => {
        setActiveProfile(contact);
        setShowProfileModal(true);
    };

    const getTabTitle = () => {
        if (currentTab === 'customers') return t.customers || 'Customers';
        if (currentTab === 'suppliers') return t.suppliers || 'Suppliers';
        return t.staff || 'Staff/Team';
    };

    return (
        <div className="h-screen bg-slate-50 flex flex-col relative">
            <PageHeader 
                title={t.contacts || "Contacts Book"} 
                onBack={onBack} 
                rightContent={
                    <button onClick={() => openModal('add')} className={`px-3 py-1.5 bg-white ${themeClasses.primaryText} font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors active:scale-95 flex items-center text-sm`}>
                        <Plus className="h-4 w-4 mr-1" /> {t.add || "Add"}
                    </button>
                } 
            />

            {/* --- Tabs --- */}
            <div className="px-4 pt-4 pb-2 bg-white border-b border-slate-200">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setCurrentTab('customers')} 
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${currentTab === 'customers' ? `bg-white shadow-sm ${themeClasses.primaryText}` : 'text-slate-500'}`}
                    >
                        {t.customers || 'Customers'}
                    </button>
                    <button 
                        onClick={() => setCurrentTab('suppliers')} 
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${currentTab === 'suppliers' ? `bg-white shadow-sm ${themeClasses.primaryText}` : 'text-slate-500'}`}
                    >
                        {t.suppliers || 'Suppliers'}
                    </button>
                    <button 
                        onClick={() => setCurrentTab('employees')} 
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${currentTab === 'employees' ? `bg-white shadow-sm ${themeClasses.primaryText}` : 'text-slate-500'}`}
                    >
                        {t.staff || 'Staff/Team'}
                    </button>
                </div>
            </div>
            
            {/* --- Search Bar --- */}
            <div className="p-4 bg-slate-50 z-10">
                <div className="relative group">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:${themeClasses.primaryText.split(' ')[0]} transition-colors`} />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={`Search ${getTabTitle().toLowerCase()}...`} 
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:border-slate-300 focus:ring-4 focus:ring-slate-100 outline-none transition-all text-sm font-medium shadow-sm" 
                    />
                </div>
            </div>

            {/* --- Contact List --- */}
            <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col justify-center items-center h-40">
                        <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText} mb-3`} />
                        <p className="text-slate-500 font-medium">Loading {getTabTitle().toLowerCase()}...</p>
                    </div>
                ) : filteredContacts.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 bg-white rounded-3xl border border-slate-200 border-dashed">
                        <User className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                        <h3 className="text-lg font-bold text-slate-700 mb-1">No {getTabTitle().toLowerCase()} found</h3>
                        <p className="text-sm">Click the Add button to create a new record.</p>
                    </div>
                ) : (
                    filteredContacts.map(c => (
                        <div key={c.$id} onClick={() => openProfile(c)} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center cursor-pointer active:scale-[0.98]">
                            {/* Avatar */}
                            {c.image_url ? (
                                <img src={c.image_url} alt={c.name} className="h-14 w-14 rounded-full object-cover border-2 border-indigo-50 mr-4 flex-shrink-0" />
                            ) : (
                                <div className={`h-14 w-14 rounded-full ${themeClasses.lightBg} ${themeClasses.primaryText} flex items-center justify-center mr-4 border-2 border-transparent flex-shrink-0 font-bold text-lg`}>
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 text-[15px] truncate mb-0.5">{c.name}</h3>
                                <p className="text-[12px] font-medium text-slate-500 flex items-center mb-1">
                                    <Phone className="h-3 w-3 mr-1" /> {c.phone || 'No phone'}
                                </p>
                                
                                {currentTab === 'suppliers' && c.items && (
                                    <span className={`text-[10px] font-bold ${themeClasses.primaryText} ${themeClasses.lightBg} px-2 py-0.5 rounded-md inline-block truncate max-w-full`}>
                                        {c.items}
                                    </span>
                                )}
                                {currentTab === 'employees' && c.position && (
                                    <span className={`text-[10px] font-bold ${themeClasses.primaryText} ${themeClasses.lightBg} px-2 py-0.5 rounded-md inline-block truncate max-w-full`}>
                                        {c.position}
                                    </span>
                                )}
                            </div>
                            
                            {/* Quick Actions */}
                            <div className="flex space-x-2 ml-3" onClick={(e) => e.stopPropagation()}>
                                {c.phone && (
                                    <a href={`tel:${c.phone}`} className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 active:scale-90 transition-all">
                                        <Phone className="h-4 w-4" />
                                    </a>
                                )}
                                {c.email && (
                                    <a href={`mailto:${c.email}`} className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 active:scale-90 transition-all">
                                        <Mail className="h-4 w-4" />
                                    </a>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ==========================================
                ADD / EDIT MODAL
                ========================================== */}
            {showContactModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="text-xl font-extrabold text-slate-800 flex items-center">
                                <User className={`h-6 w-6 mr-2 ${themeClasses.primaryText}`} /> 
                                {editId ? `Edit ${getTabTitle()}` : `Add ${getTabTitle()}`}
                            </h3>
                            <button onClick={() => setShowContactModal(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveContact} className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            
                            {/* Profile Image Upload */}
                            <div className="flex flex-col items-center justify-center mb-6">
                                <label className="relative w-24 h-24 rounded-full border-2 border-slate-200 border-dashed bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-center overflow-hidden cursor-pointer group shadow-sm">
                                    {cImage ? (
                                        <img src={URL.createObjectURL(cImage)} className="w-full h-full object-cover" alt="Preview" />
                                    ) : cImageUrl ? (
                                        <img src={cImageUrl} className="w-full h-full object-cover" alt="Profile" />
                                    ) : (
                                        <div className={`flex flex-col items-center justify-center text-slate-400 group-hover:${themeClasses.primaryText.split(' ')[0]} transition-colors`}>
                                            <Camera className="w-6 h-6 mb-1" />
                                            <span className="text-[10px] font-bold">Photo</span>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && setCImage(e.target.files[0])} />
                                </label>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name <span className="text-red-500">*</span></label>
                                    <input type="text" required value={cName} onChange={e => setCName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all text-slate-800 font-medium" placeholder="Enter full name" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mobile Number <span className="text-red-500">*</span></label>
                                    <input type="tel" required value={cPhone} onChange={e => setCPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all text-slate-800 font-medium" placeholder="01XXXXXXXXX" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                                    <input type="text" value={cAddress} onChange={e => setCAddress(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all text-slate-800 font-medium" placeholder="Full address" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email (Optional)</label>
                                    <input type="email" value={cEmail} onChange={e => setCEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all text-slate-800 font-medium" placeholder="example@mail.com" />
                                </div>

                                {/* Conditional Fields */}
                                {currentTab === 'suppliers' && (
                                    <div className="pt-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Items Supplied / Company</label>
                                        <input type="text" value={cItems} onChange={e => setCItems(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all text-slate-800 font-medium" placeholder="e.g. Stationery, Pran, RFL" />
                                    </div>
                                )}

                                {currentTab === 'employees' && (
                                    <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl mt-4">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1.5">Position / Role</label>
                                                <input type="text" value={cPosition} onChange={e => setCPosition(e.target.value)} className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:border-indigo-400 outline-none transition-all text-slate-800 font-medium" placeholder="e.g. Salesman, Manager" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1.5">Monthly Salary</label>
                                                <input type="number" value={cSalary} onChange={e => setCSalary(e.target.value)} className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:border-indigo-400 outline-none transition-all text-slate-800 font-medium" placeholder="Amount" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 pt-5 border-t border-slate-100 flex gap-3">
                                <button type="button" onClick={() => setShowContactModal(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving || !cName.trim() || !cPhone.trim()} className={`flex-1 py-3.5 rounded-xl ${themeClasses.primaryBg} text-white font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 flex justify-center items-center`}>
                                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Contact'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==========================================
                PROFILE VIEW MODAL
                ========================================== */}
            {showProfileModal && activeProfile && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="text-xl font-extrabold text-slate-800">Profile Overview</h3>
                            <button onClick={() => setShowProfileModal(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {/* Profile Header */}
                            <div className="text-center pb-6 border-b border-dashed border-slate-200 mb-6">
                                {activeProfile.image_url ? (
                                    <img src={activeProfile.image_url} alt={activeProfile.name} className="h-24 w-24 rounded-full object-cover border-4 border-indigo-50 mx-auto mb-3 shadow-sm" />
                                ) : (
                                    <div className={`h-24 w-24 rounded-full ${themeClasses.lightBg} ${themeClasses.primaryText} flex items-center justify-center border-4 border-transparent mx-auto mb-3 shadow-sm text-3xl font-bold`}>
                                        {activeProfile.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <h2 className="text-2xl font-extrabold text-slate-800">{activeProfile.name}</h2>
                                <div className="mt-2 inline-block">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${themeClasses.lightBg} ${themeClasses.primaryText} uppercase tracking-wider`}>
                                        {getTabTitle()} {activeProfile.items ? `• ${activeProfile.items}` : activeProfile.position ? `• ${activeProfile.position}` : ''}
                                    </span>
                                </div>

                                <div className="mt-4 space-y-2 text-sm text-slate-600 font-medium">
                                    {activeProfile.phone && <div className="flex items-center justify-center"><Phone className="h-4 w-4 mr-2 text-slate-400" /> {activeProfile.phone}</div>}
                                    {activeProfile.email && <div className="flex items-center justify-center"><Mail className="h-4 w-4 mr-2 text-slate-400" /> {activeProfile.email}</div>}
                                    {activeProfile.address && <div className="flex items-center justify-center"><MapPin className="h-4 w-4 mr-2 text-slate-400" /> {activeProfile.address}</div>}
                                    {activeProfile.salary > 0 && <div className="flex items-center justify-center"><DollarSign className="h-4 w-4 mr-2 text-slate-400" /> {formatCurrency(activeProfile.salary)} /mo</div>}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-3 mb-8">
                                <button onClick={() => { setShowProfileModal(false); openModal('edit', activeProfile); }} className="flex-1 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center shadow-sm">
                                    <Edit className="h-4 w-4 mr-2" /> Edit Info
                                </button>
                                <button onClick={() => handleDeleteContact(activeProfile.$id)} className="flex-1 py-3 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors flex items-center justify-center shadow-sm">
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </button>
                            </div>

                            {/* History Section (UI Layout ready for future implementation) */}
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 flex items-center mb-4">
                                    <Clock className={`h-5 w-5 mr-2 ${themeClasses.primaryText}`} /> 
                                    {currentTab === 'customers' ? 'Purchase History' : currentTab === 'suppliers' ? 'Supply History' : 'Employment Activity'}
                                </h4>
                                
                                <div className="pl-4 border-l-2 border-slate-100 space-y-4">
                                    {/* Mock History Item - You can dynamically fetch this from sales/purchase collections later */}
                                    <div className="relative pl-4">
                                        <div className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ${themeClasses.primaryBg} border-2 border-white`}></div>
                                        <div className="text-xs font-bold text-slate-400 mb-1">{new Date(activeProfile.$createdAt).toLocaleDateString()}</div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-slate-700 text-sm">Profile Created</span>
                                                <span className="font-bold text-emerald-600 text-sm"><CheckCircle className="h-4 w-4 inline" /></span>
                                            </div>
                                            <p className="text-xs text-slate-500">Contact successfully added to the database.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="relative pl-4">
                                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-slate-200 border-2 border-white"></div>
                                        <p className="text-xs font-medium text-slate-400 pt-1 italic">More history tracking coming soon...</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
