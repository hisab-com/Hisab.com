import React from 'react';
import Sale from './Sale';
import ProductList from './ProductList';
import Contacts from './Contacts';
import AppAccess from './AppAccess';
import GenericPage from './GenericPage';

export default function SubPageRenderer({ view, onBack, shop, setShops, shops, setCurrentShop }: any) {
    switch(view) {
        case 'sale': 
        case 'purchase': // Reusing sale UI for purchase for now
            return <Sale onBack={onBack} shop={shop} />;
        case 'productList': 
            return <ProductList onBack={onBack} shop={shop} />;
        case 'contacts':
            return <Contacts onBack={onBack} shop={shop} />;
        case 'appAccess':
            return <AppAccess onBack={onBack} shop={shop} setShops={setShops} shops={shops} setCurrentShop={setCurrentShop} />;
        default: 
            return <GenericPage view={view} onBack={onBack} />;
    }
}
