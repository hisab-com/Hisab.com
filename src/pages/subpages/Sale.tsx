import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../../components/PageHeader';
import { Search, Barcode, ArrowRight, ArrowLeft, Plus, Minus, Trash2, CheckCircle, Printer, ShoppingCart, User, Package } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { databases, DB_ID, PRODUCTS_COLLECTION, CONTACTS_COLLECTION, SALES_COLLECTION, ID, Query } from '../../lib/appwrite';
import { Html5Qrcode } from 'html5-qrcode';

export default function Sale({ onBack, shop }: any) {
    const { t, themeClasses, formatCurrency } = useAppConfig();
    
    // Views: 'selection' | 'checkout' | 'receipt'
    const [currentView, setCurrentView] = useState<'selection' | 'checkout' | 'receipt'>('selection');
    
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Cart State: { productId: { ...product, qty, sellRate } }
    const [cart, setCart] = useState<Record<string, any>>({});
    
    // Checkout State
    const [invoiceNo, setInvoiceNo] = useState('');
    const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
    const [customerName, setCustomerName] = useState('');
    const [showCustDropdown, setShowCustDropdown] = useState(false);
    const [discount, setDiscount] = useState<number | ''>(0);
    const [paid, setPaid] = useState<number | ''>('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);

    // Scanner
    const [showScannerModal, setShowScannerModal] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        fetchInitialData();
        setInvoiceNo("INV-" + Math.floor(100000 + Math.random() * 900000));
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

            // Fetch Customers safely
            let fetchedCustomers: any[] = [];
            try {
                const custRes = await databases.listDocuments(DB_ID, CONTACTS_COLLECTION, [
                    Query.equal('shop_id', shop.$id),
                    Query.equal('type', 'customers'),
                    Query.limit(500)
                ]);
                fetchedCustomers = custRes.documents;
            } catch (err) {
                console.warn('Could not fetch customers. Please check CONTACTS_COLLECTION ID.');
            }
            
            setCustomers([{ name: 'Local (Walk-in)', phone: '' }, ...fetchedCustomers]);
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
                if (product.stock > 0) {
                    newCart[product.$id] = { 
                        ...product, 
                        qty: 1, 
                        sellRate: product.sell_price 
                    };
                } else {
                    alert('This item is out of stock!');
                }
            }
            return newCart;
        });
    };

    // --- Checkout Logic ---
    const cartItems = Object.values(cart);
    const subtotal = cartItems.reduce((sum, item) => sum + (item.qty * item.sellRate), 0);
    const discountAmt = Number(discount) || 0;
    const grandTotal = subtotal - discountAmt;
    const paidAmt = paid === '' ? grandTotal : Number(paid);
    const dueAmt = grandTotal - paidAmt;

    const updateCartQty = (id: string, delta: number, manualVal?: number) => {
        setCart(prev => {
            const newCart = { ...prev };
            const item = newCart[id];
            let newQty = manualVal !== undefined ? manualVal : item.qty + delta;
            
            if (newQty > item.stock) {
                alert(`Maximum available stock: ${item.stock}`);
                newQty = item.stock;
            }
            
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
            [id]: { ...prev[id], sellRate: Number(val) || 0 }
        }));
    };

    const handleConfirmSale = async () => {
        if (cartItems.length === 0) return alert('Cart is empty!');
        setIsProcessing(true);

        const itemsToSave = cartItems.map(item => ({
            id: item.$id,
            name: item.name,
            brand: item.brand || '',
            qty: item.qty,
            sellRate: item.sellRate,
            buyRate: item.buy_price,
            profit: (item.sellRate - item.buy_price) * item.qty
        }));

        const totalProfit = itemsToSave.reduce((sum, item) => sum + item.profit, 0) - discountAmt;
        const finalCustName = customerName.trim() || 'Local (Walk-in)';

        const saleData = {
            shop_id: shop.$id,
            invoice_no: invoiceNo,
            customer_name: finalCustName,
            date: sellDate,
            items: JSON.stringify(itemsToSave),
            subtotal: subtotal,
            discount: discountAmt,
            total_amount: grandTotal,
            paid_amount: paidAmt,
            due_amount: dueAmt > 0 ? dueAmt : 0,
            total_profit: totalProfit,
            payment_method: paymentMethod
        };

        try {
            // 1. Save Sale Document
            await databases.createDocument(DB_ID, SALES_COLLECTION, ID.unique(), saleData);

            // 2. Reduce Stock
            for (const item of cartItems) {
                const newStock = item.stock - item.qty;
                await databases.updateDocument(DB_ID, PRODUCTS_COLLECTION, item.$id, {
                    stock: newStock
                });
            }

            // Set receipt and change view
            setReceiptData(saleData);
            setCurrentView('receipt');
            setCart({});
            setInvoiceNo("INV-" + Math.floor(100000 + Math.random() * 900000));
            setDiscount(0);
            setPaid('');
            setCustomerName('');

        } catch (error) {
            console.error('Sale Error:', error);
            alert('Failed to process sale. Check collections and permissions in Appwrite.');
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
            }).catch(() => setShowScannerModal(false));
        } else {
            setShowScannerModal(false);
        }
    };

    // ==========================================
    // RENDER PRODUCT SELECTION VIEW
    // ==========================================
    if (currentView === 'selection') {
        return (
            <div className="h-screen bg-slate-50 flex flex-col relative">
                <PageHeader title="Point of Sale (Sell)" onBack={onBack} />
                
                {/* Search Bar */}
                <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-10">
                    <div className="flex space-x-3">
                        <div className="relative flex-1 group">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors`} />
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name, brand or barcode..." 
                                className="w-full pl-12 pr-4 py-3 bg-slate-100 border border-transparent rounded-2xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-100 outline-none transition-all text-sm font-medium" 
                            />
                        </div>
                        <button onClick={startScanner} className={`p-3 ${themeClasses.primaryBg} text-white rounded-2xl shadow-sm active:scale-95 flex items-center justify-center`}>
                            <Barcode className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-10 text-slate-500">Loading inventory...</div>
                    ) : filteredProducts.map(p => {
                        const inCart = !!cart[p.$id];
                        const outOfStock = p.stock <= 0;
                        return (
                            <div 
                                key={p.$id} 
                                onClick={() => toggleCart(p)}
                                className={`bg-white p-3.5 rounded-2xl border-2 transition-all flex items-center cursor-pointer ${inCart ? `border-indigo-500 bg-indigo-50/30` : 'border-slate-100 hover:border-slate-300'} ${outOfStock ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                {p.image_url ? (
                                    <img src={p.image_url} className="h-12 w-12 rounded-xl object-cover border border-slate-200 mr-4" alt={p.name} />
                                ) : (
                                    <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mr-4">
                                        <Package className="h-6 w-6" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 text-sm truncate">{p.name}</h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${outOfStock ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>Stock: {p.stock}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">Sell: {formatCurrency(p.sell_price)}</span>
                                    </div>
                                </div>
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${inCart ? `${themeClasses.primaryBg} text-white` : 'bg-slate-100 text-slate-400'}`}>
                                    {inCart ? <CheckCircle className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Cart Bar */}
                <div className="absolute bottom-0 left-0 w-full bg-white p-4 border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] flex justify-between items-center rounded-t-3xl">
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Items in Cart</p>
                        <h3 className={`text-xl font-black ${themeClasses.primaryText}`}>{cartItems.length} Items</h3>
                    </div>
                    <button 
                        disabled={cartItems.length === 0}
                        onClick={() => setCurrentView('checkout')}
                        className={`px-6 py-3.5 rounded-2xl ${themeClasses.primaryBg} text-white font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center`}
                    >
                        Proceed <ArrowRight className="ml-2 h-5 w-5" />
                    </button>
                </div>

                {/* Scanner Modal */}
                {showScannerModal && (
                    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
                        <div id="reader" className="w-full max-w-sm rounded-3xl overflow-hidden border-4 border-white shadow-2xl"></div>
                        <button onClick={stopScanner} className="mt-10 px-8 py-3 bg-white text-red-600 rounded-full font-bold shadow-xl">Close Camera</button>
                    </div>
                )}
            </div>
        );
    }

    // ==========================================
    // RENDER CHECKOUT VIEW
    // ==========================================
    if (currentView === 'checkout') {
        const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase()));

        return (
            <div className="h-screen bg-slate-50 flex flex-col relative">
                <div className={`${themeClasses.primaryBg} p-4 text-white flex items-center shadow-md pb-8 rounded-b-3xl z-10`}>
                    <button onClick={() => setCurrentView('selection')} className="p-2 hover:bg-white/20 rounded-full transition-colors mr-3">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h2 className="text-lg font-bold">Checkout Details</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 -mt-4 z-20 custom-scrollbar">
                    {/* Invoice & Customer Card */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Invoice No</label>
                                <input type="text" value={invoiceNo} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-mono font-bold text-slate-700 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
                                <input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-indigo-400" />
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Customer Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={customerName}
                                    onChange={(e) => { setCustomerName(e.target.value); setShowCustDropdown(true); }}
                                    onFocus={() => setShowCustDropdown(true)}
                                    placeholder="Search or type customer name..." 
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400"
                                />
                            </div>
                            {/* Dropdown */}
                            {showCustDropdown && customerName.length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                                    {filteredCustomers.length === 0 ? (
                                        <div className="p-3 text-xs text-slate-400 text-center">No customer found</div>
                                    ) : filteredCustomers.map((c, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => { setCustomerName(c.name); setShowCustDropdown(false); }}
                                            className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                        >
                                            <span className="font-bold text-slate-700 text-sm">{c.name}</span>
                                            <span className="text-xs text-slate-400">{c.phone}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cart Items List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-4 overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between text-xs font-bold text-slate-500">
                            <span>ITEM & QTY</span>
                            <span>RATE & TOTAL</span>
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
                                            <span className="text-xs text-slate-400">Rate:</span>
                                            <input type="number" value={item.sellRate} onChange={(e) => updateCartRate(item.$id, Number(e.target.value))} className={`w-16 text-right text-xs font-bold ${themeClasses.primaryText} border border-slate-200 rounded-md p-1`} />
                                        </div>
                                        <div className="font-black text-slate-800">{formatCurrency(item.qty * item.sellRate)}</div>
                                        <button onClick={() => updateCartQty(item.$id, -item.qty)} className="text-[10px] font-bold text-red-500 mt-1 uppercase"><Trash2 className="h-3 w-3 inline" /> Remove</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment Summary Card */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-20">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-slate-600">Subtotal:</span>
                            <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-bold text-slate-600">Discount (৳):</span>
                            <input type="number" value={discount} onChange={e => setDiscount(e.target.value === '' ? '' : Number(e.target.value))} className="w-24 text-right bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-sm font-bold outline-none focus:border-indigo-400" />
                        </div>
                        <div className={`flex justify-between items-center py-3 border-t border-b border-slate-100 mb-4`}>
                            <span className="text-lg font-black text-slate-800">Grand Total:</span>
                            <span className={`text-xl font-black ${themeClasses.primaryText}`}>{formatCurrency(grandTotal)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Received (৳)</label>
                                <input type="number" value={paid} onChange={e => setPaid(e.target.value === '' ? '' : Number(e.target.value))} placeholder={grandTotal.toString()} className={`w-full bg-indigo-50/30 border-2 border-indigo-200 rounded-xl p-2.5 text-lg font-black ${themeClasses.primaryText} outline-none focus:border-indigo-400`} />
                            </div>
                            <div className="text-right">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{dueAmt < 0 ? 'Return Change' : 'Due Amount'}</label>
                                <div className={`text-2xl font-black ${dueAmt < 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
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
                                        className={`py-2 px-1 text-xs font-bold rounded-xl border-2 transition-all ${paymentMethod === method ? `border-indigo-500 bg-indigo-50 text-indigo-700` : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'}`}
                                    >
                                        {method}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Confirm Button Bar */}
                <div className="absolute bottom-0 left-0 w-full bg-white p-4 border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-30">
                    <button 
                        onClick={handleConfirmSale} 
                        disabled={isProcessing}
                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-emerald-600 active:scale-95 transition-all flex justify-center items-center"
                    >
                        {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <><CheckCircle className="h-6 w-6 mr-2" /> Confirm Sale</>}
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER RECEIPT VIEW (PRINTABLE)
    // ==========================================
    if (currentView === 'receipt' && receiptData) {
        return (
            <div className="h-screen flex flex-col bg-slate-100">
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        body * { visibility: hidden; }
                        #printable-receipt, #printable-receipt * { visibility: visible; }
                        #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white; }
                        .no-print { display: none !important; }
                    }
                `}} />

                <div className="flex-1 overflow-y-auto p-4 flex justify-center">
                    <div id="printable-receipt" className="bg-white w-full max-w-md p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="text-center mb-6 border-b border-dashed border-slate-300 pb-6">
                            <h2 className="text-2xl font-black text-slate-800">{shop.name}</h2>
                            <p className="text-xs font-bold text-slate-500 tracking-widest mt-1">CASH MEMO / INVOICE</p>
                        </div>

                        <div className="flex justify-between text-xs font-medium text-slate-600 mb-6">
                            <div>
                                <p className="mb-1">Customer: <strong className="text-slate-800">{receiptData.customer_name}</strong></p>
                                <p>Date: {new Date(receiptData.date).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="mb-1">Invoice: <strong className="text-slate-800">{receiptData.invoice_no}</strong></p>
                                <p>Method: {receiptData.payment_method}</p>
                            </div>
                        </div>

                        <table className="w-full text-xs mb-6 border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-800">
                                    <th className="text-left py-2">Item & Description</th>
                                    <th className="text-center py-2">Qty</th>
                                    <th className="text-right py-2">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {JSON.parse(receiptData.items).map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="py-3">
                                            <div className="font-bold text-slate-800">{item.name}</div>
                                            {item.brand && <div className="text-[10px] text-slate-500">{item.brand}</div>}
                                            <div className="text-[10px] text-slate-400 mt-0.5">@ {formatCurrency(item.sellRate)}</div>
                                        </td>
                                        <td className="text-center py-3 font-bold">{item.qty}</td>
                                        <td className="text-right py-3 font-bold text-slate-800">{formatCurrency(item.qty * item.sellRate)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="border-t-2 border-slate-800 pt-3 text-sm">
                            <div className="flex justify-between mb-1 font-medium text-slate-600">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(receiptData.subtotal)}</span>
                            </div>
                            {receiptData.discount > 0 && (
                                <div className="flex justify-between mb-1 font-medium text-rose-500">
                                    <span>Discount:</span>
                                    <span>- {formatCurrency(receiptData.discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between mb-3 font-black text-slate-800 text-base">
                                <span>Grand Total:</span>
                                <span>{formatCurrency(receiptData.total_amount)}</span>
                            </div>
                            
                            <div className="border-t border-dashed border-slate-300 my-3"></div>
                            
                            <div className="flex justify-between mb-1 font-medium text-slate-600">
                                <span>Paid / Received:</span>
                                <span>{formatCurrency(receiptData.paid_amount)}</span>
                            </div>
                            {receiptData.due_amount > 0 && (
                                <div className="flex justify-between font-black text-rose-600 mt-1">
                                    <span>Due Amount:</span>
                                    <span>{formatCurrency(receiptData.due_amount)}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-10 text-center">
                            <p className="text-xs font-bold text-slate-800">Thank you for your business!</p>
                            <p className="text-[10px] text-slate-400 mt-1">Generated by App</p>
                        </div>
                    </div>
                </div>

                <div className="no-print p-4 bg-white border-t border-slate-200 flex gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                    <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-bold text-lg hover:bg-slate-700 active:scale-95 transition-all flex justify-center items-center">
                        <Printer className="mr-2 h-5 w-5" /> Print Receipt
                    </button>
                    <button onClick={() => setCurrentView('selection')} className={`flex-1 py-4 ${themeClasses.primaryBg} text-white rounded-2xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all flex justify-center items-center`}>
                        <ShoppingCart className="mr-2 h-5 w-5" /> New Sale
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
