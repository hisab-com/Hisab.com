import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppConfig } from '../context/AppConfigContext';
import { databases, DB_ID, SHOPS_COLLECTION, ID, Query } from '../lib/appwrite';
import { Store, Settings, Plus, X, Loader2, Home, FileText, Bell, Upload, ChevronRight } from 'lucide-react';
import HomeTab from '../components/tabs/HomeTab';
import ReportTab from '../components/tabs/ReportTab';
import SettingsTab from '../components/tabs/SettingsTab';
import SubPageRenderer from './subpages/SubPageRenderer';
import AppAccessModal from '../components/modals/AppAccessModal';
import { uploadToUploadMe } from '../utils/uploadMe';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const { t, themeClasses } = useAppConfig();
    
    const [shops, setShops] = useState<any[]>([]);
    const [currentShop, setCurrentShop] = useState<any | null>(null);
    const [loadingShops, setLoadingShops] = useState(true);
    const [dbError, setDbError] = useState(false);

    const [activeTab, setActiveTab] = useState<'home' | 'report' | 'settings'>('home');
    const [currentView, setCurrentView] = useState<string>('dashboard');

    const [showCreateShop, setShowCreateShop] = useState(false);
    const [newShopName, setNewShopName] = useState('');
    const [newShopAddress, setNewShopAddress] = useState('');
    const [newShopUploadMeApi, setNewShopUploadMeApi] = useState('');
    const [newShopLogo, setNewShopLogo] = useState<File | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const [showAccessModal, setShowAccessModal] = useState(false);

    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        fetchShops();
    }, [user]);

    const handleSetCurrentShop = (shop: any) => {
        setCurrentShop(shop);
        if (shop) {
            localStorage.setItem('lastShopId', shop.$id);
        } else {
            localStorage.removeItem('lastShopId');
        }
    };

    const fetchShops = async () => {
        if (!user) return;
        setLoadingShops(true);
        setDbError(false);
        try {
            const userMobile = user.prefs?.mobile || '';
            
            // Fetch shops where user is owner
            const ownedShopsRes = await databases.listDocuments(DB_ID, SHOPS_COLLECTION, [
                Query.equal('owner_id', user.$id)
            ]);

            // Fetch shops where user has access via mobile
            let sharedShopsRes = { documents: [] };
            if (userMobile) {
                sharedShopsRes = await databases.listDocuments(DB_ID, SHOPS_COLLECTION, [
                    Query.contains('allowed_mobiles', [userMobile])
                ]);
            }

            const allShops = [...ownedShopsRes.documents, ...sharedShopsRes.documents];
            // Remove duplicates
            const uniqueShops = Array.from(new Map(allShops.map(item => [item.$id, item])).values());

            setShops(uniqueShops);
            if (uniqueShops.length === 1) {
                handleSetCurrentShop(uniqueShops[0]);
            } else if (uniqueShops.length > 1) {
                const savedShopId = localStorage.getItem('lastShopId');
                const savedShop = uniqueShops.find(s => s.$id === savedShopId);
                if (savedShop) {
                    handleSetCurrentShop(savedShop);
                } else {
                    handleSetCurrentShop(null); // Force selection
                }
            }
        } catch (error: any) {
            console.error('Error fetching shops:', error);
            if (error.code === 404 || error.code === 403 || error.code === 400) {
                setDbError(true);
            }
        } finally {
            setLoadingShops(false);
        }
    };

    const handleCreateShop = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newShopName.trim()) return;
        setIsCreating(true);
        try {
            let logoUrl = '';
            if (newShopLogo && newShopUploadMeApi) {
                try {
                    logoUrl = await uploadToUploadMe(newShopLogo, newShopUploadMeApi);
                } catch (uploadError) {
                    console.error('Failed to upload logo:', uploadError);
                    alert('ছবি আপলোড করতে সমস্যা হয়েছে।');
                }
            }

            const newShop = await databases.createDocument(DB_ID, SHOPS_COLLECTION, ID.unique(), {
                name: newShopName,
                owner_id: user?.$id,
                allowed_mobiles: [],
                address: newShopAddress || "",
                uploadme_api_key: newShopUploadMeApi || "",
                logo_url: logoUrl || "",
                access_roles: "{}"
            });
            setShops([...shops, newShop]);
            handleSetCurrentShop(newShop);
            setShowCreateShop(false);
            setNewShopName('');
            setNewShopAddress('');
            setNewShopUploadMeApi('');
            setNewShopLogo(null);
        } catch (error) {
            console.error(error);
            alert('দোকান তৈরি করতে সমস্যা হয়েছে। ডাটাবেস সেটআপ ঠিক আছে কিনা চেক করুন।');
        } finally {
            setIsCreating(false);
        }
    };

    if (dbError) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex items-center justify-center">
                <div className="max-w-2xl w-full bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-red-100">
                    <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6 mx-auto">
                        <Settings className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">{t.dbSetupRequired}</h2>
                    <p className="text-center text-slate-600 mb-8">{t.dbSetupDesc}</p>
                    <button onClick={fetchShops} className={`mt-8 w-full ${themeClasses.primaryBg} text-white py-3 rounded-xl font-medium ${themeClasses.primaryHoverBg} transition-colors`}>
                        {t.checkAgain}
                    </button>
                </div>
            </div>
        );
    }

    if (loadingShops) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText}`} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Top Header */}
            {currentView === 'dashboard' && (
            <header className={`${themeClasses.primaryBg} text-white px-4 py-3 sticky top-0 z-40 shadow-md flex justify-between items-center`}>
                <div className="flex items-center">
                    {currentShop?.logo_url ? (
                        <img src={currentShop.logo_url} alt="Shop Logo" className="h-8 w-8 rounded-full object-cover mr-2 border border-white/20" />
                    ) : (
                        <Store className="h-6 w-6 mr-2" />
                    )}
                    <h1 className="font-bold text-lg truncate max-w-[200px] sm:max-w-xs">
                        {currentShop ? currentShop.name : 'Shop Management'}
                    </h1>
                    {currentShop?.owner_id !== user?.$id && currentShop && (
                        <span className="ml-2 bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                            Staff
                        </span>
                    )}
                </div>
                <div className="flex items-center">
                    <button onClick={() => setShowNotifications(true)} className="relative p-2 rounded-full hover:bg-white/20 transition-colors">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
                    </button>
                </div>
            </header>
            )}

            {/* Main Content Area */}
            <main className={`flex-1 overflow-y-auto ${currentView === 'dashboard' ? 'pb-20' : ''}`}>
                {!currentShop ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <Store className="h-16 w-16 text-slate-300 mb-4" />
                        {shops.length > 0 ? (
                            <>
                                <h2 className="text-xl font-bold text-slate-800 mb-2">{t.shopSelect}</h2>
                                <p className="text-slate-500 mb-6">দয়া করে একটি দোকান নির্বাচন করুন</p>
                                <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50 text-left mb-6">
                                    {shops.map((shop: any) => (
                                        <button 
                                            key={shop.$id} 
                                            onClick={() => handleSetCurrentShop(shop)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex items-center">
                                                {shop.logo_url ? (
                                                    <img src={shop.logo_url} alt="Shop Logo" className="h-8 w-8 rounded-full object-cover mr-3 border border-slate-200" />
                                                ) : (
                                                    <Store className={`h-6 w-6 mr-3 text-slate-400`} />
                                                )}
                                                <span className="font-medium text-slate-900">{shop.name}</span>
                                                {shop.owner_id !== user?.$id && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Staff</span>}
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-slate-300" />
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowCreateShop(true)}
                                    className={`inline-flex items-center text-slate-600 px-6 py-3 rounded-xl font-medium hover:bg-slate-100 transition-colors`}
                                >
                                    <Plus className="h-5 w-5 mr-2" /> {t.createShop}
                                </button>
                            </>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-slate-800 mb-2">{t.noShopFound}</h2>
                                <p className="text-slate-500 mb-6">{t.createShopPrompt}</p>
                                <button
                                    onClick={() => setShowCreateShop(true)}
                                    className={`inline-flex items-center ${themeClasses.primaryBg} text-white px-6 py-3 rounded-xl font-medium ${themeClasses.primaryHoverBg} transition-colors shadow-sm`}
                                >
                                    <Plus className="h-5 w-5 mr-2" /> {t.createShop}
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {currentView !== 'dashboard' ? (
                            <SubPageRenderer view={currentView} onBack={() => setCurrentView('dashboard')} shop={currentShop} />
                        ) : (
                            <>
                                {activeTab === 'home' && <HomeTab onNavigate={setCurrentView} />}
                                {activeTab === 'report' && <ReportTab onNavigate={setCurrentView} />}
                                {activeTab === 'settings' && (
                                    <SettingsTab 
                                        user={user}
                                        shops={shops}
                                        currentShop={currentShop}
                                        setCurrentShop={setCurrentShop}
                                        setShowCreateShop={setShowCreateShop}
                                        setShowAccessModal={setShowAccessModal}
                                        logout={logout}
                                    />
                                )}
                            </>
                        )}
                    </>
                )}
            </main>

            {/* Bottom Navigation */}
            {currentShop && currentView === 'dashboard' && (
                <nav className="bg-white border-t border-slate-200 fixed bottom-0 w-full z-40 pb-safe">
                    <div className="max-w-md mx-auto sm:max-w-3xl flex justify-around">
                        <button 
                            onClick={() => setActiveTab('home')}
                            className={`flex flex-col items-center py-3 px-6 ${activeTab === 'home' ? themeClasses.primaryText : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Home className={`h-6 w-6 mb-1 ${activeTab === 'home' ? 'fill-current' : ''}`} />
                            <span className="text-[10px] font-bold">{t.home}</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('report')}
                            className={`flex flex-col items-center py-3 px-6 ${activeTab === 'report' ? themeClasses.primaryText : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <FileText className={`h-6 w-6 mb-1 ${activeTab === 'report' ? 'fill-current' : ''}`} />
                            <span className="text-[10px] font-bold">{t.report}</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`flex flex-col items-center py-3 px-6 ${activeTab === 'settings' ? themeClasses.primaryText : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Settings className={`h-6 w-6 mb-1 ${activeTab === 'settings' ? 'fill-current' : ''}`} />
                            <span className="text-[10px] font-bold">{t.settings}</span>
                        </button>
                    </div>
                </nav>
            )}

            {/* Create Shop Modal */}
            {showCreateShop && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">{t.createShop}</h3>
                            <button onClick={() => setShowCreateShop(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateShop} className="p-6 max-h-[80vh] overflow-y-auto">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">{t.shopName}</label>
                                <input
                                    type="text"
                                    required
                                    value={newShopName}
                                    onChange={(e) => setNewShopName(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${themeClasses.primaryText.replace('text-', 'focus:ring-')}`}
                                    placeholder="Shop Name"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Shop Address</label>
                                <input
                                    type="text"
                                    value={newShopAddress}
                                    onChange={(e) => setNewShopAddress(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${themeClasses.primaryText.replace('text-', 'focus:ring-')}`}
                                    placeholder="Shop Address"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Me API Key</label>
                                <input
                                    type="text"
                                    value={newShopUploadMeApi}
                                    onChange={(e) => setNewShopUploadMeApi(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${themeClasses.primaryText.replace('text-', 'focus:ring-')}`}
                                    placeholder="API Key for image uploads"
                                />
                                <p className="text-xs text-slate-500 mt-1">This key will be permanent once set.</p>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Shop Logo</label>
                                {newShopLogo && (
                                    <div className="mb-3">
                                        <img src={URL.createObjectURL(newShopLogo)} alt="Selected Logo" className="h-16 w-16 object-cover rounded-xl border border-emerald-500 ring-2 ring-emerald-200" />
                                        <p className="text-sm text-emerald-600 mt-2 font-medium">Selected: {newShopLogo.name}</p>
                                    </div>
                                )}
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 mb-3 text-slate-400" />
                                            <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-slate-500">PNG, JPG up to 5MB</p>
                                        </div>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setNewShopLogo(e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateShop(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating || !newShopName.trim()}
                                    className={`flex-1 px-4 py-2.5 rounded-xl ${themeClasses.primaryBg} text-white font-medium ${themeClasses.primaryHoverBg} disabled:opacity-70 transition-colors flex justify-center items-center`}
                                >
                                    {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : t.create}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Access Modal */}
            <AppAccessModal 
                isOpen={showAccessModal} 
                onClose={() => setShowAccessModal(false)} 
                currentShop={currentShop}
                setCurrentShop={handleSetCurrentShop}
                shops={shops}
                setShops={setShops}
            />

            {/* Notifications Modal */}
            {showNotifications && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm h-full shadow-xl flex flex-col animate-in slide-in-from-right">
                        <div className="px-4 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">{t.notifications}</h3>
                            <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-slate-500">
                            <Bell className="h-12 w-12 text-slate-300 mb-3" />
                            <p>No new notifications</p>
                            <p className="text-xs text-center mt-2 max-w-[250px]">
                                Notifications sent from the Admin App will appear here.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
