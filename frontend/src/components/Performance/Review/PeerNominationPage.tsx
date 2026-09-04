import { CircleHelp } from "lucide-react";
import { lazy, useMemo, useState } from "react";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import toast from "react-hot-toast";

const PeerNominationHeader = lazy(() =>
  import("./components/PeerNominationHeader").then((m) => ({
    default: m.PeerNominationHeader,
  })),
);
const PeerNominationFilterBar = lazy(() =>
  import("./components/PeerNominationFilterBar").then((m) => ({
    default: m.PeerNominationFilterBar,
  })),
);
const ReviewerCard = lazy(() =>
  import("./components/ReviewerCard").then((m) => ({
    default: m.ReviewerCard,
  })),
);

const INITIAL_REVIEWERS = [
  {
    id: 1,
    initials: "KI",
    name: "Karthik Iyer",
    role: "Eng Lead · Platform",
    suggestionText: "Worked on Oxygen 2.0 (84 PRs)",
    bu: "india_tech",
    selected: true,
  },
  {
    id: 2,
    initials: "NP",
    name: "Neha Patel",
    role: "Product Manager · Oxygen",
    suggestionText: "PM partner on dashboard rebuild",
    bu: "india_tech",
    selected: true,
  },
  {
    id: 3,
    initials: "MS",
    name: "Mohit Sinha",
    role: "Sr. Designer · Recruitment",
    suggestionText: "Frequent design crit collaborator",
    bu: "india_tech",
    selected: true,
  },
  {
    id: 4,
    initials: "RB",
    name: "Riya Banerjee",
    role: "Research Lead",
    suggestionText: "Joint research projects (3)",
    bu: "us_tech",
    selected: true,
  },
  {
    id: 5,
    initials: "AB",
    name: "Aman Bhatt",
    role: "Frontend Eng",
    suggestionText: "Slack DMs (high freq) + 12 PRs",
    bu: "india_tech",
    selected: false,
  },
  {
    id: 6,
    initials: "SD",
    name: "Shreya Das",
    role: "Content Strategist",
    suggestionText: "Cross-functional workshop facilitator",
    bu: "uk_tech",
    selected: false,
  },
  {
    id: 7,
    initials: "VR",
    name: "Vikram Rao",
    role: "Sr. Designer · LMS",
    suggestionText: "Design system v2 co-author",
    bu: "us_tech",
    selected: false,
  },
  {
    id: 8,
    initials: "PM",
    name: "Priya Menon",
    role: "QA Lead",
    suggestionText: "Joint usability testing",
    bu: "india_tech",
    selected: false,
  },
];

const PeerNominationPage = () => {
  const [reviewers, setReviewers] = useState(INITIAL_REVIEWERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBu, setSelectedBu] = useState("all");

  const selectedCount = reviewers.filter((r) => r.selected).length;

  const filteredReviewers = useMemo(() => {
    return reviewers.filter((r) => {
      const matchesBu = selectedBu === "all" || r.bu === selectedBu;

      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        r.suggestionText.toLowerCase().includes(q);

      return matchesBu && matchesSearch;
    });
  }, [reviewers, searchTerm, selectedBu]);

  const toggleSelection = (id: number) => {
    const target = reviewers.find((r) => r.id === id);
    if (!target) return;

    if (!target.selected && selectedCount >= 7) {
      toast.error("Maximum 7 peer reviewers can be selected.");
      return;
    }

    setReviewers((prev) =>
      prev.map((reviewer) =>
        reviewer.id === id
          ? { ...reviewer, selected: !reviewer.selected }
          : reviewer,
      ),
    );
  };

  return (
    <div className="min-h-full overflow-y-scroll overflow-x-hidden bg-app p-2 font-sans sm:p-6">
      <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col">
        <div className="mb-6 flex min-w-0 flex-col rounded-xl border border-border bg-card shadow-sm">
         
            <PeerNominationHeader selectedCount={selectedCount} />

            <PeerNominationFilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedBu={selectedBu}
              onBuChange={setSelectedBu}
            />

            {/* List Header */}
            <div className="flex flex-col gap-1 border-b border-border bg-slate-500/10 p-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
              <Typography
                variant="caption"
                color="body2"
                className="font-semibold tracking-wider"
              >
                SUGGESTED REVIEWERS ({filteredReviewers.length})
              </Typography>
              <Typography variant="caption" color="body2">
                Inferred from Slack, Jira & Figma · last 90 days
              </Typography>
            </div>

            {/* List Content */}
            <div className="flex flex-col divide-y divide-border">
              {filteredReviewers.length === 0 ? (
                <div className="p-8 text-center text-sm text-text-body2 font-medium">
                  No reviewers found matching the selected filters.
                </div>
              ) : (
                filteredReviewers.map((reviewer) => (
                  <ReviewerCard
                    key={reviewer.id}
                    reviewer={reviewer}
                    onToggleSelection={toggleSelection}
                  />
                ))
              )}
            </div>

            <div className="border-t border-border p-4">
              <div className="flex flex-col gap-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <Typography
                      variant="bodySmall"
                      className="font-semibold text-amber-500"
                    >
                      What happens next?
                    </Typography>
                    <Typography
                      variant="caption"
                      color="body2"
                      className="mt-1 block"
                    >
                      Your nominations go to Rohit Khanna for approval. He can
                      replace anyone he disagrees with (HR is notified). Peer
                      feedback is aggregated — individual answers are never
                      attributed.
                    </Typography>
                  </div>
                </div>
                <Button
                  variant="contain"
                  bgColor="primary"
                  size="md"
                  className="h-10 w-full shrink-0 justify-center px-5 sm:w-auto"
                >
                  Submit to Manager
                </Button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PeerNominationPage;
