import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { Search, QrCode, Printer, Download, Package, Loader2 } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, PRODUCTS_COLLECTION, Query } from '../../lib/appwrite';

export default function BarcodeGen({ onBack, shop }: any) {
    const { t, themeClasses } = useAppConfig();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    const searchProducts = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setProducts([]);
            return;
        }
        try {
            setLoading(true);
            const res = await databases.listDocuments(DB_ID, PRODUCTS_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.search('name', term),
                Query.limit(10)
            ]);
            setProducts(res.documents);
        } catch (error) {
            console.error('Error searching products for barcode:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen bg-slate-50 flex flex-col">
            <PageHeader title={t.barcodeGen || "Barcode Generator"} onBack={onBack} />
            
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm space-y-4">
                <div className="relative group">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:${themeClasses.primaryText.split(' ')[0]} transition-colors`} />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => searchProducts(e.target.value)}
                        placeholder="Search product to generate barcode..." 
                        className="w-full pl-12 pr-4 py-3 bg-slate-100 border border-transparent rounded-2xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-100 outline-none transition-all text-sm font-medium" 
                    />
                </div>

                {products.length > 0 && (
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                        {products.map(p => (
                            <button 
                                key={p.$id} 
                                onClick={() => {
                                    setSelectedProduct(p);
                                    setProducts([]);
                                    setSearchTerm('');
                                }}
                                className="w-full p-3 text-left hover:bg-white border-b border-slate-100 last:border-0 transition-colors flex items-center"
                            >
                                <Package className="h-4 w-4 text-slate-400 mr-3" />
                                <span className="text-sm font-bold text-slate-700">{p.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
                {selectedProduct ? (
                    <div className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                        <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                            <QrCode className={`h-10 w-10 ${themeClasses.primaryText}`} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-1">{selectedProduct.name}</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">SKU: {selectedProduct.$id.slice(-8).toUpperCase()}</p>
                        
                        <div className="w-full p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 mb-8 flex flex-col items-center">
                            {/* Placeholder for Barcode Image */}
                            <div className="h-24 w-full bg-white rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden">
                                <div className="flex space-x-1 opacity-20">
                                    {[...Array(20)].map((_, i) => (
                                        <div key={i} className={`h-16 w-${i % 3 === 0 ? '2' : '1'} bg-black`} />
                                    ))}
                                </div>
                                <span className="absolute text-[10px] font-mono font-bold text-slate-400 mt-16">{selectedProduct.$id.slice(-12).toUpperCase()}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <button className="flex items-center justify-center p-4 bg-slate-100 text-slate-700 rounded-2xl font-bold active:scale-95 transition-all">
                                <Download className="h-5 w-5 mr-2" /> Save
                            </button>
                            <button className={`flex items-center justify-center p-4 ${themeClasses.primaryBg} text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all`}>
                                <Printer className="h-5 w-5 mr-2" /> Print
                            </button>
                        </div>
                        
                        <button onClick={() => setSelectedProduct(null)} className="mt-6 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">Select Another</button>
                    </div>
                ) : (
                    <div className="text-center max-w-xs">
                        <div className="h-24 w-24 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6">
                            <QrCode className="h-10 w-10 text-slate-300" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Generate Barcodes</h2>
                        <p className="text-slate-500 text-sm">Search and select a product from your inventory to generate and print barcodes.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
