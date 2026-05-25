import { Switch } from "../../../../shared/atoms/Switch";
import { Typography } from "../../../../shared/atoms/Typography";
import { FileText } from "lucide-react"; // Using generic icon if specific logos aren't available

type RatingRow = {
  id: string;
  achievement: string;
  ratingName: string;
  ratingValue: string;
  ratingColor: string;
  dotColor: string;
  comment: string;
};

const ratingMatrix: RatingRow[] = [
  {
    id: "outstanding",
    achievement: "≥ 120%",
    ratingName: "Outstanding",
    ratingValue: "5/5",
    ratingColor: "text-green-700 bg-green-50",
    dotColor: "bg-green-500",
    comment: "Pre-filled prompt",
  },
  {
    id: "exceeds",
    achievement: "100% - 119%",
    ratingName: "Exceeds",
    ratingValue: "4/5",
    ratingColor: "text-green-700 bg-green-50",
    dotColor: "bg-green-500",
    comment: "Pre-filled prompt",
  },
  {
    id: "meets",
    achievement: "85% - 99%",
    ratingName: "Meets",
    ratingValue: "3/5",
    ratingColor: "text-blue-700 bg-blue-50",
    dotColor: "bg-blue-500",
    comment: "Pre-filled prompt",
  },
  {
    id: "below",
    achievement: "60% - 84%",
    ratingName: "Below",
    ratingValue: "2/5",
    ratingColor: "text-yellow-700 bg-yellow-50",
    dotColor: "bg-yellow-500",
    comment: "Pre-filled prompt",
  },
  {
    id: "unsatisfactory",
    achievement: "< 60%",
    ratingName: "Unsatisfactory",
    ratingValue: "1/5",
    ratingColor: "text-red-700 bg-red-50",
    dotColor: "bg-red-500",
    comment: "Pre-filled prompt",
  },
];

type Integration = {
  id: string;
  name: string;
  status: string;
  active: boolean;
};

const integrations: Integration[] = [
  { id: "jira", name: "Jira (Atlassian)", status: "Syncing 4218 goals", active: true },
  { id: "salesforce", name: "Salesforce CRM", status: "Syncing 612 goals", active: true },
  { id: "hubspot", name: "HubSpot Sales", status: "Not connected", active: false },
  { id: "asana", name: "Asana", status: "Syncing 84 goals", active: true },
  { id: "monday", name: "Monday.com", status: "Not connected", active: false },
  { id: "github", name: "GitHub", status: "Syncing 1226 goals", active: true },
];

type AutoRatingProps = {
  globalAutoRating: boolean;
  setGlobalAutoRating: (val: boolean) => void;
};

const AutoRating = ({ globalAutoRating, setGlobalAutoRating }: AutoRatingProps) => {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-start justify-between mb-8">
        <div>
          <Typography variant="h3" className="text-xl font-bold text-gray-900">
            Auto-rating from goal achievement
          </Typography>
          <Typography variant="bodySmall" className="text-gray-500 mt-1 block">
            Optional — manager can override with reason (Keka pattern)
          </Typography>
        </div>
        <Switch checked={globalAutoRating} onCheckedChange={setGlobalAutoRating} />
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_400px]">
        {/* Left Column: Matrix */}
        <div>
          <Typography variant="caption" className="font-bold uppercase tracking-wider text-gray-500 mb-4 block">
            ACHIEVEMENT ↔ RATING MATRIX
          </Typography>
          
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left min-w-[500px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-gray-200 text-[11px] font-bold text-gray-500">
                  <th className="py-3 px-4 uppercase tracking-wider">Achievement %</th>
                  <th className="py-3 px-4 uppercase tracking-wider">Rating</th>
                  <th className="py-3 px-4 uppercase tracking-wider">Default Comment</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {ratingMatrix.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 px-4">
                      <Typography variant="bodyMedium" className="font-bold text-gray-900">
                        {row.achievement}
                      </Typography>
                    </td>
                    <td className="py-4 px-4">
                      <div className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-0.5 ${row.ratingColor}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${row.dotColor}`}></div>
                        <span className="text-sm font-bold">{row.ratingName}</span>
                        <span className="text-[10px] font-bold opacity-60">{row.ratingValue}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Typography variant="bodySmall" className="text-gray-500">
                        {row.comment}
                      </Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Integrations */}
        <div>
          <Typography variant="caption" className="font-bold uppercase tracking-wider text-gray-500 mb-4 block">
            AUTO-PULL INTEGRATIONS
          </Typography>
          
          <div className="flex flex-col space-y-3">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-500">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <Typography variant="bodyMedium" className="font-bold text-gray-900 leading-tight">
                      {integration.name}
                    </Typography>
                    <Typography variant="caption" className="text-gray-500 block mt-0.5">
                      {integration.status}
                    </Typography>
                  </div>
                </div>
                <Switch 
                  checked={integration.active} 
                  onCheckedChange={() => {}} 
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AutoRating;
