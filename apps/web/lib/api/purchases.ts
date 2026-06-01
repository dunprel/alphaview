import api from './client';
import type { Purchase } from '@/types';

export const purchasesApi = {
  /** Initiate a Paystack purchase — returns checkout URL */
  async initiate(contentId: string): Promise<{
    checkoutUrl: string;
    reference:   string;
    amountKobo:  number;
  }> {
    const { data } = await api.post('/purchases/initiate', { contentId });
    return data;
  },

  /** Manually verify after Paystack redirect */
  async verify(reference: string): Promise<Purchase> {
    const { data } = await api.post(`/purchases/verify/${reference}`);
    return data;
  },

  /** All purchases for the current user */
  async getLibrary(): Promise<Purchase[]> {
    const { data } = await api.get('/purchases/library');
    return data;
  },

  /** Check if user has active access to a specific title */
  async getAccessStatus(contentId: string): Promise<{
    hasAccess:     boolean;
    purchase?:     Purchase;
    daysRemaining: number;
  }> {
    const { data } = await api.get(`/purchases/access/${contentId}`);
    return data;
  },
};
