import { useState } from "react";

const invoices = [
  {
    invoiceNo: "INV-001",
    invoiceDate: "2025-05-01",
    dueDate: "2025-05-10",
    customerName: "ABC Pvt Ltd",
    status: "Paid",
    subTotal: 100000,
    tax: 18000,
    totalAmount: 118000,
  },
  {
    invoiceNo: "INV-002",
    invoiceDate: "2025-04-15",
    dueDate: "2025-04-25",
    customerName: "XYZ Solutions",
    status: "Pending",
    subTotal: 75000,
    tax: 13500,
    totalAmount: 88500,
  },
];

const formatINR = (num: number) => `₹ ${num.toLocaleString("en-IN")}`;

export default function Invoice() {
  const [hideAmount, setHideAmount] = useState(false);

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

            {/* Year Dropdown (UI only) */}
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow">
              25-26
              <span className="text-xs">▼</span>
            </button>
          </div>
        </div>

        {/* Table Wrapper */}
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-8 bg-gray-100 text-gray-700 font-medium text-sm px-4 py-3">
            <div>Invoice No</div>
            <div>Invoice Date</div>
            <div>Due Date</div>
            <div>Customer</div>
            <div>Status</div>
            <div>Sub Total</div>
            <div>Total Amount</div>
            <div className="text-center">Action</div>
          </div>

          {/* Data Rows */}
          {invoices.map((inv, idx) => (
            <div
              key={idx}
              className="grid grid-cols-8 items-center px-4 py-4 border-t text-sm"
            >
              <div className="font-medium">{inv.invoiceNo}</div>
              <div>{inv.invoiceDate}</div>
              <div>{inv.dueDate}</div>
              <div>{inv.customerName}</div>

              <div>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-medium ${
                    inv.status === "Paid"
                      ? "bg-green-100 text-green-700"
                      : inv.status === "Pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {inv.status}
                </span>
              </div>

              <div className="font-medium">
                {hideAmount ? "•••••" : formatINR(inv.subTotal)}
              </div>

              <div className="font-medium">
                {hideAmount ? "•••••" : formatINR(inv.totalAmount)}
              </div>

              <div className="flex justify-center gap-2">
                <button className="px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50">
                  View
                </button>
                <button className="px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50">
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
