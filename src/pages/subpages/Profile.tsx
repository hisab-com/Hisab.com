import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, ArrowLeft, Search, Loader2, Edit2, Camera, Globe, Lock } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { useAuth } from '../../context/AuthContext';
import { databases, DB_ID, USERS_COLLECTION, Query, account } from '../../lib/appwrite';
import PageHeader from '../../components/PageHeader';
import { uploadToCloudinary, DEFAULT_CLOUDINARY } from '../../utils/cloudinary';

export default function Profile({ onBack, userId, currentShop }: { onBack: () => void, userId?: string, currentShop?: any }) {
    const { t, themeClasses } = useAppConfig();
    const { user: currentUser, checkAuth } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [isMobilePublic, setIsMobilePublic] = useState(false);
    const [isEmailPublic, setIsEmailPublic] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, [userId, currentUser]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const targetId = userId || currentUser?.$id;
            if (!targetId) return;

            const doc = await databases.getDocument(DB_ID, USERS_COLLECTION, targetId);
            setProfile(doc);
            
            if (!userId) {
                setEditName(doc.name || '');
                setEditBio(doc.bio || '');
                setIsMobilePublic(doc.is_mobile_public || false);
                setIsEmailPublic(doc.is_email_public || false);
            }
        } catch (error: any) {
            console.error('Error fetching profile:', error);
            if (error.message?.includes('Attribute not found')) {
                console.warn('Users Public collection missing attributes.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await databases.listDocuments(DB_ID, USERS_COLLECTION, [
                Query.or([
                    Query.contains('name', searchQuery),
                    Query.equal('mobile', searchQuery),
                    Query.equal('email', searchQuery)
                ]),
                Query.limit(10)
            ]);
            setSearchResults(res.documents);
        } catch (error: any) {
            console.error('Search error:', error);
            if (error.message?.includes('Attribute not found')) {
                alert('Search failed: Database schema missing attributes (name, mobile, or email).');
            }
        } finally {
            setIsSearching(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        setIsUpdating(true);
        try {
            const prefs = {
                ...currentUser.prefs,
                bio: editBio,
                is_mobile_public: isMobilePublic,
                is_email_public: isEmailPublic
            };

            await account.updatePrefs(prefs);
            if (editName !== currentUser.name) {
                await account.updateName(editName);
            }

            // Sync to public collection
            await databases.updateDocument(DB_ID, USERS_COLLECTION, currentUser.$id, {
                name: editName,
                bio: editBio,
                is_mobile_public: isMobilePublic,
                is_email_public: isEmailPublic
            });

            await checkAuth();
            setIsEditing(false);
            fetchProfile();
        } catch (error) {
            console.error('Update profile error:', error);
            alert('Failed to update profile');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAvatarUpload = async (file: File) => {
        if (!currentUser) return;
        setIsUpdating(true);
        try {
            // Use shop's custom API if available, otherwise default
            const customConfig = currentShop?.uploadme_api_key ? JSON.parse(currentShop.uploadme_api_key) : null;
            const uploadRes = await uploadToCloudinary(file, customConfig || DEFAULT_CLOUDINARY);
            const avatarUrl = uploadRes.url;

            const prefs = { ...currentUser.prefs, avatar_url: avatarUrl };
            await account.updatePrefs(prefs);

            await databases.updateDocument(DB_ID, USERS_COLLECTION, currentUser.$id, {
                avatar_url: avatarUrl
            });

            await checkAuth();
            fetchProfile();
        } catch (error) {
            console.error('Avatar upload error:', error);
            alert('Failed to upload avatar');
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText}`} />
            </div>
        );
    }

    const isOwnProfile = !userId || userId === currentUser?.$id;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <PageHeader 
                title={isOwnProfile ? t.myProfile || "My Profile" : profile?.name || "Profile"} 
                onBack={onBack} 
                icon={User}
            />

            <div className="max-w-md mx-auto sm:max-w-3xl p-4 space-y-6">
                {/* Search Bar */}
                {isOwnProfile && (
                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, mobile or email..."
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <button 
                            type="submit"
                            disabled={isSearching}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl ${themeClasses.primaryBg} text-white font-bold text-sm`}
                        >
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                        </button>
                    </form>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && isOwnProfile && (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                        <div className="px-6 py-3 bg-slate-50 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search Results</span>
                            <button onClick={() => setSearchResults([])} className="text-xs font-bold text-rose-500">Clear</button>
                        </div>
                        {searchResults.map(res => (
                            <button 
                                key={res.$id} 
                                onClick={() => {
                                    setProfile(res);
                                    setSearchResults([]);
                                    setSearchQuery('');
                                }}
                                className="w-full flex items-center p-4 hover:bg-slate-50 transition-colors text-left"
                            >
                                <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden mr-3">
                                    {res.avatar_url ? (
                                        <img src={res.avatar_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                                            <User className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{res.name}</p>
                                    <p className="text-xs text-slate-500">{res.mobile || res.email}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Profile Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className={`h-32 ${themeClasses.primaryBg} relative`}>
                        {isOwnProfile && (
                            <button 
                                onClick={() => setIsEditing(!isEditing)}
                                className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                            >
                                <Edit2 className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    <div className="px-6 pb-6 relative">
                        <div className="absolute -top-12 left-6">
                            <div className="h-24 w-24 rounded-3xl bg-white p-1 shadow-lg relative group">
                                <div className="h-full w-full rounded-2xl bg-slate-100 overflow-hidden">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                                            <User className="h-10 w-10" />
                                        </div>
                                    )}
                                </div>
                                {isOwnProfile && (
                                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                        <Camera className="h-6 w-6" />
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="pt-16">
                            {!isEditing ? (
                                <>
                                    <h2 className="text-2xl font-bold text-slate-900">{profile?.name}</h2>
                                    <p className="text-slate-500 mt-1">{profile?.bio || "No bio yet."}</p>

                                    <div className="mt-6 space-y-4">
                                        {(profile?.is_mobile_public || isOwnProfile) && profile?.mobile && (
                                            <div className="flex items-center text-slate-600">
                                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center mr-3">
                                                    <Phone className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile</p>
                                                    <p className="font-medium">{profile.mobile}</p>
                                                </div>
                                                {!profile.is_mobile_public && isOwnProfile && <Lock className="h-3 w-3 ml-2 text-slate-300" />}
                                            </div>
                                        )}
                                        {(profile?.is_email_public || isOwnProfile) && profile?.email && (
                                            <div className="flex items-center text-slate-600">
                                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center mr-3">
                                                    <Mail className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                                                    <p className="font-medium">{profile.email}</p>
                                                </div>
                                                {!profile.is_email_public && isOwnProfile && <Lock className="h-3 w-3 ml-2 text-slate-300" />}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-opacity-50 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Bio</label>
                                        <textarea
                                            value={editBio}
                                            onChange={(e) => setEditBio(e.target.value)}
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-opacity-50 outline-none resize-none"
                                        />
                                    </div>
                                    <div className="flex space-x-4">
                                        <label className="flex-1 flex items-center p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50">
                                            <input 
                                                type="checkbox" 
                                                checked={isMobilePublic}
                                                onChange={(e) => setIsMobilePublic(e.target.checked)}
                                                className="mr-2"
                                            />
                                            <span className="text-sm font-medium text-slate-700">Public Mobile</span>
                                        </label>
                                        <label className="flex-1 flex items-center p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50">
                                            <input 
                                                type="checkbox" 
                                                checked={isEmailPublic}
                                                onChange={(e) => setIsEmailPublic(e.target.checked)}
                                                className="mr-2"
                                            />
                                            <span className="text-sm font-medium text-slate-700">Public Email</span>
                                        </label>
                                    </div>
                                    <div className="flex space-x-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isUpdating}
                                            className={`flex-1 px-4 py-3 rounded-xl ${themeClasses.primaryBg} text-white font-bold flex justify-center items-center`}
                                        >
                                            {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
