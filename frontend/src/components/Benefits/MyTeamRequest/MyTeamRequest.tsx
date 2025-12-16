"use client";

import type React from "react";
import { useState } from "react";
import CardTable from "../../shared/CardTable";
import ApprovalList from "../../shared/ApprovalList";
import BenefitRequestItem from "./BenefitRequestItem";

const MyTeamRequest: React.FC = () => {
    const [showBenefitForm, setShowBenefitForm] = useState(false);



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
        <div className="p-4 bg-white">
            <div className="flex items-center gap-4 mb-2">
                <h2 className="pb-1 text-xl font-semibold">Team Benefit Requests</h2>
            </div>

            <div className=" rounded-lg overflow-x-auto">
                <CardTable
                    titles={[
                        "",
                        "Employee Name",
                        "Claim Benefit For",
                        "Claimed Amount",
                        "Max Amount Eligible",
                        "Claim Date",
                        "Status",
                        "Actions",
                    ]}
                    columnWidths={[
                        "8%",
                        "10%",
                        "10%",
                        "10%",
                        "10%",
                        "10%",
                        "10%",
                        "20%",
                    ]}
                >
                    <ApprovalList
                        status="Pending"
                        doctype={"Employee Benefit Claim"}
                        pageSize={4}
                        showPagination={false}
                        // refetch={refetchApprovalList}
                        // setRefetch={setRefetchApprovalList}
                        // onApprovalRefetchComplete={handleApprovalRefetchComplete}
                        renderCardContent={(item) => (
                            <BenefitRequestItem
                                isSelected={item?.isSelected}
                                onToggleSelect={item?.onToggleSelect}
                                data={item?.data}
                                onAction={item?.onAction}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                // onClick={handleRequestClick}
                                loadingAction={item?.loadingAction}
                            />
                        )}

                    />
                </CardTable>
            </div>
        </div>
    );
};


export default MyTeamRequest;
