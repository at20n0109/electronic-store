'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ApiError, formatVND, getOrder, getInvoice, getInvoicePdf } from '@/lib/api';
import type { Invoice, Order } from '@/lib/types';
import { FileX, Receipt, Spinner, DownloadSimple } from '@phosphor-icons/react';

type PageState = 'loading' | 'ready' | 'notfound' | 'denied' | 'error';

const ORDER_STATUS: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
};

const PAYMENT_STATUS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  SUCCEEDED: 'Thành công',
  FAILED: 'Thất bại',
  CANCELED: 'Đã hủy',
};

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [state, setState] = useState<PageState>('loading');
  const [order, setOrder] = useState<Order | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [o, inv] = await Promise.all([getOrder(orderId), getInvoice(orderId)]);
        if (!active) return;
        setOrder(o);
        setInvoice(inv);
        setState('ready');
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setState('denied');
        } else if (err instanceof ApiError && err.status === 404) {
          setState('notfound');
        } else {
          setState('error');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId]);

  async function openPdf() {
    if (!invoice) return;
    setPdfBusy(true);
    setPdfError('');
    try {
      const blob = await getInvoicePdf(invoice.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setPdfError('Không tải được PDF. Vui lòng thử lại.');
    } finally {
      setPdfBusy(false);
    }
  }

  if (state === 'loading') {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 py-24 text-zinc-500">
        <Spinner size={32} className="animate-spin" />
        <p className="text-sm">Đang tải hoá đơn...</p>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Receipt size={40} className="mx-auto text-zinc-400" />
        <h1 className="font-heading mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Cần đăng nhập
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Bạn cần đăng nhập để xem hoá đơn này.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-red-600 px-6 text-sm font-semibold text-white hover:bg-red-500"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (state !== 'ready' || !order || !invoice) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <FileX size={40} className="mx-auto text-zinc-400" />
        <h1 className="font-heading mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {state === 'notfound' ? 'Không tìm thấy hoá đơn' : 'Có lỗi xảy ra'}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {state === 'notfound'
            ? 'Hoá đơn này không tồn tại hoặc bạn không có quyền xem.'
            : 'Không tải được hoá đơn. Vui lòng thử lại sau.'}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-zinc-300 px-6 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Hoá đơn {invoice.number}
        </h1>
        <button
          type="button"
          onClick={openPdf}
          disabled={pdfBusy}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
        >
          <DownloadSimple size={16} />
          {pdfBusy ? 'Đang tải...' : 'Tải PDF'}
        </button>
      </div>
      {pdfError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{pdfError}</p>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Đơn hàng
            </h2>
            <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between py-2 text-zinc-700 dark:text-zinc-300"
                >
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span>{formatVND(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Tạm tính</span>
                <span>{formatVND(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Phí vận chuyển</span>
                <span>{formatVND(order.shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <span>Tổng cộng</span>
                <span>{formatVND(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Người nhận
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {order.receiverName} - {order.receiverPhone}
            </p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
              {order.receiverAddress}
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Trạng thái: {ORDER_STATUS[order.status] ?? order.status} / Thanh toán:{' '}
              {order.payment
                ? (PAYMENT_STATUS[order.payment.status] ?? order.payment.status)
                : 'n/a'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          {invoice.qrDataUrl && (
            <Image
              src={invoice.qrDataUrl}
              alt="Mã QR xác minh hoá đơn"
              width={180}
              height={180}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800"
            />
          )}
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            Quét mã để xác minh hoá đơn trên thiết bị di động.
          </p>
          <p className="text-center text-xs text-zinc-500">
            Phát hành: {new Date(invoice.issuedAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
      </div>
    </div>
  );
}
