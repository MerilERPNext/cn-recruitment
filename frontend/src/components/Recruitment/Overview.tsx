import { Card } from "../shared/atoms/Card";
import {
  Calendar,
  Briefcase,
  FileText,
  CheckSquare,
  Users,
  Plus,
} from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";

const Overview = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2">
      <Card
        radius="xl"
        className="border md:col-span-2 flex flex-col w-full gap-4 p-4 md:p-6"
      >
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full">
          <button className="w-full  p-4 md:p-6 rounded-xl border border-gray-200/40 transition-all hover:shadow-md text-left group">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Briefcase className="size-5 md:size-6 text-cyan-500" />
              </div>
              <div>
                <Typography
                  variant="bodySmall"
                  className="uppercase mb-1"
                  color="body2"
                >
                  All Job Openings
                </Typography>
                <Typography variant="subheading" color="primary">
                  25
                </Typography>
              </div>
            </div>
          </button>

          <button className="w-full p-4 md:p-6 rounded-xl border border-gray-200/40 transition-all hover:shadow-md text-left group">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-pink-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <FileText className="size-5 md:size-6 text-pink-500" />
              </div>
              <div>
                <Typography
                  variant="bodySmall"
                  className="uppercase mb-1"
                  color="body2"
                >
                  All Requisition Positions
                </Typography>
                <Typography variant="subheading" color="primary">
                  65
                </Typography>
              </div>
            </div>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs md:text-sm font-medium text-gray-700 cursor-pointer transition-colors">
            All - 50
          </span>
          <span className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs md:text-sm font-medium text-gray-700 cursor-pointer transition-colors">
            Open - 33
          </span>
          <span className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs md:text-sm font-medium text-gray-700 cursor-pointer transition-colors">
            Draft - 12
          </span>
          <span className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs md:text-sm font-medium text-gray-700 cursor-pointer transition-colors">
            On Hold - 0
          </span>
        </div>
      </Card>

      <Card radius="xl" className="border p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
            <Calendar className="size-5 text-primary" />
          </div>
          <Typography variant="bodyMedium">My Interviews</Typography>
        </div>

        <div className="flex flex-col items-center justify-center py-6 md:py-8">
          <div className="w-20 h-20 md:w-24 md:h-24 mb-3 md:mb-4">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="70" r="25" fill="#E0F2FE" />
              <rect
                x="35"
                y="45"
                width="30"
                height="35"
                fill="#3B82F6"
                rx="2"
              />
              <rect x="40" y="35" width="20" height="8" fill="#60A5FA" rx="1" />
              <circle cx="50" cy="25" r="8" fill="#FCA5A5" />
            </svg>
          </div>

          <Typography color="body2">
            No interviews scheduled at the moment!
          </Typography>
        </div>
      </Card>

      <Card radius="xl" className="border md:col-span-2 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="size-10 bg-orange-500/10 rounded-lg flex items-center justify-center shrink-0">
            <CheckSquare className="size-5 text-orange-500" />
          </div>
          <Typography variant="bodyMedium">My Tasks</Typography>
        </div>

        <div className="flex flex-col items-center justify-center py-6 md:py-8">
          <div className="w-24 h-24 md:w-32 md:h-32 mb-3 md:mb-4">
            <svg viewBox="0 0 120 100" className="w-full h-full">
              <ellipse cx="60" cy="85" rx="50" ry="8" fill="#E0E7FF" />
              <rect
                x="45"
                y="40"
                width="30"
                height="45"
                fill="#93C5FD"
                rx="2"
              />
              <circle cx="60" cy="25" r="12" fill="#FCA5A5" />
              <rect x="50" y="20" width="20" height="5" fill="#1E40AF" />
              <path
                d="M 30 50 Q 25 45 20 50"
                stroke="#1E3A8A"
                strokeWidth="3"
                fill="none"
              />
              <circle cx="25" cy="50" r="3" fill="#1E3A8A" />
            </svg>
          </div>
          <Typography color="body2"> No pending tasks with you!</Typography>
        </div>
      </Card>

      <Card radius="xl" className="border md:col-span-2 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-teal-500/10 rounded-lg flex items-center justify-center shrink-0">
              <Users className="size-5 text-teal-500" />
            </div>
            <Typography variant="bodyMedium">My Referrals</Typography>
          </div>

          <Button variant="subtle" size="md">
            <Plus className="size-4" />
            ADD NEW REFERRAL
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center py-6 md:py-8">
          <div className="w-24 h-24 md:w-32 md:h-32 mb-3 md:mb-4">
            <svg viewBox="0 0 120 100" className="w-full h-full">
              <ellipse cx="60" cy="85" rx="55" ry="10" fill="#E0F2FE" />
              <circle cx="45" cy="45" r="12" fill="#93C5FD" />
              <circle cx="45" cy="35" r="8" fill="#FCA5A5" />
              <circle cx="65" cy="40" r="12" fill="#93C5FD" />
              <circle cx="65" cy="30" r="8" fill="#FBBF24" />
              <circle cx="75" cy="35" r="12" fill="#93C5FD" />
              <circle cx="75" cy="25" r="8" fill="#60A5FA" />
            </svg>
          </div>

          <Typography color="body2" className="mb-3 md:mb-4">
            You haven't referred anyone so far!
          </Typography>

          <Button variant="contain" size="md">
            <Plus className="size-4" />
            ADD NEW REFERRALS
          </Button>
        </div>
      </Card>

      <Card radius="xl" className="border md:col-span-2 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="size-10 bg-purple-500/10 rounded-lg flex items-center justify-center shrink-0">
            <Briefcase className="size-5 text-purple-500" />
          </div>
          <Typography variant="bodyMedium">Internal Job Openings</Typography>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800 mb-1 text-sm md:text-base">
                Associate
              </h4>
              <p className="text-xs md:text-sm text-gray-600">
                Multiple locations
              </p>
              <p className="text-xs md:text-sm text-gray-600">
                Academics Design
              </p>
            </div>

            <Button variant="contain" size="md">
              APPLY
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800 mb-1 text-sm md:text-base">
                Tech Product management
              </h4>
              <p className="text-xs md:text-sm text-gray-600 line-clamp-2 sm:line-clamp-1">
                Branch Office - Mumbai - MH, Mumbai, Maharashtra, India
                (PW_BO_MH)
              </p>
              <p className="text-xs md:text-sm text-gray-600">
                Tech - Product Management
              </p>
            </div>
            <Button variant="contain" size="md">
              APPLY
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Overview;
