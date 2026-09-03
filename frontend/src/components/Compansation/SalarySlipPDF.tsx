import { useState, useEffect } from "react";
import HeaderBar from "../HeaderBar";
import { useParams } from "react-router-dom";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";

const ViewSalarySlipModal = () => {
  const { salaryId } = useParams<{ salaryId: string }>();

  const [isMasked, setIsMasked] = useState(true);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchPayslip = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(
          `/api/method/cn_indian_payroll.cn_indian_payroll.overrides.tds_printer.get_payslip_pdf_html?id=${salaryId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data = await response.json();

        // Extract HTML from the response
        if (data.message?.response) {
          setHtmlContent(data.message.response);
        } else if (data.response) {
          setHtmlContent(data.response);
        } else {
          throw new Error("Invalid response format");
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error loading payslip:", err);
        setError(err instanceof Error ? err.message : "Failed to load payslip");
        setIsLoading(false);
      }
    };

    if (salaryId) {
      fetchPayslip();
    }
  }, [salaryId]);


  if (!salaryId) {
    return <p className="text-error">Salary Slip ID missing in URL.</p>;
  }

  return (
    <div>
      <HeaderBar
        title="Salary Slip"
        rightSlot={
          <button
            onClick={() => setIsMasked(!isMasked)}
            className="flex items-center justify-end gap-2 py-1 transition-colors duration-200"
            title={isMasked ? "Show" : "Hide"}
          >
            {isMasked ? (
              <>
                <span className="text-sm font-medium">Hide</span>
                <BsToggleOff className="w-8 h-8" />
              </>
            ) : (
              <>
                <span className="text-sm font-medium">Show</span>
                <BsToggleOn className="w-8 h-8" />
              </>
            )}
          </button>
        }
      />

      <div className="fixed inset-0 flex items-center justify-center mt-14">
        <div className="bg-white rounded-lg shadow-lg w-full h-full relative overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading Salary Slip...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <p className="text-error">{error}</p>
            </div>
          )}

          {!isLoading && !error && (
            <>
              <div className={`w-full h-full overflow-auto ${isMasked ? "blur-lg" : ""}`}>
                <iframe
                  srcDoc={htmlContent}
                  className="w-full h-full border-0"
                  title={`Salary Slip - ${salaryId}`}
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
              {isMasked && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-800 text-2xl font-bold pointer-events-none">
                  Salary Slip Hidden
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewSalarySlipModal;