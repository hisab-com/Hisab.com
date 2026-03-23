import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../../components/PageHeader';
import { Plus, Package, Edit, Trash2, Search, Barcode, MoreVertical, Layers, FileText, FileSpreadsheet, X, Upload, Loader2, AlertTriangle, Calendar, Tag, Minus, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, PRODUCTS_COLLECTION, STOCK_HISTORY_COLLECTION, ID, Query } from '../../lib/appwrite';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { Html5Qrcode } from 'html5-qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ProductList({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency, language } = useAppConfig();
    
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const itemsPerPage = 20;

    // Modals
    const [showProductModal, setShowProductModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    // Form State
    const [editProductId, setEditProductId] = useState('');
    const [pName, setPName] = useState('');
    const [pBrand, setPBrand] = useState('');
    const [pBuyPrice, setPBuyPrice] = useState('');
    const [pSellPrice, setPSellPrice] = useState('');
    const [pStock, setPStock] = useState('');
    const [pUnit, setPUnit] = useState('');
    const [pBarcode, setPBarcode] = useState('');
    const [pImage, setPImage] = useState<File | null>(null);
    const [pImageUrl, setPImageUrl] = useState('');
    
    const [isWholesale, setIsWholesale] = useState(false);
    const [pWholesalePrice, setPWholesalePrice] = useState('');
    const [hasAlert, setHasAlert] = useState(false);
    const [pAlertQty, setPAlertQty] = useState('5');
    const [hasExpiry, setHasExpiry] = useState(false);
    const [pExpireDate, setPExpireDate] = useState('');

    const [isSaving, setIsSaving] = useState(false);

    // Stock Modal State
    const [stockUpdateId, setStockUpdateId] = useState('');
    const [stockUpdateName, setStockUpdateName] = useState('');
    const [newStockInput, setNewStockInput] = useState<number>(0);

    // Scanner State
    const [scanTarget, setScanTarget] = useState<'search' | 'input'>('search');
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Dropdown State
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    useEffect(() => {
        fetchProducts();
    }, [shop.$id]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await databases.listDocuments(DB_ID, PRODUCTS_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.orderDesc('$createdAt'),
                Query.limit(1000) 
            ]);
            setProducts(res.documents);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const displayedProducts = filteredProducts.slice(0, page * itemsPerPage);

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let finalImageUrl = pImageUrl;
            
            if (pImage) {
                let cloudName = '';
                let uploadPreset = '';

                if (shop.uploadme_api_key) {
                    try {
                        const parsed = JSON.parse(shop.uploadme_api_key);
                        if (parsed.cloudName) cloudName = parsed.cloudName;
                        if (parsed.uploadPreset) uploadPreset = parsed.uploadPreset;
                    } catch (e) {
                        console.warn('Could not parse shop cloudinary credentials');
                    }
                }

                const uploadRes = await uploadToCloudinary(pImage, cloudName, uploadPreset);
                finalImageUrl = uploadRes.url;
            }

            const productData = {
                shop_id: shop.$id,
                name: pName,
                brand: pBrand,
                buy_price: Number(pBuyPrice),
                sell_price: Number(pSellPrice),
                stock: Number(pStock),
                unit: pUnit,
                image_url: finalImageUrl,
                barcode: pBarcode,
                is_wholesale: isWholesale ? "true" : "false",
                wholesale_price: isWholesale ? Number(pWholesalePrice) : 0,
                has_alert: hasAlert ? "true" : "false",
                alert_qty: hasAlert ? Number(pAlertQty) : 5,
                has_expiry: hasExpiry ? "true" : "false",
                expire_date: hasExpiry ? pExpireDate : ''
            };

            if (editProductId) {
                await databases.updateDocument(DB_ID, PRODUCTS_COLLECTION, editProductId, productData);
            } else {
                const newProduct = await databases.createDocument(DB_ID, PRODUCTS_COLLECTION, ID.unique(), productData);
                
                if (Number(pStock) > 0) {
                    await databases.createDocument(DB_ID, STOCK_HISTORY_COLLECTION, ID.unique(), {
                        shop_id: shop.$id,
                        product_id: newProduct.$id,
                        product_name: pName,
                        qty: Number(pStock),
                        action: "Opening Stock",
                        date: new Date().toISOString()
                    });
                }
            }
            
            await fetchProducts();
            setShowProductModal(false);
        } catch (error: any) {
            console.error('Error saving product:', error);
            alert(error.message || 'প্রোডাক্ট সেভ করতে সমস্যা হয়েছে।');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm("আপনি কি নিশ্চিত?")) return;
        try {
            await databases.deleteDocument(DB_ID, PRODUCTS_COLLECTION, id);
            setProducts(products.filter(p => p.$id !== id));
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        
        // PDF Metadata & Bengali Header Support
        const isBn = language === 'bn';
        const title = isBn ? `ইনভেন্টরি রিপোর্ট - ${shop.name}` : `Inventory Report - ${shop.name}`;
        const dateText = isBn ? `তারিখ: ${new Date().toLocaleDateString('bn-BD')}` : `Date: ${new Date().toLocaleDateString()}`;

        doc.setFontSize(20);
        doc.setTextColor(79, 70, 229); 
        doc.text(title, 105, 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(dateText, 105, 22, { align: 'center' });

        const tableColumn = isBn 
            ? ["#", "পণ্য", "ব্র্যান্ড", "স্টক", "ক্রয়", "বিক্রয়", "মোট মূল্য"]
            : ["#", "Product", "Brand", "Stock", "Buy", "Sell", "Total Value"];
            
        const tableRows: any[] = [];
        let totalValue = 0;

        filteredProducts.forEach((p, index) => {
            const val = p.stock * p.sell_price;
            totalValue += val;
            const productData = [
                index + 1,
                p.name,
                p.brand || '-',
                `${p.stock} ${p.unit || ''}`,
                p.buy_price,
                p.sell_price,
                val
            ];
            tableRows.push(productData);
        });

        tableRows.push(["", "", "", "", "", isBn ? "সর্বমোট:" : "Total:", totalValue]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            theme: 'grid',
            styles: { font: 'helvetica', fontSize: 9 }, // Note: Real Bengali requires .ttf injection
            headStyles: { fillColor: [79, 70, 229] },
            footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
        });

        const pdfBlobUrl = doc.output('bloburl');
        setPdfUrl(pdfBlobUrl);
        setShowPdfPreview(true);
    };

    const downloadExcel = () => {
        const isBn = language === 'bn';
        const worksheet = XLSX.utils.json_to_sheet(filteredProducts.map(p => ({
            [isBn ? "পণ্যের নাম" : "Product Name"]: p.name,
            [isBn ? "ব্র্যান্ড" : "Brand"]: p.brand || '-',
            [isBn ? "স্টক" : "Stock"]: p.stock,
            [isBn ? "ইউনিট" : "Unit"]: p.unit || '-',
            [isBn ? "ক্রয় মূল্য" : "Buy Price"]: p.buy_price,
            [isBn ? "বিক্রয় মূল্য" : "Sell Price"]: p.sell_price,
            [isBn ? "মোট মূল্য" : "Total Value"]: p.stock * p.sell_price,
            [isBn ? "বারকোড" : "Barcode"]: p.barcode || '-'
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
        XLSX.writeFile(workbook, `${shop.name}_Inventory.xlsx`);
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
                scannerRef.current?.clear();
                setShowScannerModal(false);
            }).catch(() => setShowScannerModal(false));
        } else {
            setShowScannerModal(false);
        }
    };

    const openModal = (type: 'add' | 'edit', product?: any) => {
        if (type === 'add') {
            setEditProductId(''); setPName(''); setPBrand(''); setPBuyPrice(''); setPSellPrice(''); setPStock(''); setPUnit(''); setPBarcode(''); setPImage(null); setPImageUrl(''); setIsWholesale(false); setPWholesalePrice(''); setHasAlert(false); setPAlertQty('5'); setHasExpiry(false); setPExpireDate('');
        } else if (product) {
            setEditProductId(product.$id); setPName(product.name); setPBrand(product.brand || ''); setPBuyPrice(product.buy_price.toString()); setPSellPrice(product.sell_price.toString()); setPStock(product.stock.toString()); setPUnit(product.unit || ''); setPBarcode(product.barcode || ''); setPImage(null); setPImageUrl(product.image_url || ''); setIsWholesale(product.is_wholesale === true || product.is_wholesale === 'true'); setPWholesalePrice(product.wholesale_price?.toString() || ''); setHasAlert(product.has_alert === true || product.has_alert === 'true'); setPAlertQty(product.alert_qty?.toString() || '5'); setHasExpiry(product.has_expiry === true || product.has_expiry === 'true'); setPExpireDate(product.expire_date || '');
        }
        setShowProductModal(true);
        setActiveMenu(null);
    };

    const handleQuickStock = async () => {
        try {
            const currentProduct = products.find(p => p.$id === stockUpdateId);
            if (!currentProduct) return;
            const qtyChange = newStockInput - currentProduct.stock;
            if (qtyChange !== 0) {
                await databases.createDocument(DB_ID, STOCK_HISTORY_COLLECTION, ID.unique(), {
                    shop_id: shop.$id, product_id: stockUpdateId, product_name: currentProduct.name, qty: Math.abs(qtyChange), action: qtyChange > 0 ? "Manual Add (Quick Stock)" : "Manual Reduce (Quick Stock)", date: new Date().toISOString()
                });
            }
            await databases.updateDocument(DB_ID, PRODUCTS_COLLECTION, stockUpdateId, { stock: newStockInput });
            setProducts(products.map(p => p.$id === stockUpdateId ? { ...p, stock: newStockInput } : p));
            setShowStockModal(false);
        } catch (error) { console.error(error); }
    };

    const startScanner = (target: 'search' | 'input') => {
        setScanTarget(target);
        setShowScannerModal(true);
        setTimeout(() => {
            scannerRef.current = new Html5Qrcode("reader");
            scannerRef.current.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (text) => {
                stopScanner();
                if (target === 'search') setSearchTerm(text);
                else setPBarcode(text);
            }).catch(() => stopScanner());
        }, 100);
    };

    return (
        <div className="h-screen bg-slate-50 flex flex-col relative">
            <PageHeader 
                title={language === 'bn' ? "পণ্যের তালিকা" : "Product List"} 
                onBack={onBack} 
                rightContent={
                    <div className="flex space-x-2">
                        <button onClick={generatePDF} className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/30 shadow-sm active:scale-95 transition-all">
                            <FileText className="h-5 w-5" />
                        </button>
                        <button onClick={downloadExcel} className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/30 shadow-sm active:scale-95 transition-all">
                            <FileSpreadsheet className="h-5 w-5" />
                        </button>
                        <button onClick={() => openModal('add')} className="px-3 py-1.5 bg-white text-indigo-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors active:scale-95 flex items-center">
                            <Plus className="h-4 w-4 mr-1" /> {language === 'bn' ? "যোগ করুন" : "Add"}
                        </button>
                    </div>
                } 
            />
            
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-10">
                <div className="flex space-x-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={language === 'bn' ? "নাম বা বারকোড দিয়ে খুঁজুন..." : "Search by name or barcode..."}
                            className="w-full pl-12 pr-4 py-3 bg-slate-100 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium" 
                        />
                    </div>
                    <button onClick={() => startScanner('search')} className="p-3 bg-slate-800 text-white rounded-2xl hover:bg-slate-700 transition-colors shadow-sm active:scale-95 flex items-center justify-center">
                        <Barcode className="h-6 w-6" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" onClick={() => setActiveMenu(null)}>
                {loading ? (
                    <div className="flex flex-col justify-center items-center h-40">
                        <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText} mb-3`} />
                    </div>
                ) : displayedProducts.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 bg-white rounded-3xl border border-slate-200 border-dashed">
                        <Package className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                    </div>
                ) : (
                    displayedProducts.map(p => {
                        const hasAlertParsed = p.has_alert === true || p.has_alert === 'true';
                        const isLowStock = hasAlertParsed && p.stock <= p.alert_qty;
                        return (
                            <div key={p.$id} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center relative group">
                                {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="h-14 w-14 rounded-xl object-cover border border-slate-100 mr-4 shadow-sm" />
                                ) : (
                                    <div className="h-14 w-14 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mr-4 border border-slate-100">
                                        <Package className="h-6 w-6" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 text-[15px] truncate mb-0.5">{p.name}</h3>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold ${isLowStock ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-600'}`}>
                                            Stock: {p.stock} {p.unit}
                                        </span>
                                        <span className="text-[11px] px-2.5 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                            {formatCurrency(p.sell_price)}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === p.$id ? null : p.$id); }}
                                    className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl ml-2 transition-colors"
                                >
                                    <MoreVertical className="h-6 w-6" />
                                </button>
                                {activeMenu === p.$id && (
                                    <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-20 min-w-[160px]">
                                        <button onClick={() => openModal('edit', p)} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center">
                                            <Edit className="h-4 w-4 mr-3 text-indigo-500" /> {language === 'bn' ? "সম্পাদনা" : "Edit"}
                                        </button>
                                        <button onClick={() => { setStockUpdateId(p.$id); setStockUpdateName(p.name); setNewStockInput(p.stock); setShowStockModal(true); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center">
                                            <Layers className="h-4 w-4 mr-3 text-emerald-500" /> {language === 'bn' ? "দ্রুত স্টক" : "Quick Stock"}
                                        </button>
                                        <button onClick={() => handleDeleteProduct(p.$id)} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center border-t border-slate-50">
                                            <Trash2 className="h-4 w-4 mr-3" /> {language === 'bn' ? "মুছে ফেলুন" : "Delete"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* --- Product Modal --- */}
            {showProductModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="text-xl font-extrabold text-slate-800">
                                {editProductId ? (language === 'bn' ? "পণ্য সম্পাদন" : "Edit Product") : (language === 'bn' ? "নতুন পণ্য যোগ" : "Add Product")}
                            </h3>
                            <button onClick={() => setShowProductModal(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="flex flex-col items-center justify-center mb-8">
                                <div className="relative w-32 h-32 rounded-3xl border-2 border-slate-200 border-dashed bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm">
                                    {pImage ? <img src={URL.createObjectURL(pImage)} className="w-full h-full object-cover" alt="Preview" /> : pImageUrl ? <img src={pImageUrl} className="w-full h-full object-cover" alt="Product" /> : <ImageIcon className="w-8 h-8 text-slate-300" />}
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => e.target.files && setPImage(e.target.files[0])} />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{language === 'bn' ? "পণ্যের নাম" : "Product Name"}</label>
                                    <input type="text" required value={pName} onChange={e => setPName(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none transition-all font-medium" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{language === 'bn' ? "ক্রয় মূল্য" : "Buy Price"}</label>
                                        <input type="number" required step="any" value={pBuyPrice} onChange={e => setPBuyPrice(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-indigo-600 uppercase mb-2">{language === 'bn' ? "বিক্রয় মূল্য" : "Sell Price"}</label>
                                        <input type="number" required step="any" value={pSellPrice} onChange={e => setPSellPrice(e.target.value)} className="w-full px-4 py-3 bg-indigo-50 border-2 border-indigo-200 rounded-xl outline-none font-bold text-indigo-900" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{language === 'bn' ? "ওপেনিং কোয়ান্টিটি" : "Opening Qty"}</label>
                                        <input type="number" required step="any" value={pStock} onChange={e => setPStock(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{language === 'bn' ? "ইউনিট" : "Unit"}</label>
                                        <input type="text" value={pUnit} onChange={e => setPUnit(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium" />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 pt-5 border-t flex gap-3">
                                <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl active:scale-95 transition-all">{language === 'bn' ? "বাতিল" : "Cancel"}</button>
                                <button type="submit" disabled={isSaving} className={`flex-1 py-3.5 rounded-xl ${themeClasses.primaryBg} text-white font-bold shadow-md active:scale-95 transition-all flex justify-center items-center`}>
                                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5 mr-2" /> {language === 'bn' ? "সেভ করুন" : "Save"}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- PDF Preview Modal --- */}
            {showPdfPreview && (
                <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-sm animate-in fade-in">
                    <div className="flex justify-between items-center p-4 bg-white/10 backdrop-blur-md border-b border-white/10">
                        <h3 className="font-bold text-lg text-white">{language === 'bn' ? "পিডিএফ প্রিভিউ" : "PDF Preview"}</h3>
                        <div className="flex space-x-3">
                            <a href={pdfUrl} download="inventory.pdf" className={`px-5 py-2.5 rounded-xl ${themeClasses.primaryBg} text-white font-bold shadow-lg active:scale-95 transition-all`}>
                                {language === 'bn' ? "ডাউনলোড" : "Download"}
                            </a>
                            <button onClick={() => setShowPdfPreview(false)} className="p-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"><X className="h-5 w-5" /></button>
                        </div>
                    </div>
                    <div className="flex-1 p-2 sm:p-6 overflow-hidden">
                        <object data={pdfUrl} type="application/pdf" className="w-full h-full rounded-2xl bg-white shadow-2xl">
                            <iframe src={pdfUrl} className="w-full h-full rounded-2xl bg-white shadow-2xl" title="PDF Preview"></iframe>
                        </object>
                    </div>
                </div>
            )}

            {/* Scanner Modal */}
            {showScannerModal && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
                    <div id="reader" className="w-full max-w-sm rounded-3xl overflow-hidden border-4 border-indigo-500 shadow-2xl"></div>
                    <button onClick={stopScanner} className="mt-10 px-10 py-4 bg-white text-red-600 rounded-full font-bold shadow-xl active:scale-95 transition-transform text-lg flex items-center">
                        <X className="h-6 w-6 mr-2" /> {language === 'bn' ? "বন্ধ করুন" : "Close"}
                    </button>
                </div>
            )}
        </div>
    );
}
