import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../../components/PageHeader';
import { Plus, Package, Edit, Trash2, Search, Barcode, MoreVertical, Layers, FileText, FileSpreadsheet, X, Upload, Check, Loader2, AlertTriangle, Calendar, Tag, Minus } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, PRODUCTS_COLLECTION, STOCK_HISTORY_COLLECTION, ID, Query } from '../../lib/appwrite';
import { uploadToCloudinary, DEFAULT_CLOUDINARY } from '../../utils/cloudinary';
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
                Query.limit(1000) // Fetch all for local search/pagination
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
                let apiKey = '';
                let apiSecret = '';

                if (shop.uploadme_api_key) {
                    try {
                        const parsed = JSON.parse(shop.uploadme_api_key);
                        if (parsed.cloudName) cloudName = parsed.cloudName;
                        if (parsed.apiKey) apiKey = parsed.apiKey;
                        if (parsed.apiSecret) apiSecret = parsed.apiSecret;
                    } catch (e) {
                        console.warn('Could not parse shop cloudinary credentials');
                    }
                }

                if (!cloudName || !apiKey || !apiSecret) {
                    alert('দয়া করে সেটিংস থেকে Cloudinary API Key, Secret এবং Cloud Name যুক্ত করুন।');
                    setIsSaving(false);
                    return;
                }

                const uploadRes = await uploadToCloudinary(pImage, cloudName, apiKey, apiSecret);
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
                
                // Update stock history if stock changed significantly? 
                // For simplicity, we just update the product.
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

    const handleDeleteProduct = async (id: string, imageUrl?: string) => {
        if (!window.confirm("Are you sure you want to PERMANENTLY delete this product?")) return;
        try {
            if (imageUrl && imageUrl.includes('cloudinary.com')) {
                // Extract public ID from URL
                const parts = imageUrl.split('/');
                const filename = parts[parts.length - 1];
                const publicId = filename.split('.')[0];
                
                let cloudName = '';
                let apiKey = '';
                let apiSecret = '';

                if (shop.uploadme_api_key) {
                    try {
                        const parsed = JSON.parse(shop.uploadme_api_key);
                        if (parsed.cloudName) cloudName = parsed.cloudName;
                        if (parsed.apiKey) apiKey = parsed.apiKey;
                        if (parsed.apiSecret) apiSecret = parsed.apiSecret;
                    } catch (e) {
                        // Ignore parse error
                    }
                }

                if (cloudName && apiKey && apiSecret) {
                    import('../../utils/cloudinary').then(({ deleteFromCloudinary }) => {
                        deleteFromCloudinary(publicId, cloudName, apiKey, apiSecret).catch(console.error);
                    });
                }
            }

            await databases.deleteDocument(DB_ID, PRODUCTS_COLLECTION, id);
            setProducts(products.filter(p => p.$id !== id));
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Delete failed.');
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
            alert('Stock update failed.');
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
                alert("Camera error: " + err);
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

    const generatePDF = () => {
        const doc = new jsPDF();
        
        // Add Shop Logo if available
        if (shop.logo_url) {
            // In a real scenario, you'd need the base64 of the image to add it reliably to jsPDF
            // For now, we'll just add the text
        }
        
        doc.setFontSize(20);
        doc.setTextColor(79, 70, 229); // Primary color
        doc.text(shop.name, 105, 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Inventory Report | Date: ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });

        const tableColumn = ["#", "Product", "Brand", "Stock", "Buy", "Sell", "Total Value"];
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

        tableRows.push(["", "", "", "", "", "Total:", totalValue]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
            showFoot: 'lastPage'
        });

        const pdfBlob = doc.output('bloburl');
        setPdfUrl(pdfBlob.toString());
        setShowPdfPreview(true);
    };

    const downloadExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredProducts.map(p => ({
            "Product Name": p.name,
            "Brand": p.brand || '-',
            "Stock": p.stock,
            "Unit": p.unit || '-',
            "Buy Price": p.buy_price,
            "Sell Price": p.sell_price,
            "Total Value": p.stock * p.sell_price,
            "Barcode": p.barcode || '-'
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
        XLSX.writeFile(workbook, `${shop.name}_Inventory_${new Date().toLocaleDateString()}.xlsx`);
    };

    return (
        <div className="h-screen bg-slate-50 flex flex-col relative">
            <PageHeader 
                title={t.productList || "Product List"} 
                onBack={onBack} 
                rightContent={
                    <div className="flex space-x-2">
                        <button onClick={generatePDF} className="p-1.5 bg-red-500/20 text-red-100 rounded-lg hover:bg-red-500/30 transition-colors">
                            <FileText className="h-5 w-5" />
                        </button>
                        <button onClick={downloadExcel} className="p-1.5 bg-emerald-500/20 text-emerald-100 rounded-lg hover:bg-emerald-500/30 transition-colors">
                            <FileSpreadsheet className="h-5 w-5" />
                        </button>
                        <button onClick={() => openModal('add')} className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>
                } 
            />
            
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-10">
                <div className="flex space-x-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, brand or barcode..." 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-transparent rounded-xl focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all text-sm" 
                        />
                    </div>
                    <button onClick={() => startScanner('search')} className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors shadow-sm">
                        <Barcode className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3" onClick={() => setActiveMenu(null)}>
                {loading ? (
                    <div className="flex justify-center items-center h-32">
                        <Loader2 className={`h-8 w-8 animate-spin ${themeClasses.primaryText}`} />
                    </div>
                ) : displayedProducts.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p>No products found.</p>
                    </div>
                ) : (
                    displayedProducts.map(p => {
                        const hasAlertParsed = p.has_alert === true || p.has_alert === 'true';
                        const isLowStock = hasAlertParsed && p.stock <= p.alert_qty;
                        return (
                            <div key={p.$id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center relative transition-all hover:shadow-md">
                                {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded-lg object-cover border border-slate-100 mr-3" />
                                ) : (
                                    <div className={`h-12 w-12 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mr-3 border border-slate-200`}>
                                        <Package className="h-6 w-6" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 text-sm truncate">{p.name}</h3>
                                    {p.brand && <span className="text-[10px] font-semibold text-indigo-600 mb-1 block"><Tag className="inline h-3 w-3 mr-0.5" />{p.brand}</span>}
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${isLowStock ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                            Stock: {p.stock} {p.unit}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-600">
                                            Buy: {formatCurrency(p.buy_price)}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-indigo-50 text-indigo-600">
                                            Sell: {formatCurrency(p.sell_price)}
                                        </span>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === p.$id ? null : p.$id); }}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg ml-1"
                                >
                                    <MoreVertical className="h-5 w-5" />
                                </button>

                                {activeMenu === p.$id && (
                                    <div className="absolute right-12 top-10 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20 min-w-[140px] animate-in fade-in zoom-in duration-150">
                                        <button onClick={() => openModal('edit', p)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center">
                                            <Edit className="h-4 w-4 mr-2 text-indigo-500" /> Edit
                                        </button>
                                        <button onClick={() => { setStockUpdateId(p.$id); setStockUpdateName(p.name); setNewStockInput(p.stock); setShowStockModal(true); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center">
                                            <Layers className="h-4 w-4 mr-2 text-emerald-500" /> Quick Stock
                                        </button>
                                        <button onClick={() => handleDeleteProduct(p.$id, p.image_url)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">
                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
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
                        className="w-full py-3 bg-white border border-slate-200 rounded-xl text-indigo-600 font-bold shadow-sm hover:bg-slate-50"
                    >
                        Load More Products
                    </button>
                )}
            </div>

            {/* Product Modal */}
            {showProductModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="text-lg font-bold text-slate-900">{editProductId ? 'Edit Product' : 'Add Product'}</h3>
                            <button onClick={() => setShowProductModal(false)} className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto flex-1 space-y-4">
                            {/* Image Upload */}
                            <div className="flex justify-center mb-2">
                                <label className="relative flex flex-col items-center justify-center w-24 h-24 border-2 border-slate-300 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 overflow-hidden group">
                                    {pImage ? (
                                        <img src={URL.createObjectURL(pImage)} className="w-full h-full object-cover" alt="Preview" />
                                    ) : pImageUrl ? (
                                        <img src={pImageUrl} className="w-full h-full object-cover" alt="Product" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-6 h-6 mb-1 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                            <span className="text-[10px] font-semibold text-slate-500">Upload</span>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && setPImage(e.target.files[0])} />
                                </label>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Product Name</label>
                                <input type="text" required value={pName} onChange={e => setPName(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm" placeholder="e.g. Matador Ballpen" />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Brand / Company</label>
                                <input type="text" value={pBrand} onChange={e => setPBrand(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm" placeholder="e.g. Matador, Pran" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Buy Price</label>
                                    <input type="number" required step="any" value={pBuyPrice} onChange={e => setPBuyPrice(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-indigo-600 uppercase mb-1">Sell Price</label>
                                    <input type="number" required step="any" value={pSellPrice} onChange={e => setPSellPrice(e.target.value)} className="w-full px-3 py-2.5 bg-white border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm font-bold text-indigo-900" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Stock Qty</label>
                                    <input type="number" required step="any" value={pStock} onChange={e => setPStock(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Unit</label>
                                    <input type="text" value={pUnit} onChange={e => setPUnit(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm" placeholder="pcs, kg, liter" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Barcode / SKU</label>
                                <div className="flex space-x-2">
                                    <input type="text" value={pBarcode} onChange={e => setPBarcode(e.target.value)} className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm font-mono" placeholder="Scan or type" />
                                    <button type="button" onClick={() => startScanner('input')} className="px-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors">
                                        <Barcode className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <h4 className="text-[10px] font-bold text-indigo-600 uppercase mb-3">Advanced Settings</h4>
                                
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-700 flex items-center"><Layers className="h-4 w-4 mr-2 text-blue-500" /> Wholesale Price</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={isWholesale} onChange={e => setIsWholesale(e.target.checked)} />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </label>
                                    </div>
                                    {isWholesale && (
                                        <input type="number" step="any" value={pWholesalePrice} onChange={e => setPWholesalePrice(e.target.value)} className="mt-3 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="Enter Wholesale Price" />
                                    )}
                                </div>

                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-700 flex items-center"><AlertTriangle className="h-4 w-4 mr-2 text-orange-500" /> Low Stock Alert</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={hasAlert} onChange={e => setHasAlert(e.target.checked)} />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </label>
                                    </div>
                                    {hasAlert && (
                                        <input type="number" step="any" value={pAlertQty} onChange={e => setPAlertQty(e.target.value)} className="mt-3 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="Min Qty (Default 5)" />
                                    )}
                                </div>

                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-700 flex items-center"><Calendar className="h-4 w-4 mr-2 text-red-500" /> Expire Date</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={hasExpiry} onChange={e => setHasExpiry(e.target.checked)} />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </label>
                                    </div>
                                    {hasExpiry && (
                                        <input type="date" value={pExpireDate} onChange={e => setPExpireDate(e.target.value)} className="mt-3 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" />
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 pb-2 sticky bottom-0 bg-white">
                                <button type="submit" disabled={isSaving} className={`w-full py-3.5 rounded-xl ${themeClasses.primaryBg} text-white font-bold shadow-md hover:shadow-lg transition-all flex justify-center items-center`}>
                                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Stock Modal */}
            {showStockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-[300px] p-6 text-center">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Layers className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Update Stock</h3>
                        <p className="text-xs text-slate-500 mb-6 truncate">{stockUpdateName}</p>
                        
                        <div className="flex items-center justify-center space-x-4 mb-6">
                            <button onClick={() => setNewStockInput(p => p - 1)} className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors">
                                <Minus className="h-5 w-5" />
                            </button>
                            <input 
                                type="number" 
                                value={newStockInput} 
                                onChange={(e) => setNewStockInput(Number(e.target.value))}
                                className="w-20 text-center text-3xl font-black text-slate-800 border-b-2 border-slate-200 focus:border-indigo-500 outline-none bg-transparent pb-1"
                            />
                            <button onClick={() => setNewStockInput(p => p + 1)} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="flex space-x-3">
                            <button onClick={() => setShowStockModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={handleQuickStock} className={`flex-1 py-3 rounded-xl ${themeClasses.primaryBg} text-white font-bold hover:shadow-md transition-all`}>Update</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scanner Modal */}
            {showScannerModal && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
                    <div id="reader" className="w-full max-w-sm rounded-2xl overflow-hidden border-4 border-indigo-500 shadow-2xl"></div>
                    <button onClick={stopScanner} className="mt-8 px-8 py-3 bg-white text-red-600 rounded-full font-bold shadow-lg">Close Camera</button>
                </div>
            )}

            {/* PDF Preview Modal */}
            {showPdfPreview && (
                <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-sm">
                    <div className="flex justify-between items-center p-4 bg-white">
                        <h3 className="font-bold text-lg">PDF Preview</h3>
                        <div className="flex space-x-3">
                            <a href={pdfUrl} download={`${shop.name}_Inventory.pdf`} className={`px-4 py-2 rounded-lg ${themeClasses.primaryBg} text-white font-medium flex items-center`}>
                                Download
                            </a>
                            <button onClick={() => setShowPdfPreview(false)} className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 p-4">
                        <iframe src={pdfUrl} className="w-full h-full rounded-xl bg-white" title="PDF Preview"></iframe>
                    </div>
                </div>
            )}
        </div>
    );
}
