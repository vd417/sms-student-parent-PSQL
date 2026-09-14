import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Fee } from '@/models';

interface InvoiceMeta {
  studentName: string;
  grade?: string;
  school?: string;
}

function invoiceHtml(fee: Fee, meta: InvoiceMeta): string {
  const amountPaid = fee.status === 'paid' ? fee.amount : (fee.paidAmount ?? 0);
  const balance = fee.amount - amountPaid;
  const statusLabel = fee.status === 'paid' ? 'PAID' : fee.status === 'partial' ? 'PARTIALLY PAID' : 'DUE';
  const items = fee.items ?? [];

  const itemRows = items
    .map(
      (it) => `<tr><td class="cell">${it.l}</td><td class="cell amt">₹${it.amt.toLocaleString()}</td></tr>`
    )
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 32px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .muted { color: #666; font-size: 12px; margin-bottom: 24px; }
          .status { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; }
          .status.paid { background: #e3f6e8; color: #1c8a3d; }
          .status.due { background: #fdeaea; color: #c0392b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .cell { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
          .amt { text-align: right; }
          .totals { margin-top: 16px; }
          .totals-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
          .totals-row.grand { font-size: 16px; font-weight: bold; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 6px; }
        </style>
      </head>
      <body>
        <h1>Fee Invoice</h1>
        <div class="muted">
          ${meta.studentName}${meta.grade ? ` · ${meta.grade}` : ''}${meta.school ? ` · ${meta.school}` : ''}
        </div>
        <div>
          <span class="status ${fee.status === 'paid' ? 'paid' : 'due'}">${statusLabel}</span>
        </div>
        <div class="muted" style="margin-top: 12px;">
          Period: ${fee.period}<br/>
          Due date: ${fee.dueDate}
          ${fee.paidOn ? `<br/>Paid on: ${fee.paidOn}` : ''}
          ${fee.method ? `<br/>Method: ${fee.method}` : ''}
        </div>

        <table>${itemRows}</table>

        <div class="totals">
          <div class="totals-row"><span>Amount paid</span><span>₹${amountPaid.toLocaleString()}</span></div>
          <div class="totals-row grand"><span>Total</span><span>₹${fee.amount.toLocaleString()}</span></div>
          ${balance > 0 ? `<div class="totals-row"><span>Balance due</span><span>₹${balance.toLocaleString()}</span></div>` : ''}
        </div>
      </body>
    </html>
  `;
}

export async function downloadInvoice(fee: Fee, meta: InvoiceMeta): Promise<void> {
  const html = invoiceHtml(fee, meta);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}
