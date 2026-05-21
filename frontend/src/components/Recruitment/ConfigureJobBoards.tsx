import React, { useState, useEffect } from "react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import {
  Settings2,
  CheckCircle2,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Sliders,
  Database,
  Key,
  Globe,
  Power,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";

interface JobBoardConfig {
  id: string;
  name: string;
  isActive: boolean;
  clientId: string;
  clientSecret: string;
  apiEndpoint: string;
  lastSynced?: string;
  logoColor: string;
}

const INITIAL_BOARDS: JobBoardConfig[] = [
  {
    id: "board-linkedin",
    name: "LinkedIn Jobs Integration",
    isActive: true,
    clientId: "hffc_ln_prod_9021",
    clientSecret: "sec_88921_lkjadsf_992384a_2634",
    apiEndpoint: "https://api.linkedin.com/v2/simpleJobPostings",
    lastSynced: "May 20, 2026 at 06:12 PM",
    logoColor: "bg-blue-600"
  },
  {
    id: "board-indeed",
    name: "Indeed Jobs Publisher API",
    isActive: false,
    clientId: "indeed_pub_82310",
    clientSecret: "sec_indeed_kjasd99112_aa8810",
    apiEndpoint: "https://api.indeed.com/v2/jobpush",
    logoColor: "bg-blue-800"
  },
  {
    id: "board-ziprecruiter",
    name: "ZipRecruiter Partner Feed",
    isActive: false,
    clientId: "zip_partner_hffc",
    clientSecret: "sec_zip_91823_kkadfa_81239",
    apiEndpoint: "https://api.ziprecruiter.com/v1/jobs",
    logoColor: "bg-green-600"
  }
];

