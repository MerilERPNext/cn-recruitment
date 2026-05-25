import { useState, useEffect } from "react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import {
  Calendar,
  MapPin,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ClipboardList,
  Sparkles
} from "lucide-react";
import toast from "react-hot-toast";

interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  department: string;
  location: string;
  appliedDate: string;
  experience: string;
  sop: string;
  cvName: string;
  status: "Applied" | "Screening" | "Technical Round" | "Manager Round" | "Offered" | "Withdrawn";
}

const DEFAULT_APPLICATIONS: Application[] = [
  {
    id: "IJP-892147",
    jobId: "job-default-1",
    jobTitle: "Senior Product Manager",
    department: "Product",
    location: "Mumbai",
    appliedDate: "May 12, 2026",
    experience: "5.5 years",
    sop: "I want to apply for the Senior Product Manager position to help guide the strategy and roadmap for our customer experiences. My experience aligns perfectly with scaling B2B solutions.",
    cvName: "product_manager_resume_2026.pdf",
    status: "Technical Round"
  },
  {
    id: "IJP-291045",
    jobId: "job-default-2",
    jobTitle: "HR Operations Specialist",
    department: "Human Resources",
    location: "Bangalore",
    appliedDate: "May 08, 2026",
    experience: "3 years",
    sop: "I am eager to transition to the HR Operations Specialist role. Having worked in HR admin for 2+ years, I understand our database systems, payroll coordination, and onboarding flows.",
    cvName: "hr_operations_cv_final.pdf",
    status: "Offered"
  }
];

const STEPS = ["Applied", "Screening", "Technical Round", "Manager Round", "Decision"];

