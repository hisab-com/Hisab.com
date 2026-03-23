import React, { useState } from 'react';
import { useAppConfig } from '../../context/AppConfigContext';
import { Store, User, Globe, Palette, LogOut, Shield, ChevronRight, Plus, Check, DollarSign, Hash, X, Upload, Loader2, MapPin, Cloud, Tag, Lock, Mail, Phone, Camera } from 'lucide-react';
import { databases, DB_ID, SHOPS_COLLECTION, account } from '../../lib/appwrite';
import { uploadToCloudinary } from '../../utils/cloudinary';

export default function SettingsTab({ 
    user, shops, currentShop, setCurrentShop, setShowCreateShop, setShowAccessModal, logout 
}: any) {
    const { t, themeClasses, language, setLanguage, theme, setTheme, currency, setCurrency, decimalPoint, setDecimalPoint } = useAppConfig();

    // Shop Profile State
    const [showShopProfile, setShowShopProfile] = useState(false);
    const [editShopName, setEditShopName] = useState('');
    const [editShopAddress, setEditShopAddress] = useState('');
    const [editCloudName, setEditCloudName] = useState('');
    const [editUploadPreset, setEditUploadPreset] = useState('');
    const [editShopLogo, setEditShopLogo] = useState<File | null>(null);
    const [isUpdatingShop, setIsUpdatingShop] = useState(false);

    // User Profile State
    const [showUserProfile, setShowUserProfile] = useState(false);
    const [editUserName, setEditUserName] = useState('');
    const [editUserEmail, setEditUserEmail] = useState('');
    const [editUserMobile, setEditUserMobile] = useState('');
    const [editUserPassword, setEditUserPassword] = useState('');
    const [editUserOldPassword, setEditUserOldPassword] = useState('');
    const [editUserAvatar, setEditUserAvatar] = useState<File | null>(null);
    const [isUpdatingUser, setIsUpdatingUser] = useState(false);

    const openShopProfile = () => {
        setEditShopName(currentShop?.name || '');
        setEditShopAddress(currentShop?.address || '');
        try {
            const parsed = JSON.parse(currentShop?.uploadme_api_key || '{}');
            setEditCloudName(parsed.cloudName || '');
            setEditUploadPreset(parsed.uploadPreset || '');
        } catch {
            setEditCloudName('');
            setEditUploadPreset('');
        }
        setEditShopLogo(null);
        setShowShopProfile(true);
    };

    const openUserProfile = () => {
        setEditUserName(user?.name || '');
        setEditUserEmail(user?.email || '');
        setEditUserMobile(user?.prefs?.mobile || '');
        setEditUserPassword('');
        setEditUserOldPassword('');
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
                if (!editUserOldPassword) {
                    alert('পাসওয়ার্ড পরিবর্তন করতে বর্তমান পাসওয়ার্ড দেওয়া আবশ্যক।');
                    setIsUpdatingUser(false);
                    return;
                }
                await account.updatePassword(editUserPassword, editUserOldPassword);
            }

            let avatarUrl = user?.prefs?.avatar_url || '';

            if (editUserAvatar) {
                try {
                    // Uses default cloudinary settings defined in cloudinary.ts
                    const uploadRes = await uploadToCloudinary(editUserAvatar);
                    avatarUrl = uploadRes.url;
                } catch (uploadError: any) {
                    console.error('Failed to upload avatar:', uploadError);
                    alert(uploadError.message || 'ছবি আপলোড করতে সমস্যা হয়েছে।');
                    setIsUpdatingUser(false);
                    return;
                }
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
            const shopApiConfig = JSON.stringify({
                cloudName: editCloudName,
                uploadPreset: editUploadPreset
            });

            if (editShopLogo) {
                try {
                    // Uses default cloudinary settings defined in cloudinary.ts
                    const uploadRes = await uploadToCloudinary(editShopLogo);
                    logoUrl = uploadRes.url;
                } catch (uploadError: any) {
                    console.error('Failed to upload logo:', uploadError);
                    alert(uploadError.message || 'ছবি আপলোড করতে সমস্যা হয়েছে।');
                    setIsUpdatingShop(false);
                    return;
                }
            }

            const updatedShop = await databases.updateDocument(DB_ID, SHOPS_COLLECTION, currentShop.$id, {
                name: editShopName,
                address: editShopAddress || "",
                uploadme_api_key: shopApiConfig,
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
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-extrabold text-slate-800">{t.settings}</h2>
            </div>

            {/* Profile Header Card */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl shadow-lg p-6 flex items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-5 rounded-full blur-2xl"></div>
                <div className="relative">
                    {user?.prefs?.avatar_url ? (
                        <img src={user.prefs.avatar_url} alt="User Avatar" className="h-16 w-16 rounded-full object-cover mr-4 ring-4 ring-white/10" />
                    ) : (
                        <div className={`h-16 w-16 rounded-full bg-white/10 text-white flex items-center justify-center text-2xl font-bold mr-4 ring-4 ring-white/5`}>
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                    )}
                </div>
                <div className="relative text-white">
                    <h3 className="font-bold text-xl">{user?.name}</h3>
                    <p className="text-sm text-slate-300 flex items-center mt-1">
                        <Phone className="h-3 w-3 mr-1" /> {user?.prefs?.mobile || user?.email}
                    </p>
                </div>
            </div>

            {/* Shop Selection */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50 bg-slate-50 flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-sm uppercase tracking-wider">{t.shopSelect}</span>
                    <button onClick={() => setShowCreateShop(true)} className={`${themeClasses.primaryText} flex items-center text-sm font-bold bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100 active:scale-95 transition-transform`}>
                        <Plus className="h-4 w-4 mr-1" /> {t.createShop}
                    </button>
                </div>
                <div className="divide-y divide-slate-50">
                    {shops.map((shop: any) => (
                        <button 
                            key={shop.$id} 
                            onClick={() => setCurrentShop(shop)}
                            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group"
                        >
                            <div className="flex items-center">
                                {shop.logo_url ? (
                                    <img src={shop.logo_url} alt="Shop Logo" className="h-10 w-10 rounded-xl object-cover mr-4 border border-slate-200 shadow-sm" />
                                ) : (
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center mr-4 shadow-sm ${currentShop?.$id === shop.$id ? themeClasses.primaryBg + ' text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Store className="h-5 w-5" />
                                    </div>
                                )}
                                <div className="text-left">
                                    <span className={`block font-bold text-base ${currentShop?.$id === shop.$id ? 'text-slate-900' : 'text-slate-600'}`}>{shop.name}</span>
                                    {shop.owner_id !== user?.$id && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-semibold mt-1 inline-block">Staff</span>}
                                </div>
                            </div>
                            {currentShop?.$id === shop.$id ? (
                                <div className={`h-6 w-6 rounded-full ${themeClasses.lightBg} flex items-center justify-center`}>
                                    <Check className={`h-4 w-4 ${themeClasses.primaryText}`} />
                                </div>
                            ) : (
                                <ChevronRight className="h-5 w-5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Settings Options */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                <button onClick={openShopProfile} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors active:bg-slate-100">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center mr-4 text-indigo-600">
                            <Store className="h-5 w-5" />
                        </div>
                        <span className="font-semibold text-slate-700 text-base">{t.shopProfile}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>
                <button onClick={openUserProfile} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors active:bg-slate-100">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center mr-4 text-emerald-600">
                            <User className="h-5 w-5" />
                        </div>
                        <span className="font-semibold text-slate-700 text-base">{t.userProfile}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>
                {userRole === 'Owner' && (
                    <button onClick={() => setShowAccessModal(true)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors active:bg-slate-100">
                        <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center mr-4 text-rose-600">
                                <Shield className="h-5 w-5" />
                            </div>
                            <span className="font-semibold text-slate-700 text-base">{t.appAccess}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                    </button>
                )}
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center">
                        <Globe className="h-5 w-5 mr-3 text-slate-500" />
                        <span className="font-medium text-slate-700">{t.language}</span>
                    </div>
                    <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner">
                        <button onClick={() => setLanguage('bn')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${language === 'bn' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>বাংলা</button>
                        <button onClick={() => setLanguage('en')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${language === 'en' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>EN</button>
                    </div>
                </div>
                <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center">
                        <Palette className="h-5 w-5 mr-3 text-slate-500" />
                        <span className="font-medium text-slate-700">{t.theme}</span>
                    </div>
                    <div className="flex space-x-3">
                        <button onClick={() => setTheme('bkash')} className={`h-8 w-8 rounded-full bg-[#e2136e] shadow-sm transform transition-transform ${theme === 'bkash' ? 'scale-110 ring-4 ring-pink-100' : 'hover:scale-105'}`}></button>
                        <button onClick={() => setTheme('emerald')} className={`h-8 w-8 rounded-full bg-emerald-600 shadow-sm transform transition-transform ${theme === 'emerald' ? 'scale-110 ring-4 ring-emerald-100' : 'hover:scale-105'}`}></button>
                        <button onClick={() => setTheme('blue')} className={`h-8 w-8 rounded-full bg-blue-600 shadow-sm transform transition-transform ${theme === 'blue' ? 'scale-110 ring-4 ring-blue-100' : 'hover:scale-105'}`}></button>
                    </div>
                </div>
                <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center">
                        <DollarSign className="h-5 w-5 mr-3 text-slate-500" />
                        <span className="font-medium text-slate-700">{t.currency}</span>
                    </div>
                    <select 
                        value={currency} 
                        onChange={(e) => setCurrency(e.target.value)}
                        className="bg-slate-100 border-none text-sm font-bold text-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-slate-200 shadow-inner appearance-none cursor-pointer text-center"
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
                <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center">
                        <Hash className="h-5 w-5 mr-3 text-slate-500" />
                        <span className="font-medium text-slate-700">{t.decimalPoint}</span>
                    </div>
                    <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner">
                        <button onClick={() => setDecimalPoint(0)} className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${decimalPoint === 0 ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>0</button>
                        <button onClick={() => setDecimalPoint(1)} className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${decimalPoint === 1 ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>.0</button>
                        <button onClick={() => setDecimalPoint(2)} className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${decimalPoint === 2 ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>.00</button>
                    </div>
                </div>
            </div>

            {/* Logout */}
            <button onClick={logout} className="w-full flex items-center justify-center p-4 bg-white border border-red-100 text-red-600 rounded-3xl font-bold shadow-sm hover:bg-red-50 active:scale-95 transition-all">
                <LogOut className="h-5 w-5 mr-2" /> {t.logout}
            </button>

            {/* --- Shop Profile Modal --- */}
            {showShopProfile && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="text-xl font-extrabold text-slate-800 flex items-center">
                                <Store className="h-6 w-6 mr-2 text-indigo-500" /> {t.shopProfile}
                            </h3>
                            <button onClick={() => setShowShopProfile(false)} className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateShop} className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Shop Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Tag className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={editShopName}
                                            onChange={(e) => setEditShopName(e.target.value)}
                                            className={`block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-opacity-50 outline-none transition-all ${themeClasses.primaryText.replace('text-', 'focus:ring-')} focus:border-transparent font-medium`}
                                            placeholder="e.g. Allahardan Stationery"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <MapPin className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={editShopAddress}
                                            onChange={(e) => setEditShopAddress(e.target.value)}
                                            className={`block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-opacity-50 outline-none transition-all ${themeClasses.primaryText.replace('text-', 'focus:ring-')} focus:border-transparent font-medium`}
                                            placeholder="e.g. Mohakhali, Dhaka"
                                        />
                                    </div>
                                </div>

                                {/* Custom Cloudinary Storage Section */}
                                <div className="mt-8 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 relative">
                                    <div className="absolute -top-3 left-4 bg-indigo-100 text-indigo-700 px-3 py-0.5 rounded-full text-xs font-bold flex items-center shadow-sm border border-indigo-200">
                                        <Cloud className="h-3 w-3 mr-1" /> Custom Storage (Optional)
                                    </div>
                                    <p className="text-xs text-slate-500 mb-4 mt-2 leading-relaxed">
                                        আপনার নিজের Cloudinary অ্যাকাউন্ট ব্যবহার করতে চাইলে নিচের তথ্যগুলো দিন। খালি রাখলে ডিফল্ট স্টোরেজ ব্যবহার হবে।
                                    </p>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Cloud Name</label>
                                            <input
                                                type="text"
                                                value={editCloudName}
                                                onChange={(e) => setEditCloudName(e.target.value)}
                                                className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                                placeholder="e.g. dxxxxxxxx"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Upload Preset (Unsigned)</label>
                                            <input
                                                type="text"
                                                value={editUploadPreset}
                                                onChange={(e) => setEditUploadPreset(e.target.value)}
                                                className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                                placeholder="e.g. stashio_products"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-3">Shop Logo</label>
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-shrink-0">
                                            {editShopLogo ? (
                                                <img src={URL.createObjectURL(editShopLogo)} alt="Selected Logo" className="h-20 w-20 object-cover rounded-2xl border-2 border-emerald-500 shadow-md" />
                                            ) : currentShop?.logo_url ? (
                                                <img src={currentShop.logo_url} alt="Shop Logo" className="h-20 w-20 object-cover rounded-2xl border border-slate-200 shadow-sm" />
                                            ) : (
                                                <div className="h-20 w-20 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 border-dashed">
                                                    <Store className="h-8 w-8 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <label className="flex items-center justify-center w-full px-4 py-3 border border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-colors shadow-sm font-medium text-slate-700 text-sm">
                                                <Camera className="w-5 h-5 mr-2 text-slate-500" /> 
                                                <span>{editShopLogo ? 'Change Picture' : 'Upload Picture'}</span>
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
                                </div>
                            </div>
                            <div className="mt-8 pt-5 border-t border-slate-100 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowShopProfile(false)}
                                    className="px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingShop || !editShopName.trim()}
                                    className={`px-4 py-3.5 rounded-2xl ${themeClasses.primaryBg} text-white font-bold shadow-md hover:shadow-lg disabled:opacity-70 active:scale-95 transition-all flex justify-center items-center`}
                                >
                                    {isUpdatingShop ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- User Profile Modal --- */}
            {showUserProfile && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="text-xl font-extrabold text-slate-800 flex items-center">
                                <User className="h-6 w-6 mr-2 text-emerald-500" /> {t.userProfile}
                            </h3>
                            <button onClick={() => setShowUserProfile(false)} className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={editUserName}
                                            onChange={(e) => setEditUserName(e.target.value)}
                                            className={`block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-opacity-50 outline-none transition-all ${themeClasses.primaryText.replace('text-', 'focus:ring-')} focus:border-transparent font-medium`}
                                            placeholder="e.g. Fahim"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={editUserEmail}
                                            onChange={(e) => setEditUserEmail(e.target.value)}
                                            className={`block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-opacity-50 outline-none transition-all ${themeClasses.primaryText.replace('text-', 'focus:ring-')} focus:border-transparent font-medium`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Mobile Number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Phone className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            type="tel"
                                            required
                                            value={editUserMobile}
                                            onChange={(e) => setEditUserMobile(e.target.value)}
                                            className={`block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-opacity-50 outline-none transition-all ${themeClasses.primaryText.replace('text-', 'focus:ring-')} focus:border-transparent font-medium`}
                                        />
                                    </div>
                                </div>

                                {/* Password Section */}
                                <div className="mt-8 bg-rose-50/50 border border-rose-100 rounded-2xl p-5 relative">
                                    <div className="absolute -top-3 left-4 bg-rose-100 text-rose-700 px-3 py-0.5 rounded-full text-xs font-bold flex items-center shadow-sm border border-rose-200">
                                        <Lock className="h-3 w-3 mr-1" /> Security
                                    </div>
                                    <div className="space-y-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Current Password</label>
                                            <input
                                                type="password"
                                                value={editUserOldPassword}
                                                onChange={(e) => setEditUserOldPassword(e.target.value)}
                                                className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all text-sm"
                                                placeholder="Required if changing password"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">New Password</label>
                                            <input
                                                type="password"
                                                value={editUserPassword}
                                                onChange={(e) => setEditUserPassword(e.target.value)}
                                                className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all text-sm"
                                                placeholder="Leave blank to keep current"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-3">Profile Picture</label>
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-shrink-0">
                                            {editUserAvatar ? (
                                                <img src={URL.createObjectURL(editUserAvatar)} alt="Selected Avatar" className="h-20 w-20 object-cover rounded-full border-2 border-emerald-500 shadow-md" />
                                            ) : user?.prefs?.avatar_url ? (
                                                <img src={user.prefs.avatar_url} alt="User Avatar" className="h-20 w-20 object-cover rounded-full border border-slate-200 shadow-sm" />
                                            ) : (
                                                <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 border-dashed">
                                                    <User className="h-8 w-8 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <label className="flex items-center justify-center w-full px-4 py-3 border border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-colors shadow-sm font-medium text-slate-700 text-sm">
                                                <Camera className="w-5 h-5 mr-2 text-slate-500" /> 
                                                <span>{editUserAvatar ? 'Change Photo' : 'Upload Photo'}</span>
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
                                </div>
                            </div>
                            <div className="mt-8 pt-5 border-t border-slate-100 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowUserProfile(false)}
                                    className="px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingUser || !editUserName.trim() || !editUserEmail.trim() || !editUserMobile.trim()}
                                    className={`px-4 py-3.5 rounded-2xl ${themeClasses.primaryBg} text-white font-bold shadow-md hover:shadow-lg disabled:opacity-70 active:scale-95 transition-all flex justify-center items-center`}
                                >
                                    {isUpdatingUser ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Profile'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
