export type AddressType = 'upi' | 'phone' | 'crypto';
export type CryptoNetwork = 'ltc' | 'usdt-trc20' | 'usdt-erc20';

export interface RecentEntry {
  id: string;
  merchantName: string;
  address: string;
  addressType: AddressType;
  amount: string;
  note: string;
  payload: string;
  timestamp: number;
}
