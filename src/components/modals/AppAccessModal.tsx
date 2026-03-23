import React, { useState, useEffect } from 'react';
import { X, Shield, Plus, User, Trash2, Edit2, Check, Loader2 } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, SHOPS_COLLECTION } from '../../lib/appwrite';

export default function AppAccessModal({ isOpen, onClose, currentShop, setCurrentShop, setShops, shops }: any) {
    const { t, themeClasses } = useAppConfig();
    const [isUpdating, setIsUpdating] = useState(false);
    
    const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
    const [selectedMobile, setSelectedMobile] = useState('');
    const [role, setRole] = useState('staff');
    const [permissions, setPermissions] = useState<string[]>([]);
    
    const [roles, setRoles] = useState<any>({});
    const [allowedMobiles, setAllowedMobiles] = useState<string[]>([]);

    const availablePermissions = [
        { id: 'sales', label: 'Sales' },
        { id: 'purchases', label: 'Purchases' },
        { id: 'products', label: 'Products' },
        { id: 'customers', label: 'Customers' },
        { id: 'reports', label: 'Reports' },
        { id: 'settings', label: 'Settings' }
    ];

    useEffect(() => {
        if (currentShop) {
            setAllowedMobiles(currentShop.allowed_mobiles || []);
            try {
                if (currentShop.access_roles) {
                    setRoles(JSON.parse(currentShop.access_roles));
                } else {
                    setRoles({});
                }
            } catch (e) {
                setRoles({});
            }
        }
    }, [currentShop, isOpen]);

    if (!isOpen) return null;

    const handleSaveAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMobile.trim()) return;
        setIsUpdating(true);
        
        try {
            const newRoles = { ...roles };
            newRoles[selectedMobile] = {
                role,
                permissions: role === 'owner' || role === 'manager' 
                    ? availablePermissions.map(p => p.id) 
                    : role === 'staff' 
                        ? ['sales', 'products', 'customers'] 
                        : permissions
            };

            const newMobiles = [...allowedMobiles];
            if (!newMobiles.includes(selectedMobile)) {
                newMobiles.push(selectedMobile);
            }

            const updatedShop = await databases.updateDocument(DB_ID, SHOPS_COLLECTION, currentShop.$id, {
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
        if (!window.confirm(`Are you sure you want to remove access for ${mobileToRemove}?`)) return;
        
        setIsUpdating(true);
        try {
            const newRoles = { ...roles };
            delete newRoles[mobileToRemove];

            const newMobiles = allowedMobiles.filter(m => m !== mobileToRemove);

            const updatedShop = await databases.updateDocument(DB_ID, SHOPS_COLLECTION, currentShop.$id, {
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

    const togglePermission = (permId: string) => {
        if (permissions.includes(permId)) {
            setPermissions(permissions.filter(p => p !== permId));
        } else {
            setPermissions([...permissions, permId]);
        }
    };

    const openEdit = (mobile: string) => {
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

    const openAdd = () => {
        setSelectedMobile('');
        setRole('staff');
        setPermissions(['sales', 'products', 'customers']);
        setView('add');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center">
                        <Shield className={`h-5 w-5 mr-2 ${themeClasses.primaryText}`} />
                        <h3 className="text-lg font-bold text-slate-900">
                            {view === 'list' ? 'App Access' : view === 'add' ? 'Add New Access' : 'Edit Access'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {view === 'list' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-semibold text-slate-700">Users with access</h4>
                                <button 
                                    onClick={openAdd}
                                    className={`flex items-center text-sm font-medium ${themeClasses.primaryText} bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors`}
                                >
                                    <Plus className="h-4 w-4 mr-1" /> Add User
                                </button>
                            </div>

                            {allowedMobiles.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <User className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                                    <p>No other users have access to this shop.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {allowedMobiles.map(mobile => {
                                        const roleData = roles[mobile];
                                        const roleName = typeof roleData === 'string' ? roleData : (roleData?.role || 'staff');
                                        
                                        return (
                                            <div key={mobile} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                                                <div className="flex items-center">
                                                    <div className={`h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mr-3 ${themeClasses.primaryText}`}>
                                                        <User className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-800">{mobile}</p>
                                                        <p className="text-xs text-slate-500 capitalize">{roleName}</p>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-1">
                                                    <button onClick={() => openEdit(mobile)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleRemoveAccess(mobile)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {(view === 'add' || view === 'edit') && (
                        <form onSubmit={handleSaveAccess}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Number</label>
                                <input
                                    type="tel"
                                    required
                                    disabled={view === 'edit'}
                                    value={selectedMobile}
                                    onChange={(e) => setSelectedMobile(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent ${themeClasses.primaryText.replace('text-', 'focus:ring-')} disabled:bg-slate-50 disabled:text-slate-500`}
                                    placeholder="01XXXXXXXXX"
                                />
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['manager', 'staff', 'custom'].map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setRole(r)}
                                            className={`py-2.5 px-3 rounded-xl border text-sm font-medium capitalize transition-colors flex items-center justify-center ${
                                                role === r 
                                                    ? `border-transparent ${themeClasses.primaryBg} text-white` 
                                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            {role === r && <Check className="h-4 w-4 mr-1.5" />}
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {role === 'custom' && (
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-3">Permissions</label>
                                    <div className="space-y-2">
                                        {availablePermissions.map(perm => (
                                            <label key={perm.id} className="flex items-center p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                                <div className={`h-5 w-5 rounded border flex items-center justify-center mr-3 ${
                                                    permissions.includes(perm.id) 
                                                        ? `${themeClasses.primaryBg} border-transparent` 
                                                        : 'border-slate-300'
                                                }`}>
                                                    {permissions.includes(perm.id) && <Check className="h-3.5 w-3.5 text-white" />}
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden"
                                                    checked={permissions.includes(perm.id)}
                                                    onChange={() => togglePermission(perm.id)}
                                                />
                                                <span className="text-sm font-medium text-slate-700">{perm.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex space-x-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setView('list')}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating || !selectedMobile.trim()}
                                    className={`flex-1 px-4 py-3 rounded-xl ${themeClasses.primaryBg} text-white font-medium ${themeClasses.primaryHoverBg} disabled:opacity-70 transition-colors flex justify-center items-center`}
                                >
                                    {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Access'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
