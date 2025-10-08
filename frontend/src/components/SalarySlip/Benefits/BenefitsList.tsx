"use client";

import type React from "react";
import { useState } from "react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { formatCurrency } from "../../../utils/currencyFormatter";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { StatusBadge } from "../Advances/StatusBadge";
import Modal from "../Advances/commonModal";
import BenefitRequestForm from "./BenefitRequestForm";

interface UiBenefit {
  id: number;
  benefitType: string;
  claimAmount: number;
  approvedAmount: number | null;
  requestDate: string;
  approvalDate: string | null;
  status: string;
}

// 2. CREATE DUMMY DATA AS PER THE UI IMAGE
const dummyBenefitsData: UiBenefit[] = [
  {
    id: 1,
    benefitType: "Health Insurance",
    claimAmount: 15000.0,
    approvedAmount: 14500.0,
    requestDate: "2025-10-02",
    approvalDate: "2025-10-05",
    status: "Approved",
  },
  {
    id: 2,
    benefitType: "Meal Vouchers",
    claimAmount: 2200.0,
    approvedAmount: 2200.0,
    requestDate: "2025-10-02",
    approvalDate: "2025-10-02",
    status: "Approved",
  },
  {
    id: 3,
    benefitType: "Travel Allowance",
    claimAmount: 5000.0,
    approvedAmount: null,
    requestDate: "2025-10-03",
    approvalDate: null,
    status: "Pending",
  },
  {
    id: 4,
    benefitType: "Internet Reimbursement",
    claimAmount: 999.0,
    approvedAmount: null,
    requestDate: "2025-10-04",
    approvalDate: null,
    status: "Pending",
  },
  {
    id: 5,
    benefitType: "Wellness Program",
    claimAmount: 1500.0,
    approvedAmount: 0.0,
    requestDate: "2025-10-03",
    approvalDate: "2025-09-03", // Note: Corrected based on image logic, approval date can exist for rejected items
    status: "Rejected",
  },
  {
    id: 6,
    benefitType: "Child Care",
    claimAmount: 8000.0,
    approvedAmount: null,
    requestDate: "2025-10-03",
    approvalDate: null,
    status: "Pending",
  },
  {
    id: 7,
    benefitType: "Professional Development",
    claimAmount: 25000.0,
    approvedAmount: null,
    requestDate: "2025-10-02",
    approvalDate: null,
    status: "Unpaid", // Assuming 'Unpaid' is a valid status
  },
  {
    id: 8,
    benefitType: "Gym Membership",
    claimAmount: 3000.0,
    approvedAmount: null,
    requestDate: "2025-09-16",
    approvalDate: null,
    status: "Pending",
  },
];

