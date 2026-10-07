import { describe, expect, it } from 'vitest';
import { BankTransferProvider } from './bank.provider.js';

const BO_INFO = JSON.stringify({
  bank: 'Vietcombank',
  accountName: 'PC Store',
  accountNumber: '0123456789',
  branch: 'Hồ Chí Minh',
});

function configGetter(extra: Record<string, string> = {}) {
  const base: Record<string, string> = { BANK_TRANSFER_INFO: BO_INFO };
  return (key: string) => extra[key] ?? base[key];
}

const order = {
  id: 'order-bank-1',
  userId: 'user-1',
  subtotal: 200000,
  shipping: 0,
  total: 200000,
  currency: 'VND',
  items: [],
};

describe('BankTransferProvider', () => {
  it('creates a pending checkout and exposes bank account details', async () => {
    const provider = new BankTransferProvider(configGetter());
    const result = await provider.create(order as never);

    expect(result.provider).toBe('bank');
    expect(result.status).toBe('pending');
    expect(result.details?.bankAccount).toMatchObject({
      bank: 'Vietcombank',
      accountNumber: '0123456789',
    });
  });

  it('returns bank details through getDetails for the methods endpoint', () => {
    const provider = new BankTransferProvider(configGetter());
    expect(provider.getDetails()).toMatchObject({
      bankAccount: { accountName: 'PC Store' },
    });
  });

  it('tolerates a missing or malformed BANK_TRANSFER_INFO', async () => {
    const provider = new BankTransferProvider(() => undefined);
    const result = await provider.create(order as never);
    expect(result.status).toBe('pending');
  });
});