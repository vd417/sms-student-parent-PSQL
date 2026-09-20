import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Fee } from '@/models';
import { colors } from '@/theme';
import { monogramFromName } from '@/components/ui/monogram';

interface InvoiceMeta {
  studentName: string;
  grade?: string;
  school?: string;
  /** School brand mark — falls back to a monogram of `school` when missing/unreachable. */
  schoolLogoUrl?: string;
}

function esc(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Stable, display-only invoice number derived from the invoice id — not a sequence counter. */
function invoiceNumber(feeId: string): string {
  const digits = feeId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  return `INV-${digits || '00000000'}`;
}

function formatGeneratedAt(date: Date): string {
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function brandLogo(schoolName: string, logoUrl: string | undefined): string {
  const url = (logoUrl ?? '').trim();
  const initials = esc(monogramFromName(schoolName || 'School'));
  if (url) {
    return `<img class="logo" src="${esc(url)}" alt="${esc(schoolName)}" onerror="this.outerHTML='<div class=&quot;logo logo-fallback&quot;>${initials}</div>'" />`;
  }
  return `<div class="logo logo-fallback">${initials}</div>`;
}

export function invoiceHtml(fee: Fee, meta: InvoiceMeta, generatedAt: Date = new Date()): string {
  const amountPaid = fee.status === 'paid' ? fee.amount : (fee.paidAmount ?? 0);
  const balance = fee.amount - amountPaid;
  const statusLabel = fee.status === 'paid' ? 'PAID' : fee.status === 'partial' ? 'PARTIALLY PAID' : 'DUE';
  const items = fee.items ?? [];

  // A manually created invoice can have no fee-head lines yet — fall back to a single
  // row for the period so the table is never empty, without inventing a breakdown.
  const rows = items.length > 0 ? items.map((it) => ({ label: it.l, amount: it.amt })) : [{ label: fee.period, amount: fee.amount }];
  const itemRows = rows
    .map((r) => `<tr><td class="cell">${esc(r.label)}</td><td class="cell amt">₹${r.amount.toLocaleString()}</td></tr>`)
    .join('');

  const schoolName = meta.school || 'School';
  const studentLine = [meta.studentName, meta.grade]
    .filter((v): v is string => Boolean(v))
    .map(esc)
    .join(' · ');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${esc(invoiceNumber(fee.id))} · ${esc(schoolName)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, Helvetica, Arial, sans-serif;
        color: ${colors.ink};
        font-size: 13px;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid ${colors.primary};
        padding-bottom: 20px;
      }
      .brand { display: flex; align-items: center; gap: 12px; }
      .logo { width: 48px; height: 48px; border-radius: 10px; object-fit: contain; }
      .logo-fallback {
        display: flex; align-items: center; justify-content: center;
        background: ${colors.primary}; color: #fff; font-weight: 800; font-size: 16px;
      }
      .brand-name { font-size: 16px; font-weight: 700; color: ${colors.primary}; }
      .doc-title { text-align: right; }
      .doc-title h1 { font-size: 22px; margin: 0; letter-spacing: 1px; color: ${colors.primary}; }
      .doc-meta { color: ${colors.inkMuted}; font-size: 11px; margin-top: 6px; line-height: 1.5; }
      .parties { display: flex; justify-content: space-between; margin-top: 28px; gap: 24px; }
      .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: ${colors.inkMuted}; margin-bottom: 4px; }
      .status { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; margin-top: 8px; }
      .status.paid { background: #e3f6e8; color: #1c8a3d; }
      .status.due { background: #fdeaea; color: #c0392b; }
      table { width: 100%; border-collapse: collapse; margin-top: 28px; }
      th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: ${colors.inkMuted}; padding-bottom: 8px; border-bottom: 1px solid ${colors.rule}; }
      th.amt, .amt { text-align: right; }
      .cell { padding: 10px 0; border-bottom: 1px solid ${colors.ruleSoft}; font-size: 13px; }
      .totals { margin-top: 16px; margin-left: auto; width: 260px; }
      .totals-row { display: flex; justify-content: space-between; font-size: 13px; padding: 5px 0; }
      .totals-row.grand { font-size: 16px; font-weight: bold; border-top: 1px solid ${colors.rule}; padding-top: 10px; margin-top: 6px; color: ${colors.primary}; }
      .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid ${colors.ruleSoft}; color: ${colors.inkMuted}; font-size: 11px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="brand">
        ${brandLogo(schoolName, meta.schoolLogoUrl)}
        <div class="brand-name">${esc(schoolName)}</div>
      </div>
      <div class="doc-title">
        <h1>INVOICE</h1>
        <div class="doc-meta">
          ${esc(invoiceNumber(fee.id))}<br/>
          Generated ${esc(formatGeneratedAt(generatedAt))}
        </div>
      </div>
    </div>

    <div class="parties">
      <div>
        <div class="label">Billed to</div>
        <div>${studentLine || 'Student'}</div>
        <span class="status ${fee.status === 'paid' ? 'paid' : 'due'}">${statusLabel}</span>
      </div>
      <div style="text-align:right;">
        <div class="label">Fee period</div>
        <div>${esc(fee.period)}</div>
        <div class="label" style="margin-top:8px;">Due date</div>
        <div>${esc(fee.dueDate || '—')}</div>
      </div>
    </div>

    <table>
      <thead><tr><th>Description</th><th class="amt">Amount</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="totals">
      <div class="totals-row grand"><span>Total</span><span>₹${fee.amount.toLocaleString()}</span></div>
      <div class="totals-row"><span>Amount paid</span><span>₹${amountPaid.toLocaleString()}</span></div>
      ${balance > 0 ? `<div class="totals-row"><span>Balance due</span><span>₹${balance.toLocaleString()}</span></div>` : ''}
    </div>

    <div class="footer">
      ${fee.paidOn ? `Paid on ${esc(fee.paidOn)}${fee.method ? ` via ${esc(fee.method)}` : ''}<br/>` : ''}
      This is a system-generated invoice and does not require a signature.
    </div>
  </body>
</html>`;
}

function getWindow(): Window | null {
  return typeof window === 'undefined' ? null : window;
}

function getDocument(): Document | null {
  return typeof document === 'undefined' ? null : document;
}

/** Prints once every image in `doc` has settled (loaded or errored), instead of racing the layout. */
function printWhenReady(win: Window, doc: Document, onDone?: () => void): void {
  const go = () => {
    try {
      win.focus();
      win.print();
    } finally {
      onDone?.();
    }
  };
  const imgs = Array.from(doc.images || []);
  if (!imgs.length || imgs.every((img) => img.complete)) {
    win.setTimeout(go, 30);
    return;
  }
  let left = imgs.length;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    go();
  };
  imgs.forEach((img) => {
    if (img.complete) {
      if (--left <= 0) finish();
      return;
    }
    img.onload = img.onerror = () => {
      if (--left <= 0) finish();
    };
  });
  win.setTimeout(finish, 150);
}

/**
 * expo-print's web shim ignores the `html` option entirely and just calls the browser's
 * `window.print()` on the current page (see expo-print/src/ExponentPrint.web.ts) — using it
 * here would print whatever screen the parent happens to be on, not the invoice. So on web we
 * render the invoice into its own window/iframe and print that, the same technique already
 * used for report cards (see `printReportCard` in `src/lib/reportCardPrint.ts`).
 */
function printHtmlOnWeb(html: string, title: string): boolean {
  const winGlobal = getWindow();
  const docGlobal = getDocument();
  if (!winGlobal || !docGlobal) return false;

  const popup = winGlobal.open('', '_blank');
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    try {
      popup.document.title = title;
    } catch {
      /* ignore */
    }
    printWhenReady(popup, popup.document, () => {
      winGlobal.setTimeout(() => {
        try {
          popup.close();
        } catch {
          /* ignore */
        }
      }, 1_000);
    });
    return true;
  }

  // Popup blocked — fall back to a hidden iframe printed in place.
  const iframe = docGlobal.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', title);
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
  docGlobal.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();

  printWhenReady(win, doc, () => {
    winGlobal.setTimeout(() => iframe.remove(), 30_000);
  });
  return true;
}

export async function downloadInvoice(fee: Fee, meta: InvoiceMeta): Promise<void> {
  const html = invoiceHtml(fee, meta);

  if (Platform.OS === 'web') {
    const printed = printHtmlOnWeb(html, `${invoiceNumber(fee.id)} · ${meta.school || 'Invoice'}`);
    if (!printed) throw new Error('Printing is not available in this browser');
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}
