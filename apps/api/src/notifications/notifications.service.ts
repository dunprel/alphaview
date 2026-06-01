import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import * as sgMail            from '@sendgrid/mail';
import axios                  from 'axios';
import * as admin             from 'firebase-admin';

@Injectable()
export class NotificationsService {
  private readonly log    = new Logger(NotificationsService.name);
  private readonly termii = 'https://api.ng.termii.com/api';

  constructor(private readonly cfg: ConfigService) {
    sgMail.setApiKey(cfg.get('SENDGRID_API_KEY', ''));

    // Init Firebase Admin once
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:   cfg.get('FIREBASE_PROJECT_ID'),
          privateKey:  cfg.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
          clientEmail: cfg.get('FIREBASE_CLIENT_EMAIL'),
        }),
      });
    }
  }

  // ── OTP via Termii ────────────────────────────────────────────────────────
  async sendOtp(phone: string): Promise<string> {
    const { data } = await axios.post(`${this.termii}/sms/otp/send`, {
      api_key:          this.cfg.get('TERMII_API_KEY'),
      message_type:     'NUMERIC',
      to:               phone,
      from:             this.cfg.get('TERMII_SENDER_ID', 'AlphaView'),
      channel:          'generic',
      pin_attempts:     3,
      pin_time_to_live: 5,
      pin_length:       6,
      pin_placeholder:  '< 1234 >',
      message_text:     'Your AlphaView TV verification code is < 1234 >. Valid for 5 minutes. Do not share.',
    });
    return data.pinId;
  }

  async verifyOtp(pinId: string, pin: string): Promise<boolean> {
    try {
      const { data } = await axios.post(`${this.termii}/sms/otp/verify`, {
        api_key: this.cfg.get('TERMII_API_KEY'),
        pin_id:  pinId,
        pin,
      });
      return data.verified === 'True';
    } catch {
      return false;
    }
  }

  // ── SMS via Termii ─────────────────────────────────────────────────────────
  async sendSms(to: string, text: string): Promise<void> {
    try {
      await axios.post(`${this.termii}/sms/send`, {
        api_key: this.cfg.get('TERMII_API_KEY'),
        to,
        from:    this.cfg.get('TERMII_SENDER_ID', 'AlphaView'),
        sms:     text,
        type:    'plain',
        channel: 'generic',
      });
    } catch (err) {
      this.log.error('SMS send failed', err);
    }
  }

  // ── Email via SendGrid ─────────────────────────────────────────────────────
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await sgMail.send({
        to,
        from: { email: this.cfg.get('EMAIL_FROM', 'hello@alphaview.tv'), name: 'AlphaView TV' },
        subject,
        html,
      });
    } catch (err) {
      this.log.error('Email send failed', err);
    }
  }

  // ── Push via FCM ──────────────────────────────────────────────────────────
  async sendPush(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<void> {
    if (!tokens.length) return;
    try {
      const chunks = this._chunk(tokens, 500);
      for (const batch of chunks) {
        await admin.messaging().sendEachForMulticast({
          tokens:       batch,
          notification: { title, body },
          data:         data ?? {},
          android:      { priority: 'high' },
          apns: {
            payload: { aps: { sound: 'default', badge: 1 } },
          },
        });
      }
    } catch (err) {
      this.log.error('Push send failed', err);
    }
  }

  // ── Domain events ─────────────────────────────────────────────────────────
  async purchaseConfirmed(userId: string, contentId: string, expiresAt: Date): Promise<void> {
    // These would normally look up user/content data from the DB
    // Simplified here — in production inject User and Content repos
    this.log.log(`Purchase confirmed: user=${userId} content=${contentId} expires=${expiresAt.toISOString()}`);
  }

  async contentApproved(producerId: string, contentId: string): Promise<void> {
    this.log.log(`Content approved: producer=${producerId} content=${contentId}`);
  }

  async contentRejected(contentId: string, reason: string): Promise<void> {
    this.log.log(`Content rejected: content=${contentId} reason="${reason}"`);
  }

  async payoutRequested(producerId: string, amountNgn: number): Promise<void> {
    this.log.log(`Payout requested: producer=${producerId} amount=₦${amountNgn}`);
  }

  async accessExpired(userId: string, contentId: string): Promise<void> {
    this.log.log(`Access expired: user=${userId} content=${contentId}`);
  }

  async expiringSoon(userId: string, contentId: string, expiresAt: Date): Promise<void> {
    this.log.log(`Access expiring soon: user=${userId} content=${contentId}`);
  }

  private _chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  }
}
