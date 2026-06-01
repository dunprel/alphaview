import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { ConfigService }    from '@nestjs/config';
import axios                from 'axios';
import { Producer }         from './entities/producer.entity';
import { NotificationsService } from '../notifications/notifications.service';

const PAYSTACK = 'https://api.paystack.co';

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(Producer) private readonly producerRepo: Repository<Producer>,
    private readonly cfg:    ConfigService,
    private readonly notify: NotificationsService,
  ) {}

  private get headers() {
    return { Authorization: `Bearer ${this.cfg.get('PAYSTACK_SECRET_KEY')}` };
  }

  private async _getProducer(userId: string): Promise<Producer> {
    const p = await this.producerRepo.findOne({ where: { userId } });
    if (!p) throw new NotFoundException('Producer profile not found');
    return p;
  }

  async getBalance(userId: string) {
    const p = await this._getProducer(userId);
    return {
      earningsBalanceNgn: Math.round(p.earningsBalance / 100),
      totalEarnedNgn:     Math.round(p.totalEarned / 100),
    };
  }

  async requestPayout(userId: string, amountNgn: number) {
    const producer   = await this._getProducer(userId);
    const amountKobo = Math.round(amountNgn * 100);

    if (amountKobo < 500_000)              throw new BadRequestException('Minimum payout is ₦5,000');
    if (amountKobo > producer.earningsBalance) throw new BadRequestException('Insufficient balance');
    if (!producer.paystackRecipientCode)   throw new BadRequestException('Please set up your bank account first');

    // Deduct from balance immediately (hold)
    await this.producerRepo.decrement({ id: producer.id }, 'earningsBalance', amountKobo);

    // Create payout record
    const [row] = await this.producerRepo.manager.query(
      `INSERT INTO payout_requests (producer_id, amount_kobo, status)
       VALUES ($1, $2, 'pending') RETURNING *`,
      [producer.id, amountKobo],
    );

    await this.notify.payoutRequested(producer.id, amountNgn);
    return row;
  }

  async getProducerPayouts(userId: string) {
    const producer = await this._getProducer(userId);
    return this.producerRepo.manager.query(
      `SELECT * FROM payout_requests WHERE producer_id = $1 ORDER BY requested_at DESC`,
      [producer.id],
    );
  }

  async saveBankAccount(userId: string, dto: {
    accountNumber: string; bankCode: string; accountName: string;
  }) {
    const producer = await this._getProducer(userId);

    // Create Paystack transfer recipient
    const { data } = await axios.post(`${PAYSTACK}/transferrecipient`, {
      type:           'nuban',
      name:           dto.accountName,
      account_number: dto.accountNumber,
      bank_code:      dto.bankCode,
      currency:       'NGN',
    }, { headers: this.headers });

    // Fetch bank name
    const banks    = await this.getNigerianBanks();
    const bankInfo = banks.find(b => b.code === dto.bankCode);

    await this.producerRepo.update(producer.id, {
      paystackRecipientCode: data.data.recipient_code,
      bankCode:              dto.bankCode,
      bankName:              bankInfo?.name ?? dto.bankCode,
      bankAccountLast4:      dto.accountNumber.slice(-4),
      // Store encrypted account number in real impl — simplified here
    });

    return { message: 'Bank account saved successfully' };
  }

  async getNigerianBanks(): Promise<{ name: string; code: string }[]> {
    try {
      const { data } = await axios.get(`${PAYSTACK}/bank?currency=NGN&perPage=100`, {
        headers: this.headers,
      });
      return (data.data as any[]).map(b => ({ name: b.name, code: b.code }));
    } catch {
      // Fallback list of major Nigerian banks
      return [
        { name: 'Access Bank',          code: '044' },
        { name: 'GTBank',               code: '058' },
        { name: 'First Bank of Nigeria',code: '011' },
        { name: 'Zenith Bank',          code: '057' },
        { name: 'UBA',                  code: '033' },
        { name: 'Fidelity Bank',        code: '070' },
        { name: 'Sterling Bank',        code: '232' },
        { name: 'Union Bank',           code: '032' },
        { name: 'Ecobank',              code: '050' },
        { name: 'Stanbic IBTC',         code: '221' },
        { name: 'FCMB',                 code: '214' },
        { name: 'Wema Bank',            code: '035' },
        { name: 'OPay',                 code: '999992' },
        { name: 'Palmpay',              code: '999991' },
        { name: 'Kuda Bank',            code: '090267' },
      ];
    }
  }
}
