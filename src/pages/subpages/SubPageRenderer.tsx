import React from 'react';
import Sale from './Sale';
import Purchase from './Purchase';
import ProductList from './ProductList';
import Contacts from './Contacts';
import AppAccess from './AppAccess';
import Community from './Community';
import Profile from './Profile';
import SalesReports from './SalesReports';
import PurchaseReports from './PurchaseReports';
import ExpenseReports from './ExpenseReports';
import DueReports from './DueReports';
import StockReport from './StockReport';
import BusinessReport from './BusinessReport';
import CashBox from './CashBox';
import ExpireItems from './ExpireItems';
import Note from './Note';
import SalesReturn from './SalesReturn';
import PurchaseReturn from './PurchaseReturn';
import BarcodeGen from './BarcodeGen';
import Printer from './Printer';
import GenericPage from './GenericPage';

export default function SubPageRenderer({ view, onBack, shop, setShops, shops, setCurrentShop }: any) {
    switch(view) {
        case 'sale': 
            return <Sale onBack={onBack} shop={shop} />;
        case 'purchase':
            return <Purchase onBack={onBack} shop={shop} />;
        case 'productList': 
        case 'product-list':
            return <ProductList onBack={onBack} shop={shop} />;
        case 'contacts':
            return <Contacts onBack={onBack} shop={shop} />;
        case 'appAccess':
        case 'app-access':
            return <AppAccess onBack={onBack} shop={shop} setShops={setShops} shops={shops} setCurrentShop={setCurrentShop} />;
        case 'community':
            return <Community onBack={onBack} shop={shop} />;
        case 'profile':
            return <Profile onBack={onBack} />;
        case 'salesReports':
        case 'sales-reports':
            return <SalesReports onBack={onBack} shop={shop} />;
        case 'purchaseReports':
        case 'purchase-reports':
            return <PurchaseReports onBack={onBack} shop={shop} />;
        case 'expenseReports':
        case 'expense-reports':
            return <ExpenseReports onBack={onBack} shop={shop} />;
        case 'dueReports':
        case 'due-reports':
            return <DueReports onBack={onBack} shop={shop} />;
        case 'stockReport':
        case 'stock-report':
            return <StockReport onBack={onBack} shop={shop} />;
        case 'businessReport':
        case 'business-report':
            return <BusinessReport onBack={onBack} shop={shop} />;
        case 'cashBox':
        case 'cash-box':
            return <CashBox onBack={onBack} shop={shop} />;
        case 'expireItems':
        case 'expire-items':
            return <ExpireItems onBack={onBack} shop={shop} />;
        case 'note':
            return <Note onBack={onBack} shop={shop} />;
        case 'salesReturn':
        case 'sales-return':
            return <SalesReturn onBack={onBack} shop={shop} />;
        case 'purchaseReturn':
        case 'purchase-return':
            return <PurchaseReturn onBack={onBack} shop={shop} />;
        case 'barcodeGen':
        case 'barcode-gen':
            return <BarcodeGen onBack={onBack} shop={shop} />;
        case 'printer':
            return <Printer onBack={onBack} shop={shop} />;
        default: 
            return <GenericPage view={view} onBack={onBack} />;
    }
}
