import api from './client';
import type { StreamSession, Content } from '@/types';

export const streamingApi = {
  /** Create a playback session — verifies purchase & 30-day window */
  async createSession(contentId: string): Promise<StreamSession> {
    const { data } = await api.post(`/stream/${contentId}/session`);
    return data;
  },

  /** Get lightweight content metadata for the player UI */
  async getContentMeta(contentId: string): Promise<Pick<Content, 'id' | 'title' | 'durationMins' | 'thumbnailUrl'>> {
    const { data } = await api.get(`/content/${contentId}?fields=id,title,durationMins,thumbnailUrl`);
    return data;
  },

  /** 30-second heartbeat — records analytics and confirms active session */
  async heartbeat(contentId: string, payload: {
    playheadSecs:   number;
    percentWatched: number;
    quality:        string;
    deviceType:     'web' | 'mobile' | 'tablet';
  }): Promise<void> {
    await api.post(`/stream/${contentId}/heartbeat`, payload);
  },

  /** Request DRM license — proxied through backend for auth verification */
  async getLicense(contentId: string, drmType: 'widevine' | 'fairplay' | 'playready', licenseRequest: ArrayBuffer): Promise<ArrayBuffer> {
    const { data } = await api.post(
      `/stream/${contentId}/drm-license`,
      licenseRequest,
      {
        headers:      { 'Content-Type': 'application/octet-stream', 'X-DRM-Type': drmType },
        responseType: 'arraybuffer',
      },
    );
    return data;
  },
};
