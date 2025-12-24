/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Search, Filter } from "lucide-react";
import { useExtraPayment } from "../../../hooks/useExtraPAyments";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import Modal from "../Advances/commonModal";
import ExtraPaymentForm from "./ExtraPaymentForm";
import { IoCloseCircleOutline } from "react-icons/io5";

type PaymentStatus = "all" | "paid" | "pending" | "overdue";

interface Payment {
  salary_component: string;
  id: string;
  recipient: string;
  invoiceId: string;
  date: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
}

function FilterDropdown({
  isOpen,
  onClose,
  activeFilter,
  onFilterChange,
}: any) {
  if (!isOpen) return null;

  const filters = ["all", "paid", "pending", "overdue"];

  return (
    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="p-3">
      <div className="flex items-center justify-between mb-3">  
        <h3 className="text-sm font-semibold mb-2 text-gray-700">
          Filter Payments
        </h3>
        <button
        onClick={onClose}
        className=" mb-2 text-gray-700 "
        ><IoCloseCircleOutline className="w-6 h-6"/></button>
        </div>

        <div className="flex flex-col gap-1">
          {filters.map((filter) => (
            <button
              key={filter}
              className={`px-3 py-2 rounded-md text-sm text-left border
                ${
                  activeFilter === filter
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:bg-gray-50"
                }
              `}
              onClick={() => {
                onFilterChange(filter);
                onClose();
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


export default function ExtraPayment() {
  const [activeFilter, setActiveFilter] = useState<PaymentStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [showExtraPaymentForm, setShowExtraPaymentForm] = useState(false);

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const { data: extraPayment } = useExtraPayment(
    user?.company || null,
    user?.employee || null
  );

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 768);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // -------- MAP API DATA ----------
  const apiPayments: Payment[] =
    (extraPayment as any)?.extra_payments?.map((item: any) => ({
      id: item.name,
      salary_component: item.salary_component,
      recipient: (extraPayment as any)?.employee,
      invoiceId: item.name,
      date: item.payment_date,
      amount: item.amount,
      status: item.is_tax_applicable ? "Paid" : "Pending",
    })) ?? [];

  // -------- FILTER ----------
  const filteredPayments = apiPayments.filter((p) => {
    if (activeFilter !== "all" && p.status.toLowerCase() !== activeFilter)
      return false;
    if (
      searchTerm &&
      !`${p.recipient}${p.invoiceId}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
      return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-700";
      case "Pending":
        return "bg-amber-100 text-amber-700";
      case "Overdue":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-white md:p-4">
      <div className="w-full mx-auto">
        <div className="flex items-start justify-between mb-2">
          <h1 className="base-title  font-bold text-gray-900 mb-2">
            Extra Payment History
          </h1>
          {/* <button
            onClick={() => setShowExtraPaymentForm(true)}
            className="px-4 py-1 rounded-lg bg-blue-600 text-white flex items-center gap-2"
          >
            Create Request +
          </button> */}
        </div>

        <div className="flex items-center justify-between  mb-1 md:mb-2">
          <div className="relative w-full ">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-1 border border-gray-300 rounded-l-lg w-full "
            />
          </div>

    <div className="relative inline-block">
  <button
    onClick={() => setIsFilterOpen((prev) => !prev)}
    className="px-2 py-2 border border-gray-300 border-l-0 rounded-r-lg bg-white text-gray-900 flex items-center gap-2"
  >
    <Filter className="w-4 h-4" />
  </button>

  <FilterDropdown
    isOpen={isFilterOpen}
    activeFilter={activeFilter}
    onFilterChange={setActiveFilter}
    onClose={() => setIsFilterOpen(false)}
  />
</div>
        </div>

      

        {/* ---------------------- WEB ---------------------- */}
        {!isMobile && (
          <div className="border border-gray-100 rounded overflow-hidden">
            <div className="grid grid-cols-6 bg-gray-50 border-b border-gray-100">
              <div className="px-6 py-2 text-left text-xs font-semibold">
                Recipient
              </div>
              <div className="px-6 py-2 text-left text-xs font-semibold">
                Document ID
              </div>
              <div className="px-6 py-2 text-left text-xs font-semibold">
                Salary Component
              </div>
              <div className="px-6 py-2 text-left text-xs font-semibold">
                Date
              </div>
              <div className="px-6 py-2 text-left text-xs font-semibold">
                Amount
              </div>
              <div className="px-6 py-2 text-left text-xs font-semibold">
                Status
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="grid grid-cols-6 hover:bg-gray-50"
                >
                  <div className="px-6 py-2 text-xs font-medium">
                    {payment.recipient}
                  </div>
                  <div className="px-6 py-2 text-xs">{payment.invoiceId}</div>
                  <div className="px-6 py-2 text-xs">
                    {payment.salary_component}
                  </div>
                  <div className="px-6 py-2 text-xs">{payment.date}</div>
                  <div className="px-6 py-2 text-xs font-medium">
                    {payment.amount}
                  </div>
                  <div className="px-6 py-2 text-xs">
                    <span
                      className={`px-2 py-1 rounded-lg text-sm ${getStatusColor(
                        payment.status
                      )}`}
                    >
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------- MOBILE ---------------------- */}
        {isMobile && (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="p-4 rounded-xl border shadow-sm bg-white"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">{payment.recipient}</h3>
                  <span
                    className={`px-3 py-1 text-xs rounded-lg ${getStatusColor(
                      payment.status
                    )}`}
                  >
                    {payment.status}
                  </span>
                </div>
                <p className="text-sm mb-1">Invoice: {payment.invoiceId}</p>
                <p className="text-sm mb-1">Date: {payment.date}</p>
                <p className="font-semibold text-lg mt-2">₹ {payment.amount}</p>
              </div>
            ))}
          </div>
        )}

        {filteredPayments.length === 0 && (
          <p className="text-center text-gray-500 mt-10">No payments found.</p>
        )}
      </div>
      {showExtraPaymentForm && (
        <Modal onClose={() => setShowExtraPaymentForm(false)}>
          <ExtraPaymentForm
            isOpen={showExtraPaymentForm}
            onClose={() => setShowExtraPaymentForm(false)}
            onSuccess={() => {
              setShowExtraPaymentForm(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
