import { useState, useEffect } from "react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import {
  Linkedin,
  Github,
  Chrome,
  Briefcase,
  RefreshCw,
  CheckCircle2,
  X,
  Link2,
  Unlink,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import toast from "react-hot-toast";

interface LinkedAccount {
  id: string;
  name: string;
  logoType: "linkedin" | "github" | "indeed" | "google";
  description: string;
  scope: string[];
  isConnected: boolean;
  lastSynced?: string;
}

const INITIAL_ACCOUNTS: LinkedAccount[] = [
  {
    id: "acct-linkedin",
    name: "LinkedIn",
    logoType: "linkedin",
    description: "Import your work history, skills, endorsements, and certifications directly to your job profile.",
    scope: ["r_liteprofile", "r_emailaddress", "w_member_social"],
    isConnected: true,
    lastSynced: "May 20, 2026 at 10:15 AM"
  },
  {
    id: "acct-github",
    name: "GitHub",
    logoType: "github",
    description: "Link your developer portfolio, showcase public repositories, and prove coding contribution stats.",
    scope: ["read:user", "repo:status"],
    isConnected: false
  },
  {
    id: "acct-indeed",
    name: "Indeed",
    logoType: "indeed",
    description: "Sync your application history and transfer pre-verified resume details from Indeed Jobs.",
    scope: ["indeed.profile.read"],
    isConnected: false
  },
  {
    id: "acct-google",
    name: "Google Career Account",
    logoType: "google",
    description: "Sync personal information, set up calendar notifications for interviews, and connect Gmail updates.",
    scope: ["profile", "email", "calendar.events.readonly"],
    isConnected: true,
    lastSynced: "May 21, 2026 at 09:30 AM"
  }
];

