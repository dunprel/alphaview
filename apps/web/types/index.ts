// ─── User & Auth ──────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'producer' | 'admin';

export interface User {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── Content ──────────────────────────────────────────────────────────────────

export type ContentStatus = 'draft' | 'processing' | 'review' | 'live' | 'rejected';
export type ContentType   = 'movie' | 'series' | 'documentary' | 'short';

export interface Content {
  id:             string;
  title:          string;
  description:    string;
  genre:          string[];
  type:           ContentType;
  priceNgn:       number;
  thumbnailUrl:   string;
  trailerUrl?:    string;
  durationMins:   number;
  ageRating:      string;
  castList:       string[];
  releaseDate:    string;
  status:         ContentStatus;
  viewCount:      number;
  purchaseCount:  number;
  avgRating:      number;
  producer:       ProducerPublic;
  createdAt:      string;
}

export interface ContentDetail extends Content {
  hlsUrl?:        string;
  relatedContent: Content[];
}

// ─── Producer ─────────────────────────────────────────────────────────────────

export interface ProducerPublic {
  id:             string;
  studioName:     string;
  avatarUrl?:     string;
  bannerUrl?:     string;
  isVerified:     boolean;
  followerCount:  number;
  contentCount:   number;
}

export interface ProducerProfile extends ProducerPublic {
  bio:            string;
  totalEarned:    number;  // in Naira
  avgRating:      number;
  user:           Pick<User, 'id' | 'email' | 'fullName'>;
}

export interface ProducerDashboard {
  earningsBalance:    number;
  totalEarned:        number;
  totalViews:         number;
  totalPurchases:     number;
  contentCount:       number;
  followerCount:      number;
  pendingPayouts:     number;
}

// ─── Purchase & Access ────────────────────────────────────────────────────────

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

export interface StreamSession {
  sessionToken:    string;
  manifestUrl:     string;
  drmLicenseUrl:   string;
  accessExpiresAt: string;
  daysRemaining:   number;
  watermarkPayload: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface CountryViewStats {
  countryCode:  string;
  countryName:  string;
  flag:         string;
  views:        number;
  watchMins:    number;
  completions:  number;
}

export interface RevenuePoint {
  month:         string;
  revenueNgn:    number;
  purchaseCount: number;
}

export interface ContentStats {
  contentId:   string;
  title:       string;
  thumbnail:   string;
  views:       number;
  revenueNgn:  number;
  avgRating:   number;
  purchases:   number;
}

// ─── Payout ───────────────────────────────────────────────────────────────────

export type PayoutStatus = 'pending' | 'approved' | 'processing' | 'paid' | 'failed' | 'rejected';

export interface Payout {
  id:           string;
  producerId:   string;
  amountNgn:    number;
  status:       PayoutStatus;
  requestedAt:  string;
  paidAt?:      string;
  transferRef?:  string;
  producer?:    ProducerPublic;
}

// ─── Download ─────────────────────────────────────────────────────────────────

export interface Download {
  id:          string;
  contentId:   string;
  content:     Content;
  keyId:       string;
  expiresAt:   string;
  downloadedAt: string;
  keyRevoked:  boolean;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface PlatformSummary {
  totalUsers:       number;
  totalProducers:   number;
  totalContent:     number;
  pendingContent:   number;
  revenueNgn:       number;
  revenueMtdNgn:    number;
  pendingPayouts:   number;
  activePurchases:  number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data:     T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data:  T[];
  meta: {
    total:  number;
    page:   number;
    limit:  number;
    pages:  number;
  };
}

export interface ApiError {
  statusCode: number;
  message:    string;
  errors?:    Record<string, string[]>;
}

// ─── Forms ────────────────────────────────────────────────────────────────────

export interface RegisterForm {
  fullName:        string;
  email:           string;
  phone:           string;
  password:        string;
  confirmPassword: string;
}

export interface LoginForm {
  email:    string;
  password: string;
}

export interface UploadContentForm {
  title:        string;
  description:  string;
  genre:        string[];
  type:         ContentType;
  priceNgn:     number;
  ageRating:    string;
  castList:     string;
  releaseDate:  string;
}
