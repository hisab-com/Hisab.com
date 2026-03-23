import React, { useState } from 'react';
import { useAppConfig } from '../../context/AppConfigContext';
import { Store, User, Globe, Palette, LogOut, Shield, ChevronRight, Plus, Check, DollarSign, Hash, X, Upload, Loader2 } from 'lucide-react';
import { databases, DB_ID, SHOPS_COLLECTION, account } from '../../lib/appwrite';
import { uploadToUploadMe } from '../../utils/uploadMe';

export default function SettingsTab({ 
    user, shops, currentShop, setCurrentShop, setShowCreateShop, setShowAccessModal, logout 
}: any) {
    const { t, themeClasses, language, setLanguage, theme, setTheme, currency, setCurrency, decimalPoint, setDecimalPoint } = useAppConfig();

    const [showShopProfile, setShowShopProfile] = useState(false);
    const [editShopName, setEditShopName] = useState('');
    const [editShopAddress, setEditShopAddress] = useState('');
    const [editShopApi, setEditShopApi] = useState('');
    const [editShopLogo, setEditShopLogo] = useState<File | null>(null);
    const [isUpdatingShop, setIsUpdatingShop] = useState(false);

    const [showUserProfile, setShowUserProfile] = useState(false);
    const [editUserName, setEditUserName] = useState('');
    const [editUserEmail, setEditUserEmail] = useState('');
    const [editUserMobile, setEditUserMobile] = useState('');
    const [editUserPassword, setEditUserPassword] = useState('');
    const [editUserAvatar, setEditUserAvatar] = useState<File | null>(null);
    const [isUpdatingUser, setIsUpdatingUser] = useState(false);

    const openShopProfile = () => {
        setEditShopName(currentShop?.name || '');
        setEditShopAddress(currentShop?.address || '');
        setEditShopApi(currentShop?.uploadme_api_key || '');
        setEditShopLogo(null);
        setShowShopProfile(true);
    };

    const openUserProfile = () => {
        setEditUserName(user?.name || '');
        setEditUserEmail(user?.email || '');
        setEditUserMobile(user?.prefs?.mobile || '');
        setEditUserPassword('');
        setEditUserAvatar(null);
        setShowUserProfile(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingUser(true);
        try {
            if (editUserEmail !== user?.email || editUserMobile !== user?.prefs?.mobile) {
                alert('ইমেইল বা মোবাইল নম্বর পরিবর্তন করতে কোড ভেরিফিকেশন প্রয়োজন। এই ফিচারটি শীঘ্রই আসছে।');
            }
            
            if (editUserName !== user?.name) {
                await account.updateName(editUserName);
            }

            if (editUserPassword) {
                await account.updatePassword(editUserPassword);
            }

            let avatarUrl = user?.prefs?.avatar_url || '';
            const finalApiKey = currentShop?.uploadme_api_key;

            if (editUserAvatar && finalApiKey) {
                try {
                    avatarUrl = await uploadToUploadMe(editUserAvatar, finalApiKey);
                } catch (uploadError) {
                    console.error('Failed to upload avatar:', uploadError);
                    alert('ছবি আপলোড করতে সমস্যা হয়েছে।');
                }
            } else if (editUserAvatar && !finalApiKey) {
                alert('ছবি আপলোড করার জন্য দোকানের Upload Me API Key সেট করা প্রয়োজন।');
            }

            const newPrefs = {
                ...user?.prefs,
                avatar_url: avatarUrl
            };
            
            await account.updatePrefs(newPrefs);
            
            alert('প্রোফাইল আপডেট সফল হয়েছে। পেজটি রিলোড করুন।');
            setShowUserProfile(false);
        } catch (error) {
            console.error('Error updating user:', error);
            alert('প্রোফাইল আপডেট করতে সমস্যা হয়েছে।');
        } finally {
            setIsUpdatingUser(false);
        }
    };

    const handleUpdateShop = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentShop) return;
        setIsUpdatingShop(true);
        try {
            let logoUrl = currentShop.logo_url;
            const finalApiKey = currentShop.uploadme_api_key || editShopApi;

            if (editShopLogo && finalApiKey) {
                try {
                    logoUrl = await uploadToUploadMe(editShopLogo, finalApiKey);
                } catch (uploadError) {
                    console.error('Failed to upload logo:', uploadError);
                    alert('ছবি আপলোড করতে সমস্যা হয়েছে।');
                }
            }

            const updatedShop = await databases.updateDocument(DB_ID, SHOPS_COLLECTION, currentShop.$id, {
                name: editShopName,
                address: editShopAddress || "",
                uploadme_api_key: finalApiKey || "",
                logo_url: logoUrl || "",
                access_roles: currentShop.access_roles || "{}"
            });
            setCurrentShop(updatedShop);
            setShowShopProfile(false);
        } catch (error) {
            console.error('Error updating shop:', error);
            alert('দোকান আপডেট করতে সমস্যা হয়েছে।');
        } finally {
            setIsUpdatingShop(false);
        }
    };

    // Determine user's role in the current shop
    let userRole = 'Owner';
    if (currentShop && currentShop.owner_id !== user?.$id) {
        userRole = 'Staff';
        try {
            if (currentShop.access_roles) {
                const roles = JSON.parse(currentShop.access_roles);
                const mobile = user?.prefs?.mobile;
                if (mobile && roles[mobile]) {
                    userRole = roles[mobile].charAt(0).toUpperCase() + roles[mobile].slice(1);
                }
            }
        } catch (e) {}
    }

    return (
        <div className="pb-24 pt-4 px-4 max-w-md mx-auto sm:max-w-3xl space-y-6">
            <h2 className="text-xl font-bold text-slate-800 mb-2">{t.settings}</h2>

            {/* Profile Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center">
                {user?.prefs?.avatar_url ? (
                    <img src={user.prefs.avatar_url} alt="User Avatar" className="h-14 w-14 rounded-full object-cover mr-4 border border-slate-200" />
                ) : (
                    <div className={`h-14 w-14 rounded-full ${themeClasses.lightBg} ${themeClasses.primaryText} flex items-center justify-center text-xl font-bold mr-4`}>
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                )}
                <div>
                    <h3 className="font-bold text-lg text-slate-800">{user?.name}</h3>
                    <p className="text-sm text-slate-500">{user?.prefs?.mobile || user?.email}</p>
                </div>
            </div>

            {/* Shop Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50 flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-sm">{t.shopSelect}</span>
                    <button onClick={() => setShowCreateShop(true)} className={`${themeClasses.primaryText} flex items-center text-sm font-bold`}>
                        <Plus className="h-4 w-4 mr-1" /> {t.createShop}
                    </button>
                </div>
                <div className="divide-y divide-slate-50">
                    {shops.map((shop: any) => (
                        <button 
                            key={shop.$id} 
                            onClick={() => setCurrentShop(shop)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center">
                                {shop.logo_url ? (
                                    <img src={shop.logo_url} alt="Shop Logo" className="h-6 w-6 rounded-full object-cover mr-3 border border-slate-200" />
                                ) : (
                                    <Store className={`h-5 w-5 mr-3 ${currentShop?.$id === shop.$id ? themeClasses.primaryText : 'text-slate-400'}`} />
                                )}
                                <span className={`font-medium ${currentShop?.$id === shop.$id ? 'text-slate-900' : 'text-slate-600'}`}>{shop.name}</span>
                                {shop.owner_id !== user?.$id && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Staff</span>}
                            </div>
                            {currentShop?.$id === shop.$id && <Check className={`h-5 w-5 ${themeClasses.primaryText}`} />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Settings Options */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                <button onClick={openShopProfile} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center">
                        <Store className="h-5 w-5 mr-3 text-slate-500" />
                        <span className="font-medium text-slate-700">{t.shopProfile}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                </button>
                <button onClick={openUserProfile} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center">
                        <User className="h-5 w-5 mr-3 text-slate-500" />
                        <span className="font-medium text-slate-700">{t.userProfile}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                </button>
                {userRole === 'Owner' && (
                    <button onClick={() => setShowAccessModal(true)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center">
                            <Shield className="h-5 w-5 mr-3 text-slate-500" />
                            <span className="font-medium text-slate-700">{t.appAccess}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300" />
                    </button>
                )}
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <Globe className="h-5 w-5 mr-3 text-slate-500" />
                        <span className="font-medium text-slate-700">{t.language}</span>
                    </div>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setLanguage('bn')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${language === 'bn' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>বাংলা</button>
                        <button onClick={() => setLanguage('en')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${language === 'en' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>English</button>
                    </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <Palette className="h-5 w-5 mr-3 text-slate-500" />
                        <span className="font-medium text-slate-700">{t.theme}</span>
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={() => setTheme('bkash')} className={`h-8 w-8 rounded-full bg-[#e2136e] flex items-center justify-center ${theme === 'bkash' ? 'ring-2 ring-offset-2 ring-[#e2136e]' : ''}`}></button>
                        <button onClick={() => setTheme('emerald')} className={`h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center ${theme === 'emerald' ? 'ring-2 ring-offset-2 ring-emerald-600' : ''}`}></button>
                        <button onClick={() => setTheme('blue')} className={`h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center ${theme === 'blue' ? 'ring-2 ring-offset-2 ring-blue-600' : ''}`}></button>
                    </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <DollarSign className="h-5 w-5 mr-3 text-slate-500" />
                        <span className="font-medium text-slate-700">{t.currency}</span>
                    </div>
                    <select 
                        value={currency} 
                        onChange={(e) => setCurrency(e.target.value)}
                        className="bg-slate-100 border-none text-sm font-medium rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-slate-200"
                    >
                        <option value="৳">৳ (BDT)</option>
                        <option value="$">$ (USD)</option>
                        <option value="₹">₹ (INR)</option>
                        <option value="€">€ (EUR)</option>
                        <option value="£">£ (GBP)</option>
                        <option value="ر.س">ر.س (SAR)</option>
                        <option value="د.إ">د.إ (AED)</option>
                        <option value="RM">RM (MYR)</option>
                        <option value="S$">S$ (SGD)</option>
                    </select>
                </div>
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <Hash className="h-5 w-5 mr-3 text-slate-500" />
                        <span className="font-medium text-slate-700">{t.decimalPoint}</span>
                    </div>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setDecimalPoint(0)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${decimalPoint === 0 ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>0</button>
                        <button onClick={() => setDecimalPoint(1)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${decimalPoint === 1 ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>.0</button>
                        <button onClick={() => setDecimalPoint(2)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${decimalPoint === 2 ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>.00</button>
                    </div>
                </div>
            </div>

            {/* Logout */}
            <button onClick={logout} className="w-full flex items-center justify-center p-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors">
                <LogOut className="h-5 w-5 mr-2" /> {t.logout}
            </button>

            {/* Shop Profile Modal */}
            {showShopProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">{t.shopProfile}</h3>
                            <button onClick={() => setShowShopProfile(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateShop} className="p-6 max-h-[80vh] overflow-y-auto">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">{t.shopName}</label>
                                <input
                                    type="text"
                                    required
                                    value={editShopName}
                                    onChange={(e) => setEditShopName(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${themeClasses.primaryText.replace('text-', 'focus:ring-')}`}
                                    placeholder="Shop Name"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Shop Address</label>
                                <input
                                    type="text"
                                    value={editShopAddress}
                                    onChange={(e) => setEditShopAddress(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${themeClasses.primaryText.replace('text-', 'focus:ring-')}`}
                                    placeholder="Shop Address"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Me API Key</label>
                                <input
                                    type="text"
                                    value={editShopApi}
                                    onChange={(e) => setEditShopApi(e.target.value)}
                                    disabled={!!currentShop?.uploadme_api_key}
                                    className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${themeClasses.primaryText.replace('text-', 'focus:ring-')} disabled:bg-slate-100 disabled:text-slate-500`}
                                    placeholder="API Key for image uploads"
                                />
                                {currentShop?.uploadme_api_key ? (
                                    <p className="text-xs text-slate-500 mt-1">API Key is already set and cannot be changed.</p>
                                ) : (
                                    <p className="text-xs text-slate-500 mt-1">This key will be permanent once set.</p>
                                )}
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Shop Logo</label>
                                {currentShop?.logo_url && !editShopLogo && (
                                    <div className="mb-3">
                                        <img src={currentShop.logo_url} alt="Shop Logo" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
                                    </div>
                                )}
                                {editShopLogo && (
                                    <div className="mb-3">
                                        <img src={URL.createObjectURL(editShopLogo)} alt="Selected Logo" className="h-16 w-16 object-cover rounded-xl border border-emerald-500 ring-2 ring-emerald-200" />
                                        <p className="text-sm text-emerald-600 mt-2 font-medium">Selected: {editShopLogo.name}</p>
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
                                                    setEditShopLogo(e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowShopProfile(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingShop || !editShopName.trim()}
                                    className={`flex-1 px-4 py-2.5 rounded-xl ${themeClasses.primaryBg} text-white font-medium ${themeClasses.primaryHoverBg} disabled:opacity-70 transition-colors flex justify-center items-center`}
                                >
                                    {isUpdatingShop ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* User Profile Modal */}
            {showUserProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">{t.userProfile}</h3>
                            <button onClick={() => setShowUserProfile(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="p-6 max-h-[80vh] overflow-y-auto">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editUserName}
                                    onChange={(e) => setEditUserName(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${themeClasses.primaryText.replace('text-', 'focus:ring-')}`}
                                    placeholder="Your Name"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={editUserEmail}
                                    onChange={(e) => setEditUserEmail(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${themeClasses.primaryText.replace('text-', 'focus:ring-')}`}
                                    placeholder="Your Email"
                                />
                                {editUserEmail !== user?.email && (
                                    <p className="text-xs text-amber-600 mt-1">Changing email requires verification code.</p>
                                )}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Number</label>
                                <input
                                    type="tel"
                                    required
                                    value={editUserMobile}
                                    onChange={(e) => setEditUserMobile(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${themeClasses.primaryText.replace('text-', 'focus:ring-')}`}
                                    placeholder="Your Mobile Number"
                                />
                                {editUserMobile !== user?.prefs?.mobile && (
                                    <p className="text-xs text-amber-600 mt-1">Changing mobile requires verification code.</p>
                                )}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">New Password (Optional)</label>
                                <input
                                    type="password"
                                    value={editUserPassword}
                                    onChange={(e) => setEditUserPassword(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${themeClasses.primaryText.replace('text-', 'focus:ring-')}`}
                                    placeholder="Leave blank to keep current"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Profile Picture</label>
                                {user?.prefs?.avatar_url && !editUserAvatar && (
                                    <div className="mb-3">
                                        <img src={user.prefs.avatar_url} alt="User Avatar" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
                                    </div>
                                )}
                                {editUserAvatar && (
                                    <div className="mb-3">
                                        <img src={URL.createObjectURL(editUserAvatar)} alt="Selected Avatar" className="h-16 w-16 object-cover rounded-xl border border-emerald-500 ring-2 ring-emerald-200" />
                                        <p className="text-sm text-emerald-600 mt-2 font-medium">Selected: {editUserAvatar.name}</p>
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
                                                    setEditUserAvatar(e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowUserProfile(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingUser || !editUserName.trim() || !editUserEmail.trim() || !editUserMobile.trim()}
                                    className={`flex-1 px-4 py-2.5 rounded-xl ${themeClasses.primaryBg} text-white font-medium ${themeClasses.primaryHoverBg} disabled:opacity-70 transition-colors flex justify-center items-center`}
                                >
                                    {isUpdatingUser ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
