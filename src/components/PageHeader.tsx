import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppConfig } from '../context/AppConfigContext';

export default function PageHeader({ title, onBack, rightContent }: any) {
    const { themeClasses } = useAppConfig();
    return (
        <header className={`${themeClasses.primaryBg} text-white px-4 py-3 sticky top-0 z-40 shadow-md flex justify-between items-center`}>
            <div className="flex items-center">
                <button onClick={onBack} className="mr-3 p-1 rounded-full hover:bg-white/20 transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="font-bold text-lg truncate">{title}</h1>
            </div>
            {rightContent && <div>{rightContent}</div>}
        </header>
    );
}