export default function IJPJobsApplied() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppToWithdraw, setSelectedAppToWithdraw] = useState<Application | null>(null);
  const [isConfirmingWithdraw, setIsConfirmingWithdraw] = useState(false);

  // Load applications from localStorage or populate default ones
  useEffect(() => {
    const saved = localStorage.getItem("cn_ijp_applications");
    if (saved) {
      try {
        setApplications(JSON.parse(saved));
      } catch (e) {
        console.error(e);
        setApplications(DEFAULT_APPLICATIONS);
      }
    } else {
      localStorage.setItem("cn_ijp_applications", JSON.stringify(DEFAULT_APPLICATIONS));
      setApplications(DEFAULT_APPLICATIONS);
    }
  }, []);

  const handleWithdraw = () => {
    if (!selectedAppToWithdraw) return;

    const updatedApps = applications.map((app) => {
      if (app.id === selectedAppToWithdraw.id) {
        return { ...app, status: "Withdrawn" as const };
      }
      return app;
    });

    localStorage.setItem("cn_ijp_applications", JSON.stringify(updatedApps));
    setApplications(updatedApps);
    setIsConfirmingWithdraw(false);
    setSelectedAppToWithdraw(null);
    toast.success("Application withdrawn successfully.");
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case "Applied":
        return 0;
      case "Screening":
        return 1;
      case "Technical Round":
        return 2;
      case "Manager Round":
        return 3;
      case "Offered":
        return 4;
      default:
        return 0;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Offered":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Withdrawn":
        return "bg-rose-50 text-rose-600 border-rose-200";
      case "Applied":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-blue-600" />
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              My Applied Internal Jobs
            </h1>
          </div>
          <p className="text-slate-500 text-xs md:text-sm font-light">
            Monitor stages, review job requirements, and view offers for your IJP submissions.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 shrink-0 text-center">
          <span className="text-xs text-slate-500 font-light block">Active Applications</span>
          <span className="text-lg font-bold text-blue-600">
            {applications.filter((app) => app.status !== "Withdrawn").length}
          </span>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-6">
        {applications.map((app) => {
          const currentStep = getStepIndex(app.status);
          const isWithdrawn = app.status === "Withdrawn";
          const isOffered = app.status === "Offered";

          return (
            <Card
              key={app.id}
              radius="xl"
              className={`border transition-all p-6 bg-white relative ${
                isWithdrawn ? "opacity-75 border-slate-200" : "hover:border-blue-300 border-slate-200"
              }`}
            >
              {/* Top Row: Job Title, ID, Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography variant="bodyMedium" className="font-bold text-slate-900 text-base md:text-lg">
                      {app.jobTitle}
                    </Typography>
                    <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      {app.id}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-xs font-light">
                    <span className="flex items-center gap-1">
                      <Building2 className="size-3.5" />
                      {app.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {app.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      Applied: {app.appliedDate}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0 flex items-center gap-2">
                  <span
                    className={`text-xs font-bold border px-3 py-1 rounded-full ${getStatusColor(
                      app.status
                    )}`}
                  >
                    {app.status}
                  </span>
                </div>
              </div>

              {/* Stepper (Only visible if not withdrawn) */}
              {!isWithdrawn ? (
                <div className="mb-6">
                  <div className="relative">
                    {/* Stepper Background Line */}
                    <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-100 -z-0" />
                    
                    {/* Stepper Active Progress Line */}
                    <div
                      className="absolute top-4 left-4 h-0.5 bg-blue-500 transition-all duration-500 -z-0"
                      style={{
                        width: `${(currentStep / (STEPS.length - 1)) * 96}%`
                      }}
                    />

                    {/* Steps Row */}
                    <div className="relative flex justify-between items-start z-10">
                      {STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStep;
                        const isActive = idx === currentStep;
                        const isStepOffered = isOffered && idx === STEPS.length - 1;

                        return (
                          <div key={step} className="flex flex-col items-center max-w-[120px] text-center">
                            {/* Step Indicator Dot */}
                            <div
                              className={`size-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                isStepOffered
                                  ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100"
                                  : isCompleted
                                  ? "bg-blue-500 border-blue-500 text-white"
                                  : isActive
                                  ? "bg-white border-blue-600 text-blue-600 font-bold scale-110 shadow-md"
                                  : "bg-white border-slate-200 text-slate-400"
                              }`}
                            >
                              {isStepOffered ? (
                                <Sparkles className="size-4" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="size-4" />
                              ) : (
                                <span className="text-xs">{idx + 1}</span>
                              )}
                            </div>

                            {/* Step Label */}
                            <span
                              className={`hidden md:block text-[10px] md:text-xs mt-2 font-medium ${
                                isStepOffered
                                  ? "text-emerald-600 font-bold"
                                  : isActive
                                  ? "text-blue-600 font-bold"
                                  : isCompleted
                                  ? "text-slate-700"
                                  : "text-slate-400"
                              }`}
                            >
                              {isStepOffered ? "Offer Extended" : step}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Mobile Stage Label */}
                    <div className="md:hidden mt-4 text-center">
                      <span className="text-xs text-slate-500">Current Stage: </span>
                      <span className={`text-xs font-bold ${isOffered ? "text-emerald-600" : "text-blue-600"}`}>
                        {isOffered ? "Offer Extended" : app.status}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Withdrawn warning banner */
                <div className="mb-6 p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-light">
                  <ShieldAlert className="size-5 text-rose-500 shrink-0" />
                  <div>
                    <span className="font-bold text-rose-800 block">Application Withdrawn</span>
                    You withdrew this application. If this was a mistake, please reach out to the Talent Acquisition team.
                  </div>
                </div>
              )}

              {/* Collapsible Details / Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 bg-slate-50/50 -mx-6 -mb-6 p-6 rounded-b-xl">
                <div className="text-xs text-slate-500 font-light flex flex-col gap-1">
                  <span>
                    <strong>Attached Resume:</strong> {app.cvName}
                  </span>
                  <span>
                    <strong>Experience Declared:</strong> {app.experience}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status contextual actions */}
                  {isOffered && (
                    <Button
                      variant="contain"
                      className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                      onClick={() => window.location.href = "/webapp/recruitment/offer-letter"}
                    >
                      View Offer Letter
                    </Button>
                  )}
                  
                  {!isWithdrawn && !isOffered && (
                    <Button
                      variant="outline"
                      className="border-red-200 hover:bg-red-50 text-red-600 w-full sm:w-auto"
                      onClick={() => {
                        setSelectedAppToWithdraw(app);
                        setIsConfirmingWithdraw(true);
                      }}
                    >
                      Withdraw Application
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {applications.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center p-6">
            <Clock className="size-12 text-slate-300 mb-3" />
            <Typography variant="bodyMedium" className="font-semibold text-slate-700">
              No internal applications yet
            </Typography>
            <Typography variant="caption" className="text-slate-500 mt-1 max-w-sm">
              You haven't submitted any internal applications. Explore current internal listings in the <strong>IJP Openings</strong> tab to apply.
            </Typography>
            <div className="mt-4">
              <Button
                variant="contain"
                onClick={() => window.location.href = "/webapp/recruitment/ijp-openings"}
              >
                Browse IJP Openings
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {isConfirmingWithdraw && selectedAppToWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="bg-red-50 p-2.5 rounded-full">
                <AlertTriangle className="size-6 text-red-600" />
              </div>
              <Typography variant="bodyMedium" className="font-extrabold text-slate-900 text-lg">
                Withdraw Application?
              </Typography>
            </div>

            <p className="text-slate-600 text-sm font-light leading-relaxed">
              Are you sure you want to withdraw your application for <strong className="text-slate-800 font-semibold">{selectedAppToWithdraw.jobTitle}</strong>? This action is permanent and your candidacy for this specific posting will be closed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="subtle"
                onClick={() => {
                  setIsConfirmingWithdraw(false);
                  setSelectedAppToWithdraw(null);
                }}
              >
                No, Keep Active
              </Button>
              <Button
                variant="contain"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleWithdraw}
              >
                Yes, Withdraw
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
