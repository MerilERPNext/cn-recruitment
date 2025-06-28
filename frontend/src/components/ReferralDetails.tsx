import type React from "react"
import { Check, Clock, Circle, FileText, Download, Link, Calendar, Edit, Send, Eye, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router";

const ReferralDetails: React.FC = () => {
  const navigate = useNavigate();
  const handleBackInterview= () => {
    navigate(-1);
  };
  return (
    <div className="flex flex-col w-full h-screen bg-gray-50">
              <header className="sticky top-0 z-10 flex items-center bg-white/80 backdrop-blur-md p-4 pb-3 justify-between border-b border-slate-200">
          <button 
          onClick={handleBackInterview}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-900">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-center flex-1 text-slate-900">Referral Details</h1>
          <div className="w-10 h-10"></div>
        </header>
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <section className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div
              className="bg-center bg-no-repeat bg-cover rounded-full size-16 shrink-0"
              style={{
                backgroundImage: `url("https://cdn-icons-png.flaticon.com/512/219/219983.png")`,
              }}
            ></div>
            <div>
              <p className="text-gray-900 text-lg font-bold">Sophia Bennett</p>
              <p className="text-gray-600 text-sm">Software Engineer</p>
              <p className="text-gray-600 text-sm">sophia.bennett@email.com</p>
              <a className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1 mt-1" href="#">
                <Link size={16} />
                View Resume
              </a>
            </div>
          </div>
        </section>

        {/* Referral Details */}
        <section>
          <h2 className="text-gray-900 text-lg font-semibold mb-3">Referral Details</h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
            {[
              ["Referred By", "Ethan Carter"],
              ["Position", "Senior Software Engineer"],
              ["Submission Date", "July 15, 2024"],
            ].map(([label, value], i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-4 ${i !== 0 ? "border-t border-gray-200" : ""}`}
              >
                <p className="text-gray-600">{label}</p>
                <p className="text-gray-900 font-medium">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Status */}
        <section>
          <h2 className="text-gray-900 text-lg font-semibold mb-4">Current Status</h2>
          <div className="overflow-hidden z-100">
            {[
              {
                icon: <Check size={18} />,
                title: "Application Received",
                date: "July 15, 2024",
                status: "done",
              },
              {
                icon: <Check size={18} />,
                title: "Resume Review",
                date: "July 17, 2024",
                status: "done",
              },
              {
                icon: <Clock size={18} />,
                title: "Interview Scheduled",
                date: "July 20, 2024",
                status: "current",
              },
              {
                icon: <Circle size={18} />,
                title: "Offer Extended",
                date: "Pending",
                status: "upcoming",
              },
            ].map(({ icon, title, date, status }, index, arr) => {
              const showBlueLine = index < arr.length - 1
              const bgColor =
                status === "done" || status === "current"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-400"
              return (
                <div key={index} className="relative flex items-start gap-4 mb-6 last:mb-0">
                  <div className="relative flex flex-col items-center z-10">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full ${bgColor} relative z-20`}>
                      {icon}
                    </div>
                    {showBlueLine && (
                      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-blue-600 z-10"></div>
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-gray-900 font-medium text-sm">{title}</p>
                    <p className="text-gray-600 text-xs">{date}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Actions */}
        <section>
          <h2 className="text-gray-900 text-lg font-semibold mb-3">Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: <Calendar size={18} />,
                text: "Schedule Interview",
                className: "bg-blue-600 text-white hover:bg-blue-700",
              },
              {
                icon: <Edit size={18} />,
                text: "Update Status",
                className: "bg-gray-200 text-gray-900 hover:bg-gray-300",
              },
              {
                icon: <Send size={18} />,
                text: "Send Message",
                className: "bg-gray-200 text-gray-900 hover:bg-gray-300",
              },
              {
                icon: <Eye size={18} />,
                text: "View Resume",
                className: "bg-gray-200 text-gray-900 hover:bg-gray-300",
              },
            ].map(({ icon, text, className }, i) => (
              <button
                key={i}
                className={`flex items-center justify-center gap-2 rounded-md h-12 px-3 text-sm font-medium transition-colors ${className}`}
              >
                {icon}
                <span className="truncate">{text}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Comments */}
        <section>
          <h2 className="text-gray-900 text-lg font-semibold mb-3">Comments/Notes</h2>
          <div className="space-y-4">
            {[
              [
                "Liam Harper",
                "July 16, 2024",
                "Sophia's resume is impressive. Her experience aligns well with the requirements.",
              ],
              ["Olivia Hayes", "July 18, 2024", "Agreed. Let's schedule an interview."],
            ].map(([author, date, comment], i) => (
              <div key={i} className="flex gap-3 bg-white p-3 rounded-lg border border-gray-200">
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 shrink-0 bg-gray-300"></div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-gray-900 text-sm font-semibold">{author}</p>
                    <p className="text-gray-600 text-xs">{date}</p>
                  </div>
                  <p className="text-gray-900 text-sm mt-0.5">{comment}</p>
                </div>
              </div>
            ))}
            <div className="mt-2">
              <textarea
                className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Add a comment..."
                rows={3}
              />
              <button className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                Add Comment
              </button>
            </div>
          </div>
        </section>

        {/* Documents */}
        <section className="pb-6">
          <h2 className="text-gray-900 text-lg font-semibold mb-3">Documents & Attachments</h2>
          <div className="space-y-3">
            {["Resume.pdf", "Cover_Letter.docx"].map((doc, i) => (
              <div
                key={i}
                className="p-4 rounded-lg border border-gray-200 bg-white flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="bg-gray-100 text-blue-600 rounded-md w-10 h-10 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <p className="text-sm font-medium text-gray-900 flex-1 truncate">{doc}</p>
                <Download size={20} className="text-gray-500 hover:text-gray-700" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default ReferralDetails
