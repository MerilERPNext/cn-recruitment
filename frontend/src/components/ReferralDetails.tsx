// import React from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   MdArrowBackIosNew,
//   MdCheck,
//   MdAccessTime,
//   MdRadioButtonUnchecked,
//   MdDescription,
//   MdDownload,
//   MdLink,
//   MdCalendarToday,
//   MdEditNote,
//   MdSend,
//   MdVisibility,
//   MdHome,
//   MdBusinessCenter,
//   MdGroups,
//   MdPerson,
// } from "react-icons/md";


// const ReferralDetails: React.FC = () => {
//     const navigate = useNavigate();

//     return (
//         <div
//             className="relative flex w-full min-h-screen flex-col justify-between overflow-x-hidden"
//             style={{ fontFamily: "Inter, 'Noto Sans', sans-serif" }}
//         >
//             <div className="flex-grow w-full">
//                 <header className="sticky top-0 z-10 bg-white shadow-sm w-full">
//                     <div className="flex items-center p-4">
//                         <button
//                             onClick={() => navigate(-1)}
//                             className="text-[var(--text-primary)] p-2 -ml-2"
//                         >
//                             <MdArrowBackIosNew className="text-2xl" />
//                         </button>
//                         <h1 className="text-[var(--text-primary)] text-xl font-semibold leading-tight tracking-tight flex-1 text-center">
//                             Referral Details
//                         </h1>
//                         <div className="w-8"></div>
//                     </div>
//                 </header>

//                 <main className="w-full px-4 py-6 space-y-6">
//                     {/* Profile Card */}
//                     <section className="w-full bg-gray-100 p-4 rounded-xl">
//                         <div className="flex flex-col sm:flex-row sm:items-center gap-4">
//                             <div
//                                 className="bg-center bg-no-repeat bg-cover rounded-full size-16 shrink-0"
//                                 style={{
//                                     backgroundImage: `url("https://cdn-icons-png.flaticon.com/512/219/219983.png")`,
//                                 }}
//                             ></div>
//                             <div>
//                                 <p className="text-[var(--text-primary)] text-lg font-bold">Sophia Bennett</p>
//                                 <p className="text-[var(--text-secondary)] text-sm">Software Engineer</p>
//                                 <p className="text-[var(--text-secondary)] text-sm">sophia.bennett@email.com</p>
//                                 <a
//                                     className="text-[var(--primary-color)] text-sm font-medium hover:underline flex items-center gap-1 mt-1"
//                                     href="#"
//                                 >
//                                     <MdLink size={16} />
//                                     View Resume
//                                 </a>
//                             </div>
//                         </div>
//                     </section>


//                     {/* Referral Details */}
//                     <section className="w-full">
//                         <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight mb-3">
//                             Referral Details
//                         </h2>
//                         <div className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-gray-100 w-full text-sm">
//                             {[
//                                 ["Referred By", "Ethan Carter"],
//                                 ["Position", "Senior Software Engineer"],
//                                 ["Submission Date", "July 15, 2024"],
//                             ].map(([label, value], i) => (
//                                 <div
//                                     key={i}
//                                     className={`flex items-center justify-between px-4 py-4 ${i !== 0 ? "border-t border-[var(--border-color)]" : ""
//                                         }`}
//                                 >
//                                     <p className="text-[var(--text-secondary)]">{label}</p>
//                                     <p className="text-[var(--text-primary)] font-medium">{value}</p>
//                                 </div>
//                             ))}
//                         </div>
//                     </section>



//                     {/* Current Status */}
//                     <section className="w-full">
//                         <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight mb-4">
//                             Current Status
//                         </h2>
//                         <div className="ml-3 relative">
//                             {[
//                                 {
//                                     icon: <MdCheck size={18} />,
//                                     title: "Application Received",
//                                     date: "July 15, 2024",
//                                     status: "done",
//                                 },
//                                 {
//                                     icon: <MdCheck size={18} />,
//                                     title: "Resume Review",
//                                     date: "July 17, 2024",
//                                     status: "done",
//                                 },
//                                 {
//                                     icon: <MdAccessTime size={18} />,
//                                     title: "Interview Scheduled",
//                                     date: "July 20, 2024",
//                                     status: "current",
//                                 },
//                                 {
//                                     icon: <MdRadioButtonUnchecked size={18} />,
//                                     title: "Offer Extended",
//                                     date: "Pending",
//                                     status: "upcoming",
//                                 },
//                             ].map(({ icon, title, date, status }, index, arr) => {
//                                 const isLast = index === arr.length - 1;

//                                 const bgColor =
//                                     status === "done" || status === "current"
//                                         ? "bg-[var(--primary-color)] text-white"
//                                         : "bg-white border border-gray-300 text-gray-400";

