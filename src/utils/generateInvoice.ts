import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generateInvoice(order: any) {
  const doc = new jsPDF();
  const generatedAt = new Date();

  // ===== Title =====
  doc.setFontSize(18);
  doc.text("Ballerz Invoice", 14, 20);

  // ===== Order Meta =====
  doc.setFontSize(11);
  doc.text(`Order ID: ${order.id}`, 14, 30);
  doc.text(
    `Order Date: ${order.createdAt?.toDate?.().toLocaleString()}`,
    14,
    36
  );
  doc.text(`Order Status: ${order.status}`, 14, 42);
  doc.text(
    `Invoice Generated: ${generatedAt.toLocaleString()}`,
    14,
    48
  );

  // ===== Customer Details =====
  doc.setFontSize(12);
  doc.text("Customer Details", 14, 60);

  doc.setFontSize(11);
  doc.text(`Name: ${order.customer?.name}`, 14, 66);
  doc.text(`Email: ${order.customer?.email}`, 14, 72);
  doc.text(`Phone: ${order.customer?.phone}`, 14, 78);
  doc.text(`Address: ${order.customer?.address}`, 14, 84);

  // ===== Calculate Normal Total =====
  const normalTotal = order.items.reduce((sum: number, item: any) => {
    const basePrice = item.product?.Price || 0;
    const customPrice =
      item.isCustomized && item.customPrice ? item.customPrice : 0;
    const totalPrice = basePrice + customPrice;
    return sum + totalPrice * item.Quantity;
  }, 0);

  const grandTotal = order.total;
  const discountAmount = normalTotal - grandTotal;
  const discountPercent =
    discountAmount > 0
      ? Math.round((discountAmount / normalTotal) * 100)
      : 0;

  // ===== Order Table =====
  autoTable(doc, {
    startY: 94,
    head: [["Product", "Qty", "Price", "Total"]],
    body: order.items.map((item: any) => {
      const basePrice = item.product?.Price || 0;
      const customPrice =
        item.isCustomized && item.customPrice ? item.customPrice : 0;
      const totalPrice = basePrice + customPrice;
      const itemTotal = totalPrice * item.Quantity;

      let productName = item.product?.Description ?? "Product";
      if (item.isCustomized && item.customizationText) {
        productName += ` (Custom: "${item.customizationText}")`;
      }

      return [
        productName,
        item.Quantity,
        customPrice > 0
          ? `Rs. ${basePrice} + Rs. ${customPrice}`
          : `Rs. ${basePrice}`,
        `Rs. ${itemTotal}`,
      ];
    }),
    styles: {
      fontSize: 10,
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: 255,
    },
  });

  // ===== Totals Section =====
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  doc.setFontSize(12);

  // Discount line (only if applicable)
  if (discountAmount > 0) {
    doc.text(
      `Discount (${discountPercent}%): -Rs. ${discountAmount}`,
      14,
      finalY + 10
    );
    doc.text(
      `Grand Total: Rs. ${grandTotal}`,
      14,
      finalY + 18
    );
  } else {
    doc.text(
      `Grand Total: Rs. ${grandTotal}`,
      14,
      finalY + 10
    );
  }

  // ===== Footer =====
  doc.setFontSize(10);
  doc.text(
    "Thank you for shopping with Ballerz.",
    14,
    discountAmount > 0 ? finalY + 30 : finalY + 20
  );

  // ===== Save =====
  doc.save(`Ballerz_Order_${order.id}.pdf`);
}
