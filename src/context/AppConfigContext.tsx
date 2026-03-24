import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'bn';
type Theme = 'emerald' | 'bkash' | 'blue';

interface ThemeClasses {
    primaryBg: string;
    primaryHoverBg: string;
    primaryText: string;
    lightBg: string;
    lightText: string;
    border: string;
}

const themes: Record<Theme, ThemeClasses> = {
    emerald: { primaryBg: 'bg-emerald-600', primaryHoverBg: 'hover:bg-emerald-700', primaryText: 'text-emerald-600', lightBg: 'bg-emerald-50', lightText: 'text-emerald-700', border: 'border-emerald-600' },
    bkash: { primaryBg: 'bg-[#e2136e]', primaryHoverBg: 'hover:bg-[#c40e5d]', primaryText: 'text-[#e2136e]', lightBg: 'bg-pink-50', lightText: 'text-[#e2136e]', border: 'border-[#e2136e]' },
    blue: { primaryBg: 'bg-blue-600', primaryHoverBg: 'hover:bg-blue-700', primaryText: 'text-blue-600', lightBg: 'bg-blue-50', lightText: 'text-blue-700', border: 'border-blue-600' }
};

const translations = {
    en: {
        home: 'Home', report: 'Report', settings: 'Settings',
        purchase: 'Purchase', sale: 'Sale',
        ledgerReports: 'Ledger Reports', purchaseReports: 'Purchase Reports', salesReports: 'Sales Reports', dueReports: 'Due Reports', expenseReports: 'Expense Reports',
        businessManagement: 'Business Management', contacts: 'Contacts', productList: 'Product List', stockReport: 'Stock Report', businessReport: 'Business Report',
        utilitiesSecurity: 'Utilities & Security', cashBox: 'Cash Box', salesReturn: 'Sales Return', purchaseReturn: 'Purchase Return', expireItems: 'Expire Items', appAccess: 'App Access', barcodeGen: 'BarcodeGen', printer: 'Printer', note: 'Note',
        shopSelect: 'Select Shop', createShop: 'Create New Shop', staffAccess: 'Staff Access', logout: 'Logout', language: 'Language', theme: 'Theme', profile: 'Profile', shopProfile: 'Shop Profile', userProfile: 'User Profile',
        noShopFound: 'No Shop Found', createShopPrompt: 'Create a new shop or get access to start using the app.',
        shopName: 'Shop Name', cancel: 'Cancel', create: 'Create', staffMobile: 'Staff Mobile Number', staffMobileHint: 'If an account exists with this number, they will see your shop.', add: 'Add',
        dbSetupRequired: 'Database Setup Required!', dbSetupDesc: 'You need to setup the Appwrite database for the multi-shop system.', checkAgain: 'I have setup, check again',
        dailySummary: 'Today\'s Summary', incomes: 'Incomes', expense: 'Expense', cash: 'Cash', dueGiven: 'Due Given', dueTaken: 'Due Taken', notifications: 'Notifications',
        currency: 'Currency', decimalPoint: 'Decimal Point',
        printPreview: 'Print Preview', style: 'Style', logo: 'Logo', description: 'Description', header: 'Header', productImage: 'Product Image', challanView: 'Challan View', previousDue: 'Previous Due', voucherInfo: 'Voucher Info', priceOnly: 'Price only', pos: 'POS', token: 'Token'
    },
    bn: {
        home: 'হোম', report: 'রিপোর্ট', settings: 'সেটিংস',
        purchase: 'ক্রয়', sale: 'বিক্রয়',
        ledgerReports: 'খতিয়ান রিপোর্ট', purchaseReports: 'ক্রয় রিপোর্ট', salesReports: 'বিক্রয় রিপোর্ট', dueReports: 'বকেয়া রিপোর্ট', expenseReports: 'খরচ রিপোর্ট',
        businessManagement: 'ব্যবসা পরিচালনা', contacts: 'যোগাযোগ', productList: 'পণ্য তালিকা', stockReport: 'স্টক রিপোর্ট', businessReport: 'ব্যবসা রিপোর্ট',
        utilitiesSecurity: 'ইউটিলিটি ও নিরাপত্তা', cashBox: 'ক্যাশ বক্স', salesReturn: 'বিক্রয় ফেরত', purchaseReturn: 'ক্রয় ফেরত', expireItems: 'মেয়াদোত্তীর্ণ পণ্য', appAccess: 'অ্যাপ এক্সেস', barcodeGen: 'বারকোড জেনারেটর', printer: 'প্রিন্টার', note: 'নোট',
        shopSelect: 'দোকান নির্বাচন করুন', createShop: 'নতুন দোকান তৈরি করুন', staffAccess: 'স্টাফ এক্সেস', logout: 'লগআউট', language: 'ভাষা', theme: 'থিম', profile: 'প্রোফাইল', shopProfile: 'দোকানের প্রোফাইল', userProfile: 'আপনার প্রোফাইল',
        noShopFound: 'কোনো দোকান পাওয়া যায়নি', createShopPrompt: 'অ্যাপটি ব্যবহার শুরু করতে প্রথমে একটি নতুন দোকান তৈরি করুন অথবা অন্য কারো দোকানের এক্সেস গ্রহণ করুন।',
        shopName: 'দোকানের নাম', cancel: 'বাতিল', create: 'তৈরি করুন', staffMobile: 'স্টাফের মোবাইল নম্বর', staffMobileHint: 'এই নম্বর দিয়ে অ্যাকাউন্ট খোলা থাকলে তিনি আপনার দোকান দেখতে পাবেন।', add: 'যুক্ত করুন',
        dbSetupRequired: 'ডাটাবেস সেটআপ প্রয়োজন!', dbSetupDesc: 'মাল্টি-শপ সিস্টেম চালানোর জন্য আপনাকে Appwrite-এ ডাটাবেস তৈরি করতে হবে।', checkAgain: 'সেটআপ করেছি, আবার চেক করুন',
        dailySummary: 'আজকের সারসংক্ষেপ', incomes: 'আয়', expense: 'খরচ', cash: 'ক্যাশ', dueGiven: 'বকেয়া দেওয়া', dueTaken: 'বকেয়া নেওয়া', notifications: 'নোটিফিকেশন',
        currency: 'মুদ্রা (Currency)', decimalPoint: 'দশমিক বিন্দু (Decimal)',
        printPreview: 'প্রিন্ট প্রিভিউ', style: 'স্টাইল', logo: 'লোগো', description: 'বিবরণ', header: 'হেডার', productImage: 'পণ্যের ছবি', challanView: 'চালান ভিউ', previousDue: 'পূর্বের বকেয়া', voucherInfo: 'ভাউচার ইনফো', priceOnly: 'শুধু দাম', pos: 'পস (POS)', token: 'টোকেন'
    }
};