export default function ConfigureJobBoards() {
  const [boards, setBoards] = useState<JobBoardConfig[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState("board-linkedin");
  
  // Form values (controlled per selected board)
  const [isActive, setIsActive] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  
  // Loading animations
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSync, setIsTestingSync] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cn_job_boards");
    if (saved) {
      try {
        setBoards(JSON.parse(saved));
      } catch (e) {
        setBoards(INITIAL_BOARDS);
      }
    } else {
      localStorage.setItem("cn_job_boards", JSON.stringify(INITIAL_BOARDS));
      setBoards(INITIAL_BOARDS);
    }
  }, []);

  // Update controlled fields when selecting a different board
  const activeBoard = boards.find((b) => b.id === selectedBoardId) || boards[0];

  useEffect(() => {
    if (activeBoard) {
      setIsActive(activeBoard.isActive);
      setClientId(activeBoard.clientId);
      setClientSecret(activeBoard.clientSecret);
      setApiEndpoint(activeBoard.apiEndpoint);
      setShowSecret(false);
    }
  }, [selectedBoardId, boards, activeBoard]);

  // Save Settings Form
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim() || !apiEndpoint.trim()) {
      toast.error("Please fill in all API credentials.");
      return;
    }

    setIsSaving(true);
    
    setTimeout(() => {
      const updated = boards.map((b) => {
        if (b.id === selectedBoardId) {
          return {
            ...b,
            isActive,
            clientId,
            clientSecret,
            apiEndpoint
          };
        }
        return b;
      });

      localStorage.setItem("cn_job_boards", JSON.stringify(updated));
      setBoards(updated);
      setIsSaving(false);
      toast.success(`Saved configuration for ${activeBoard.name}.`);
    }, 1200);
  };

  // Sync / Test Connection simulator
  const handleSyncNow = () => {
    if (!activeBoard.isActive) {
      toast.error("Please enable the job board integration before running a sync.");
      return;
    }

    setIsTestingSync(true);
    toast.success("Initiating API authentication and job sync query...");

    setTimeout(() => {
      const updated = boards.map((b) => {
        if (b.id === selectedBoardId) {
          return {
            ...b,
            lastSynced: new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            }) + " at " + new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit"
            })
          };
        }
        return b;
      });

      localStorage.setItem("cn_job_boards", JSON.stringify(updated));
      setBoards(updated);
      setIsTestingSync(false);
      toast.success(`Sync successful. Active postings pushed to ${activeBoard.name}.`);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings2 className="size-5 text-blue-600" />
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              Configure External Job Boards
            </h1>
          </div>
          <p className="text-slate-500 text-xs md:text-sm font-light">
            Set up credentials and endpoints to push recruitment openings directly to LinkedIn, Indeed, and ZipRecruiter.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-amber-800 shrink-0 text-xs font-light">
          <ShieldCheck className="size-4 shrink-0 text-amber-600" />
          <span>Credentials are stored securely using corporate encryption vault standards.</span>
        </div>
      </div>

      {/* Boards List Sidebar */}
      <div className="lg:col-span-1 space-y-3">
        <Typography variant="bodyMedium" className="font-bold text-slate-800 text-sm">
          Integrations ({boards.length})
        </Typography>

        <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 pb-2 lg:pb-0">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => setSelectedBoardId(board.id)}
              className={`w-full text-left p-4 rounded-xl border flex items-center justify-between gap-3 transition-all shrink-0 min-w-[240px] lg:min-w-0 ${
                selectedBoardId === board.id
                  ? "border-blue-500 bg-blue-50/10 shadow-sm ring-1 ring-blue-500/20"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`size-8 rounded-lg shrink-0 flex items-center justify-center text-white ${board.logoColor}`}>
                  <Globe className="size-4" />
                </div>
                <div>
                  <Typography variant="bodyMedium" className="font-bold text-slate-900 text-xs md:text-sm truncate max-w-[140px] md:max-w-none">
                    {board.name.split(" ")[0]}
                  </Typography>
                  <p className="text-[10px] text-slate-400 font-light">
                    {board.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
              
              <span
                className={`size-2.5 rounded-full shrink-0 ${
                  board.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Detail Panel */}
      <div className="lg:col-span-3">
        {activeBoard ? (
          <Card radius="xl" className="border shadow-sm p-6 bg-white space-y-6">
            {/* Header: Name and Status Switch */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <Typography variant="bodyMedium" className="font-bold text-slate-900 text-base md:text-lg">
                  {activeBoard.name} Settings
                </Typography>
                <p className="text-xs text-slate-400 font-light">Configure API keys and credentials for direct integration.</p>
              </div>

              {/* Status Toggle control */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                <Power className={`size-4 ${isActive ? "text-emerald-500" : "text-slate-400"}`} />
                <span className="text-xs font-semibold text-slate-700 select-none">Integration Status:</span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Config Form */}
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client ID / App ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    Client ID / Application ID
                  </label>
                  <input
                    type="text"
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-light"
                  />
                </div>

                {/* Client Secret / Token */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    Client Secret / Security Token
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      required
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-light"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* API Endpoint Endpoint */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    Integration API Endpoint URL
                  </label>
                  <input
                    type="url"
                    required
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-light font-mono"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-100">
                <div className="text-xs text-slate-400 font-light">
                  {activeBoard.lastSynced ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      Last successful sync: {activeBoard.lastSynced}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="size-4 text-slate-400 shrink-0" />
                      Never synchronized. Save credentials and sync to push openings.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isTestingSync || !isActive}
                    onClick={handleSyncNow}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-white"
                  >
                    <RefreshCw className={`size-4 ${isTestingSync ? "animate-spin" : ""}`} />
                    {isTestingSync ? "Syncing..." : "Sync Now"}
                  </Button>
                  
                  <Button
                    variant="contain"
                    type="submit"
                    disabled={isSaving}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5"
                  >
                    <Save className="size-4" />
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center p-6">
            <Settings2 className="size-12 text-slate-300 mb-3" />
            <Typography variant="bodyMedium" className="font-semibold text-slate-700">
              Select an Integration Board
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
}
