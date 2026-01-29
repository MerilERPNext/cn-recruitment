/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useInvoiceSalarySlip } from "../../../hooks/payroll/usePerquisite";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import InvoicePDFview from "./Component/InvoicePDFview";

const formatINR = (num: number) => `₹ ${num.toLocaleString("en-IN")}`;

export default function Invoice() {
  const [hideAmount, setHideAmount] = useState(false);

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const { data: invoiceData } = useInvoiceSalarySlip(
    user?.employee || "",
    user?.company || ""
  );

  const invoices = Array.isArray(invoiceData) ? invoiceData : [];

  // ✅ parent click handler
  const handleInvoiceClick = (invoiceID: string) => {
    console.log("Clicked invoiceID:", invoiceID);
  };

  return (
    <div className="py-4 min-h-screen">
      <div className="w-full ">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Invoices</h2>
            <p className="text-sm text-gray-500">
              Track and manage your invoices
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Hide Amount Toggle */}
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
              <span className="text-sm text-gray-600">Hide Amounts</span>
              <button
                onClick={() => setHideAmount(!hideAmount)}
                className={`w-8 h-5 rounded-xl relative transition ${
                  hideAmount ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition ${
                    hideAmount ? "right-0.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Table Wrapper */}
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-7 bg-gray-100 text-gray-700 font-medium text-sm px-4 py-3">
            <div>Invoice No</div>
            <div>Invoice Date</div>
            <div>Due Date</div>
            <div>Customer</div>
            <div>Sub Total</div>
            <div>Total Amount</div>
            <div>Action</div>
          </div>

          {invoices.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-500">
              No invoices found
            </div>
          )}

          {invoices.map((inv: any, idx: number) => {
            const invoiceNo = inv.name;
            const invoiceDate = inv.start_date;
            const dueDate = inv.end_date;
            const customerName = inv.employee_name;
            const subTotal = inv.gross_pay;
            const totalAmount = inv.net_pay;

            return (
              <div
                key={invoiceNo || idx}
                className="grid grid-cols-7 items-center px-4 py-4 border-t text-sm"
              >
                <div className="font-medium">{invoiceNo}</div>
                <div>{invoiceDate}</div>
                <div>{dueDate}</div>
                <div>{customerName}</div>

                <div className="font-medium">
                  {hideAmount ? "•••••" : formatINR(subTotal || 0)}
                </div>

                <div
                  className={`font-medium ${
                    !hideAmount ? "blur-sm select-none" : ""
                  }`}
                >
                  {hideAmount ? "•••••" : formatINR(totalAmount || 0)}
                </div>

                <div className="flex items-center justify-start">
                  <InvoicePDFview
                    invoiceID={invoiceNo}
                    disabled={false}
                    onClick={handleInvoiceClick} // ✅ pass callback
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
