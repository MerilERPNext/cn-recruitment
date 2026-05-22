import React, { useState, useRef, useEffect } from "react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import {
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  Download,
  PenTool,
  Clock,
  AlertCircle,
  Check
} from "lucide-react";
import toast from "react-hot-toast";

interface Offer {
  id: string;
  jobTitle: string;
  department: string;
  salary: string;
  joiningDate: string;
  expiryDate: string;
  status: "Pending" | "Accepted" | "Declined";
  signedName?: string;
  signedDate?: string;
  declineReason?: string;
}

const INITIAL_OFFERS: Offer[] = [
  {
    id: "OFF-8201",
    jobTitle: "Senior Product Manager",
    department: "Product",
    salary: "₹24,00,000",
    joiningDate: "July 01, 2026",
    expiryDate: "June 05, 2026",
    status: "Pending"
  },
  {
    id: "OFF-6192",
    jobTitle: "UI/UX Designer",
    department: "Design",
    salary: "₹14,50,000",
    joiningDate: "March 15, 2026",
    expiryDate: "Feb 20, 2026",
    status: "Declined",
    declineReason: "Location mismatch, requested hybrid but role required full onsite presence."
  }
];

export default function OfferLetterPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState("OFF-8201");
  const [sigType, setSigType] = useState<"type" | "draw">("type");
  const [typedName, setTypedName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReasonText, setDeclineReasonText] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("cn_offers");
    if (saved) {
      try {
        setOffers(JSON.parse(saved));
      } catch (e) {
        setOffers(INITIAL_OFFERS);
      }
    } else {
      localStorage.setItem("cn_offers", JSON.stringify(INITIAL_OFFERS));
      setOffers(INITIAL_OFFERS);
    }
  }, []);

  const activeOffer = offers.find((o) => o.id === selectedOfferId) || offers[0];

  // Confetti Launcher
  const launchConfetti = () => {
    for (let i = 0; i < 100; i++) {
      const confetti = document.createElement("div");
      confetti.className = "fixed pointer-events-none z-50 rounded-sm";

      const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.floor(Math.random() * 8) + 6;

      confetti.style.width = `${size}px`;
      confetti.style.height = `${size}px`;
      confetti.style.backgroundColor = randomColor;
      confetti.style.left = `${Math.random() * 100}vw`;
      confetti.style.top = `-20px`;

      const duration = Math.random() * 3 + 2;
      const delay = Math.random() * 0.5;

      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      confetti.style.transition = `top ${duration}s linear ${delay}s, left ${duration}s ease-in-out ${delay}s, transform ${duration}s ease-in-out ${delay}s`;

      document.body.appendChild(confetti);

      setTimeout(() => {
        confetti.style.top = "105vh";
        confetti.style.left = `${parseFloat(confetti.style.left) + (Math.random() * 200 - 100)}px`;
        confetti.style.transform = `rotate(${Math.random() * 720}deg)`;
      }, 50);

      setTimeout(() => confetti.remove(), (duration + delay) * 1000 + 100);
    }
  };

  // Drawing Canvas logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1E3A8A";
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Touch drawing support
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1E3A8A";
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    setIsDrawing(true);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Accept Offer
  const handleAcceptOffer = () => {
    if (sigType === "type" && !typedName.trim()) {
      toast.error("Please type your signature name to accept the offer.");
      return;
    }

    const updatedOffers = offers.map((o) => {
      if (o.id === selectedOfferId) {
        return {
          ...o,
          status: "Accepted" as const,
          signedName: sigType === "type" ? typedName : "Digitally Hand-drawn Signature",
          signedDate: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
          })
        };
      }
      return o;
    });

    localStorage.setItem("cn_offers", JSON.stringify(updatedOffers));
    setOffers(updatedOffers);
    launchConfetti();
    toast.success("Offer accepted! Welcome to the team!");
  };

  // Decline Offer
  const handleDeclineOffer = () => {
    if (!declineReasonText.trim()) {
      toast.error("Please provide a reason for declining the offer.");
      return;
    }

    const updatedOffers = offers.map((o) => {
      if (o.id === selectedOfferId) {
        return {
          ...o,
          status: "Declined" as const,
          declineReason: declineReasonText
        };
      }
      return o;
    });

    localStorage.setItem("cn_offers", JSON.stringify(updatedOffers));
    setOffers(updatedOffers);
    setShowDeclineModal(false);
    setDeclineReasonText("");
    toast.error("Offer declined.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pb-10">
      {/* Offers List Sidebar */}
      <div className="space-y-4 lg:col-span-1">
        <Typography variant="bodyMedium" className="font-bold text-slate-800 text-sm">
          Offers Received ({offers.length})
        </Typography>

        <div className="space-y-3">
          {offers.map((offer) => (
            <Card
              key={offer.id}
              radius="xl"
              onClick={() => setSelectedOfferId(offer.id)}
              className={`border cursor-pointer transition-all p-4 ${
                selectedOfferId === offer.id
                  ? "border-blue-500 bg-blue-50/10 shadow-sm ring-1 ring-blue-500/20"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <Typography variant="bodyMedium" className="font-bold text-slate-900 text-sm">
                    {offer.jobTitle}
                  </Typography>
                  <p className="text-xs text-slate-500 font-light">{offer.department}</p>
                </div>
                
                <span
                  className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    offer.status === "Accepted"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : offer.status === "Declined"
                      ? "bg-red-50 text-red-700 border-red-100"
                      : "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"
                  }`}
                >
                  {offer.status}
                </span>
              </div>

              <div className="flex items-center justify-between mt-4 text-[10px] text-slate-400 font-light border-t border-slate-100/50 pt-2">
                <span>CTC: {offer.salary}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  Expires: {offer.expiryDate}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Offer Preview & Signature Panel */}
      <div className="lg:col-span-2 space-y-6">
        {activeOffer ? (
          <>
            {/* Offer Letter Viewer Panel */}
            <Card radius="xl" className="border shadow-sm p-6 bg-white space-y-6">
              {/* Top Details & PDF Download Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border border-slate-100/60 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 p-2.5 rounded-lg">
                    <FileText className="size-6" />
                  </div>
                  <div>
                    <Typography variant="bodyMedium" className="font-bold text-slate-900 text-sm">
                      {activeOffer.jobTitle}_Offer.pdf
                    </Typography>
                    <p className="text-[10px] text-slate-400 font-light">Size: 1.2 MB • Generated 2 days ago</p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => toast.success("Offer letter downloaded successfully!")}
                  className="flex items-center gap-1.5 shrink-0 bg-white"
                >
                  <Download className="size-4" /> Download PDF
                </Button>
              </div>

              {/* High-fidelity Document Preview Layout */}
              <div className="border border-slate-200/60 rounded-2xl p-6 md:p-8 bg-slate-50/20 max-h-[500px] overflow-y-auto font-sans leading-relaxed text-slate-800 text-xs md:text-sm space-y-6 shadow-inner">
                {/* Header */}
                <div className="text-center border-b border-slate-200 pb-6 space-y-1">
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-slate-900">
                    Home First Finance Company
                  </h2>
                  <p className="text-[10px] text-slate-500 font-light">Corporate Office: Mumbai, MH, India</p>
                </div>

                {/* Offer Letter Text */}
                <div className="space-y-4 font-light">
                  <p className="font-medium text-slate-900">Ref: HFFC/HR/2026/{activeOffer.id}</p>
                  <p>Date: May 20, 2026</p>
                  
                  <p>To,</p>
                  <p className="font-bold text-slate-900">Candidate Name (Internal Transition)</p>
                  
                  <p className="font-medium text-slate-900 mt-4">Subject: Offer of Internal Appointment as {activeOffer.jobTitle}</p>
                  
                  <p>
                    Dear Candidate,
                  </p>
                  <p>
                    With reference to your application and subsequent discussions, we are pleased to offer you the position of <strong className="font-semibold">{activeOffer.jobTitle}</strong> in the <strong className="font-semibold">{activeOffer.department}</strong> department of our organization.
                  </p>
                  <p>
                    Your annual Gross Compensation will be <strong className="font-semibold">{activeOffer.salary}</strong>. The details of the Compensation structure are annexed herewith. Your scheduled date of joining this new role is <strong className="font-semibold">{activeOffer.joiningDate}</strong>.
                  </p>
                  <p>
                    By accepting this offer digitally, you agree to the terms of confidentiality, employment covenants, and organizational guidelines mentioned in the employee handbook.
                  </p>
                </div>

                {/* Annexure A: Compensation Table */}
                <div className="pt-6 border-t border-slate-100 space-y-3">
                  <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                    Annexure A: Compensation structure
                  </h3>
                  
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2">Salary Component</th>
                        <th className="p-2 text-right">Monthly (₹)</th>
                        <th className="p-2 text-right">Annual (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="font-light">
                      <tr className="border-b border-slate-100">
                        <td className="p-2">Basic Salary</td>
                        <td className="p-2 text-right">₹1,00,000</td>
                        <td className="p-2 text-right">₹12,00,000</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-2">House Rent Allowance (HRA)</td>
                        <td className="p-2 text-right">₹40,000</td>
                        <td className="p-2 text-right">₹4,80,000</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-2">Special Allowance</td>
                        <td className="p-2 text-right">₹45,000</td>
                        <td className="p-2 text-right">₹5,40,000</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-2">Provident Fund (Employer Share)</td>
                        <td className="p-2 text-right">₹12,000</td>
                        <td className="p-2 text-right">₹1,44,000</td>
                      </tr>
                      <tr className="border-b border-slate-100 font-semibold bg-blue-50/30">
                        <td className="p-2 text-slate-900 font-bold">Gross CTC</td>
                        <td className="p-2 text-right text-slate-900">₹2,00,000</td>
                        <td className="p-2 text-right text-slate-900">{activeOffer.salary}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Stamped signature area if already accepted */}
                {activeOffer.status === "Accepted" && (
                  <div className="pt-6 border-t border-slate-200 flex justify-end">
                    <div className="border-2 border-dashed border-emerald-500 bg-emerald-50/30 p-4 rounded-xl text-center max-w-[240px] transform rotate-1 space-y-1">
                      <span className="text-[10px] text-emerald-600 uppercase tracking-widest font-black block">Digitally Signed</span>
                      <p className="font-serif italic text-base text-slate-800 font-bold px-4">
                        {activeOffer.signedName}
                      </p>
                      <p className="text-[9px] text-slate-400">Date: {activeOffer.signedDate}</p>
                      <span className="inline-flex items-center justify-center size-5 bg-emerald-500 text-white rounded-full text-xs font-bold mt-1">✓</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Signature & Consent Action Box */}
            {activeOffer.status === "Pending" ? (
              <Card radius="xl" className="border shadow-sm p-6 bg-white space-y-5">
                <div className="flex items-center gap-2">
                  <PenTool className="size-5 text-blue-600" />
                  <Typography variant="bodyMedium" className="font-bold text-slate-900 text-sm">
                    Review and Sign Digitally
                  </Typography>
                </div>

                {/* Signature input types switcher */}
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                  <button
                    onClick={() => setSigType("type")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      sigType === "type" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Type Signature
                  </button>
                  <button
                    onClick={() => setSigType("draw")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      sigType === "draw" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Draw Signature
                  </button>
                </div>

                {/* Signature panels */}
                {sigType === "type" ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Type your full name (e.g. John Doe)"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-light"
                    />
                    
                    {typedName && (
                      <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 font-light">Preview Signature</p>
                        <p className="text-2xl font-serif italic text-blue-900 font-bold select-none py-2 tracking-wide">
                          {typedName}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={120}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawingTouch}
                        onTouchMove={drawTouch}
                        onTouchEnd={stopDrawing}
                        className="w-full block bg-white cursor-crosshair h-[120px]"
                      />
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="absolute bottom-2 right-2 bg-slate-900/75 hover:bg-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded transition-colors"
                      >
                        Clear Canvas
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-light text-center">
                      Use mouse or touch screen to draw your signature inside the box above.
                    </p>
                  </div>
                )}

                {/* Accept/Decline action buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    className="border-red-200 hover:bg-red-50 text-red-600 w-full sm:w-1/3 flex items-center justify-center gap-1.5"
                    onClick={() => setShowDeclineModal(true)}
                  >
                    <XCircle className="size-4" /> Decline Offer
                  </Button>
                  
                  <Button
                    variant="contain"
                    className="w-full sm:w-2/3 flex items-center justify-center gap-1.5"
                    onClick={handleAcceptOffer}
                  >
                    <CheckCircle2 className="size-4" /> Accept & Digitally Sign
                  </Button>
                </div>
              </Card>
            ) : (
              /* Already accepted or declined status display box */
              <Card
                radius="xl"
                className={`border shadow-sm p-6 ${
                  activeOffer.status === "Accepted"
                    ? "bg-emerald-50/30 border-emerald-200 text-emerald-900"
                    : "bg-red-50/30 border-red-200 text-red-900"
                }`}
              >
                {activeOffer.status === "Accepted" ? (
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full shrink-0">
                      <Check className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <Typography variant="bodyMedium" className="font-bold text-slate-900 text-sm">
                        You accepted this offer
                      </Typography>
                      <p className="text-xs text-slate-500 font-light leading-relaxed">
                        Your electronic signature has been applied. HR has been notified and will proceed with onboarding details.
                      </p>
                      <div className="pt-2 text-[11px] text-slate-500">
                        <strong>Signed:</strong> {activeOffer.signedName} on {activeOffer.signedDate}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="bg-red-100 text-red-600 p-3 rounded-full shrink-0">
                      <XCircle className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <Typography variant="bodyMedium" className="font-bold text-slate-900 text-sm">
                        You declined this offer
                      </Typography>
                      <p className="text-xs text-slate-500 font-light leading-relaxed">
                        Reason specified: <em className="text-slate-700">"{activeOffer.declineReason}"</em>
                      </p>
                      <p className="text-[10px] text-slate-400 pt-1 font-light">
                        If you did this by mistake or want to discuss further, please contact HR.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center p-6">
            <Clock className="size-12 text-slate-300 mb-3" />
            <Typography variant="bodyMedium" className="font-semibold text-slate-700">
              No Offers Found
            </Typography>
          </div>
        )}
      </div>

      {/* Decline Reason Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="bg-red-50 p-2.5 rounded-full">
                <AlertCircle className="size-6 text-red-600" />
              </div>
              <Typography variant="bodyMedium" className="font-extrabold text-slate-900 text-lg">
                Decline Offer?
              </Typography>
            </div>

            <p className="text-slate-600 text-xs md:text-sm font-light leading-relaxed">
              We are sorry to hear that. Please provide feedback on why you are declining this offer so our talent acquisition team can review and align.
            </p>

            <textarea
              rows={3}
              placeholder="Provide reason for declining the offer..."
              value={declineReasonText}
              onChange={(e) => setDeclineReasonText(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none font-light"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="subtle"
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReasonText("");
                }}
              >
                Go Back
              </Button>
              <Button
                variant="contain"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDeclineOffer}
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
