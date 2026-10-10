import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Order, OrderItem, Payment } from '../generated/prisma/client.js';
import type { InvoiceModel as Invoice } from '../generated/prisma/models/Invoice.js';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { PassThrough } from 'node:stream';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { CryptoService } from '../crypto/crypto.service.js';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatVNDate(d: Date): string {
  const local = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return `${pad(local.getDate())}/${pad(local.getMonth() + 1)}/${local.getFullYear()} ${pad(local.getHours())}:${pad(local.getMinutes())}`;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

@Injectable()
export class InvoicesService {
  private readonly appUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly crypto: CryptoService,
  ) {
    this.appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL') ?? '';
  }

  async getOrCreate(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new UnauthorizedException('You do not own this order');
    }

    const existing = await this.prisma.invoice.findUnique({
      where: { orderId: order.id },
    });
    if (existing) {
      return this.withQr(existing.id, existing.number);
    }

    const number = await this.nextNumber(order.id);
    const invoice = await this.generate(order, number);
    return this.withQr(invoice.id, invoice.number);
  }

  private async withQr(
    invoiceId: string,
    _number: string,
  ): Promise<Invoice & { qrDataUrl: string | null }> {
    const base = this.appUrl ? `${this.appUrl}/invoice/${invoiceId}` : '';
    const qrDataUrl = base
      ? await QRCode.toDataURL(base, { width: 200, margin: 1 })
      : null;
    return { ...(await this.prisma.invoice.findUnique({ where: { id: invoiceId } })) as Invoice, qrDataUrl };
  }

  private async nextNumber(orderId: string): Promise<string> {
    const short = orderId.replace(/-/g, '').slice(0, 8);
    // A per-invoice random suffix removes the read-then-write race where two
    // concurrent invoices for the same derived number collide on the unique
    // constraint. A P2002 is still retried once below.
    const suffix = randomBytes(3).toString('hex');
    return `INV-${short}-${suffix}`;
  }

  private   async generate(order: Order & { items: OrderItem[]; payment: Payment | null }, number: string) {
    const qrUrl = `${this.appUrl}/invoice/${order.id}`;
    const qrPng = await QRCode.toBuffer(qrUrl, { width: 220, margin: 1 });

    const pdf = await this.buildPdf(order, number, qrPng);

    const key = `invoices/${order.id}.pdf`;
    await this.uploads.uploadBuffer(pdf, key, 'application/pdf');

    return this.prisma.invoice.create({
      data: {
        orderId: order.id,
        number,
        fileUrl: key,
        issuedAt: new Date(),
        paidAt: order.paidAt ?? undefined,
      },
    });
  }

  async getPdf(
    invoiceId: string,
    userId: string,
  ): Promise<{ content: Buffer; filename: string }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { order: { select: { userId: true } } },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.order.userId !== userId) {
      throw new UnauthorizedException('You do not own this invoice');
    }
    const key = `invoices/${invoice.orderId}.pdf`;
    const content = await this.uploads.download(key);
    return { content, filename: `${invoice.number}.pdf` };
  }

  private safeDecrypt(value: string | null): string | null {
    try {
      return this.crypto.decrypt(value) ?? '';
    } catch {
      // Tampered ciphertext must not produce a PDF containing raw ciphertext.
      return '[dữ liệu đã bị thay đổi]';
    }
  }

  private async buildPdf(
    order: Order & { items: OrderItem[]; payment: Payment | null },
    number: string,
    qrPng: Buffer,
  ): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 40 });
    const stream = new PassThrough();
    doc.pipe(stream);

    const rows: Array<[string, string, number, number, number]> = order.items.map(
      (i, idx) => [
        String(idx + 1),
        i.name,
        i.quantity,
        i.price.toNumber(),
        i.quantity * i.price.toNumber(),
      ],
    );

    // The order row stores the amounts that were actually charged at checkout;
    // the invoice must print those, not a recomputation from the line items.
    const subtotal = order.subtotal.toNumber();
    const shipping = order.shipping.toNumber();
    const total = order.total.toNumber();

    doc.fontSize(22).text('Hóa đơn bán hàng', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Số: ${number}`, { align: 'right' });
    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .text('PC Store', { align: 'left' })
      .text('xx -xxx -- hcm | xxxxxxxxxxx')
      .text(`Phát hành: ${formatVNDate(order.createdAt)}`);

    doc.moveDown(1.5);
    doc.fontSize(11).text('Khách hàng', { align: 'left' });
    doc
      .fontSize(10)
      .text(`${this.safeDecrypt(order.receiverName)}`)
      .text(`SĐT: ${this.safeDecrypt(order.receiverPhone)}`)
      .text(`Địa chỉ: ${this.safeDecrypt(order.receiverAddress)}`);

    doc.moveDown(2);
    const tableTop = doc.y;
    const headers = ['STT', 'Sản phẩm', 'Số lượng', 'Đơn giá', 'Thành tiền'];
    const startX = 40;
    const widths = [30, 220, 70, 70, 70];
    let x = startX;
    doc.font('Helvetica-Bold').fontSize(9);
    for (const [i, h] of headers.entries()) {
      doc.text(h, x, tableTop, { width: widths[i], align: i > 0 ? 'left' : 'center' });
      x += widths[i];
    }

    doc.moveDown(1);
    let y = tableTop + 18;
    doc.font('Helvetica').fontSize(9);
    for (const row of rows) {
      if (y > 720) {
        doc.addPage();
        y = 40;
      }
      let col = startX;
      for (const [i, cell] of row.entries()) {
        const value = typeof cell === 'number' ? (i < 2 ? String(cell) : formatVND(cell)) : cell;
        doc.text(value, col, y, { width: widths[i], align: i > 0 ? 'left' : 'center' });
        col += widths[i];
      }
      y += 16;
    }

    doc.switchToPage(doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1);
    y += 12;
    doc.font('Helvetica').fontSize(9);
    doc.text(`Tạm tính: ${formatVND(subtotal)}`, startX, y, { align: 'right', width: 400 });
    doc.text(`Phí vận chuyển: ${formatVND(shipping)}`, startX, y + 14, { align: 'right', width: 400 });
    doc.font('Helvetica-Bold').text(`Tổng cộng: ${formatVND(total)}`, startX, y + 28, { align: 'right', width: 400 });

    if (order.payment) {
      doc.font('Helvetica').fontSize(8).text(`Phương thức: ${order.payment.provider} (${order.payment.transactionId ?? ''})`, startX, y + 44, { align: 'right', width: 400 });
    }

    doc.image(qrPng, doc.page.width - 160, doc.page.height - 160, { fit: [120, 120] });
    doc.moveDown(6);
    doc.fontSize(8).text('Quét mã QR để xác minh hoá đơn.', { align: 'center' });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.end();
    await new Promise<void>((resolve, reject) => {
      doc.on('end', () => resolve());
      doc.on('error', reject);
    });
    return Buffer.concat(chunks);
  }
}
