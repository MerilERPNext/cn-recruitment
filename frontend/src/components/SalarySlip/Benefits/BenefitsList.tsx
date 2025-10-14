"use client";

import type React from "react";
import { useState } from "react";
import Modal from "../Advances/commonModal";
import BenefitRequestForm from "./BenefitRequestForm";
import FrappeListView from "../../ListView";
import BenefitCard from "./BenifitCard";
import CardTable from "../../shared/CardTable";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";

const BenefitsList: React.FC = () => {
  const [maskAmounts, setMaskAmounts] = useState(true);
  const [showBenefitForm, setShowBenefitForm] = useState(false);
  const [refetch, setRefetch] = useState(false);
  const handleRequestBenefit = () => {
    setShowBenefitForm(true);
  };

  const handleCloseModal = () => {
    setShowBenefitForm(false);
  };

  const CardSkeleton = () => (
    <div className="rounded-xl bg-gray-100 animate-pulse my-4">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-1">
          <div>
            <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-300 rounded"></div>
          </div>
          <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
        </div>
      </div>
    </div>
  );
  return (
    <div>
      <div className="flex items-center justify-end gap-4 mb-2">
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
      <CardTable
        titles={[
          "Employee Name",
          "Status",
          "Claim Benefit For",
          "Claim Date",
          "Claimed Amount",
          "Max Amount Eligible",
        ]}
      >
        <FrappeListView
          doctype="Employee Benefit Claim"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ItemComponent={(props: { item: any }) => {
            return <BenefitCard data={props?.item} isMasked={maskAmounts} />;
          }}
          SkeletonComponent={CardSkeleton}
          onItemClick={() => {}}
          infiniteScroll={true}
          isSearch={false}
          isFilter={false}
          refetchTrigger={refetch}
          onRefetchComplete={() => {
            setRefetch(false);
          }}
          defaultFields={[
            "employee_name",
            "earning_component",
            "currency",
            "claimed_amount",
            "custom_status",
            "claim_date",
            "max_amount_eligible",
          ]}
        />
      </CardTable>
      {showBenefitForm && (
        <Modal onClose={handleCloseModal}>
          <BenefitRequestForm
            isOpen={showBenefitForm}
            onClose={handleCloseModal}
            onSuccess={() => {
              setRefetch(true);
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default BenefitsList;
