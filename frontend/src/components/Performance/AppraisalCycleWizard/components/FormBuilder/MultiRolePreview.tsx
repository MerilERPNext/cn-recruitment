import { Typography } from "../../../../shared/atoms/Typography";

type MultiRolePreviewProps = {
  activeRole: string;
  onRoleChange: (role: string) => void;
};

const roles = ["Employee", "Manager", "Peer", "Skip"];

const MultiRolePreview = ({
  activeRole,
  onRoleChange,
}: MultiRolePreviewProps) => {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col">
        <Typography
          variant="caption"
          color="body2"
          className="font-bold uppercase tracking-wider mb-3 block"
        >
          Multi-Role Preview
        </Typography>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {roles.map((role) => {
            const isActive = role === activeRole;
            return (
              <button
                key={role}
                onClick={() => onRoleChange(role)}
                className={`min-h-[36px] rounded-md border px-3 text-sm font-semibold transition cursor-pointer ${
                  isActive
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card text-text-title hover:bg-slate-500/10"
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
        <div className="mx-auto w-full max-w-[280px] rounded-xl border border-border bg-slate-500/10 p-4 min-h-[400px]">
          {/* Wireframe Mockup */}
          <div className="space-y-3">
            <div className="rounded border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 text-[9px] font-bold text-text-title">
                Goals & KPIs
              </div>
              <div className="mb-2 text-[8px] text-text-body2">
                Q1 - OKR - Oxygen 2.0
              </div>
              <div className="flex gap-1">
                <div className="h-4 flex-1 rounded-sm bg-slate-500/20"></div>
                <div className="h-4 flex-1 rounded-sm bg-slate-500/20"></div>
                <div className="h-4 flex-1 rounded-sm bg-slate-500/20"></div>
                <div className="h-4 flex-1 rounded-sm bg-primary"></div>
                <div className="h-4 flex-1 rounded-sm bg-slate-500/20"></div>
              </div>
            </div>

            <div className="rounded border border-border bg-card p-3 shadow-sm">
              <div className="text-[8px] text-text-body2">
                Comment placeholder...
              </div>
              <div className="mt-4 h-6"></div>
            </div>

            <div className="rounded border border-border bg-card p-3 shadow-sm">
              <div className="mb-1 text-[9px] font-bold text-text-title">
                Competencies
              </div>
              <div className="text-[8px] text-text-body2">
                Design Craft - rating
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm">
        <Typography
          variant="bodyMedium"
          className="font-bold text-amber-500 mb-1"
        >
          HR self-serve required
        </Typography>
        <Typography
          variant="caption"
          className="text-amber-400 block leading-relaxed"
        >
          The Drag-Drop builder isn't covered in this scope. Selecting a
          template is sufficient to continue.
        </Typography>
      </section>
    </div>
  );
};

export default MultiRolePreview;
