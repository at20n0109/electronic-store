'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getVnpayReturn } from '@/lib/api';

function VnpayReturnView() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    getVnpayReturn(params)
      .then((result) => {
        if (cancelled) return;
        if (result.responseCode === '00') {
          const target = result.returnUrl ?? `/checkout/success?orderId=${result.orderId}`;
          window.location.href = target;
          return;
        }
        setMessage(
          `Giao dịch không thành công${result.responseCode ? ` (mã ${result.responseCode})` : ''}. Bạn có thể thử thanh toán lại.`,
        );
      })
      .catch(() => {
        if (cancelled) return;
        setMessage(
          'Không thể xác nhận kết quả thanh toán. Vui lòng kiểm tra lại đơn hàng của bạn.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (message) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {message}
        </h1>
        <Link href="/" className="mt-6 inline-block text-red-600 underline">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Đang xác nhận kết quả thanh toán...
      </p>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <VnpayReturnView />
    </Suspense>
  );
}