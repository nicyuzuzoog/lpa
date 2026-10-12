import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { get } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { money, formatDate, paymentMethodLabel, feeTypeLabel } from '../utils/format.js';
import { logoToDataUrl } from '../utils/export.js';
import { PageHeader, Spinner, EmptyState } from '../components/ui.jsx';
import { Button } from '../components/Fields.jsx';

function PdfText(doc, rows, startX, startY, opts = {}) {
  let y = startY;
  const line = opts.lineHeight || 14;
  const size = opts.size || 10;
  for (const [left, right] of rows) {
    doc.setFontSize(size);
    doc.setFont('helvetica', opts.bold || 'normal');
    if (right !== undefined) {
      doc.text(String(left), startX, y);
      doc.text(String(right), 540, y, { align: 'right' });
    } else {
      doc.text(String(left), startX, y);
    }
    y += line;
  }
  return y;
}

export default function Receipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    get(`/payments/${id}/receipt`)
      .then(setData)
      .catch((e) => {
        toast.error(e.message);
        navigate('/app/payments');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, toast]);

  if (loading) return <Spinner />;
  if (!data) return <EmptyState title="Receipt not found" />;

  const { receipt, settings, feeRow } = data;
  const student = receipt.student;

  const downloadPdf = async () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.rect(30, 30, 555, 780, 'S');
    doc.setDrawColor(22, 101, 52);
    doc.setLineWidth(2);
    doc.rect(30, 30, 555, 780);

    const logoData = await logoToDataUrl(settings.schoolLogo);
    let textX = 60;
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', 60, 48, 44, 44);
        textX = 116;
      } catch {
        /* ignore broken logo */
      }
    }

    doc.setTextColor(22, 101, 52);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.schoolName || 'School', textX, 70);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    if (settings.schoolAddress) doc.text(settings.schoolAddress, textX, 84);
    if (settings.schoolPhone) doc.text(settings.schoolPhone, textX, 96);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('OFFICIAL RECEIPT', 60, 130);

    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text(receipt.receiptNumber, 555, 130, { align: 'right' });

    let y = PdfText(doc, [
      ['Student', `${student?.firstName} ${student?.lastName}`],
      ['Student ID', student?.studentId],
      ['Class', student?.class?.name],
      ['Academic Year / Term', `${receipt.academicYear?.name} / ${receipt.term}`],
    ], 60, 160, { lineHeight: 16 });

    y += 12;
    doc.setDrawColor(220, 220, 220);
    doc.line(60, y - 8, 555, y - 8);

    y = PdfText(doc, [
      ['Fee Type', feeTypeLabel(receipt.feeType)],
      ['Amount Paid', money(receipt.amount)],
      ['Payment Method', paymentMethodLabel(receipt.paymentMethod)],
      ...(receipt.payerName ? [['Paid By', receipt.payerName]] : []),
      ['Previous Balance', money(receipt.balanceBefore)],
      ['Remaining Balance', money(receipt.balanceAfter)],
      ...(receipt.dueDate ? [['Come Back To Pay By', formatDate(receipt.dueDate)]] : []),
      ['Date', formatDate(receipt.paymentDate, true)],
      ['Recorded By', `${receipt.recordedBy?.fullName || ''} ${receipt.recordedBy?.role ? `(${receipt.recordedBy.role})` : ''}`],
    ], 60, y, { lineHeight: 18, bold: 'bold' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Thank you for your payment.', 60, 740);
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 555, 740, { align: 'right' });

    doc.save(`${receipt.receiptNumber}.pdf`);
  };

  return (
    <div>
      <PageHeader
        title="Payment Receipt"
        subtitle={`${receipt.receiptNumber} · ${student?.studentId}`}
        actions={
          <>
            <Link to="/app/payments" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              ← Back to Payments
            </Link>
            <Button onClick={downloadPdf} variant="secondary">Download PDF</Button>
            <Button onClick={() => window.print()}>Print</Button>
          </>
        }
      />

      <div className="mx-auto max-w-[720px] bg-white p-6 sm:p-10 print:shadow-none print:border-0" style={{ boxShadow: '0 10px 40px -20px rgba(22,101,52,.35)' }}>
        <div className="relative rounded-xl border-2 border-green-700 p-5 sm:p-8">
          {/* perforation marks */}
          <div className="absolute -left-2 top-8 h-4 w-4 rounded-full bg-gray-50" />
          <div className="absolute -right-2 top-8 h-4 w-4 rounded-full bg-gray-50" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {settings.schoolLogo ? (
                <img
                  src={settings.schoolLogo}
                  alt={settings.schoolName || 'School logo'}
                  className="h-14 w-14 shrink-0 rounded-lg border border-green-100 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <i className="bi bi-mortarboard-fill text-2xl" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-green-700 sm:text-2xl">{settings.schoolName || 'School'}</h1>
                {settings.schoolAddress && <p className="mt-0.5 text-xs text-gray-500">{settings.schoolAddress}</p>}
                {settings.schoolPhone && <p className="text-xs text-gray-500">{settings.schoolPhone} {settings.schoolEmail && `· ${settings.schoolEmail}`}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-green-700 border-b-2 border-green-700 pb-1">Official Receipt</p>
              <p className="mt-1 text-sm font-bold text-gray-900">{receipt.receiptNumber}</p>
            </div>
          </div>

          <div className="my-6 border-t-2 border-dashed border-green-200" />

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1.5 text-sm">
              <p><span className="text-gray-500">Student:</span> <span className="font-semibold text-gray-900">{student?.firstName} {student?.lastName}</span></p>
              <p><span className="text-gray-500">Student ID:</span> <span className="font-medium">{student?.studentId}</span></p>
              <p><span className="text-gray-500">Class:</span> <span className="font-medium">{student?.class?.name}</span></p>
              <p><span className="text-gray-500">Academic Year:</span> <span className="font-medium">{receipt.academicYear?.name}</span></p>
              <p><span className="text-gray-500">Term:</span> <span className="font-medium">{receipt.term}</span></p>
            </div>
            <div className="space-y-1.5 text-sm sm:text-right">
              <p><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDate(receipt.paymentDate, true)}</span></p>
              <p><span className="text-gray-500">Method:</span> <span className="font-medium">{paymentMethodLabel(receipt.paymentMethod)}</span></p>
              {receipt.payerName && <p><span className="text-gray-500">Paid By:</span> <span className="font-medium">{receipt.payerName}</span></p>}
              <p><span className="text-gray-500">Recorded By:</span> <span className="font-medium">{receipt.recordedBy?.fullName}</span></p>
            </div>
          </div>

          <table className="mt-6 w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Fee Type</td>
                <td className="py-2 text-right font-semibold text-gray-900">{feeTypeLabel(receipt.feeType)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Amount Paid</td>
                <td className="py-2 text-right font-semibold text-green-700">{money(receipt.amount)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Previous Balance</td>
                <td className="py-2 text-right text-gray-700">{money(receipt.balanceBefore)}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Remaining Balance</td>
                <td className="py-2 text-right font-bold text-gray-900">{money(receipt.balanceAfter)}</td>
              </tr>
              {receipt.dueDate && (
                <tr className="border-t border-gray-100">
                  <td className="py-2 text-gray-500">Come Back To Pay By</td>
                  <td className="py-2 text-right font-semibold text-amber-700">{formatDate(receipt.dueDate)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {feeRow && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">Required: {money(feeRow.required)}</span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">Paid: {money(feeRow.paid)}</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Balance: {money(feeRow.balance)}</span>
            </div>
          )}

          {receipt.note && <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">Note: {receipt.note}</p>}

          <div className="mt-8 flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-500">Received by</p>
              <div className="mt-6 w-40 border-t border-gray-300" />
              <p className="mt-1 text-xs font-medium text-gray-700">{receipt.recordedBy?.fullName}</p>
            </div>
            <p className="text-xs text-gray-400 italic">Thank you • <i className="bi bi-mortarboard-fill" /></p>
          </div>
        </div>
      </div>
    </div>
  );
}