//                                 // Show line only from steps 0 ➝ 1 ➝ 2 (i.e. before last two)
//                                 const showBlueLine = index === 0 || index === 1;

//                                 return (
//                                     <div key={index} className="relative z-10 flex items-start gap-4 mb-6">
//                                         {/* Icon */}
//                                         <div className="relative flex flex-col items-center">
//                                             <div className={`w-8 h-8 flex items-center justify-center rounded-full ${bgColor}`}>
//                                                 {icon}
//                                             </div>
//                                             {showBlueLine && (
//                                                 <div className="w-0.5 h-8 bg-[var(--primary-color)]"></div>
//                                             )}
//                                         </div>

//                                         {/* Text */}
//                                         <div>
//                                             <p className="text-[var(--text-primary)] font-medium text-sm">{title}</p>
//                                             <p className="text-[var(--text-secondary)] text-xs">{date}</p>
//                                         </div>
//                                     </div>
//                                 );
//                             })}
//                         </div>
//                     </section>




//                     {/* Actions */}
//                     <section className="w-full">
//                         <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight mb-3">
//                             Actions
//                         </h2>
//                         <div className="grid grid-cols-2 gap-3">
//                             {[
//                                 {
//                                     icon: <MdCalendarToday size={18} />,
//                                     text: "Schedule Interview",
//                                     className: "bg-[var(--primary-color)] text-white hover:bg-opacity-90",
//                                 },
//                                 {
//                                     icon: <MdEditNote size={18} />,
//                                     text: "Update Status",
//                                     className: "bg-gray-200 text-[var(--text-primary)] hover:bg-gray-300",
//                                 },
//                                 {
//                                     icon: <MdSend size={18} />,
//                                     text: "Send Message",
//                                     className: "bg-gray-200 text-[var(--text-primary)] hover:bg-gray-300",
//                                 },
//                                 {
//                                     icon: <MdVisibility size={18} />,
//                                     text: "View Resume",
//                                     className: "bg-gray-200 text-[var(--text-primary)] hover:bg-gray-300",
//                                 },
//                             ].map(({ icon, text, className }, i) => (
//                                 <button
//                                     key={i}
//                                     className={`flex items-center justify-center gap-2 rounded-md h-12 px-3 text-sm font-medium focus:outline-none focus:ring-0 focus:border-none transition-colors ${className}`}
//                                 >
//                                     {icon}
//                                     <span className="truncate">{text}</span>
//                                 </button>
//                             ))}
//                         </div>
//                     </section>

//                     {/* Comments */}
//                     <section className="w-full">
//                         <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight mb-3">Comments/Notes</h2>
//                         <div className="space-y-4">
//                             {[
//                                 ["Liam Harper", "July 16, 2024", "Sophia's resume is impressive. Her experience aligns well with the requirements."],
//                                 ["Olivia Hayes", "July 18, 2024", "Agreed. Let's schedule an interview."],
//                             ].map(([author, date, comment], i) => (
//                                 <div key={i} className="flex gap-3 bg-white p-3 rounded-lg border border-[var(--border-color)]">
//                                     <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 shrink-0 bg-gray-300"></div>
//                                     <div>
//                                         <div className="flex items-baseline gap-2">
//                                             <p className="text-[var(--text-primary)] text-sm font-semibold">{author}</p>
//                                             <p className="text-[var(--text-secondary)] text-xs">{date}</p>
//                                         </div>
//                                         <p className="text-[var(--text-primary)] text-sm mt-0.5">{comment}</p>
//                                     </div>
//                                 </div>
//                             ))}

//                             <div className="mt-2">
//                                 <textarea
//                                     className="w-full p-2 border border-[var(--border-color)] rounded-md text-sm 
//              focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] 
//              focus:border-[var(--primary-color)] transition duration-150"
//                                     placeholder="Add a comment..."
//                                     rows={3}
//                                 />

//                                 <button className="mt-2 px-4 py-2 bg-[var(--primary-color)] text-white text-sm font-medium rounded-md hover:bg-opacity-90 transition-colors">
//                                     Add Comment
//                                 </button>
//                             </div>
//                         </div>
//                     </section>

//                     {/* Documents */}
//                     <section className="w-full">
//                         <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight mb-3">
//                             Documents & Attachments
//                         </h2>

//                         {["Resume.pdf", "Cover_Letter.docx"].map((doc, i) => (
//                             <div
//                                 key={i}
//                                 className="mt-3 p-4 rounded-lg border border-gray-200 bg-white flex items-center gap-4 hover:bg-gray-100 transition-colors"
//                             >
//                                 {/* Icon */}
//                                 <div className="bg-gray-100 text-[var(--primary-color)] rounded-md w-10 h-10 flex items-center justify-center shrink-0">
//                                     <MdDescription size={20} />
//                                 </div>

