import React, { useEffect, useState } from "react";
import { Clock, FileText, Download, Link, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import axios from "axios";

const ReferralDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [referral, setReferral] = useState<any>(null);

 useEffect(() => {
  const fetchReferralDetails = async () => {
    try {
      const res = await axios.get(`/api/method/recruitment.api.employee_referral.get_referral_status`, {
        params: { referral_id: id }
      });
      console.log("Referral response ===>", res.data.message.data); // ✅ correct log
      setReferral(res.data.message.data); // ✅ correct assignment
    } catch (error) {
      console.error("Error fetching referral details", error);
    }
  };

  fetchReferralDetails();
}, [id]);


  const handleBack = () => navigate(-1);

  if (!referral) return <div className="p-4">Loading...</div>;

  return (
    <div className="flex flex-col w-full h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center bg-white/80 backdrop-blur-md p-4 pb-3 justify-between border-b border-slate-200">
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-900"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold text-center flex-1 text-slate-900">
          Referral Details
        </h1>
        <div className="w-10 h-10" />
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Profile Section */}
        <section className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div
              className="bg-center bg-no-repeat bg-cover rounded-full size-16 shrink-0"
              style={{
                backgroundImage: `url("https://cdn-icons-png.flaticon.com/512/219/219983.png")`,
              }}
            ></div>
            <div>
              <p className="text-gray-900 text-lg font-bold">
                {referral.candidate_name}
              </p>
              <p className="text-gray-600 text-sm">{referral.position}</p>
<p className="text-gray-600 text-sm">{referral.email}</p>
              {referral.resume_url ? (
                <a
                  className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1 mt-1"
                  href={referral.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Link size={16} />
                  View Resume
                </a>
              ) : (
                <p className="text-sm text-gray-400 mt-1">No resume uploaded</p>
              )}
            </div>
          </div>
        </section>

        {/* Referral Info Section */}
        <section>
          <h2 className="text-gray-900 text-lg font-semibold mb-3">
            Referral Details
          </h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
            {[
              ["Referred By", referral.referrer_name],
              ["Position", referral.position],
              ["Submission Date", referral.referral_date],
              ["Referral ID", referral.referral_id],
            ].map(([label, value], i) => (
              <div
                key={i}
                className={`flex items-center gap-2 justify-between px-4 py-4 ${
                  i !== 0 ? "border-t border-gray-200" : ""
                }`}
              >
                <p className="text-gray-600">{label}</p>
                <p className="text-gray-900 font-medium">{value || "—"}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Status Timeline */}
        <section>
          <h2 className="text-gray-900 text-lg font-semibold mb-4">
            Current Status
          </h2>
          <div className="overflow-hidden z-100">
            <div className="relative flex items-start gap-4 mb-6 last:mb-0">
              <div className="relative flex flex-col items-center z-10">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white relative z-20">
                  <Clock size={18} />
                </div>
              </div>
              <div className="flex-1 pt-1">
                <p className="text-gray-900 font-medium text-sm">
                  {referral.latest_status}
                </p>
                <p className="text-gray-600 text-xs">
                  {referral.status_date || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Resume Attachment */}
        <section className="pb-6">
          <h2 className="text-gray-900 text-lg font-semibold mb-3">
            Documents & Attachments
          </h2>
          <div className="space-y-3">
            {referral.resume_url ? (
              <div className="p-4 rounded-lg border border-gray-200 bg-white flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="bg-gray-100 text-blue-600 rounded-md w-10 h-10 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <p className="text-sm font-medium text-gray-900 flex-1 truncate">
                  {referral.resume_url.split("/").pop()}
                </p>
                <a
                  href={referral.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download
                    size={20}
                    className="text-gray-500 hover:text-gray-700"
                  />
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No documents available</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ReferralDetails;
