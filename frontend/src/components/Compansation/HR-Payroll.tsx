import React from "react";
import NoDataFound from "../shared/atoms/NoDataFound";
const PayrollDocuments: React.FC = () => {

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <NoDataFound title="No payroll documents Found" subtitle="No payroll documents records available." />
      </div>
  );
};

export default PayrollDocuments;