//                                 {/* Filename */}
//                                 <p className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">
//                                     {doc}
//                                 </p>

//                                 {/* Download Icon */}
//                                 <MdDownload size={20} className="text-gray-500" />
//                             </div>
//                         ))}
//                     </section>
//                 </main>
//             </div>

//             {/* Footer Section */}
// <footer className="sticky bottom-0 bg-white border-t border-gray-200 shadow-top-nav w-full">
//   <nav className="flex justify-around items-center px-2 py-2">
//     {[
//       { icon: <MdHome size={22} />, label: "Home", active: false },
//       { icon: <MdBusinessCenter size={22} />, label: "Jobs", active: false },
//       { icon: <MdGroups size={22} />, label: "Referrals", active: true },
//       { icon: <MdPerson size={22} />, label: "Profile", active: false },
//     ].map(({ icon, label, active }, i) => (
//       <a
//         key={i}
//         href="#"
//         className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-md w-1/4 transition-colors ${
//           active
//             ? "text-[var(--primary-color)] bg-gray-100"
//             : "text-[var(--text-secondary)] hover:bg-gray-100"
//         }`}
//       >
//         {icon}
//         <p className="text-xs font-medium">{label}</p>
//       </a>
//     ))}
//   </nav>
//   <div className="h-safe-area-bottom bg-white"></div>
// </footer>


//         </div>
//     );
// };

// export default ReferralDetails;


import React from "react";
import { useNavigate } from "react-router-dom";
import {
  MdArrowBackIosNew,
  MdCheck,
  MdAccessTime,
  MdRadioButtonUnchecked,
  MdDescription,
  MdDownload,
  MdLink,
  MdCalendarToday,
  MdEditNote,
  MdSend,
  MdVisibility,
  MdHome,
  MdBusinessCenter,
  MdGroups,
  MdPerson,
} from "react-icons/md";

