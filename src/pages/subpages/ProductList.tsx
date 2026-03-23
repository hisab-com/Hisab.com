import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../../components/PageHeader';
import { Plus, Package, Edit, Trash2, Search, Barcode, MoreVertical, Layers, FileText, Share2, X, Upload, Loader2, AlertTriangle, Calendar, Tag, Minus, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, PRODUCTS_COLLECTION, STOCK_HISTORY_COLLECTION, ID, Query } from '../../lib/appwrite';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { Html5Qrcode } from 'html5-qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ProductList({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const itemsPerPage = 20;

    // Modals
    const [showProductModal, setShowProductModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [isGeneratingAction, setIsGeneratingAction] = useState(false);

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
                        action: t.openingStock || "Opening Stock",
                        date: new Date().toISOString()
                    });
                }
            }
            
            await fetchProducts();
            setShowProductModal(false);
        } catch (error: any) {
            console.error('Error saving product:', error);
            alert(error.message || t.saveError || 'প্রোডাক্ট সেভ করতে সমস্যা হয়েছে।');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm(t.confirmDelete || "Are you sure you want to delete this product?")) return;
        try {
            await databases.deleteDocument(DB_ID, PRODUCTS_COLLECTION, id);
            setProducts(products.filter(p => p.$id !== id));
        } catch (error) {
            console.error('Error deleting product:', error);
            alert(t.deleteFailed || 'Delete failed.');
        }
    };

    const openModal = (type: 'add' | 'edit', product?: any) => {
        if (type === 'add') {
            setEditProductId('');
            setPName('');
            setPBrand('');
            setPBuyPrice('');
            setPSellPrice('');
            setPStock('');
            setPUnit('');
            setPBarcode('');
            setPImage(null);
            setPImageUrl('');
            setIsWholesale(false);
            setPWholesalePrice('');
            setHasAlert(false);
            setPAlertQty('5');
            setHasExpiry(false);
            setPExpireDate('');
        } else if (product) {
            setEditProductId(product.$id);
            setPName(product.name);
            setPBrand(product.brand || '');
            setPBuyPrice(product.buy_price.toString());
            setPSellPrice(product.sell_price.toString());
            setPStock(product.stock.toString());
            setPUnit(product.unit || '');
            setPBarcode(product.barcode || '');
            setPImage(null);
            setPImageUrl(product.image_url || '');
            setIsWholesale(product.is_wholesale === true || product.is_wholesale === 'true');
            setPWholesalePrice(product.wholesale_price?.toString() || '');
            setHasAlert(product.has_alert === true || product.has_alert === 'true');
            setPAlertQty(product.alert_qty?.toString() || '5');
            setHasExpiry(product.has_expiry === true || product.has_expiry === 'true');
            setPExpireDate(product.expire_date || '');
        }
        setShowProductModal(true);
        setActiveMenu(null);
    };

    const handleRemoveImage = () => {
        setPImage(null);
        setPImageUrl('');
    };

    const handleQuickStock = async () => {
        try {
            const currentProduct = products.find(p => p.$id === stockUpdateId);
            if (!currentProduct) return;

            const qtyChange = newStockInput - currentProduct.stock;
            
            if (qtyChange !== 0) {
                await databases.createDocument(DB_ID, STOCK_HISTORY_COLLECTION, ID.unique(), {
                    shop_id: shop.$id,
                    product_id: stockUpdateId,
                    product_name: currentProduct.name,
                    qty: Math.abs(qtyChange),
                    action: qtyChange > 0 ? "Manual Add (Quick Stock)" : "Manual Reduce (Quick Stock)",
                    date: new Date().toISOString()
                });
            }

            await databases.updateDocument(DB_ID, PRODUCTS_COLLECTION, stockUpdateId, { stock: newStockInput });
            
            setProducts(products.map(p => p.$id === stockUpdateId ? { ...p, stock: newStockInput } : p));
            setShowStockModal(false);
        } catch (error) {
            console.error('Error updating stock:', error);
            alert(t.stockUpdateFailed || 'Stock update failed.');
        }
    };

    const startScanner = (target: 'search' | 'input') => {
        setScanTarget(target);
        setShowScannerModal(true);
        
        setTimeout(() => {
            scannerRef.current = new Html5Qrcode("reader");
            scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    stopScanner();
                    if (target === 'search') {
                        setSearchTerm(decodedText);
                    } else {
                        setPBarcode(decodedText);
                    }
                },
                (errorMessage) => {
                    // ignore
                }
            ).catch(err => {
                console.error("Camera error:", err);
                alert((t.cameraError || "Camera error: ") + err);
                stopScanner();
            });
        }, 100);
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
                scannerRef.current?.clear();
                setShowScannerModal(false);
            }).catch(err => {
                console.error("Failed to stop scanner", err);
                setShowScannerModal(false);
            });
        } else {
            setShowScannerModal(false);
        }
    };

    // --- ডিরেক্ট প্রিন্ট ফাংশন (কোনো ডাউনলোড হবে না) ---
    const printPDF = async () => {
        setIsGeneratingAction(true);
        try {
            const doc = new jsPDF();
            
            try {
                const response = await fetch('/NotoSansBengali.ttf'); 
                if (response.ok) {
                    const fontBuffer = await response.arrayBuffer();
                    const fontUint8Array = new Uint8Array(fontBuffer);
                    let binaryString = '';
                    for (let i = 0; i < fontUint8Array.byteLength; i++) {
                        binaryString += String.fromCharCode(fontUint8Array[i]);
                    }
                    const base64String = window.btoa(binaryString);
                    
                    doc.addFileToVFS('NotoSansBengali.ttf', base64String);
                    doc.addFont('NotoSansBengali.ttf', 'BanglaFont', 'normal');
                    doc.setFont('BanglaFont');
                }
            } catch (err) {
                console.warn('Bangla font not loaded, falling back to default', err);
            }

            doc.setFontSize(20);
            doc.text(shop.name, 105, 15, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`${t.inventoryReport || "Inventory Report"} | Date: ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });

            const tableColumn = ["#", t.product || "Product", t.brand || "Brand", t.stock || "Stock", t.buyPrice || "Buy", t.sellPrice || "Sell", t.totalValue || "Total Value"];
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

            tableRows.push(["", "", "", "", "", t.total || "Total:", totalValue]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 30,
                theme: 'grid',
                headStyles: { fillColor: [50, 50, 50], font: 'BanglaFont' },
                bodyStyles: { font: 'BanglaFont' },
                footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold', font: 'BanglaFont' },
                showFoot: 'lastPage'
            });

            // Auto Print সেটআপ
            doc.autoPrint();
            
            // একটি লুকানো iframe তৈরি করে তার মাধ্যমে সরাসরি প্রিন্ট ডায়লগ কল করা
            const pdfBlobUrl = doc.output('bloburl');
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = pdfBlobUrl;
            document.body.appendChild(iframe);
            
            iframe.onload = () => {
                setTimeout(() => {
                    if (iframe.contentWindow) {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                    }
                }, 200);
            };

        } catch (error) {
            console.error("PDF Print Error: ", error);
            alert(t.pdfError || "প্রিন্ট করতে সমস্যা হয়েছে।");
        } finally {
            setIsGeneratingAction(false);
        }
    };

    // --- এক্সেল শিট শেয়ার/প্রিন্ট ফাংশন (কোনো ডাউনলোড হবে না) ---
    const shareExcel = async () => {
        setIsGeneratingAction(true);
        try {
            const worksheet = XLSX.utils.json_to_sheet(filteredProducts.map(p => ({
                [t.productName || "Product Name"]: p.name,
                [t.brand || "Brand"]: p.brand || '-',
                [t.stock || "Stock"]: p.stock,
                [t.unit || "Unit"]: p.unit || '-',
                [t.buyPrice || "Buy Price"]: p.buy_price,
                [t.sellPrice || "Sell Price"]: p.sell_price,
                [t.totalValue || "Total Value"]: p.stock * p.sell_price,
                "Barcode": p.barcode || '-'
            })));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
            
            // ArrayBuffer হিসেবে ডেটা তৈরি করা হচ্ছে
            const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            // File অবজেক্ট তৈরি করা হচ্ছে
            const file = new File([blob], `${shop.name}_Inventory.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            // Web Share API এর মাধ্যমে শেয়ার ডায়লগ কল করা (যা দিয়ে প্রিন্টও করা যায়)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Inventory Report',
                    text: 'Here is the inventory report Excel sheet.'
                });
            } else {
                alert(t.shareNotSupported || "আপনার ব্রাউজার বা ডিভাইসে সরাসরি শেয়ার সাপোর্ট করে না।");
            }
        } catch (error) {
            console.error("Excel Share Error: ", error);
            alert("শেয়ার করতে সমস্যা হয়েছে।");
        } finally {
            setIsGeneratingAction(false);
        }
    };

    return (
        <div className="h-screen bg-slate-50 flex flex-col relative">
            <PageHeader 
                title={t.productList || "Product List"} 
                onBack={onBack} 
                rightContent={
                    <div className="flex space-x-2">
                        {/* Print PDF Button */}
                        <button onClick={printPDF} disabled={isGeneratingAction} className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors shadow-sm active:scale-95 disabled:opacity-50" title={t.printPdf || "Print List"}>
                            {isGeneratingAction ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                        </button>
                        
                        {/* Share Excel Button */}
                        <button onClick={shareExcel} disabled={isGeneratingAction} className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors shadow-sm active:scale-95 disabled:opacity-50" title={t.shareExcel || "Share Excel"}>
                            {isGeneratingAction ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
                        </button>
                        
                        {/* Add Button */}
                        <button onClick={() => openModal('add')} className={`px-3 py-1.5 bg-white ${themeClasses.primaryText} font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors active:scale-95 flex items-center`}>
                            <Plus className="h-4 w-4 mr-1" /> {t.add || "Add"}
                        </button>
                    </div>
                } 
            />
            
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-10">
                <div className="flex space-x-3">
                    <div className="relative flex-1 group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:${themeClasses.primaryText} transition-colors`} />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t.searchPlaceholder || "Search by name, brand or barcode..."} 
                            className="w-full pl-12 pr-4 py-3 bg-slate-100 border border-transparent rounded-2xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-100 outline-none transition-all text-sm font-medium" 
                        />
                    </div>
                    <button onClick={() => startScanner('search')} className={`p-3 ${themeClasses.primaryBg} text-white rounded-2xl shadow-sm active:scale-95 flex items-center justify-center hover:opacity-90 transition-opacity`}>
                        <Barcode className="h-6 w-6" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" onClick={() => setActiveMenu(null)}>
                {loading ? (
                    <div className="flex flex-col justify-center items-center h-40">
                        <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText} mb-3`} />
                        <p className="text-slate-500 font-medium">{t.loading || "Loading inventory..."}</p>
                    </div>
                ) : displayedProducts.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 bg-white rounded-3xl border border-slate-200 border-dashed">
                        <Package className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                        <h3 className="text-lg font-bold text-slate-700 mb-1">{t.noProducts || "No products found"}</h3>
                        <p className="text-sm">{t.clickToAdd || "Click the Add button to create a new product."}</p>
                    </div>
                ) : (
                    displayedProducts.map(p => {
                        const hasAlertParsed = p.has_alert === true || p.has_alert === 'true';
                        const isLowStock = hasAlertParsed && p.stock <= p.alert_qty;
                        return (
                            <div key={p.$id} className={`bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center relative group`}>
                                {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="h-14 w-14 rounded-xl object-cover border border-slate-100 mr-4 shadow-sm" />
                                ) : (
                                    <div className={`h-14 w-14 rounded-xl ${themeClasses.lightBg} ${themeClasses.primaryText} flex items-center justify-center mr-4 border border-slate-100 shadow-sm`}>
                                        <Package className="h-6 w-6" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 text-[15px] truncate mb-0.5">{p.name}</h3>
                                    {p.brand && <span className={`text-[11px] font-bold ${themeClasses.primaryText} mb-1.5 flex items-center`}><Tag className="h-3 w-3 mr-1" />{p.brand}</span>}
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold ${isLowStock ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-600'}`}>
                                            {t.stock || "Stock"}: {p.stock} {p.unit}
                                        </span>
                                        <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-700 border border-emerald-100`}>
                                            {t.buy || "Buy"}: {formatCurrency(p.buy_price)}
                                        </span>
                                        <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold ${themeClasses.lightBg} ${themeClasses.primaryText} border border-slate-100`}>
                                            {t.sell || "Sell"}: {formatCurrency(p.sell_price)}
                                        </span>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === p.$id ? null : p.$id); }}
                                    className={`p-2 text-slate-400 hover:${themeClasses.primaryText} hover:${themeClasses.lightBg} rounded-xl ml-2 transition-colors`}
                                >
                                    <MoreVertical className="h-6 w-6" />
                                </button>

                                {activeMenu === p.$id && (
                                    <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-20 min-w-[160px] animate-in fade-in zoom-in-95 duration-150">
                                        <button onClick={() => openModal('edit', p)} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center">
                                            <Edit className={`h-4 w-4 mr-3 ${themeClasses.primaryText}`} /> {t.editDetails || "Edit Details"}
                                        </button>
                                        <button onClick={() => { setStockUpdateId(p.$id); setStockUpdateName(p.name); setNewStockInput(p.stock); setShowStockModal(true); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center">
                                            <Layers className="h-4 w-4 mr-3 text-emerald-500" /> {t.updateStock || "Update Stock"}
                                        </button>
                                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                        <button onClick={() => handleDeleteProduct(p.$id)} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center">
                                            <Trash2 className="h-4 w-4 mr-3" /> {t.deleteProduct || "Delete Product"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                {filteredProducts.length > page * itemsPerPage && (
                    <button 
                        onClick={() => setPage(p => p + 1)}
                        className={`w-full py-4 mt-4 ${themeClasses.lightBg} rounded-2xl ${themeClasses.primaryText} font-bold shadow-sm hover:opacity-80 active:scale-95 transition-all`}
                    >
                        {t.loadMore || "Load More Products"}
                    </button>
                )}
            </div>

            {/* --- Product Add/Edit Modal --- */}
            {showProductModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="text-xl font-extrabold text-slate-800 flex items-center">
                                <Package className={`h-6 w-6 mr-2 ${themeClasses.primaryText}`} /> {editProductId ? (t.editProduct || 'Edit Product') : (t.addProduct || 'Add New Product')}
                            </h3>
                            <button onClick={() => setShowProductModal(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            
                            {/* Modern Image Upload Box */}
                            <div className="flex flex-col items-center justify-center mb-8 relative">
                                <div className="relative w-32 h-32 rounded-3xl border-2 border-slate-200 border-dashed bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-center overflow-hidden group shadow-sm">
                                    {pImage ? (
                                        <img src={URL.createObjectURL(pImage)} className="w-full h-full object-cover" alt="Preview" />
                                    ) : pImageUrl ? (
                                        <img src={pImageUrl} className="w-full h-full object-cover" alt="Product" />
                                    ) : (
                                        <div className={`flex flex-col items-center justify-center text-slate-400 group-hover:${themeClasses.primaryText} transition-colors`}>
                                            <ImageIcon className="w-8 h-8 mb-2" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider">{t.addPhoto || "Add Photo"}</span>
                                        </div>
                                    )}
                                    {!(pImage || pImageUrl) && (
                                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={(e) => e.target.files && setPImage(e.target.files[0])} />
                                    )}
                                </div>

                                {(pImage || pImageUrl) && (
                                    <div className="flex space-x-2 mt-4">
                                        <label className={`px-4 py-2 ${themeClasses.lightBg} border border-transparent ${themeClasses.primaryText} text-xs font-bold rounded-xl cursor-pointer hover:opacity-80 transition-opacity flex items-center shadow-sm`}>
                                            <Upload className="w-3.5 h-3.5 mr-1.5" /> {t.replace || "Replace"}
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && setPImage(e.target.files[0])} />
                                        </label>
                                        <button type="button" onClick={handleRemoveImage} className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center shadow-sm">
                                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> {t.remove || "Remove"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.productName || "Product Name"} <span className="text-red-500">*</span></label>
                                    <input type="text" required value={pName} onChange={e => setPName(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all text-slate-800 font-medium" placeholder={t.productNamePlaceholder || "e.g. Matador Ballpen"} />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.brandCompany || "Brand / Company"}</label>
                                    <input type="text" value={pBrand} onChange={e => setPBrand(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all text-slate-800 font-medium" placeholder={t.brandPlaceholder || "e.g. Matador, Pran"} />
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center">{t.pricingInfo || "Pricing Info"}</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">{t.buyPrice || "Buy Price"} <span className="text-red-500">*</span></label>
                                            <input type="number" required step="any" value={pBuyPrice} onChange={e => setPBuyPrice(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all font-medium text-slate-800" placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-bold ${themeClasses.primaryText} mb-1.5`}>{t.sellPrice || "Sell Price"} <span className="text-red-500">*</span></label>
                                            <input type="number" required step="any" value={pSellPrice} onChange={e => setPSellPrice(e.target.value)} className={`w-full px-4 py-3 ${themeClasses.lightBg} border-2 border-transparent rounded-xl focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all font-bold ${themeClasses.primaryText}`} placeholder="0.00" />
                                        </div>
                                    </div>
                                </div>

                                {/* Opening Quantity Box */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.openingQuantity || "Opening Quantity"} <span className="text-red-500">*</span></label>
                                        <input type="number" required step="any" value={pStock} onChange={e => setPStock(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all font-medium text-slate-800" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.unit || "Unit"}</label>
                                        <input type="text" value={pUnit} onChange={e => setPUnit(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all font-medium text-slate-800" placeholder={t.unitPlaceholder || "pcs, kg, liter"} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.barcodeSku || "Barcode / SKU"}</label>
                                    <div className="flex space-x-2">
                                        <input type="text" value={pBarcode} onChange={e => setPBarcode(e.target.value)} className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-slate-300 focus:ring-4 focus:ring-slate-50 outline-none transition-all font-mono font-bold text-slate-700 tracking-wider" placeholder={t.barcodePlaceholder || "Scan or type"} />
                                        <button type="button" onClick={() => startScanner('input')} className={`px-4 ${themeClasses.primaryBg} text-white rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm flex justify-center items-center`}>
                                            <Barcode className="h-6 w-6" />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <h4 className={`text-xs font-extrabold ${themeClasses.primaryText} uppercase tracking-wider mb-4 flex items-center`}>{t.advancedSettings || "Advanced Settings"}</h4>
                                    
                                    <div className="space-y-3">
                                        <div className={`border rounded-2xl p-4 transition-colors ${isWholesale ? `${themeClasses.lightBg} border-transparent` : 'bg-white border-slate-200'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-bold text-slate-700 flex items-center"><Layers className={`h-5 w-5 mr-3 ${themeClasses.primaryText}`} /> {t.wholesalePrice || "Wholesale Price"}</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={isWholesale} onChange={e => setIsWholesale(e.target.checked)} />
                                                    <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:${themeClasses.primaryBg.split(' ')[0]} shadow-inner`}></div>
                                                </label>
                                            </div>
                                            {isWholesale && (
                                                <input type="number" step="any" value={pWholesalePrice} onChange={e => setPWholesalePrice(e.target.value)} className={`mt-4 w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-50`} placeholder={t.enterWholesalePrice || "Enter Wholesale Price"} />
                                            )}
                                        </div>

                                        <div className={`border rounded-2xl p-4 transition-colors ${hasAlert ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-bold text-slate-700 flex items-center"><AlertTriangle className="h-5 w-5 mr-3 text-orange-500" /> {t.lowStockAlert || "Low Stock Alert"}</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={hasAlert} onChange={e => setHasAlert(e.target.checked)} />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500 shadow-inner"></div>
                                                </label>
                                            </div>
                                            {hasAlert && (
                                                <input type="number" step="any" value={pAlertQty} onChange={e => setPAlertQty(e.target.value)} className="mt-4 w-full px-4 py-3 bg-white border border-orange-200 rounded-xl font-medium outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-50" placeholder={t.minQtyDefault || "Min Qty (Default 5)"} />
                                            )}
                                        </div>

                                        <div className={`border rounded-2xl p-4 transition-colors ${hasExpiry ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-bold text-slate-700 flex items-center"><Calendar className="h-5 w-5 mr-3 text-red-500" /> {t.expireDate || "Expire Date"}</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={hasExpiry} onChange={e => setHasExpiry(e.target.checked)} />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500 shadow-inner"></div>
                                                </label>
                                            </div>
                                            {hasExpiry && (
                                                <input type="date" value={pExpireDate} onChange={e => setPExpireDate(e.target.value)} className="mt-4 w-full px-4 py-3 bg-white border border-red-200 rounded-xl font-medium outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-5 border-t border-slate-100 flex gap-3">
                                <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                    {t.cancel || "Cancel"}
                                </button>
                                <button type="submit" disabled={isSaving || !pName.trim()} className={`flex-1 py-3.5 rounded-xl ${themeClasses.primaryBg} text-white font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 flex justify-center items-center`}>
                                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                        <><CheckCircle2 className="h-5 w-5 mr-2" /> {t.saveProduct || "Save Product"}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Quick Stock Modal --- */}
            {showStockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[320px] p-8 text-center animate-in zoom-in-95 duration-200">
                        <div className={`w-16 h-16 ${themeClasses.lightBg} ${themeClasses.primaryText} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner`}>
                            <Layers className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-1">{t.updateStock || "Update Stock"}</h3>
                        <p className="text-sm font-medium text-slate-500 mb-8 truncate px-2 bg-slate-50 rounded-lg py-1 inline-block">{stockUpdateName}</p>
                        
                        <div className="flex items-center justify-center space-x-5 mb-8">
                            <button onClick={() => setNewStockInput(p => p - 1)} className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 active:scale-90 transition-all shadow-sm">
                                <Minus className="h-6 w-6" />
                            </button>
                            <input 
                                type="number" 
                                value={newStockInput} 
                                onChange={(e) => setNewStockInput(Number(e.target.value))}
                                className={`w-24 text-center text-4xl font-black text-slate-800 border-b-2 border-slate-200 focus:border-slate-400 outline-none bg-transparent pb-1`}
                            />
                            <button onClick={() => setNewStockInput(p => p + 1)} className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 active:scale-90 transition-all shadow-sm">
                                <Plus className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="flex space-x-3">
                            <button onClick={() => setShowStockModal(false)} className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 active:scale-95 transition-all">{t.cancel || "Cancel"}</button>
                            <button onClick={handleQuickStock} className={`flex-1 py-3.5 rounded-xl ${themeClasses.primaryBg} text-white font-bold shadow-md hover:shadow-lg active:scale-95 transition-all`}>{t.update || "Update"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Scanner Modal --- */}
            {showScannerModal && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
                    <div id="reader" className={`w-full max-w-sm rounded-3xl overflow-hidden border-4 border-slate-500 shadow-[0_0_40px_rgba(255,255,255,0.2)]`}></div>
                    <button onClick={stopScanner} className="mt-10 px-10 py-4 bg-white text-red-600 rounded-full font-bold shadow-xl active:scale-95 transition-transform text-lg flex items-center">
                        <X className="h-6 w-6 mr-2" /> {t.closeCamera || "Close Camera"}
                    </button>
                </div>
            )}
        </div>
    );
}
