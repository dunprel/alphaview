'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { purchasesApi } from '@/lib/api/purchases';
import { useAuthStore } from '@/store/auth.store';
import type { Purchase } from '@/types';

declare global {
  interface Window {
    PaystackPop: {
      setup: (opts: Record<string, any>) => { openIframe: () => void };
    };
  }
}

interface UsePurchaseReturn {
  purchase:  Purchase | null;
  loading:   boolean;
  buying:    boolean;
  hasAccess: boolean;
  buy:       () => Promise<void>;
}

export function usePurchase(contentId: string): UsePurchaseReturn {
  const [purchase,  setPurchase]  = useState<Purchase | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [buying,    setBuying]    = useState(false);
  const { user }                  = useAuthStore();
  const router                    = useRouter();

  // Load access status on mount
  useEffect(() => {
    if (!contentId || !user) { setLoading(false); return; }
    purchasesApi.getAccessStatus(contentId)
      .then(({ purchase: p }) => setPurchase(p ?? null))
      .catch(() => setPurchase(null))
      .finally(() => setLoading(false));
  }, [contentId, user]);

  const hasAccess =
    !!purchase &&
    purchase.status === 'active' &&
    new Date(purchase.expiresAt) > new Date();

  const buy = async () => {
    if (!user) {
      toast.error('Please sign in to purchase');
      router.push(`/login?next=/movies/${contentId}`);
      return;
    }
    if (hasAccess) {
      router.push(`/player/${contentId}`);
      return;
    }

    setBuying(true);
    try {
      const { checkoutUrl, reference, amountKobo } = await purchasesApi.initiate(contentId);

      // Load Paystack inline script if not loaded
      if (!window.PaystackPop) {
        await loadPaystackScript();
      }

      const handler = window.PaystackPop.setup({
        key:      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email:    user.email,
        amount:   amountKobo,
        ref:      reference,
        currency: 'NGN',
        metadata: { contentId },
        onSuccess: async (transaction: { reference: string }) => {
          const updatedPurchase = await purchasesApi.verify(transaction.reference);
          setPurchase(updatedPurchase);
          toast.success('Purchase successful! Enjoy your 30-day access.');
          router.push(`/player/${contentId}`);
        },
        onClose: () => {
          toast('Payment cancelled', { icon: 'ℹ️' });
        },
      });
      handler.openIframe();
    } catch (err: any) {
      toast.error(err.message || 'Purchase failed. Try again.');
    } finally {
      setBuying(false);
    }
  };

  return { purchase, loading, buying, hasAccess, buy };
}

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('paystack-js')) { resolve(); return; }
    const script    = document.createElement('script');
    script.id       = 'paystack-js';
    script.src      = 'https://js.paystack.co/v1/inline.js';
    script.onload   = () => resolve();
    script.onerror  = () => reject(new Error('Failed to load Paystack'));
    document.head.appendChild(script);
  });
}