const ReferralDetails: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="relative flex w-full min-h-screen flex-col justify-between overflow-x-hidden"
      style={{ fontFamily: "Inter, 'Noto Sans', sans-serif" }}
    >
      <div className="flex-grow w-full">
        <header className="sticky top-0 z-10 bg-white shadow-sm w-full">
          <div className="flex items-center p-4">
            <button
              onClick={() => navigate(-1)}
              className="text-[var(--text-primary)] p-2 -ml-2"
            >
              <MdArrowBackIosNew className="text-2xl" />
            </button>
            <h1 className="text-[var(--text-primary)] text-xl font-semibold leading-tight tracking-tight flex-1 text-center">
              Referral Details
            </h1>
            <div className="w-8"></div>
          </div>
        </header>

        <main className="w-full px-4 py-6 space-y-6">
          {/* Profile Card */}
          <section className="w-full bg-gray-100 p-4 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div
                className="bg-center bg-no-repeat bg-cover rounded-full size-16 shrink-0"
                style={{
                  backgroundImage: `url("https://cdn-icons-png.flaticon.com/512/219/219983.png")`,
                }}
              ></div>
              <div>
                <p className="text-[var(--text-primary)] text-lg font-bold">Sophia Bennett</p>
                <p className="text-[var(--text-secondary)] text-sm">Software Engineer</p>
                <p className="text-[var(--text-secondary)] text-sm">sophia.bennett@email.com</p>
                <a
                  className="text-[var(--primary-color)] text-sm font-medium hover:underline flex items-center gap-1 mt-1"
                  href="#"
                >
                  <MdLink size={16} />
                  View Resume
                </a>
              </div>
            </div>
          </section>

          {/* Referral Details */}
          <section className="w-full">
            <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight mb-3">
              Referral Details
            </h2>
            <div className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-gray-100 w-full text-sm">
              {[
                ["Referred By", "Ethan Carter"],
                ["Position", "Senior Software Engineer"],
                ["Submission Date", "July 15, 2024"],
              ].map(([label, value], i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-4 ${i !== 0 ? "border-t border-[var(--border-color)]" : ""}`}
                >
                  <p className="text-[var(--text-secondary)]">{label}</p>
                  <p className="text-[var(--text-primary)] font-medium">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Current Status */}
          <section className="w-full">
            <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight mb-4">
              Current Status
            </h2>
            <div className="ml-3 relative">
              {[
                { icon: <MdCheck size={18} />, title: "Application Received", date: "July 15, 2024", status: "done" },
                { icon: <MdCheck size={18} />, title: "Resume Review", date: "July 17, 2024", status: "done" },
                { icon: <MdAccessTime size={18} />, title: "Interview Scheduled", date: "July 20, 2024", status: "current" },
                { icon: <MdRadioButtonUnchecked size={18} />, title: "Offer Extended", date: "Pending", status: "upcoming" },
              ].map(({ icon, title, date, status }, index, arr) => {
                const showBlueLine = index === 0 || index === 1;
                const bgColor = status === "done" || status === "current"
                  ? "bg-[var(--primary-color)] text-white"
                  : "bg-white border border-gray-300 text-gray-400";

                return (
                  <div key={index} className="relative z-10 flex items-start gap-4 mb-6">
                    <div className="relative flex flex-col items-center">
                      <div className={`w-8 h-8 flex items-center justify-center rounded-full ${bgColor}`}>
                        {icon}
                      </div>
                      {showBlueLine && <div className="w-0.5 h-8 bg-[var(--primary-color)]"></div>}
                    </div>
                    <div>
                      <p className="text-[var(--text-primary)] font-medium text-sm">{title}</p>
                      <p className="text-[var(--text-secondary)] text-xs">{date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Actions */}
          <section className="w-full">
            <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight mb-3">Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <MdCalendarToday size={18} />, text: "Schedule Interview", className: "bg-[var(--primary-color)] text-white hover:bg-opacity-90" },
                { icon: <MdEditNote size={18} />, text: "Update Status", className: "bg-gray-200 text-[var(--text-primary)] hover:bg-gray-300" },
                { icon: <MdSend size={18} />, text: "Send Message", className: "bg-gray-200 text-[var(--text-primary)] hover:bg-gray-300" },
                { icon: <MdVisibility size={18} />, text: "View Resume", className: "bg-gray-200 text-[var(--text-primary)] hover:bg-gray-300" },
              ].map(({ icon, text, className }, i) => (
                <button key={i} className={`flex items-center justify-center gap-2 rounded-md h-12 px-3 text-sm font-medium transition-colors ${className}`}>
                  {icon}
                  <span className="truncate">{text}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Comments */}
          <section className="w-full">
            <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight mb-3">Comments/Notes</h2>
            <div className="space-y-4">
              {[
                ["Liam Harper", "July 16, 2024", "Sophia's resume is impressive. Her experience aligns well with the requirements."],
                ["Olivia Hayes", "July 18, 2024", "Agreed. Let's schedule an interview."],
              ].map(([author, date, comment], i) => (
                <div key={i} className="flex gap-3 bg-white p-3 rounded-lg border border-[var(--border-color)]">
                  <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 shrink-0 bg-gray-300"></div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-[var(--text-primary)] text-sm font-semibold">{author}</p>
                      <p className="text-[var(--text-secondary)] text-xs">{date}</p>
                    </div>
                    <p className="text-[var(--text-primary)] text-sm mt-0.5">{comment}</p>
                  </div>
                </div>
              ))}
              <div className="mt-2">
                <textarea
                  className="w-full p-2 border border-[var(--border-color)] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] transition duration-150"
                  placeholder="Add a comment..."
                  rows={3}
                />
                <button className="mt-2 px-4 py-2 bg-[var(--primary-color)] text-white text-sm font-medium rounded-md hover:bg-opacity-90 transition-colors">
                  Add Comment
                </button>
              </div>
            </div>
          </section>

          {/* Documents */}
          <section className="w-full">
            <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight mb-3">Documents & Attachments</h2>
            {["Resume.pdf", "Cover_Letter.docx"].map((doc, i) => (
              <div
                key={i}
                className="mt-3 p-4 rounded-lg border border-gray-200 bg-white flex items-center gap-4 hover:bg-gray-100 transition-colors"
              >
                <div className="bg-gray-100 text-[var(--primary-color)] rounded-md w-10 h-10 flex items-center justify-center shrink-0">
                  <MdDescription size={20} />
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">{doc}</p>
                <MdDownload size={20} className="text-gray-500" />
              </div>
            ))}
          </section>
        </main>
      </div>

      {/* Footer Section */}
      <footer className="sticky bottom-0 bg-white border-t border-gray-200 shadow-top-nav w-full">
        <nav className="flex justify-around items-center px-2 py-2">
          {[
            { icon: <MdHome size={22} />, label: "Home", path: "/" },
            { icon: <MdBusinessCenter size={22} />, label: "Jobs", path: "/job-requisition" },
            { icon: <MdGroups size={22} />, label: "Referrals", path: "/referral-details" },
            { icon: <MdPerson size={22} />, label: "Profile", path: "/profile" },
          ].map(({ icon, label, path }, i) => (
            <button
              key={i}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-md w-1/4 transition-colors ${
                path === "/referral-details"
                  ? "text-[var(--primary-color)] bg-gray-100"
                  : "text-[var(--text-secondary)] hover:bg-gray-100"
              }`}
            >
              {icon}
              <p className="text-xs font-medium">{label}</p>
            </button>
          ))}
        </nav>
        <div className="h-safe-area-bottom bg-white"></div>
      </footer>
    </div>
  );
};

export default ReferralDetails;
