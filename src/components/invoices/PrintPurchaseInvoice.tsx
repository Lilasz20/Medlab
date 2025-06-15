import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface PurchaseInvoiceItem {
  id: string;
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface PurchaseInvoice {
  id: string;
  supplierName: string;
  invoiceNumber?: string;
  totalAmount: number;
  paidAmount: number;
  isPaid: boolean;
  invoiceDate: string;
  dueDate?: string;
  notes?: string;
  items: PurchaseInvoiceItem[];
  createdBy: {
    id: string;
    name: string;
  };
}

interface PrintPurchaseInvoiceProps {
  invoice: PurchaseInvoice;
}

/**
 * مكون طباعة فاتورة الشراء
 * يقوم بأنشاء نافذة جديدة للطباعة
 */
export const PrintPurchaseInvoice = ({
  invoice,
}: PrintPurchaseInvoiceProps) => {
  if (!invoice) return null;

  const handlePrint = () => {
    // إنشاء نافذة جديدة للطباعة
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة");
      return;
    }

    // مكون الطباعة فاتورة الشراء
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>فاتورة شراء رقم ${
            invoice.invoiceNumber || invoice.id.substring(0, 8)
          } - ${invoice.supplierName}</title>
          <meta charset="utf-8">
          <style>
            @media print {
              @page {
                size: A4;
                margin: 1cm;
              }
            }
            
            body {
              font-family: 'Arial', 'Tahoma', sans-serif;
              color: #333;
              line-height: 1.5;
              direction: rtl;
              padding: 0;
              margin: 0;
              background-color: white;
            }
            
            .invoice-container {
              max-width: 210mm;
              margin: 0 auto;
              padding: 20px;
              background-color: white;
            }
            
            .invoice-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              border-bottom: 2px solid #4F46E5;
              padding-bottom: 20px;
            }
            
            .invoice-logo {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            
            .logo-text {
              font-size: 24px;
              font-weight: bold;
              color: #4F46E5;
            }
            
            .logo-circle {
              width: 60px;
              height: 60px;
              border-radius: 50%;
              background-color: #4F46E5;
              display: flex;
              justify-content: center;
              align-items: center;
              margin-bottom: 10px;
            }
            
            .logo-circle span {
              color: white;
              font-weight: bold;
              font-size: 20px;
            }
            
            .invoice-info {
              text-align: left;
            }
            
            .invoice-title {
              font-size: 28px;
              color: #4F46E5;
              margin-bottom: 10px;
            }
            
            .invoice-number {
              font-size: 15px;
              margin-bottom: 5px;
            }
            
            .invoice-date {
              font-size: 14px;
              color: #666;
            }
            
            .invoice-supplier {
              background-color: #f9fafb;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 25px;
            }
            
            .invoice-supplier-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #4F46E5;
            }
            
            .invoice-supplier-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 15px;
            }
            
            .supplier-info-label {
              color: #6b7280;
              font-size: 14px;
            }
            
            .supplier-info-value {
              font-weight: bold;
              font-size: 16px;
            }
            
            .invoice-items {
              margin-bottom: 25px;
            }
            
            .invoice-items-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #4F46E5;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
            }
            
            th {
              background-color: #f3f4f6;
              padding: 12px;
              text-align: right;
              font-size: 14px;
              color: #4b5563;
              font-weight: bold;
            }
            
            td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
            }
            
            .totals {
              margin-top: 20px;
              margin-left: auto;
              width: 350px;
            }
            
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .totals-label {
              font-weight: bold;
            }
            
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
            }
            
            .status-paid {
              background-color: #d1fae5;
              color: #047857;
            }
            
            .status-partial {
              background-color: #fef3c7;
              color: #92400e;
            }
            
            .status-unpaid {
              background-color: #fee2e2;
              color: #b91c1c;
            }
            
            .invoice-footer {
              margin-top: 40px;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 100px;
              color: rgba(79, 70, 229, 0.05);
              pointer-events: none;
              z-index: -1;
            }
            
            .print-buttons {
              text-align: center;
              margin: 20px 0;
              padding: 10px;
            }
            
            .print-buttons button {
              padding: 10px 20px;
              font-size: 16px;
              cursor: pointer;
              margin: 0 5px;
              border-radius: 5px;
            }
            
            .print-button {
              background-color: #4F46E5;
              color: white;
              border: none;
            }
            
            .close-button {
              background-color: #e5e7eb;
              color: #374151;
              border: none;
            }
            
            @media print {
              .print-buttons {
                display: none;
              }
            }

            .notes-section {
              margin-top: 20px;
              margin-bottom: 20px;
              padding: 15px;
              background-color: #f9fafb;
              border-radius: 8px;
            }
            
            .notes-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #4F46E5;
            }
          </style>
        </head>
        <body>
          <div class="watermark">MedLab</div>
          <div class="invoice-container">
            <div class="invoice-header">
              <div class="invoice-logo">
                <div class="logo-circle">
                  <span>ML</span>
                </div>
                <div class="logo-text">مختبر MedLab الطبي</div>
                <div>للتحاليل الطبية والدراسات المخبرية</div>
                <div>هاتف: 093312334543</div>
              </div>
              <div class="invoice-info">
                <div class="invoice-title">فاتورة شراء</div>
                <div class="invoice-number">رقم الفاتورة: ${
                  invoice.invoiceNumber || invoice.id.substring(0, 8)
                }</div>
                <div class="invoice-date">تاريخ الفاتورة: ${format(
                  new Date(invoice.invoiceDate),
                  "dd/MM/yyyy",
                  { locale: ar }
                )}</div>
                ${
                  invoice.dueDate
                    ? `<div class="invoice-date">تاريخ الاستحقاق: ${format(
                        new Date(invoice.dueDate),
                        "dd/MM/yyyy",
                        { locale: ar }
                      )}</div>`
                    : ""
                }
              </div>
            </div>
            
            <div class="invoice-supplier">
              <div class="invoice-supplier-title">معلومات المورد</div>
              <div class="invoice-supplier-grid">
                <div>
                  <div class="supplier-info-label">اسم المورد:</div>
                  <div class="supplier-info-value">${invoice.supplierName}</div>
                </div>
              </div>
            </div>
            
            ${
              invoice.notes
                ? `<div class="notes-section">
                    <div class="notes-title">ملاحظات</div>
                    <div>${invoice.notes}</div>
                  </div>`
                : ""
            }
            
            <div class="invoice-items">
              <div class="invoice-items-title">تفاصيل الفاتورة</div>
              <table>
                <thead>
                  <tr>
                    <th>الصنف</th>
                    <th>الوصف</th>
                    <th>الكمية</th>
                    <th>سعر الوحدة</th>
                    <th>المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.items
                    .map(
                      (item) => `
                    <tr>
                      <td>${item.itemName}</td>
                      <td>${item.description || "-"}</td>
                      <td>${item.quantity}</td>
                      <td>${item.unitPrice.toLocaleString()} ل.س</td>
                      <td>${item.subtotal.toLocaleString()} ل.س</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
              
              <div class="totals">
                <div class="totals-row">
                  <div class="totals-label">المجموع:</div>
                  <div>${invoice.totalAmount.toLocaleString()} ل.س</div>
                </div>
                <div class="totals-row">
                  <div class="totals-label">المبلغ المدفوع:</div>
                  <div>${invoice.paidAmount.toLocaleString()} ل.س</div>
                </div>
                ${
                  !invoice.isPaid
                    ? `
                <div class="totals-row">
                  <div class="totals-label">المبلغ المتبقي:</div>
                  <div>${(
                    invoice.totalAmount - invoice.paidAmount
                  ).toLocaleString()} ل.س</div>
                </div>
                `
                    : ""
                }
                <div class="totals-row">
                  <div class="totals-label">حالة الدفع:</div>
                  <div>
                    <span class="status-badge ${
                      invoice.isPaid
                        ? "status-paid"
                        : invoice.paidAmount > 0
                        ? "status-partial"
                        : "status-unpaid"
                    }">
                      ${
                        invoice.isPaid
                          ? "مدفوعة بالكامل"
                          : invoice.paidAmount > 0
                          ? "مدفوعة جزئياً"
                          : "غير مدفوعة"
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="invoice-footer">
              <div>تم إصدار هذه الفاتورة بواسطة: ${invoice.createdBy.name}</div>
              <div>تاريخ الإصدار: ${format(
                new Date(invoice.invoiceDate),
                "dd/MM/yyyy",
                { locale: ar }
              )}</div>
              <div style="margin-top: 10px;">شكراً للتعامل مع مختبر MedLab الطبي</div>
            </div>
            
            <div class="print-buttons">
              <button class="print-button" onclick="window.print();">طباعة الفاتورة</button>
              <button class="close-button" onclick="window.close();">إغلاق</button>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return handlePrint();
};

export default PrintPurchaseInvoice;