export default function LinkAccounts() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [activeOAuthAcct, setActiveOAuthAcct] = useState<LinkedAccount | null>(null);
  
  // OAuth simulation states
  const [oauthStep, setOauthStep] = useState<"consent" | "syncing" | "success">("consent");
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncText, setSyncText] = useState("");
  
  // Single card loading state for re-syncing
  const [syncingCardId, setSyncingCardId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("cn_linked_accounts");
    if (saved) {
      try {
        setAccounts(JSON.parse(saved));
      } catch (e) {
        setAccounts(INITIAL_ACCOUNTS);
      }
    } else {
      localStorage.setItem("cn_linked_accounts", JSON.stringify(INITIAL_ACCOUNTS));
      setAccounts(INITIAL_ACCOUNTS);
    }
  }, []);

  // Simulating manual re-sync click
  const handleReSync = (id: string, name: string) => {
    setSyncingCardId(id);
    toast.success(`Initiated synchronizing with ${name}...`);
    
    setTimeout(() => {
      const updated = accounts.map((acct) => {
        if (acct.id === id) {
          return {
            ...acct,
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
        return acct;
      });

      localStorage.setItem("cn_linked_accounts", JSON.stringify(updated));
      setAccounts(updated);
      setSyncingCardId(null);
      toast.success(`Successfully updated profile sync with ${name}.`);
    }, 1500);
  };

  // Launch simulated OAuth connection dialog
  const handleConnect = (account: LinkedAccount) => {
    setActiveOAuthAcct(account);
    setOauthStep("consent");
    setSyncProgress(0);
    setSyncText("");
  };

  // Confirm authorization in simulated OAuth modal
  const handleAuthorize = () => {
    if (!activeOAuthAcct) return;

    setOauthStep("syncing");
    setSyncProgress(10);
    setSyncText("Establishing handshakes & securing token credentials...");

    // Stage 1 loader
    setTimeout(() => {
      setSyncProgress(45);
      setSyncText(`Authenticating OAuth scopes: [${activeOAuthAcct.scope.join(", ")}]...`);
    }, 800);

    // Stage 2 loader
    setTimeout(() => {
      setSyncProgress(80);
      setSyncText("Retrieving profile data, history records, and credentials...");
    }, 1600);

    // Finalize
    setTimeout(() => {
      setSyncProgress(100);
      setSyncText("Connection established. Formatting and syncing data structures...");
      
      const updated = accounts.map((acct) => {
        if (acct.id === activeOAuthAcct.id) {
          return {
            ...acct,
            isConnected: true,
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
        return acct;
      });

      localStorage.setItem("cn_linked_accounts", JSON.stringify(updated));
      setAccounts(updated);
      setOauthStep("success");
      toast.success(`${activeOAuthAcct.name} connected successfully!`);
    }, 2400);
  };

  // Disconnect confirmation
  const handleDisconnect = (id: string, name: string) => {
    const updated = accounts.map((acct) => {
      if (acct.id === id) {
        return {
          ...acct,
          isConnected: false,
          lastSynced: undefined
        };
      }
      return acct;
    });

    localStorage.setItem("cn_linked_accounts", JSON.stringify(updated));
    setAccounts(updated);
    toast.error(`Disconnected ${name} account profile.`);
  };

  // Render Platform Logo
  const renderLogo = (type: string) => {
    switch (type) {
      case "linkedin":
        return (
          <div className="size-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <Linkedin className="size-6" />
          </div>
        );
      case "github":
        return (
          <div className="size-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <Github className="size-6" />
          </div>
        );
      case "google":
        return (
          <div className="size-12 bg-rose-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <Chrome className="size-6" />
          </div>
        );
      case "indeed":
      default:
        return (
          <div className="size-12 bg-blue-800 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <Briefcase className="size-6" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link2 className="size-5 text-blue-600" />
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              Link Career Profiles
            </h1>
          </div>
          <p className="text-slate-500 text-xs md:text-sm font-light">
            Connect external professional networks to automatically populate applications, synch credentials, and calendar invites.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 text-blue-800 shrink-0 text-xs">
          <ShieldCheck className="size-4 shrink-0" />
          <span>All connections are encrypted and comply with data privacy policies.</span>
        </div>
      </div>

      {/* Grid of Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts.map((acct) => {
          const isCardSyncing = syncingCardId === acct.id;
          return (
            <Card
              key={acct.id}
              radius="xl"
              className={`border bg-white flex flex-col justify-between h-full p-5 relative overflow-hidden transition-all ${
                acct.isConnected ? "border-slate-200 hover:border-slate-300" : "border-slate-200 hover:border-blue-300 bg-slate-50/20"
              }`}
            >
              {/* Card Header */}
              <div className="flex gap-4 mb-4">
                {renderLogo(acct.logoType)}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Typography variant="bodyMedium" className="font-bold text-slate-900 text-base">
                      {acct.name}
                    </Typography>
                    
                    {acct.isConnected && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-0.5">
                        <CheckCircle2 className="size-2.5" /> Connected
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-500 font-light line-clamp-2">
                    {acct.description}
                  </p>
                </div>
              </div>

              {/* Scope lists */}
              <div className="my-4 pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Authorized Scopes:</span>
                <div className="flex flex-wrap gap-1.5">
                  {acct.scope.map((s) => (
                    <code key={s} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono font-medium">
                      {s}
                    </code>
                  ))}
                </div>
              </div>

              {/* Sync status & Actions footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  {acct.isConnected && acct.lastSynced ? (
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Last Profile Sync</span>
                      <span className="text-[11px] text-slate-600 font-medium">{acct.lastSynced}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-light flex items-center gap-1">
                      <Lock className="size-3.5" /> Not Connected
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {acct.isConnected ? (
                    <>
                      <button
                        onClick={() => handleDisconnect(acct.id, acct.name)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50/50 hover:bg-red-50 p-2 rounded-xl border border-red-100 transition-colors"
                        title="Disconnect profile"
                      >
                        <Unlink className="size-4" />
                      </button>
                      
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => handleReSync(acct.id, acct.name)}
                        disabled={isCardSyncing}
                        className="flex items-center gap-1 bg-white"
                      >
                        <RefreshCw className={`size-3.5 ${isCardSyncing ? "animate-spin" : ""}`} />
                        {isCardSyncing ? "Syncing..." : "Sync Profile"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contain"
                      size="md"
                      onClick={() => handleConnect(acct)}
                      className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Simulated OAuth popup Modal */}
      {activeOAuthAcct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col h-[400px] justify-between animate-in zoom-in-95 duration-200">
            {/* OAuth Window Top Header */}
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-mono font-medium">
              <span className="flex items-center gap-1.5">
                <Lock className="size-3.5 text-emerald-400" /> secure.oauth.{activeOAuthAcct.name.toLowerCase().replace(/\s+/g, "")}.com
              </span>
              <button onClick={() => setActiveOAuthAcct(null)} className="text-slate-400 hover:text-white transition-colors">
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body depending on step */}
            {oauthStep === "consent" && (
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Sync icons */}
                  <div className="flex items-center justify-center gap-6 py-2">
                    {renderLogo(activeOAuthAcct.logoType)}
                    <ArrowRight className="size-6 text-slate-300 animate-pulse" />
                    <div className="size-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-md">
                      <Zap className="size-6 text-blue-600" />
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <h3 className="font-bold text-slate-900 text-base">
                      Authorize Profile Sync
                    </h3>
                    <p className="text-xs text-slate-500 font-light leading-relaxed px-4">
                      <strong>HomeFirst Candidate Portal</strong> is requesting secure permission to access details of your <strong>{activeOAuthAcct.name}</strong> account.
                    </p>
                  </div>

                  {/* Scopes box */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-light text-slate-600 space-y-1.5">
                    <span className="font-bold text-slate-700 block">Requested Permissions:</span>
                    <ul className="list-disc pl-4 space-y-1">
                      {activeOAuthAcct.scope.map((s) => (
                        <li key={s} className="font-mono text-[10px] text-slate-500">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <Button variant="subtle" className="w-full" onClick={() => setActiveOAuthAcct(null)}>
                    Cancel
                  </Button>
                  <Button variant="contain" className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleAuthorize}>
                    Authorize & Link
                  </Button>
                </div>
              </div>
            )}

            {oauthStep === "syncing" && (
              <div className="p-6 flex-grow flex flex-col items-center justify-center text-center space-y-4">
                <RefreshCw className="size-10 text-blue-600 animate-spin" />
                <div className="space-y-2 w-full">
                  <h4 className="font-bold text-slate-900 text-sm">Syncing Account Data</h4>
                  <p className="text-[11px] text-slate-500 font-light min-h-[32px] px-6">
                    {syncText}
                  </p>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[280px] mx-auto">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {oauthStep === "success" && (
              <div className="p-6 flex-grow flex flex-col justify-between items-center text-center">
                <div className="my-auto space-y-3">
                  <div className="size-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-base">Account Successfully Linked!</h4>
                    <p className="text-xs text-slate-500 font-light px-4 leading-relaxed">
                      You have successfully synchronized your {activeOAuthAcct.name} profile with the candidate portal.
                    </p>
                  </div>
                </div>

                <Button variant="contain" className="w-full bg-emerald-600 hover:bg-emerald-700 mt-4" onClick={() => setActiveOAuthAcct(null)}>
                  Return to Dashboard
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