interface AppConfigContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    currency: string;
    setCurrency: (currency: string) => void;
    decimalPoint: number;
    setDecimalPoint: (decimalPoint: number) => void;
    formatCurrency: (amount: number | string) => string;
    t: typeof translations.en;
    themeClasses: ThemeClasses;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

export const AppConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('bn');
    const [theme, setTheme] = useState<Theme>('bkash');
    const [currency, setCurrency] = useState<string>('৳');
    const [decimalPoint, setDecimalPoint] = useState<number>(2);

    useEffect(() => {
        const savedLang = localStorage.getItem('app_lang') as Language;
        const savedTheme = localStorage.getItem('app_theme') as Theme;
        const savedCurrency = localStorage.getItem('app_currency');
        const savedDecimal = localStorage.getItem('app_decimal');
        
        if (savedLang) setLanguage(savedLang);
        if (savedTheme) setTheme(savedTheme);
        if (savedCurrency) setCurrency(savedCurrency);
        if (savedDecimal) {
            const parsed = parseInt(savedDecimal, 10);
            if (!isNaN(parsed)) setDecimalPoint(parsed);
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('app_lang', lang);
    };

    const handleSetTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem('app_theme', newTheme);
    };

    const handleSetCurrency = (newCurrency: string) => {
        setCurrency(newCurrency);
        localStorage.setItem('app_currency', newCurrency);
    };

    const handleSetDecimalPoint = (newDecimal: number) => {
        const val = isNaN(newDecimal) ? 2 : newDecimal;
        setDecimalPoint(val);
        localStorage.setItem('app_decimal', val.toString());
    };

    const formatCurrency = (amount: any) => {
        if (amount === null || amount === undefined || amount === '') return `${currency}0`;
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        const dp = isNaN(decimalPoint) ? 2 : decimalPoint;
        return `${currency}${isNaN(num) ? (0).toFixed(dp) : num.toFixed(dp)}`;
    };

    return (
        <AppConfigContext.Provider value={{ 
            language, setLanguage: handleSetLanguage, 
            theme, setTheme: handleSetTheme, 
            currency, setCurrency: handleSetCurrency,
            decimalPoint, setDecimalPoint: handleSetDecimalPoint,
            formatCurrency,
            t: translations[language], 
            themeClasses: themes[theme] 
        }}>
            {children}
        </AppConfigContext.Provider>
    );
};

export const useAppConfig = () => {
    const context = useContext(AppConfigContext);
    if (!context) throw new Error('useAppConfig must be used within AppConfigProvider');
    return context;
};
