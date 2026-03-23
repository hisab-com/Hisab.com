import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppConfigProvider } from './context/AppConfigContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                <p className="text-slate-500 font-medium">লোড হচ্ছে...</p>
            </div>
        );
    }
    
    if (!user) return <Navigate to="/login" />;
    return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                <p className="text-slate-500 font-medium">লোড হচ্ছে...</p>
            </div>
        );
    }
    
    if (user) return <Navigate to="/" />;
    return <>{children}</>;
};

export default function App() {
    return (
        <AuthProvider>
            <AppConfigProvider>
                <BrowserRouter>
                    <Routes>
                        <Route 
                            path="/login" 
                            element={
                                <PublicRoute>
                                    <Login />
                                </PublicRoute>
                            } 
                        />
                        <Route 
                            path="/register" 
                            element={
                                <PublicRoute>
                                    <Register />
                                </PublicRoute>
                            } 
                        />
                        <Route 
                            path="/" 
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            } 
                        />
                    </Routes>
                </BrowserRouter>
            </AppConfigProvider>
        </AuthProvider>
    );
}
