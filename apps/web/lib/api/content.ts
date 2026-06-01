import api from './client';
import type { Content, ContentDetail, PaginatedResponse } from '@/types';

interface BrowseParams {
  page?:     number;
  limit?:    number;
  genre?:    string;
  sort?:     'trending' | 'newest' | 'rating' | 'price_asc' | 'price_desc';
  search?:   string;
  type?:     string;
}

export const contentApi = {
  /** Server-side: get home page data (featured, trending, etc.) */
  async getHomeData() {
    const { data } = await api.get('/content/home');
    return data as {
      featured:          Content[];
      trending:          Content[];
      newReleases:       Content[];
      topNollywood:      Content[];
      topDocumentaries:  Content[];
      topProducers:      any[];
    };
  },

  async browse(params: BrowseParams = {}): Promise<PaginatedResponse<Content>> {
    const { data } = await api.get('/content', { params });
    return data;
  },

  async getById(id: string): Promise<ContentDetail> {
    const { data } = await api.get(`/content/${id}`);
    return data;
  },

  async search(q: string, filters?: BrowseParams): Promise<Content[]> {
    const { data } = await api.get('/content/search', { params: { q, ...filters } });
    return data;
  },

  async getCategories(): Promise<string[]> {
    const { data } = await api.get('/content/categories');
    return data;
  },

  /** Producer: create content record + get S3 upload URL */
  async create(payload: {
    title: string; description: string; genre: string[];
    type: string; priceNgn: number; ageRating: string;
    castList: string[]; releaseDate: string;
    fileType: string; fileSize: number;
  }): Promise<{ contentId: string; uploadUrl: string }> {
    const { data } = await api.post('/content', payload);
    return data;
  },

  async getThumbUploadUrl(contentId: string, mimeType: string): Promise<string> {
    const { data } = await api.post(`/content/${contentId}/thumbnail-url`, { mimeType });
    return data.uploadUrl;
  },

  async update(id: string, payload: Partial<Content>): Promise<Content> {
    const { data } = await api.put(`/content/${id}`, payload);
    return data;
  },

  async notifyUploadComplete(contentId: string): Promise<void> {
    await api.post(`/content/${contentId}/upload-complete`);
  },

  /** Producer: get own content list */
  async myContent(params?: BrowseParams): Promise<PaginatedResponse<Content>> {
    const { data } = await api.get('/producer/content', { params });
    return data;
  },
};

/** Convenience for server components */
export async function getHomeData() {
  return contentApi.getHomeData();
}
