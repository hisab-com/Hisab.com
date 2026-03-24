import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../../components/PageHeader';
import { Search, Barcode, ArrowRight, ArrowLeft, Plus, Minus, Trash2, CheckCircle, Printer, ShoppingBag, User, Package, Loader2, X } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, PRODUCTS_COLLECTION, CONTACTS_COLLECTION, PURCHASES_COLLECTION, STOCK_HISTORY_COLLECTION, ID, Query } from '../../lib/appwrite';
import { Html5Qrcode } from 'html5-qrcode';
import PrintPreview from '../../components/PrintPreview';

interface CartItem {
    $id: string;
    name: string;
    brand?: string;
    qty: number;
    buyRate: number;
    sell_price: number;
    stock: number;
    [key: string]: any;
}

export default function Purchase({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    
    // Views: 'selection' | 'checkout' | 'receipt'
    const [currentView, setCurrentView] = useState<'selection' | 'checkout' | 'receipt'>('selection');
    
    const [products, setProducts] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Cart State: { productId: { ...product, qty, buyRate } }
    const [cart, setCart] = useState<Record<string, CartItem>>({});
    
    // Checkout State
    const [invoiceNo, setInvoiceNo] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [supplierName, setSupplierName] = useState('');
    const [showSuppDropdown, setShowSuppDropdown] = useState(false);
    const [paid, setPaid] = useState<number | ''>('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [newPName, setNewPName] = useState('');
    const [newPBuyPrice, setNewPBuyPrice] = useState('');
    const [newPSellPrice, setNewPSellPrice] = useState('');
    const [newPStock, setNewPStock] = useState('');

    const handleQuickAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPName.trim()) return;
        setIsSavingProduct(true);
        try {
            const productData = {
                shop_id: shop.$id,
                name: newPName,
                buy_price: Number(newPBuyPrice) || 0,
                sell_price: Number(newPSellPrice) || 0,
                stock: Number(newPStock) || 0,
                unit: 'pcs',
                is_wholesale: "false",
                has_alert: "false",
                has_expiry: "false"
            };
            const newProduct = await databases.createDocument(DB_ID, PRODUCTS_COLLECTION, ID.unique(), productData);
            setProducts([newProduct, ...products]);
            setShowQuickAdd(false);
            setNewPName('');
            setNewPBuyPrice('');
            setNewPSellPrice('');
            setNewPStock('');
            // Auto add to cart
            toggleCart(newProduct);
        } catch (error) {
            console.error('Error quick adding product:', error);
            alert('Failed to add product.');
        } finally {
            setIsSavingProduct(false);
        }
    };

    // Scanner
    const [showScannerModal, setShowScannerModal] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        fetchInitialData();
        setInvoiceNo("PUR-" + Math.floor(100000 + Math.random() * 900000));
    }, [shop.$id]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Fetch Products
            const prodRes = await databases.listDocuments(DB_ID, PRODUCTS_COLLECTION, [
                Query.equal('shop_id', shop.$id),
                Query.orderDesc('$createdAt'),
                Query.limit(500)
            ]);
            setProducts(prodRes.documents);

            // Fetch Suppliers
            let fetchedSuppliers: any[] = [];
            try {
                const suppRes = await databases.listDocuments(DB_ID, CONTACTS_COLLECTION, [
                    Query.equal('shop_id', shop.$id),
                    Query.equal('type', 'suppliers'),
                    Query.limit(500)
                ]);
                fetchedSuppliers = suppRes.documents;
            } catch (err) {
                console.warn('Could not fetch suppliers.');
            }
            
            setSuppliers([{ name: 'General Supplier', phone: '' }, ...fetchedSuppliers]);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Product Selection Logic ---
    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const toggleCart = (product: any) => {
        setCart(prev => {
            const newCart = { ...prev };
            if (newCart[product.$id]) {
                delete newCart[product.$id];
            } else {
                newCart[product.$id] = { 
                    ...product, 
                    qty: 1, 
                    buyRate: product.buy_price || 0
                };
            }
            return newCart;
        });
    };

    // --- Checkout Logic ---
    const cartItems = Object.values(cart) as CartItem[];
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.qty * item.buyRate), 0);
    const paidAmt = paid === '' ? totalAmount : Number(paid);
    const dueAmt = totalAmount - paidAmt;

    const updateCartQty = (id: string, delta: number, manualVal?: number) => {
        setCart(prev => {
            const newCart = { ...prev };
            const item = newCart[id];
            let newQty = manualVal !== undefined ? manualVal : item.qty + delta;
            
            if (newQty <= 0) {
                delete newCart[id];
            } else {
                newCart[id] = { ...item, qty: newQty };
            }
            return newCart;
        });
    };

    const updateCartRate = (id: string, val: number) => {
        setCart(prev => ({
            ...prev,
            [id]: { ...prev[id], buyRate: Number(val) || 0 }
        }));
    };

    const handleConfirmPurchase = async () => {
        if (cartItems.length === 0) return alert('Cart is empty!');
        setIsProcessing(true);

        const itemsToSave = cartItems.map(item => ({
            id: item.$id,
            name: item.name,
            brand: item.brand || '',
            qty: item.qty,
            buyRate: item.buyRate,
            sellRate: item.sell_price,
            image_url: item.image_url || ''
        }));

        const finalSuppName = supplierName.trim() || 'General Supplier';

        const purchaseData = {
            shop_id: shop.$id,
            invoice_no: invoiceNo,
            supplier_name: finalSuppName,
            date: purchaseDate,
            items: JSON.stringify(itemsToSave),
            total_amount: totalAmount,
            paid_amount: paidAmt,
            due_amount: dueAmt > 0 ? dueAmt : 0,
            payment_method: paymentMethod
        };

        try {
            // 1. Save Purchase Document
            await databases.createDocument(DB_ID, PURCHASES_COLLECTION, ID.unique(), purchaseData);

            // 2. Increase Stock & Log History
            for (const item of cartItems) {
                const newStock = (item.stock || 0) + item.qty;
                await databases.updateDocument(DB_ID, PRODUCTS_COLLECTION, item.$id, {
                    stock: newStock,
                    buy_price: item.buyRate // Update buy price to last purchase price
                });

                // Log to stock history
                await databases.createDocument(DB_ID, STOCK_HISTORY_COLLECTION, ID.unique(), {
                    shop_id: shop.$id,
                    product_id: item.$id,
                    product_name: item.name,
                    qty: item.qty, // Positive for addition
                    action: `Purchase (Inv: ${invoiceNo})`,
                    date: new Date().toISOString()
                });
            }

            // Set receipt and change view
            setReceiptData(purchaseData);
            setCurrentView('receipt');
            setCart({});
            setInvoiceNo("PUR-" + Math.floor(100000 + Math.random() * 900000));
            setPaid('');
            setSupplierName('');

        } catch (error: any) {
            console.error('Purchase Error:', error);
            alert(`Failed to process purchase: ${error?.message || 'Unknown error'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Scanner Logic ---
    const startScanner = () => {
        setShowScannerModal(true);
        setTimeout(() => {
            scannerRef.current = new Html5Qrcode("reader");
            scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    stopScanner();
                    setSearchTerm(decodedText);
                },
                (err) => {}
            ).catch(err => {
                console.error("Camera error:", err);
                stopScanner();
            });
        }, 100);
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

    if (currentView === 'selection') {
        return (
            <div className="h-screen bg-slate-50 flex flex-col relative">
                <PageHeader title="Purchase Inventory" onBack={onBack} />
                
                <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-10">
                    <div className="flex space-x-3">
                        <div className="relative flex-1 group">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors`} />
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search products to buy..." 
                                className="w-full pl-12 pr-4 py-3 bg-slate-100 border border-transparent rounded-2xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-100 outline-none transition-all text-sm font-medium" 
                            />
                        </div>
                        <button onClick={() => setShowQuickAdd(true)} className={`p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm active:scale-95 flex items-center justify-center hover:bg-emerald-100 transition-colors`} title="Quick Add Product">
                            <Plus className="h-6 w-6" />
                        </button>
                        <button onClick={startScanner} className={`p-3 ${themeClasses.primaryBg} text-white rounded-2xl shadow-sm active:scale-95 flex items-center justify-center`}>
                            <Barcode className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-10 text-slate-500">Loading inventory...</div>
                    ) : filteredProducts.map(p => {
                        const inCart = !!cart[p.$id];
                        return (
                            <div 
                                key={p.$id} 
                                onClick={() => toggleCart(p)}
                                className={`bg-white p-3.5 rounded-2xl border-2 transition-all flex items-center cursor-pointer ${inCart ? `border-blue-500 bg-blue-50/30` : 'border-slate-100 hover:border-slate-300'}`}
                            >
                                <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mr-4">
                                    <Package className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 text-sm truncate">{p.name}</h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">Stock: {p.stock}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">Buy: {formatCurrency(p.buy_price || 0)}</span>
                                    </div>
                                </div>
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${inCart ? `bg-blue-600 text-white` : 'bg-slate-100 text-slate-400'}`}>
                                    {inCart ? <CheckCircle className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="absolute bottom-0 left-0 w-full bg-white p-4 border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] flex justify-between items-center rounded-t-3xl">
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Items to Purchase</p>
                        <h3 className={`text-xl font-black text-blue-600`}>{cartItems.length} Items</h3>
                    </div>
                    <button 
                        disabled={cartItems.length === 0}
                        onClick={() => setCurrentView('checkout')}
                        className={`px-6 py-3.5 rounded-2xl bg-blue-600 text-white font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center`}
                    >
                        Checkout <ArrowRight className="ml-2 h-5 w-5" />
                    </button>
                </div>

                {showQuickAdd && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                                    <Plus className={`h-5 w-5 mr-2 text-blue-600`} /> Quick Add Product
                                </h3>
                                <button onClick={() => setShowQuickAdd(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <form onSubmit={handleQuickAddProduct} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Product Name</label>
                                    <input type="text" required value={newPName} onChange={e => setNewPName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-300 transition-all font-bold" placeholder="e.g. New Item" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Buy Price</label>
                                        <input type="number" required value={newPBuyPrice} onChange={e => setNewPBuyPrice(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-300 transition-all font-bold" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sell Price</label>
                                        <input type="number" required value={newPSellPrice} onChange={e => setNewPSellPrice(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-300 transition-all font-bold" placeholder="0" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Initial Stock</label>
                                    <input type="number" required value={newPStock} onChange={e => setNewPStock(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-300 transition-all font-bold" placeholder="0" />
                                </div>
                                <button type="submit" disabled={isSavingProduct || !newPName.trim()} className={`w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 flex justify-center items-center`}>
                                    {isSavingProduct ? <Loader2 className="h-5 w-5 animate-spin" /> : "Add to Cart"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {showScannerModal && (
                    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
                        <div id="reader" className="w-full max-w-sm rounded-3xl overflow-hidden border-4 border-white shadow-2xl"></div>
                        <button onClick={stopScanner} className="mt-10 px-8 py-3 bg-white text-red-600 rounded-full font-bold shadow-xl">Close Camera</button>
                    </div>
                )}
            </div>
        );
    }

    if (currentView === 'checkout') {
        const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(supplierName.toLowerCase()));

        return (
            <div className="h-screen bg-slate-50 flex flex-col relative">
                <div className="bg-blue-600 p-4 text-white flex items-center shadow-md pb-8 rounded-b-3xl z-10">
                    <button onClick={() => setCurrentView('selection')} className="p-2 hover:bg-white/20 rounded-full transition-colors mr-3">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h2 className="text-lg font-bold">Purchase Details</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 -mt-4 z-20 custom-scrollbar">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Invoice No</label>
                                <input type="text" value={invoiceNo} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-mono font-bold text-slate-700 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
                                <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-blue-400" />
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Supplier Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={supplierName}
                                    onChange={(e) => { setSupplierName(e.target.value); setShowSuppDropdown(true); }}
                                    onFocus={() => setShowSuppDropdown(true)}
                                    placeholder="Search or type supplier name..." 
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-400"
                                />
                            </div>
                            {showSuppDropdown && supplierName.length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                                    {filteredSuppliers.map((s, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => { setSupplierName(s.name); setShowSuppDropdown(false); }}
                                            className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                        >
                                            <span className="font-bold text-slate-700 text-sm">{s.name}</span>
                                            <span className="text-xs text-slate-400">{s.phone}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-4 overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between text-xs font-bold text-slate-500">
                            <span>ITEM & QTY</span>
                            <span>BUY RATE & TOTAL</span>
                        </div>
                        <div className="p-2">
                            {cartItems.map(item => (
                                <div key={item.$id} className="p-3 border-b border-dashed border-slate-200 last:border-0 flex justify-between items-center">
                                    <div className="flex-1 pr-2">
                                        <h4 className="font-bold text-sm text-slate-800 mb-2">{item.name}</h4>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => updateCartQty(item.$id, -1)} className="h-7 w-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                                            <input type="number" value={item.qty} onChange={(e) => updateCartQty(item.$id, 0, Number(e.target.value))} className="w-10 text-center text-sm font-bold border border-slate-200 rounded-md p-1" />
                                            <button onClick={() => updateCartQty(item.$id, 1)} className="h-7 w-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center justify-end space-x-1 mb-1">
                                            <span className="text-xs text-slate-400">Buy Rate:</span>
                                            <input type="number" value={item.buyRate} onChange={(e) => updateCartRate(item.$id, Number(e.target.value))} className={`w-16 text-right text-xs font-bold text-blue-600 border border-slate-200 rounded-md p-1`} />
                                        </div>
                                        <div className="font-black text-slate-800">{formatCurrency(item.qty * item.buyRate)}</div>
                                        <button onClick={() => updateCartQty(item.$id, -item.qty)} className="text-[10px] font-bold text-red-500 mt-1 uppercase"><Trash2 className="h-3 w-3 inline" /> Remove</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-20">
                        <div className={`flex justify-between items-center py-3 border-b border-slate-100 mb-4`}>
                            <span className="text-lg font-black text-slate-800">Total Amount:</span>
                            <span className={`text-xl font-black text-blue-600`}>{formatCurrency(totalAmount)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Paid Amount (৳)</label>
                                <input type="number" value={paid} onChange={e => setPaid(e.target.value === '' ? '' : Number(e.target.value))} placeholder={(totalAmount ?? 0).toString()} className={`w-full bg-blue-50/30 border-2 border-blue-200 rounded-xl p-2.5 text-lg font-black text-blue-600 outline-none focus:border-blue-400`} />
                            </div>
                            <div className="text-right">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Due to Supplier</label>
                                <div className={`text-2xl font-black text-rose-500`}>
                                    {formatCurrency(Math.abs(dueAmt))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Payment Method</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Cash', 'Bkash/Nagad', 'Bank'].map(method => (
                                    <button 
                                        key={method}
                                        onClick={() => setPaymentMethod(method)}
                                        className={`py-2 px-1 text-xs font-bold rounded-xl border-2 transition-all ${paymentMethod === method ? `border-blue-500 bg-blue-50 text-blue-700` : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'}`}
                                    >
                                        {method}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 w-full bg-white p-4 border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-30">
                    <button 
                        onClick={handleConfirmPurchase} 
                        disabled={isProcessing}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center"
                    >
                        {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <><CheckCircle className="h-6 w-6 mr-2" /> Confirm Purchase</>}
                    </button>
                </div>
            </div>
        );
    }

    if (currentView === 'receipt' && receiptData) {
        const printData = {
            ...receiptData,
            items: typeof receiptData.items === 'string' ? JSON.parse(receiptData.items) : receiptData.items
        };

        return (
            <PrintPreview 
                data={printData} 
                shop={shop} 
                onBack={() => setCurrentView('selection')} 
                type="Purchase" 
            />
        );
    }

    return null;
}
