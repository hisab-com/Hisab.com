import React, { useState, useEffect } from 'react';
import { X, Shield, Plus, User, Trash2, Edit2, Check, Loader2, ArrowLeft, Search, Mail, Phone, Crown, UserPlus, Send, Bell } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { useAuth } from '../../context/AuthContext';
import { databases, DB_ID, SHOPS_COLLECTION, USERS_COLLECTION, INVITATIONS_COLLECTION, Query, ID } from '../../lib/appwrite';
import PageHeader from '../../components/PageHeader';

export default function AppAccess({ onBack, shop, setShops, shops, setCurrentShop }: any) {
    const { t, themeClasses } = useAppConfig();
    const { user: currentUser } = useAuth();
    const [isUpdating, setIsUpdating] = useState(false);
    
    const [view, setView] = useState<'list' | 'add' | 'edit' | 'search'>('list');
    const [selectedMobile, setSelectedMobile] = useState('');
    const [role, setRole] = useState('staff');
    const [permissions, setPermissions] = useState<string[]>([]);
    
    const [roles, setRoles] = useState<any>({});
    const [allowedMobiles, setAllowedMobiles] = useState<string[]>([]);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Invitations state
    const [invitations, setInvitations] = useState<any[]>([]);
    const [loadingInvitations, setLoadingInvitations] = useState(false);

    const availablePermissions = [
        { id: 'sales', label: 'Sales' },
        { id: 'purchases', label: 'Purchases' },
        { id: 'products', label: 'Products' },
        { id: 'customers', label: 'Customers' },
        { id: 'reports', label: 'Reports' },
        { id: 'settings', label: 'Settings' }
    ];

    useEffect(() => {
        if (shop) {
            setAllowedMobiles(shop.allowed_mobiles || []);
            try {
                if (shop.access_roles) {
                    setRoles(JSON.parse(shop.access_roles));
                } else {
                    setRoles({});
                }
            } catch (e) {
                setRoles({});
            }
            fetchInvitations();
        }
    }, [shop]);

    const fetchInvitations = async () => {
        if (!shop) return;
        setLoadingInvitations(true);
        try {
            const res = await databases.listDocuments(DB_ID, INVITATIONS_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.equal('status', 'pending')
            ]);
            setInvitations(res.documents);
        } catch (error: any) {
            console.error('Error fetching invitations:', error);
            if (error.message?.includes('Attribute not found')) {
                console.warn('Database schema missing attributes. Please add "shop_id" and "status" to invitations collection.');
            }
        } finally {
            setLoadingInvitations(false);
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

    const handleInvite = async (userToInvite: any) => {
        if (!shop || !currentUser) return;
        setIsUpdating(true);
        try {
            const inviteData = {
                shop_id: shop.$id,
                shop_name: shop.name,
                sender_id: currentUser.$id,
                sender_name: currentUser.name,
                receiver_mobile: userToInvite.mobile || '',
                receiver_email: userToInvite.email || '',
                receiver_id: userToInvite.uid,
                role: 'staff',
                permissions: JSON.stringify(['sales', 'products', 'customers']),
                status: 'pending',
                created_at: new Date().toISOString()
            };

            await databases.createDocument(DB_ID, INVITATIONS_COLLECTION, ID.unique(), inviteData);
            alert(`Invitation sent to ${userToInvite.name}`);
            setSearchResults([]);
            setSearchQuery('');
            setView('list');
            fetchInvitations();
        } catch (error) {
            console.error('Invite error:', error);
            alert('Failed to send invitation');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSaveAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMobile.trim()) return;
        if (selectedMobile === currentUser?.prefs?.mobile) {
            alert("You cannot change your own role.");
            return;
        }

        setIsUpdating(true);
        try {
            const newRoles = { ...roles };
            const finalPermissions = role === 'owner' || role === 'manager' 
                ? availablePermissions.map(p => p.id) 
                : role === 'staff' 
                    ? ['sales', 'products', 'customers'] 
                    : permissions;

            newRoles[selectedMobile] = {
                role,
                permissions: finalPermissions
            };

            const newMobiles = [...allowedMobiles];
            if (!newMobiles.includes(selectedMobile)) {
                newMobiles.push(selectedMobile);
            }

            // Check if at least one owner remains
            const ownersCount = Object.values(newRoles).filter((r: any) => 
                (typeof r === 'string' && r === 'owner') || 
                (r.role === 'owner') || 
                (r.permissions?.length === availablePermissions.length)
            ).length;

            // Include original owner if not in roles
            const isOriginalOwnerInRoles = newRoles[shop.owner_mobile];
            const totalOwners = ownersCount + (isOriginalOwnerInRoles ? 0 : 1);

            if (totalOwners === 0) {
                alert("At least one owner must remain.");
                setIsUpdating(false);
                return;
            }

            const updatedShop = await databases.updateDocument(DB_ID, SHOPS_COLLECTION, shop.$id, {
                allowed_mobiles: newMobiles,
                access_roles: JSON.stringify(newRoles)
            });

            setCurrentShop(updatedShop);
            setShops(shops.map((s: any) => s.$id === updatedShop.$id ? updatedShop : s));
            
            setView('list');
            setSelectedMobile('');
            setRole('staff');
            setPermissions([]);
        } catch (error) {
            console.error(error);
            alert('Failed to update access.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemoveAccess = async (mobileToRemove: string) => {
        if (mobileToRemove === currentUser?.prefs?.mobile) {
            alert("You cannot remove yourself. Use 'Leave Shop' in settings.");
            return;
        }

        if (!window.confirm(`Are you sure you want to remove access for ${mobileToRemove}?`)) return;
        
        setIsUpdating(true);
        try {
            const newRoles = { ...roles };
            delete newRoles[mobileToRemove];

            const newMobiles = allowedMobiles.filter(m => m !== mobileToRemove);

            // Check if at least one owner remains
            const ownersCount = Object.values(newRoles).filter((r: any) => 
                (typeof r === 'string' && r === 'owner') || 
                (r.role === 'owner') || 
                (r.permissions?.length === availablePermissions.length)
            ).length;

            if (ownersCount === 0 && mobileToRemove === shop.owner_mobile) {
                alert("At least one owner must remain.");
                setIsUpdating(false);
                return;
            }

            const updatedShop = await databases.updateDocument(DB_ID, SHOPS_COLLECTION, shop.$id, {
                allowed_mobiles: newMobiles,
                access_roles: JSON.stringify(newRoles)
            });

            setCurrentShop(updatedShop);
            setShops(shops.map((s: any) => s.$id === updatedShop.$id ? updatedShop : s));
        } catch (error) {
            console.error(error);
            alert('Failed to remove access.');
        } finally {
            setIsUpdating(false);
        }
    };

    const isOwner = (mobile: string, roleData: any) => {
        if (mobile === shop.owner_mobile) return true;
        const roleName = typeof roleData === 'string' ? roleData : (roleData?.role || 'staff');
        const perms = typeof roleData === 'string' ? [] : (roleData?.permissions || []);
        return roleName === 'owner' || perms.length === availablePermissions.length;
    };

    const togglePermission = (permId: string) => {
        if (permissions.includes(permId)) {
            setPermissions(permissions.filter(p => p !== permId));
        } else {
            setPermissions([...permissions, permId]);
        }
    };

    const openEdit = (mobile: string) => {
        if (mobile === currentUser?.prefs?.mobile) {
            alert("You cannot edit your own role.");
            return;
        }
        setSelectedMobile(mobile);
        const userRoleData = roles[mobile];
        if (typeof userRoleData === 'string') {
            setRole(userRoleData);
            setPermissions(userRoleData === 'staff' ? ['sales', 'products', 'customers'] : availablePermissions.map(p => p.id));
        } else if (userRoleData) {
            setRole(userRoleData.role || 'staff');
            setPermissions(userRoleData.permissions || []);
        } else {
            setRole('staff');
            setPermissions(['sales', 'products', 'customers']);
        }
        setView('edit');
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title={t.appAccess || "App Access"} 
                onBack={onBack} 
                icon={Shield}
            />

            <div className="p-4 max-w-md mx-auto sm:max-w-3xl space-y-6">
                {/* Search / Invite Section */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                        <UserPlus className="h-5 w-5 mr-2 text-blue-500" />
                        Invite New User
                    </h4>
                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, mobile or email..."
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent"
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

                    {searchResults.length > 0 && (
                        <div className="mt-4 space-y-3 animate-in slide-in-from-top-4 duration-300">
                            {searchResults.map(res => (
                                <div key={res.$id} className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl bg-slate-50/50">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-white shadow-sm overflow-hidden mr-3">
                                            {res.avatar_url ? (
                                                <img src={res.avatar_url} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-slate-300">
                                                    <User className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{res.name}</p>
                                            <p className="text-[10px] text-slate-500">{res.mobile || res.email}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleInvite(res)}
                                        disabled={isUpdating}
                                        className={`p-2 rounded-xl ${themeClasses.primaryBg} text-white hover:shadow-md transition-all active:scale-90`}
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Users List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6">
                        {view === 'list' ? (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-lg mb-4">Users with access</h4>
                                    <div className="space-y-4">
                                        {/* Original Owner */}
                                        <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50/30">
                                            <div className="flex items-center">
                                                <div className={`h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mr-4 text-amber-600 shadow-sm`}>
                                                    <Crown className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{shop.owner_mobile}</p>
                                                    <div className="flex items-center">
                                                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-full mr-2">Owner</span>
                                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Creator</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {allowedMobiles.filter(m => m !== shop.owner_mobile).map(mobile => {
                                            const roleData = roles[mobile];
                                            const roleName = typeof roleData === 'string' ? roleData : (roleData?.role || 'staff');
                                            const owner = isOwner(mobile, roleData);
                                            
                                            return (
                                                <div key={mobile} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:border-slate-200 hover:shadow-sm transition-all">
                                                    <div className="flex items-center">
                                                        <div className={`h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mr-4 ${owner ? 'text-amber-600 bg-amber-50' : themeClasses.primaryText}`}>
                                                            {owner ? <Crown className="h-6 w-6" /> : <User className="h-6 w-6" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800">{mobile}</p>
                                                            <div className="flex items-center">
                                                                {owner && <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-full mr-2">Owner</span>}
                                                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{roleName}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <button onClick={() => openEdit(mobile)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90">
                                                            <Edit2 className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => handleRemoveAccess(mobile)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90">
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Pending Invitations */}
                                {invitations.length > 0 && (
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg mb-4 flex items-center">
                                            <Bell className="h-5 w-5 mr-2 text-amber-500" />
                                            Pending Invitations
                                        </h4>
                                        <div className="space-y-3">
                                            {invitations.map(invite => (
                                                <div key={invite.$id} className="flex items-center justify-between p-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center mr-3 text-slate-400">
                                                            <User className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-sm">{invite.receiver_mobile || invite.receiver_email}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">Invited on {new Date(invite.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={async () => {
                                                            if (window.confirm('Cancel this invitation?')) {
                                                                await databases.deleteDocument(DB_ID, INVITATIONS_COLLECTION, invite.$id);
                                                                fetchInvitations();
                                                            }
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleSaveAccess} className="space-y-6">
                                <div className="flex items-center mb-2">
                                    <button type="button" onClick={() => setView('list')} className="p-2 mr-2 bg-slate-100 rounded-full text-slate-500">
                                        <ArrowLeft className="h-4 w-4" />
                                    </button>
                                    <h4 className="font-bold text-slate-800">{view === 'add' ? 'Add New Access' : 'Edit Access'}</h4>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Mobile Number</label>
                                    <input
                                        type="tel"
                                        required
                                        disabled={view === 'edit'}
                                        value={selectedMobile}
                                        onChange={(e) => setSelectedMobile(e.target.value)}
                                        className={`w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${themeClasses.primaryText.replace('text-', 'focus:ring-')} disabled:opacity-60 font-medium`}
                                        placeholder="01XXXXXXXXX"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-3">Role</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['owner', 'manager', 'staff', 'custom'].map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setRole(r)}
                                                className={`py-3 px-4 rounded-2xl border text-sm font-bold capitalize transition-all flex items-center justify-center ${
                                                    role === r 
                                                        ? `border-transparent ${themeClasses.primaryBg} text-white shadow-md` 
                                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                {role === r && <Check className="h-4 w-4 mr-1.5" />}
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {(role === 'custom' || role === 'staff') && (
                                    <div className="animate-in slide-in-from-top-4 duration-300">
                                        <label className="block text-sm font-bold text-slate-700 mb-4">Permissions</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {availablePermissions.map(perm => (
                                                <label key={perm.id} className="flex items-center p-4 border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all">
                                                    <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center mr-3 transition-all ${
                                                        permissions.includes(perm.id) 
                                                            ? `${themeClasses.primaryBg} border-transparent` 
                                                            : 'border-slate-200'
                                                    }`}>
                                                        {permissions.includes(perm.id) && <Check className="h-4 w-4 text-white" />}
                                                    </div>
                                                    <input 
                                                        type="checkbox" 
                                                        className="hidden"
                                                        checked={permissions.includes(perm.id)}
                                                        onChange={() => togglePermission(perm.id)}
                                                    />
                                                    <span className="font-bold text-slate-700">{perm.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex space-x-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setView('list')}
                                        className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUpdating || !selectedMobile.trim()}
                                        className={`flex-1 px-6 py-4 rounded-2xl ${themeClasses.primaryBg} text-white font-bold shadow-md hover:shadow-lg disabled:opacity-70 transition-all flex justify-center items-center active:scale-95`}
                                    >
                                        {isUpdating ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Save Access'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
