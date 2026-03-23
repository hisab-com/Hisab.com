import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { account, ID } from '../lib/appwrite';
import { Store, Mail, Lock, User, Phone, Loader2, ShieldCheck } from 'lucide-react';

export default function Register() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ name: '', email: '', mobile: '', password: '' });
    const [code, setCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { checkAuth } = useAuth();

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Generate 6-digit verification code
            const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
            setCode(generatedCode);

            // Google Apps Script URL
            const scriptUrl = 'https://script.google.com/macros/s/AKfycbwoC5HV-g8E5W3LY4tw4I63OUtIIK5e7kEDMW5Dk8XTn9BmBFyLR6sOGCd1JHo9HdLx/exec';
            
            // Send JSON Payload to Apps Script
            fetch(scriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    email: formData.email,
                    code: generatedCode,
                    name: formData.name
                }),
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'text/plain', // Use text/plain to avoid CORS preflight
                },
            }).catch(console.error);

            setStep(2);
        } catch (err: any) {
            setError('কোড পাঠাতে সমস্যা হয়েছে। আপনার ইন্টারনেট কানেকশন চেক করুন।');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (inputCode !== code) {
            setError('ভুল কোড! আপনার ইমেইল চেক করে সঠিক কোড দিন।');
            return;
        }
        
        setLoading(true);
        setError('');
        try {
            // 1. Create Appwrite account
            await account.create(ID.unique(), formData.email, formData.password, formData.name);
            
            // 2. Login to create session
            await account.createEmailPasswordSession(formData.email, formData.password);
            
            // 3. Save mobile number in user preferences
            await account.updatePrefs({ mobile: formData.mobile });
            
            // 4. Update auth context and redirect
            await checkAuth();
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে।');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="h-16 w-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Store className="h-8 w-8 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
                    নতুন অ্যাকাউন্ট
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    দোকান ম্যানেজমেন্ট অ্যাপে স্বাগতম
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-sm ring-1 ring-slate-200 sm:rounded-xl sm:px-10">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <form className="space-y-5" onSubmit={handleSendCode}>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">আপনার নাম</label>
                                <div className="mt-2 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="block w-full pl-10 rounded-lg border-0 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm"
                                        placeholder="আপনার পুরো নাম"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">ইমেইল অ্যাড্রেস</label>
                                <div className="mt-2 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="block w-full pl-10 rounded-lg border-0 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm"
                                        placeholder="example@gmail.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">মোবাইল নম্বর</label>
                                <div className="mt-2 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.mobile}
                                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                        className="block w-full pl-10 rounded-lg border-0 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm"
                                        placeholder="01XXXXXXXXX"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">পাসওয়ার্ড</label>
                                <div className="mt-2 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="block w-full pl-10 rounded-lg border-0 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm"
                                        placeholder="কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full justify-center items-center rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-70 transition-colors"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'পরবর্তী ধাপ (ইমেইল ভেরিফিকেশন)'}
                            </button>
                        </form>
                    ) : (
                        <form className="space-y-6" onSubmit={handleVerifyAndRegister}>
                            <div className="text-center mb-6">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">ইমেইল ভেরিফিকেশন</h3>
                                <p className="text-sm text-slate-500 mt-2">
                                    আমরা <strong>{formData.email}</strong> ঠিকানায় একটি ৬-ডিজিটের কোড পাঠিয়েছি। অনুগ্রহ করে কোডটি নিচে দিন।
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 text-center">
                                    ভেরিফিকেশন কোড
                                </label>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value)}
                                    className="mt-2 block w-full text-center tracking-widest text-2xl rounded-lg border-0 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-emerald-600"
                                    placeholder="------"
                                />
                            </div>

                            <div className="flex flex-col space-y-3">
                                <button
                                    type="submit"
                                    disabled={loading || inputCode.length !== 6}
                                    className="flex w-full justify-center items-center rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-70 transition-colors"
                                >
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'ভেরিফাই ও অ্যাকাউন্ট তৈরি করুন'}
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-sm text-slate-600 hover:text-slate-900 font-medium text-center"
                                >
                                    তথ্য পরিবর্তন করতে ফিরে যান
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-6 text-center text-sm text-slate-600">
                        আগে থেকে অ্যাকাউন্ট আছে?{' '}
                        <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-500">
                            লগইন করুন
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
