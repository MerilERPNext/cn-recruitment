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
import { Typography } from "../../shared/atoms/Typography";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import CardTable from "../../shared/CardTable";
import StatusBadge from "../../shared/atoms/statusBadge";
import Button from "../../shared/atoms/Button";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { RupeeSymbolPerfix } from "../../../utils/currency";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";

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
    <div className="absolute right-0 top-full mt-2 w-56 bg-app rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold mb-2 text-gray-700">
            Filter Payments
          </h3>
          <button onClick={onClose} className=" mb-2 text-gray-700 ">
            <IoCloseCircleOutline className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {filters.map((filter) => (
            <button
              key={filter}
              className={`px-3 py-2 rounded-md text-sm text-left border
                ${
                  activeFilter === filter
                    ? "border-primary-600 bg-primary/10 text-primary-700"
                    : "border-primary-200 hover:bg-primary/10"
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
  const { isDesktop } = useScreenSize();

  const [showExtraPaymentForm, setShowExtraPaymentForm] = useState(false);

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const { data: extraPayment, isLoading } = useExtraPayment(
    user?.company || null,
    user?.employee || null,
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
      date: formatToIndianDate(item.payment_date),
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

  const titles = [
    "Recipient",
    "Document ID",
    "Salary Component",
    "Date",
    "Amount",
    "Status",
  ];

  const columnWidths = ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="px-1 md:px-6 py-1 md:py-4">
          <div className="flex items-center justify-between">
            {isDesktop ? (
              <div>
                <Typography variant="h4">Extra Payment History</Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your extra payments
                </Typography>
              </div>
            ) : (
              <div>
                <Typography variant="h4">Extra Payment History</Typography>
              </div>
            )}
            <Button
              bgColor="blue-600"
              size="md"
              className="hover:bg-blue-700 py-[0.55rem] font-semibold px-4 text-white"
              onClick={() => setShowExtraPaymentForm(true)}
            >
              + Create Request
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between py-2 md:px-4 md:pt-0">
        <div className="relative w-full ">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-1 border border-gray-100 rounded-l-lg w-full "
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
        <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
          <CardTable titles={titles} columnWidths={columnWidths}>
            {isLoading ? (
              <CardSkeleton />
            ) : filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
                  style={{
                    gridTemplateColumns: columnWidths.join(" "),
                  }}
                >
                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {payment.recipient}
                  </Typography>

                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {payment.invoiceId}
                  </Typography>

                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {payment.salary_component}
                  </Typography>

                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {payment.date}
                  </Typography>

                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {RupeeSymbolPerfix(payment.amount)}
                  </Typography>

                  <div className="flex items-center justify-center">
                    <StatusBadge status={payment.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-gray-500">
                No payments found.
              </div>
            )}
          </CardTable>
        </div>
      )}

      {/* ---------------------- MOBILE ---------------------- */}
      {isMobile && (
        <div className="space-y-4">
          {isLoading ? (
            <CardSkeleton />
          ) : filteredPayments.length > 0 ? (
            filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="p-4 rounded-xl border shadow-sm bg-white"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">{payment.recipient}</h3>
                  <StatusBadge status={payment.status} />
                </div>

                <p className="text-sm mb-1">Invoice: {payment.invoiceId}</p>
                <p className="text-sm mb-1">Date: {payment.date}</p>
                <p className="font-semibold text-lg mt-2">
                  {RupeeSymbolPerfix(payment.amount)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 mt-10">
              No payments found.
            </p>
          )}
        </div>
      )}

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
