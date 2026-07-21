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
          className="font-bold uppercase tracking-wider text-gray-500 mb-3 block"
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
                className={`min-h-[36px] rounded-md border px-3 text-sm font-semibold transition ${
                  isActive
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
        <div className="mx-auto w-full max-w-[280px] rounded-xl border border-gray-200 bg-slate-50/50 p-4 min-h-[400px]">
          {/* Wireframe Mockup */}
          <div className="space-y-3">
            <div className="rounded border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-2 text-[9px] font-bold text-gray-800">
                Goals & KPIs
              </div>
              <div className="mb-2 text-[8px] text-gray-500">
                Q1 - OKR - Oxygen 2.0
              </div>
              <div className="flex gap-1">
                <div className="h-4 flex-1 rounded-sm bg-gray-200"></div>
                <div className="h-4 flex-1 rounded-sm bg-gray-200"></div>
                <div className="h-4 flex-1 rounded-sm bg-gray-200"></div>
                <div className="h-4 flex-1 rounded-sm bg-blue-500"></div>
                <div className="h-4 flex-1 rounded-sm bg-gray-200"></div>
              </div>
            </div>

            <div className="rounded border border-gray-100 bg-white p-3 shadow-sm">
              <div className="text-[8px] text-gray-400">
                Comment placeholder...
              </div>
              <div className="mt-4 h-6"></div>
            </div>

            <div className="rounded border border-gray-100 bg-white p-3 shadow-sm">
              <div className="mb-1 text-[9px] font-bold text-gray-800">
                Competencies
              </div>
              <div className="text-[8px] text-gray-500">
                Design Craft - rating
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
        <Typography
          variant="bodyMedium"
          className="font-bold text-yellow-800 mb-1"
        >
          HR self-serve required
        </Typography>
        <Typography
          variant="caption"
          className="text-yellow-700 block leading-relaxed"
        >
          The Drag-Drop builder isn't covered in this scope. Selecting a
          template is sufficient to continue.
        </Typography>
      </section>
    </div>
  );
};

export default MultiRolePreview;
