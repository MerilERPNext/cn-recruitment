import { useState } from "react";
import HeaderBar from "../HeaderBar";
import PDFViewer from "../PDFViewer";
import { useNavigate, useParams } from "react-router-dom";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";

const ViewSalarySlipModal = () => {
  const navigate = useNavigate();
  const { salaryId } = useParams<{ salaryId: string }>();

  const [isMasked, setIsMasked] = useState(true); // 🔹 State for masking

  if (!salaryId) {
    return <p className="text-red-500">Salary Slip name missing in URL.</p>;
  }

  const pdfUrl = `/api/method/frappe.utils.print_format.download_pdf?doctype=Salary%20Slip&name=${encodeURIComponent(
    salaryId
  )}&format=Salary%20Slip&no_letterhead=0`;

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div>
      {/* Header with Mask/Unmask button in rightSlot */}
      <HeaderBar
        title="Salary Slip PDF"
        onBack={handleBack}
        rightSlot={
                      <button
                      onClick={() => setIsMasked(!isMasked)}
                        className="flex items-center justify-end gap-2  py-1 transition-colors duration-200"
                        title={isMasked ? 'Show' : 'Hide'}
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
        <div className="bg-white rounded-lg shadow-lg w-full h-full z-[-100] relative overflow-hidden">
          
          {/* PDF Viewer */}
          <div className={`w-full h-full ${isMasked ? "blur-lg" : ""}`}>
            <PDFViewer
              pdfUrl={pdfUrl}
              mode="react-pdf"
              className="w-full h-full rounded-b-lg"
              title={`Salary Slip - ${salaryId}`}
            />
          </div>
          {isMasked && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold pointer-events-none">
              PDF Blurred
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewSalarySlipModal;
