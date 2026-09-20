import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { downloadInvoice, invoiceHtml } from './invoicePdf';
import type { Fee } from '@/models';

const baseFee: Fee = {
  id: 'f-abc12345',
  period: '2026-27 Term 2',
  dueDate: '23 Sep 2026',
  amount: 23800,
  status: 'due',
  items: [
    { l: 'Exam Fee', amt: 500 },
    { l: 'Tuition Fee', amt: 6300 },
    { l: 'Transport Fee', amt: 17000 },
  ],
};

const generatedAt = new Date(2026, 8, 14, 10, 30);

describe('invoiceHtml', () => {
  it('shows the school name, a generated timestamp, and a stable invoice number', () => {
    const html = invoiceHtml(baseFee, { studentName: 'Maya Patel', school: 'Green Valley School' }, generatedAt);

    expect(html).toContain('Green Valley School');
    expect(html).toContain('INV-ABC12345');
    expect(html).toMatch(/Generated.*2026/);
  });

  it('renders the school logo image when a logo URL is provided', () => {
    const html = invoiceHtml(
      baseFee,
      { studentName: 'Maya Patel', school: 'Green Valley School', schoolLogoUrl: 'https://cdn.example.com/logo.png' },
      generatedAt,
    );

    expect(html).toContain('<img class="logo" src="https://cdn.example.com/logo.png"');
  });

  it('falls back to a monogram when no logo URL is available', () => {
    const html = invoiceHtml(baseFee, { studentName: 'Maya Patel', school: 'Green Valley School' }, generatedAt);

    expect(html).not.toContain('<img class="logo"');
    expect(html).toContain('logo-fallback');
    expect(html).toContain('GV');
  });

  it('escapes HTML in student and school names', () => {
    const html = invoiceHtml(
      baseFee,
      { studentName: '<script>alert(1)</script>', school: 'A & B School' },
      generatedAt,
    );

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B School');
  });

  it('shows every actual invoice line — Exam, Tuition, and Transport — with no invented amounts', () => {
    const html = invoiceHtml(baseFee, { studentName: 'Maya Patel', school: 'Green Valley School' }, generatedAt);

    expect(html).toContain('Exam Fee');
    expect(html).toContain('₹500');
    expect(html).toContain('Tuition Fee');
    expect(html).toContain('₹6,300');
    expect(html).toContain('Transport Fee');
    expect(html).toContain('₹17,000');
  });

  it('does not show a Transport line for an invoice that has none', () => {
    const noTransport: Fee = { ...baseFee, items: [{ l: 'Tuition Fee', amt: 6300 }] };
    const html = invoiceHtml(noTransport, { studentName: 'Maya Patel', school: 'Green Valley School' }, generatedAt);

    expect(html).not.toContain('Transport');
  });

  it('falls back to a single period row when the invoice has no line items, instead of inventing one', () => {
    const noLines: Fee = { id: 'f-2', period: 'Manual adjustment', dueDate: '1 Oct 2026', amount: 1000, status: 'due' };
    const html = invoiceHtml(noLines, { studentName: 'Maya Patel', school: 'Green Valley School' }, generatedAt);

    expect(html).toContain('Manual adjustment');
    expect(html).toContain('₹1,000');
  });

  it('shows total, amount paid, and balance due for a partially paid invoice', () => {
    const partial: Fee = { ...baseFee, status: 'partial', paidAmount: 10000 };
    const html = invoiceHtml(partial, { studentName: 'Maya Patel', school: 'Green Valley School' }, generatedAt);

    expect(html).toContain('₹23,800');
    expect(html).toContain('₹10,000');
    expect(html).toContain('₹13,800');
  });

  it('shows the paid-on date and method for a fully paid invoice', () => {
    const paid: Fee = { ...baseFee, status: 'paid', paidOn: '15 Aug 2026', method: 'upi_autopay' };
    const html = invoiceHtml(paid, { studentName: 'Maya Patel', school: 'Green Valley School' }, generatedAt);

    expect(html).toContain('Paid on 15 Aug 2026');
    expect(html).toContain('upi_autopay');
  });
});

describe('downloadInvoice', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  it('never calls expo-print on web — its web shim ignores `html` and prints whatever screen is currently open', async () => {
    // expo-print's own web implementation is `async print() { window.print(); }` — it discards
    // the html entirely, so calling it here would print the parent's current screen instead of
    // the invoice. Guard against ever wiring that path back in.
    Platform.OS = 'web';
    const printAsyncSpy = jest.spyOn(Print, 'printAsync');

    // No `document` in this test environment, so the web print path can't actually open a
    // window — it should fail loudly rather than silently doing nothing or falling back to
    // expo-print.
    await expect(downloadInvoice(baseFee, { studentName: 'Maya Patel', school: 'Green Valley School' })).rejects.toThrow();
    expect(printAsyncSpy).not.toHaveBeenCalled();
  });

  it('generates a PDF file and shares it on native platforms', async () => {
    Platform.OS = 'ios';
    jest.spyOn(Print, 'printToFileAsync').mockResolvedValue({ uri: 'file:///invoice.pdf' } as any);
    jest.spyOn(Sharing, 'isAvailableAsync').mockResolvedValue(true);
    const shareSpy = jest.spyOn(Sharing, 'shareAsync').mockResolvedValue(undefined as any);

    await downloadInvoice(baseFee, { studentName: 'Maya Patel', school: 'Green Valley School' });

    expect(shareSpy).toHaveBeenCalledWith('file:///invoice.pdf', { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  });
});
