import React, { createContext, useContext, useEffect, useState } from 'react';
import { account, databases, DB_ID, USERS_COLLECTION, ID } from '../lib/appwrite';
import { Models } from 'appwrite';

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    loading: boolean;
    checkAuth: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [loading, setLoading] = useState(true);

    const syncUserToPublic = async (sessionUser: Models.User<Models.Preferences>) => {
        try {
            const userId = sessionUser.$id;
            const prefs = sessionUser.prefs as any;
            const userData = {
                uid: userId,
                name: sessionUser.name,
                email: sessionUser.email,
                mobile: prefs?.mobile || '',
                avatar_url: prefs?.avatar_url || '',
                is_mobile_public: prefs?.is_mobile_public ?? false,
                is_email_public: prefs?.is_email_public ?? false,
                bio: prefs?.bio || ''
            };

            try {
                await databases.getDocument(DB_ID, USERS_COLLECTION, userId);
                await databases.updateDocument(DB_ID, USERS_COLLECTION, userId, userData);
            } catch (e: any) {
                if (e.code === 404) {
                    await databases.createDocument(DB_ID, USERS_COLLECTION, userId, userData);
                }
            }
        } catch (error) {
            console.error('Error syncing user to public collection:', error);
        }
    };

    const checkAuth = async () => {
        try {
            const sessionUser = await account.get();
            setUser(sessionUser);
            syncUserToPublic(sessionUser);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, checkAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
