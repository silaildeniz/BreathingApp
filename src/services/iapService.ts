import { Platform, Linking } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { logError, logInfo } from '../utils/logger';

const IOS_PUBLIC_SDK_KEY = 'rc_ios_public_sdk_key_here'; // TODO: Replace with real key

let initialized = false;

export const initializeIAP = async () => {
  try {
    if (initialized) return;
    if (Platform.OS !== 'ios') return; // This app targets iOS only

    if (!IOS_PUBLIC_SDK_KEY || IOS_PUBLIC_SDK_KEY.includes('here')) {
      logInfo('IAP initialize skipped: missing RevenueCat iOS public SDK key');
      return;
    }

    await Purchases.configure({ apiKey: IOS_PUBLIC_SDK_KEY });
    initialized = true;
    logInfo('IAP initialized');
  } catch (error) {
    logError('IAP initialize failed', error);
  }
};

export const loginIAP = async (appUserId: string) => {
  try {
    if (!initialized) await initializeIAP();
    if (!appUserId) return;
    await Purchases.logIn(appUserId);
    logInfo('IAP logged in', { appUserId });
  } catch (error) {
    logError('IAP login failed', error);
  }
};

export const logoutIAP = async () => {
  try {
    if (!initialized) await initializeIAP();
    await Purchases.logOut();
    logInfo('IAP logged out');
  } catch (error) {
    logError('IAP logout failed', error);
  }
};

export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  try {
    if (!initialized) await initializeIAP();
    return await Purchases.getCustomerInfo();
  } catch (error) {
    logError('IAP getCustomerInfo failed', error);
    return null;
  }
};

export const hasEntitlement = async (entitlementId: string): Promise<boolean> => {
  const info = await getCustomerInfo();
  const active = info?.entitlements?.active || {};
  return !!active[entitlementId];
};

export const restorePurchases = async (): Promise<boolean> => {
  try {
    if (!initialized) await initializeIAP();
    await Purchases.restorePurchases();
    const info = await Purchases.getCustomerInfo();
    return Object.keys(info.entitlements.active).length > 0;
  } catch (error) {
    logError('IAP restore failed', error);
    return false;
  }
};

export const getCurrentOfferingPackages = async (): Promise<PurchasesPackage[]> => {
  try {
    if (!initialized) await initializeIAP();
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    return current?.availablePackages ?? [];
  } catch (error) {
    logError('IAP get offerings failed', error);
    return [];
  }
};

export const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
  try {
    if (!initialized) await initializeIAP();
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return Object.keys(customerInfo.entitlements.active).length > 0;
  } catch (error) {
    logError('IAP purchase failed', error);
    return false;
  }
};

export const openManageSubscriptions = async (): Promise<boolean> => {
  try {
    const url = Platform.OS === 'ios'
      ? 'itms-apps://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
    await Linking.openURL(url);
    logInfo('Opened manage subscriptions page');
    return true;
  } catch (error) {
    logError('IAP open manage subscriptions failed', error);
    return false;
  }
};


