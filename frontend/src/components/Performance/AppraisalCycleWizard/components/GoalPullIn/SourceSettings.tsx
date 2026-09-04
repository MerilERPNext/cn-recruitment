import { Switch } from "../../../../shared/atoms/Switch";
import { Typography } from "../../../../shared/atoms/Typography";

type SourceSettingsProps = {
  autoPull: boolean;
  setAutoPull: (val: boolean) => void;
  carryWeightage: boolean;
  setCarryWeightage: (val: boolean) => void;
  editLock: boolean;
  setEditLock: (val: boolean) => void;
};

const SourceSettings = ({
  autoPull,
  setAutoPull,
  carryWeightage,
  setCarryWeightage,
  editLock,
  setEditLock,
}: SourceSettingsProps) => {
  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6 shadow-sm">
      <div className="mb-6">
        <Typography variant="h3" className="text-base font-bold text-text-title">
          Source: Linked FY26 Goal Cycle
        </Typography>
        <Typography variant="bodySmall" color="body2" className="mt-1 block">
          2,140 employees · 11,824 approved goals will be pulled into Section 1
          (Goals & KPIs)
        </Typography>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border p-4 transition hover:border-primary/50 bg-card">
          <div className="flex items-center justify-between mb-2">
            <Typography
              variant="bodyMedium"
              className="font-bold text-text-title"
            >
              Auto-pull approved goals
            </Typography>
            <Switch checked={autoPull} onCheckedChange={setAutoPull} />
          </div>
          <Typography
            variant="caption"
            color="body2"
            className="leading-relaxed block"
          >
            All goals in Approved/In Progress at cycle freeze date
          </Typography>
        </div>

        <div className="rounded-lg border border-border p-4 transition hover:border-primary/50 bg-card">
          <div className="flex items-center justify-between mb-2">
            <Typography
              variant="bodyMedium"
              className="font-bold text-text-title"
            >
              Carry weightage from goal
            </Typography>
            <Switch
              checked={carryWeightage}
              onCheckedChange={setCarryWeightage}
            />
          </div>
          <Typography
            variant="caption"
            color="body2"
            className="leading-relaxed block"
          >
            Form section weight = sum of pulled-goal weights
          </Typography>
        </div>

        <div className="rounded-lg border border-border p-4 transition hover:border-primary/50 bg-card">
          <div className="flex items-center justify-between mb-2">
            <Typography
              variant="bodyMedium"
              className="font-bold text-text-title"
            >
              Edit lock on goals
            </Typography>
            <Switch checked={editLock} onCheckedChange={setEditLock} />
          </div>
          <Typography
            variant="caption"
            color="body2"
            className="leading-relaxed block"
          >
            Goals CANNOT be edited once self-review opens (SuccessFactors
            pattern)
          </Typography>
        </div>
      </div>
    </section>
  );
};

export default SourceSettings;
