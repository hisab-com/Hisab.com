import { Client, Account, ID, Databases, Query } from 'appwrite';

const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('69c014a80017f2d23a1a');

export const account = new Account(client);
export const databases = new Databases(client);
export { ID, Query };

export const DB_ID = 'shop_db';
export const SHOPS_COLLECTION = 'shops';
export const PRODUCTS_COLLECTION = 'products';
export const STOCK_HISTORY_COLLECTION = 'stock_history';
export const CONTACTS_COLLECTION = 'contacts';
