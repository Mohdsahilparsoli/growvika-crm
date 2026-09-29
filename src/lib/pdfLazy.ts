// The PDF library is large, so it is only downloaded the first time a PDF is made.
import type * as Pdf from "./pdf";

type Fn<K extends keyof typeof Pdf> = (typeof Pdf)[K] extends (...a: infer A) => infer R ? (...a: A) => R : never;

const load = () => import("./pdf");

export const paymentInvoicePDF: Fn<"paymentInvoicePDF"> = async (...a) => (await load()).paymentInvoicePDF(...a);
export const fullBillPDF: Fn<"fullBillPDF"> = async (...a) => (await load()).fullBillPDF(...a);
export const expenseReportPDF: Fn<"expenseReportPDF"> = async (...a) => (await load()).expenseReportPDF(...a);

// Start downloading it in the background (e.g. when the Billing tab opens)
export const preloadPdf = () => {
  void load();
};
