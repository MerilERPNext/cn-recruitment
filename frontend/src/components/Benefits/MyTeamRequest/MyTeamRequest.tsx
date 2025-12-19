"use client";

import type React from "react";
import CardTable from "../../shared/CardTable";
import ApprovalList from "../../shared/ApprovalList";
import BenefitRequestItem from "./BenefitRequestItem";

const MyTeamRequest: React.FC = () => {

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
