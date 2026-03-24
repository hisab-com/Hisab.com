import React, { useState, useEffect, useRef } from 'react';
import { Printer, ArrowLeft, Download, Eye, EyeOff } from 'lucide-react';
import { useAppConfig } from '../context/AppConfigContext';

export default function PrintPreview({ data, shop, onBack, type = 'Sale' }: any) {
    const { t, themeClasses, formatCurrency, printSettings } = useAppConfig();
    
    const [style, setStyle] = useState(printSettings.style || '1');
    const [showLogo, setShowLogo] = useState(printSettings.showLogo ?? true);
    const [showDesc, setShowDesc] = useState(printSettings.showDesc ?? true);
    const [showHeader, setShowHeader] = useState(printSettings.showHeader ?? true);
    const [showImage, setShowImage] = useState(printSettings.showImage ?? false);
    const [isChallan, setIsChallan] = useState(printSettings.isChallan ?? false);
    const [showPrevDue, setShowPrevDue] = useState(printSettings.showPrevDue ?? false);
    const [showVoucherInfo, setShowVoucherInfo] = useState(printSettings.showVoucherInfo ?? true);
    const [priceOnly, setPriceOnly] = useState(printSettings.priceOnly ?? false);

    const isPOS = style === 'POS' || style === 'Token';
    const isToken = style === 'Token';

    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                // 210mm is approx 794px, 80mm is approx 302px
                const targetWidth = isPOS ? 302 : 794;
                const availableWidth = containerWidth - 32; // 16px padding on each side
                
                if (availableWidth < targetWidth) {
                    setScale(availableWidth / targetWidth);
                } else {
                    setScale(1);
                }
            }
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [isPOS, style]);

    const handlePrint = () => {
        window.print();
    };

    const items = data.items.map((item: any) => ({
        ...item,
        rate: item.sellRate || item.buyRate || item.rate || 0
    }));

    const stylesList = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'POS', '11', 'Token'];

    return (
        <div className={`min-h-screen ${themeClasses.bg} flex flex-col relative`}>
            {/* Print specific CSS */}
            <style>
                {`
                @media print {
                    @page { size: auto; margin: 0mm; }
                    body { background: white; margin: 0; padding: 0; }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    .print-container { 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        padding: ${isPOS ? '2mm' : '10mm'} !important; 
                        width: ${isPOS ? '80mm' : '100%'} !important; 
                        min-height: auto !important;
                    }
                }
                `}
            </style>

            {/* Top Controls Bar (Hidden in Print) */}
            <div className={`no-print sticky top-0 z-50 ${themeClasses.cardBg} border-b ${themeClasses.border} shadow-sm`}>
                <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 ${themeClasses.text}`}>
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className={`font-bold text-lg ${themeClasses.text}`}>{t.printPreview}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className={`p-2 rounded-full bg-slate-100 dark:bg-slate-800 ${themeClasses.text} hover:bg-slate-200 dark:hover:bg-slate-700`}>
                            <Download size={20} />
                        </button>
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md">
                            <Printer size={20} />
                            <span className="font-medium hidden sm:inline">Print</span>
                        </button>
                    </div>
                </div>

                {/* Toggles Row 1 */}
                <div className="flex items-center gap-4 p-3 overflow-x-auto whitespace-nowrap text-sm border-b border-slate-200 dark:border-slate-700">
                    <label className={`flex items-center gap-2 cursor-pointer ${themeClasses.text}`}>
                        <input type="checkbox" checked={priceOnly} onChange={(e) => setPriceOnly(e.target.checked)} className="accent-red-500 w-4 h-4" />
                        {t.priceOnly}
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer ${themeClasses.text}`}>
                        <span className="font-medium">{t.previousDue}</span>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${showPrevDue ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <input type="checkbox" className="sr-only" checked={showPrevDue} onChange={(e) => setShowPrevDue(e.target.checked)} />
                            <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${showPrevDue ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer ${themeClasses.text}`}>
                        <span className="font-medium">{t.voucherInfo}</span>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${showVoucherInfo ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <input type="checkbox" className="sr-only" checked={showVoucherInfo} onChange={(e) => setShowVoucherInfo(e.target.checked)} />
                            <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${showVoucherInfo ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </label>
                    <button 
                        onClick={() => setIsChallan(!isChallan)}
                        className={`px-3 py-1 rounded-full border transition-colors ${isChallan ? 'bg-slate-200 dark:bg-slate-700 border-slate-400' : 'border-slate-300 dark:border-slate-600'} ${themeClasses.text}`}
                    >
                        {t.challanView}
                    </button>
                </div>

                {/* Styles & Toggles Row 2 */}
                <div className="flex items-center gap-3 p-3 overflow-x-auto whitespace-nowrap text-sm">
                    <span className={`font-medium ${themeClasses.text}`}>{t.style}</span>
                    {stylesList.map(s => (
                        <button 
                            key={s}
                            onClick={() => setStyle(s)}
                            className={`px-3 py-1 rounded-full border transition-colors ${style === s ? 'bg-blue-500 text-white border-blue-500' : `bg-white dark:bg-slate-800 ${themeClasses.text} border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700`}`}
                        >
                            {s}
                        </button>
                    ))}
                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-2"></div>
                    <button onClick={() => setShowLogo(!showLogo)} className={`flex items-center gap-1 px-3 py-1 rounded-full border transition-colors ${showLogo ? 'bg-slate-200 dark:bg-slate-700 border-slate-400' : 'border-slate-300 dark:border-slate-600'} ${themeClasses.text}`}>
                        {t.logo} {showLogo ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => setShowDesc(!showDesc)} className={`flex items-center gap-1 px-3 py-1 rounded-full border transition-colors ${showDesc ? 'bg-slate-200 dark:bg-slate-700 border-slate-400' : 'border-slate-300 dark:border-slate-600'} ${themeClasses.text}`}>
                        {t.description} {showDesc ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => setShowHeader(!showHeader)} className={`flex items-center gap-1 px-3 py-1 rounded-full border transition-colors ${showHeader ? 'bg-slate-200 dark:bg-slate-700 border-slate-400' : 'border-slate-300 dark:border-slate-600'} ${themeClasses.text}`}>
                        {t.header} {showHeader ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => setShowImage(!showImage)} className={`flex items-center gap-1 px-3 py-1 rounded-full border transition-colors ${showImage ? 'bg-slate-200 dark:bg-slate-700 border-slate-400' : 'border-slate-300 dark:border-slate-600'} ${themeClasses.text}`}>
                        {t.productImage} {showImage ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                </div>
            </div>

            {/* Preview Area */}
            <div ref={containerRef} className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-100 dark:bg-slate-900">
                <div 
                    style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
                    className={`print-container bg-white text-black shadow-2xl relative ${isPOS ? 'w-[80mm] p-4' : 'w-[210mm] min-h-[297mm] p-10'}`}
                >
                    
                    {/* Watermark (Optional based on style) */}
                    {style === '1' && shop?.name && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
                            <h1 className="text-8xl font-black text-center rotate-[-30deg] whitespace-nowrap">{shop.name}</h1>
                        </div>
                    )}

                    {/* Header Section */}
                    {showHeader && !isToken && (
                        <div className={`flex ${style === '3' || isPOS ? 'flex-col items-center text-center' : 'justify-between items-start'} mb-6 relative z-10`}>
                            <div className={`flex ${style === '3' || isPOS ? 'flex-col items-center' : 'items-center gap-4'}`}>
                                {showLogo && shop?.logo_url && (
                                    <img src={shop.logo_url} alt="Logo" className={`${isPOS ? 'h-12 mb-2' : 'h-16'} object-contain`} />
                                )}
                                <div>
                                    <h1 className={`${isPOS ? 'text-lg' : 'text-2xl'} font-bold text-slate-900`}>{shop?.name || 'Shop Name'}</h1>
                                    <p className={`${isPOS ? 'text-xs' : 'text-sm'} text-slate-700`}>{shop?.address}</p>
                                    <p className={`${isPOS ? 'text-xs' : 'text-sm'} text-slate-700`}>Mobile: {shop?.phone}</p>
                                </div>
                            </div>
                            
                            {showVoucherInfo && !isPOS && (
                                <div className={`border ${style === '8' ? 'border-none text-right' : 'border-slate-800 p-3'} bg-white`}>
                                    <div className="font-bold text-lg mb-1">{isChallan ? 'Challan' : `${type} Voucher`}</div>
                                    <div className="text-sm">No. {data.invoice_no}</div>
                                    <div className="text-sm">Date : {new Date(data.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Token Header */}
                    {isToken && (
                        <div className="text-center mb-4 border-b border-dashed border-slate-400 pb-2">
                            <h1 className="text-xl font-bold">{shop?.name}</h1>
                            <p className="text-xs">Token No: {data.invoice_no}</p>
                        </div>
                    )}

                    {/* Customer Info Section */}
                    {!isPOS && !isToken && (
                        <div className={`mb-4 ${style === '8' ? '' : 'border-b border-dashed border-slate-400'} pb-3 relative z-10`}>
                            {style === '8' && (
                                <div className="flex justify-between items-end mb-2">
                                    <div className="text-sm">No. {data.invoice_no}</div>
                                    <div className="font-bold text-lg">{isChallan ? 'Challan' : `${type} Voucher`}</div>
                                    <div className="text-sm">Date : {new Date(data.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                </div>
                            )}
                            
                            {style === '8' && (
                                <div className="mb-2">
                                    <svg className="w-48 h-10" preserveAspectRatio="none">
                                        {/* Placeholder for barcode if needed, using simple lines for now */}
                                        <rect x="0" y="0" width="2" height="40" fill="black"/>
                                        <rect x="4" y="0" width="4" height="40" fill="black"/>
                                        <rect x="10" y="0" width="2" height="40" fill="black"/>
                                        <rect x="14" y="0" width="6" height="40" fill="black"/>
                                        <rect x="22" y="0" width="2" height="40" fill="black"/>
                                        <rect x="26" y="0" width="4" height="40" fill="black"/>
                                        <rect x="32" y="0" width="8" height="40" fill="black"/>
                                        <rect x="42" y="0" width="2" height="40" fill="black"/>
                                        <rect x="46" y="0" width="4" height="40" fill="black"/>
                                        <rect x="52" y="0" width="2" height="40" fill="black"/>
                                        <rect x="56" y="0" width="4" height="40" fill="black"/>
                                        <rect x="62" y="0" width="2" height="40" fill="black"/>
                                        <rect x="66" y="0" width="6" height="40" fill="black"/>
                                        <rect x="74" y="0" width="2" height="40" fill="black"/>
                                        <rect x="78" y="0" width="4" height="40" fill="black"/>
                                        <rect x="84" y="0" width="2" height="40" fill="black"/>
                                        <rect x="88" y="0" width="8" height="40" fill="black"/>
                                        <rect x="98" y="0" width="2" height="40" fill="black"/>
                                        <rect x="102" y="0" width="4" height="40" fill="black"/>
                                        <rect x="108" y="0" width="2" height="40" fill="black"/>
                                        <rect x="112" y="0" width="6" height="40" fill="black"/>
                                        <rect x="120" y="0" width="2" height="40" fill="black"/>
                                        <rect x="124" y="0" width="4" height="40" fill="black"/>
                                        <rect x="130" y="0" width="2" height="40" fill="black"/>
                                        <rect x="134" y="0" width="8" height="40" fill="black"/>
                                        <rect x="144" y="0" width="2" height="40" fill="black"/>
                                        <rect x="148" y="0" width="4" height="40" fill="black"/>
                                        <rect x="154" y="0" width="2" height="40" fill="black"/>
                                        <rect x="158" y="0" width="6" height="40" fill="black"/>
                                        <rect x="166" y="0" width="2" height="40" fill="black"/>
                                        <rect x="170" y="0" width="4" height="40" fill="black"/>
                                        <rect x="176" y="0" width="2" height="40" fill="black"/>
                                        <rect x="180" y="0" width="8" height="40" fill="black"/>
                                    </svg>
                                </div>
                            )}

                            <div className="flex justify-between text-sm">
                                <div className="w-full">
                                    <div className="flex border-b border-dotted border-slate-400 py-1">
                                        <span className="w-20">Name :</span>
                                        <span className="font-bold">{data.customer_name || data.supplier_name || 'Cash'}</span>
                                    </div>
                                    <div className="flex border-b border-dotted border-slate-400 py-1">
                                        <span className="w-20">Address :</span>
                                        <span>{data.customer_address || ''}</span>
                                    </div>
                                    <div className="flex border-b border-dotted border-slate-400 py-1">
                                        <span className="w-20">Mobile :</span>
                                        <span>{data.customer_mobile || ''}</span>
                                    </div>
                                </div>
                                {!showVoucherInfo && style !== '8' && (
                                    <div className="text-right ml-4 whitespace-nowrap">
                                        <p><strong>No:</strong> {data.invoice_no}</p>
                                        <p><strong>Date:</strong> {new Date(data.date).toLocaleDateString()}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* POS Customer Info */}
                    {style === 'POS' && (
                        <div className="text-center text-xs mb-3 border-b border-dashed border-slate-400 pb-2">
                            <p>Invoice No: {data.invoice_no}</p>
                            <p>Date: {new Date(data.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            <p className="mt-1">Cust: {data.customer_name || data.supplier_name || 'Cash'}</p>
                            {data.customer_mobile && <p>Mobile: {data.customer_mobile}</p>}
                        </div>
                    )}

                    {/* Items Table */}
                    <table className={`w-full text-sm mb-4 relative z-10 ${style === '2' || style === '8' ? 'border-collapse' : ''}`}>
                        <thead className={`
                            ${style === '1' || style === '8' ? 'bg-slate-100 border border-slate-800' : ''}
                            ${style === '2' ? 'border-y-2 border-slate-800' : ''}
                            ${style === '3' ? 'border-b-2 border-slate-800 text-center' : ''}
                            ${style === '4' ? 'border-b border-slate-200' : ''}
                            ${style === '5' ? 'border-2 border-slate-800 bg-slate-50' : ''}
                            ${style === '7' ? 'bg-slate-800 text-white' : ''}
                            ${isPOS ? 'border-y border-slate-800 border-dashed' : ''}
                        `}>
                            <tr className={`${style === '1' || style === '8' ? 'border border-slate-800' : isPOS ? 'border-y border-dashed border-slate-400' : 'border-b-2 border-slate-800'}`}>
                                {!isToken && <th className={`py-1.5 px-2 text-left ${isPOS ? 'w-8' : 'w-12'} ${style === '1' || style === '8' || style === '5' ? 'border-r border-slate-800' : ''}`}>{isPOS ? 'Sn' : 'No'}</th>}
                                {showImage && !isPOS && <th className={`py-1.5 px-2 text-center w-12 ${style === '1' || style === '8' || style === '5' ? 'border-r border-slate-800' : ''}`}>Img</th>}
                                <th className={`py-1.5 px-2 text-left ${style === '1' || style === '8' || style === '5' ? 'border-r border-slate-800' : ''}`}>{isPOS ? 'Item' : 'Particulars'}</th>
                                <th className={`py-1.5 px-2 text-center ${isPOS ? 'w-10' : 'w-20'} ${style === '1' || style === '8' || style === '5' ? 'border-r border-slate-800' : ''}`}>Qty</th>
                                {!isChallan && !isToken && <th className={`py-1.5 px-2 text-right ${isPOS ? 'w-16' : 'w-24'} ${style === '1' || style === '8' || style === '5' ? 'border-r border-slate-800' : ''}`}>{isPOS ? 'Price' : 'Rate'}</th>}
                                {!isChallan && !isToken && !priceOnly && <th className={`py-1.5 px-2 text-right ${isPOS ? 'w-16' : 'w-24'}`}>Amount</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item: any, idx: number) => (
                                <tr key={idx} className={`
                                    ${style === '1' || style === '8' ? 'border border-slate-800' : isPOS ? '' : 'border-b border-slate-200'}
                                    ${style === '6' && idx % 2 === 0 ? 'bg-slate-50' : ''}
                                    ${style === '4' ? 'border-none' : ''}
                                `}>
                                    {!isToken && <td className={`py-1.5 px-2 ${style === '1' || style === '8' || style === '5' ? 'border-r border-slate-800' : ''} ${isPOS ? 'text-xs align-top' : ''}`}>{idx + 1}</td>}
                                    {showImage && !isPOS && (
                                        <td className={`py-1.5 px-2 ${style === '1' || style === '8' || style === '5' ? 'border-r border-slate-800' : ''} text-center`}>
                                            {item.image_url ? <img src={item.image_url} className="w-8 h-8 object-cover mx-auto" alt="product" /> : '-'}
                                        </td>
                                    )}
                                    <td className={`py-1.5 px-2 ${style === '1' || style === '8' || style === '5' ? 'border-r border-slate-800' : ''}`}>
                                        <div className={`font-bold ${isPOS ? 'text-xs' : ''} ${style === '9' ? 'text-base' : ''}`}>{item.name}</div>
                                        {showDesc && item.brand && <div className={`text-slate-500 ${isPOS ? 'text-[10px]' : 'text-xs'}`}>{item.brand}</div>}
                                    </td>
                                    <td className={`py-1.5 px-2 text-center ${style === '1' || style === '8' || style === '5' ? 'border-r border-slate-800' : ''} ${isPOS ? 'text-xs align-top' : ''}`}>{item.qty}</td>
                                    {!isChallan && !isToken && <td className={`py-1.5 px-2 text-right ${style === '1' || style === '8' || style === '5' ? 'border-r border-slate-800' : ''} ${isPOS ? 'text-xs align-top' : ''}`}>{formatCurrency(item.rate)}</td>}
                                    {!isChallan && !isToken && !priceOnly && <td className={`py-1.5 px-2 text-right ${isPOS ? 'text-xs align-top' : ''}`}>{formatCurrency(item.qty * item.rate)}</td>}
                                </tr>
                            ))}
                            {/* Total Row for Table Styles */}
                            {(style === '1' || style === '8' || style === '5') && !isChallan && !isToken && (
                                <tr className={`border border-slate-800 font-bold ${style === '5' ? 'border-2' : ''}`}>
                                    <td colSpan={showImage ? 3 : 2} className="py-1.5 px-2 text-right border-r border-slate-800">Total</td>
                                    <td className="py-1.5 px-2 text-center border-r border-slate-800">
                                        {items.reduce((sum: number, item: any) => sum + item.qty, 0)}
                                    </td>
                                    <td className="py-1.5 px-2 border-r border-slate-800"></td>
                                    {!priceOnly && <td className="py-1.5 px-2 text-right">{formatCurrency(data.subtotal)}</td>}
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Amount in Words (Optional, for A4 styles) */}
                    {!isPOS && !isChallan && (
                        <div className="text-sm mb-4 font-medium italic">
                            Amount in Word : <span className="text-slate-600 capitalize">
                                {/* Simple placeholder, a real number-to-words function would be better but this is fine for UI demo */}
                                {data.total_amount} Only
                            </span>
                        </div>
                    )}

                    {/* Totals Section */}
                    {!isChallan && !isToken && (
                        <div className={`flex ${isPOS ? 'flex-col border-t border-dashed border-slate-400 pt-2' : 'justify-end'} relative z-10`}>
                            <div className={`${isPOS ? 'w-full text-xs' : 'w-64 text-sm'}`}>
                                {style !== '1' && style !== '8' && (
                                    <div className="flex justify-between py-1">
                                        <span>Total:</span>
                                        <span>{formatCurrency(data.subtotal)}</span>
                                    </div>
                                )}
                                {data.discount > 0 && (
                                    <div className="flex justify-between py-1">
                                        <span>Discount:</span>
                                        <span>- {formatCurrency(data.discount)}</span>
                                    </div>
                                )}
                                {showPrevDue && data.previous_due > 0 && (
                                    <div className="flex justify-between py-1">
                                        <span>Previous Due:</span>
                                        <span>{formatCurrency(data.previous_due)}</span>
                                    </div>
                                )}
                                {(data.discount > 0 || (showPrevDue && data.previous_due > 0)) && (
                                    <div className={`flex justify-between py-1 font-bold ${isPOS ? 'border-t border-dashed border-slate-400' : 'border-t border-slate-800'}`}>
                                        <span>Grand Total:</span>
                                        <span>{formatCurrency(data.total_amount + (showPrevDue ? (data.previous_due || 0) : 0))}</span>
                                    </div>
                                )}
                                <div className="flex justify-between py-1">
                                    <span>Paid:</span>
                                    <span>{formatCurrency(data.paid_amount)}</span>
                                </div>
                                <div className={`flex justify-between py-1 font-bold ${isPOS ? '' : 'border-t border-slate-800'}`}>
                                    <span>Due:</span>
                                    <span>{formatCurrency(data.due_amount + (showPrevDue ? (data.previous_due || 0) : 0))}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Token Totals */}
                    {isToken && (
                        <div className="text-center text-sm font-bold border-t border-dashed border-slate-400 pt-2 mt-2">
                            Total Items: {items.reduce((sum: number, item: any) => sum + item.qty, 0)}
                        </div>
                    )}

                    {/* POS Footer */}
                    {isPOS && (
                        <div className="text-center text-xs mt-6 pt-2 border-t border-dashed border-slate-400">
                            <p>Thank you for shopping!</p>
                        </div>
                    )}

                    {/* A4 Footer Signatures */}
                    {!isPOS && (
                        <div className="mt-24 flex justify-between text-sm relative z-10">
                            <div className="w-48">
                                <div className="text-xs text-slate-500 mb-6">
                                    Print by : {shop?.name}<br/>
                                    {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                </div>
                            </div>
                            <div className="text-center border-t border-slate-800 pt-2 w-32">Customer</div>
                            <div className="text-center border-t border-slate-800 pt-2 w-32">Authority</div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