const BenefitsList: React.FC = () => {
  const [maskAmounts, setMaskAmounts] = useState(true);
  const [showBenefitForm, setShowBenefitForm] = useState(false);
  const { isDesktop } = useScreenSize();

  // Using the dummy data directly
  const benefitsData: UiBenefit[] = dummyBenefitsData;

  const handleRequestBenefit = () => {
    setShowBenefitForm(true);
  };

  const handleCloseModal = () => {
    setShowBenefitForm(false);
  };

  const renderAmount = (amount: number | null) => {
    if (maskAmounts) {
      return <span className="blur-sm select-none text-gray-400">₹XX,XXX</span>;
    }
    if (amount === null) {
      return <span className="text-gray-500">----</span>;
    }
    return <span className="font-medium">{formatCurrency(amount)}</span>;
  };

  const renderDate = (date: string | null) => {
    if (!date) {
      return <span className="text-gray-500">----</span>;
    }
    return formatToIndianDate(date);
  };

  const DesktopLayout = () => (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden">
      <div className="w-full max-w-[100vw] mx-auto py-0">
        <div className="flex items-center justify-end mb-6 w-full px-0">
          <div className="flex items-center justify-end gap-4">
            <button
              onClick={() => setMaskAmounts(!maskAmounts)}
              className="my-btn-secondary"
              title={maskAmounts ? "Show amounts" : "Hide amounts"}
            >
              {maskAmounts ? (
                <>
                  <span className="text-sm font-medium text-gray-700">
                    Show Amounts
                  </span>
                  <BsToggleOff className="w-6 h-6 text-gray-400" />
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-700">
                    Hide Amounts
                  </span>
                  <BsToggleOn className="w-6 h-6 text-primary" />
                </>
              )}
            </button>
            <button
              onClick={handleRequestBenefit}
              className="my-btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              Request Benefit
            </button>
          </div>
        </div>

        <div className="px-0">
          <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="my-table-header">
              <div className="grid grid-cols-6 gap-4">
                <div className="my-table-header-text">BENEFIT TYPE</div>
                <div className="my-table-header-text text-right">
                  CLAIM AMOUNT
                </div>
                <div className="my-table-header-text text-right">
                  APPROVED AMOUNT
                </div>
                <div className="my-table-header-text text-center">
                  REQUEST DATE
                </div>
                <div className="my-table-header-text text-center">
                  APPROVAL DATE
                </div>
                <div className="my-table-header-text text-center">STATUS</div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 bg-white">
              {benefitsData.map((benefit) => (
                <div
                  key={benefit.id}
                  className="my-data-row grid grid-cols-6 gap-4"
                >
                  <div className="my-data-cell font-medium">
                    {benefit.benefitType}
                  </div>
                  <div className="my-data-cell text-right">
                    {renderAmount(benefit.claimAmount)}
                  </div>
                  <div className="my-data-cell text-right">
                    {renderAmount(benefit.approvedAmount)}
                  </div>
                  <div className="my-data-cell text-center">
                    {renderDate(benefit.requestDate)}
                  </div>
                  <div className="my-data-cell text-center">
                    {renderDate(benefit.approvalDate)}
                  </div>
                  <div className="my-data-cell flex justify-center items-center">
                    <StatusBadge status={benefit.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {benefitsData.length === 0 && (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500">No benefits found.</p>
          </div>
        )}
      </div>
    </div>
  );

  const MobileLayout = () => (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="flex items-center justify-end mb-6 w-full px-0">
        <div className="flex items-center justify-between gap-4 w-full">
          <button
            onClick={() => setMaskAmounts(!maskAmounts)}
            className="my-btn-secondary"
            title={maskAmounts ? "Show amounts" : "Hide amounts"}
          >
            {maskAmounts ? (
              <>
                <span className="text-sm font-medium text-gray-700">
                  Show Amounts
                </span>
                <BsToggleOff className="w-6 h-6 text-gray-400" />
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-700">
                  Hide Amounts
                </span>
                <BsToggleOn className="w-6 h-6 text-primary" />
              </>
            )}
          </button>
          <button
            onClick={handleRequestBenefit}
            className="my-btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            Request Benefit
          </button>
        </div>
      </div>
      <div className="p-0 space-y-3">
        {benefitsData.map((benefit) => (
          <div
            key={benefit.id}
            className="my-content-card" // Your existing card style
          >
            {/* Top Section: Title and Status */}
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                {benefit.benefitType}
              </h3>
              <StatusBadge status={benefit.status} />
            </div>

            {/* NEW: 2-Column Grid for Details */}
            <div className="flex justify-between gap-6">
              {/* Column 1 */}
              <div>
                <div>
                  <div className="text-xs text-gray-500">Claimed</div>
                  <div className="font-medium text-sm text-gray-800">
                    {renderAmount(benefit.claimAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Approved</div>
                  <div className="font-medium text-sm text-gray-800">
                    {renderAmount(benefit.approvedAmount)}
                  </div>
                </div>
              </div>
              {/* Column 2 */}
              <div>
                <div>
                  <div className="text-xs text-gray-500">Requested</div>
                  <div className="font-medium text-sm text-gray-800">
                    {renderDate(benefit.requestDate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Finalized</div>
                  <div className="font-medium text-sm text-gray-800">
                    {renderDate(benefit.approvalDate)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {benefitsData.length === 0 && (
        <div className="text-center py-12 px-4">
          <p className="text-gray-500">No benefits found.</p>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {isDesktop ? <DesktopLayout /> : <MobileLayout />}

      {showBenefitForm && (
        <Modal onClose={handleCloseModal}>
          <BenefitRequestForm onClose={handleCloseModal} />
        </Modal>
      )}
    </div>
  );
};

export default BenefitsList;
