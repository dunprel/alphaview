import api from './client';
import type {
  ProducerDashboard, RevenuePoint, CountryViewStats,
  ContentStats, Payout,
} from '@/types';

export const producerApi = {
  async getDashboard(): Promise<ProducerDashboard> {
    const { data } = await api.get('/producer/dashboard');
    return data;
  },

  async getRevenue(range: string): Promise<RevenuePoint[]> {
    const { data } = await api.get('/producer/analytics/revenue', { params: { range } });
    return data;
  },

  async getCountries(range: string): Promise<CountryViewStats[]> {
    const { data } = await api.get('/producer/analytics/countries', { params: { range } });
    return data;
  },

  async getTopContent(range: string): Promise<ContentStats[]> {
    const { data } = await api.get('/producer/analytics/top-content', { params: { range } });
    return data;
  },

  async requestPayout(amountNgn: number): Promise<Payout> {
    const { data } = await api.post('/producer/payouts/request', { amountNgn });
    return data;
  },

  async getPayouts(): Promise<Payout[]> {
    const { data } = await api.get('/producer/payouts');
    return data;
  },

  async saveBankAccount(payload: {
    accountNumber: string;
    bankCode:      string;
    accountName:   string;
  }): Promise<void> {
    await api.post('/producer/bank-account', payload);
  },

  async getNigerianBanks(): Promise<{ name: string; code: string }[]> {
    const { data } = await api.get('/producer/banks');
    return data;
  },

  async follow(producerId: string): Promise<void> {
    await api.post(`/producers/${producerId}/follow`);
  },

  async unfollow(producerId: string): Promise<void> {
    await api.delete(`/producers/${producerId}/follow`);
  },
};
