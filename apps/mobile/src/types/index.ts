// ─── User & Auth ──────────────────────────────────────────────────────────────
export type UserRole = 'user' | 'producer' | 'admin';

export interface User {
  id:         string;
  email:      string;
  phone?:     string;
  fullName:   string;
  avatarUrl?: string;
  role:       UserRole;
  isVerified: boolean;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
  user:         User;
}

// ─── Content ──────────────────────────────────────────────────────────────────
export type ContentStatus = 'draft' | 'processing' | 'review' | 'live' | 'rejected';
export type ContentType   = 'movie' | 'series' | 'documentary' | 'short';

export interface Producer {
  id:            string;
  studioName:    string;
  avatarUrl?:    string;
  bannerUrl?:    string;
  isVerified:    boolean;
  followerCount: number;
  contentCount:  number;
  bio?:          string;
}

export interface Content {
  id:            string;
  title:         string;
  description:   string;
  genre:         string[];
  type:          ContentType;
  priceNgn:      number;
  thumbnailUrl:  string;
  trailerUrl?:   string;
  durationMins:  number;
  ageRating:     string;
  castList:      string[];
  releaseDate:   string;
  status:        ContentStatus;
  viewCount:     number;
  purchaseCount: number;
  avgRating:     number;
  producer:      Producer;
  relatedContent?: Content[];
}

// ─── Purchase ─────────────────────────────────────────────────────────────────
export type PurchaseStatus = 'pending' | 'active' | 'expired' | 'refunded';

export interface Purchase {
  id:           string;
  contentId:    string;
  content:      Content;
  amountNgn:    number;
  status:       PurchaseStatus;
  purchasedAt:  string;
  expiresAt:    string;
  daysRemaining: number;
}

// ─── Stream ───────────────────────────────────────────────────────────────────
export interface StreamSession {
  sessionToken:     string;
  manifestUrl:      string;
  drmLicenseUrl:    string;
  accessExpiresAt:  string;
  daysRemaining:    number;
  watermarkPayload: string;
}

// ─── Download ─────────────────────────────────────────────────────────────────
export interface Download {
  id:              string;
  contentId:       string;
  title:           string;
  thumbnailUrl:    string;
  keyId:           string;
  keyFetchUrl:     string;
  expiresAt:       string;
  keyRevoked:      boolean;
  downloadedAt:    string;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Auth:             undefined;
  Main:             undefined;
  Login:            undefined;
  Register:         undefined;
  MovieDetail:      { contentId: string };
  Player:           { contentId: string };
  ProducerProfile:  { producerId: string };
  Search:           undefined;
  PaystackWebView:  { url: string; contentId: string };
};

export type TabParamList = {
  Home:      undefined;
  Browse:    undefined;
  Library:   undefined;
  Downloads: undefined;
  Profile:   undefined;
};
