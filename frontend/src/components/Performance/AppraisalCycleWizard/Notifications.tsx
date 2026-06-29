import { useState } from "react";
import { Switch } from "../../shared/atoms/Switch";
import { Typography } from "../../shared/atoms/Typography";

type NotificationEvent = {
  id: string;
  name: string;
  email: boolean;
  inApp: boolean;
  slack: boolean;
  teams: boolean;
  whatsapp: boolean;
  cadence: string;
};

const initialEvents: NotificationEvent[] = [
  {
    id: "stage-opens",
    name: "Stage opens",
    email: true,
    inApp: true,
    slack: true,
    teams: false,
    whatsapp: false,
    cadence: "Once",
  },
  {
    id: "mid-stage",
    name: "Mid-stage reminder",
    email: true,
    inApp: true,
    slack: false,
    teams: false,
    whatsapp: false,
    cadence: "Once at 50%",
  },
  {
    id: "48h-before",
    name: "48h before due",
    email: true,
    inApp: true,
    slack: true,
    teams: true,
    whatsapp: false,
    cadence: "Once",
  },
  {
    id: "on-due",
    name: "On due",
    email: true,
    inApp: true,
    slack: true,
    teams: true,
    whatsapp: true,
    cadence: "Once",
  },
  {
    id: "overdue",
    name: "Overdue (daily)",
    email: true,
    inApp: true,
    slack: true,
    teams: true,
    whatsapp: true,
    cadence: "Daily until done",
  },
  {
    id: "manager-nudge",
    name: "Manager nudge",
    email: false,
    inApp: true,
    slack: true,
    teams: false,
    whatsapp: false,
    cadence: "Smart",
  },
  {
    id: "off-track",
    name: "Off-track goal > 7d",
    email: true,
    inApp: true,
    slack: false,
    teams: false,
    whatsapp: false,
    cadence: "Smart",
  },
  {
    id: "goal-not-updated",
    name: "Goal not updated > 14d",
    email: true,
    inApp: true,
    slack: false,
    teams: false,
    whatsapp: false,
    cadence: "Smart",
  },
  {
    id: "calibration",
    name: "Calibration invite",
    email: true,
    inApp: true,
    slack: true,
    teams: true,
    whatsapp: false,
    cadence: "Once",
  },
  {
    id: "final-rating",
    name: "Final rating released",
    email: true,
    inApp: true,
    slack: true,
    teams: true,
    whatsapp: true,
    cadence: "Once",
  },
];

const Notifications = () => {
  const [events, setEvents] = useState<NotificationEvent[]>(initialEvents);

  const handleToggle = (
    eventId: string,
    channel: "email" | "inApp" | "slack" | "teams" | "whatsapp",
  ) => {
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId ? { ...ev, [channel]: !ev[channel] } : ev,
      ),
    );
  };

  return (
    <>
      {/* Left Panel: Events Matrix */}
      <section className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-4 text-[12px] font-bold text-gray-600 uppercase tracking-widest w-1/4">
                  Event
                </th>
                <th className="px-4 py-4 text-[12px] font-bold text-gray-600 uppercase tracking-widest text-center w-[10%]">
                  Email
                </th>
                <th className="px-4 py-4 text-[12px] font-bold text-gray-600 uppercase tracking-widest text-center w-[10%]">
                  In-App
                </th>
                <th className="px-4 py-4 text-[12px] font-bold text-gray-600 uppercase tracking-widest text-center w-[10%]">
                  Slack
                </th>
                <th className="px-4 py-4 text-[12px] font-bold text-gray-600 uppercase tracking-widest text-center w-[10%]">
                  Teams
                </th>
                <th className="px-4 py-4 text-[12px] font-bold text-gray-600 uppercase tracking-widest text-center w-[12%]">
                  Whatsapp
                </th>
                <th className="px-5 py-4 text-[12px] font-bold text-gray-600 uppercase tracking-widest w-1/4">
                  Cadence
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events.map((ev) => (
                <tr
                  key={ev.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <Typography
                      variant="bodyMedium"
                      className="font-bold text-gray-800"
                    >
                      {ev.name}
                    </Typography>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={ev.email as boolean}
                        onCheckedChange={() => handleToggle(ev.id, "email")}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={ev.inApp as boolean}
                        onCheckedChange={() => handleToggle(ev.id, "inApp")}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={ev.slack as boolean}
                        onCheckedChange={() => handleToggle(ev.id, "slack")}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={ev.teams as boolean}
                        onCheckedChange={() => handleToggle(ev.id, "teams")}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={ev.whatsapp as boolean}
                        onCheckedChange={() => handleToggle(ev.id, "whatsapp")}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Typography
                      variant="bodySmall"
                      className="text-gray-500 font-medium"
                    >
                      {ev.cadence}
                    </Typography>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Right Panel: Sidebars */}
      <aside className="w-full lg:w-[320px] xl:w-[360px] flex flex-col gap-6 shrink-0">
        {/* Template Preview */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col h-full">
          <Typography
            variant="caption"
            className="font-bold text-gray-500 uppercase tracking-widest mb-4"
          >
            Template Preview - 48H Before Due
          </Typography>

          <div className="flex-1 flex flex-col rounded-lg bg-slate-50 border border-gray-100 p-4 sm:p-5 mb-5">
            <div className="mb-4">
              <Typography
                variant="bodyMedium"
                className="font-bold text-gray-800 block mb-1"
              >
                Subject: Your Self-Review for FY26 is due in 48 hours
              </Typography>
              <Typography variant="caption" className="text-gray-500 block">
                To: pallavi.mahar@pw.live
              </Typography>
            </div>

            <div className="flex flex-col gap-4 text-sm text-gray-700 leading-relaxed">
              <p>Hi Pallavi,</p>
              <p>
                Your Self-Review for the FY26 Annual Performance Cycle closes in{" "}
                <span className="font-bold text-gray-900">48 hours</span> (21
                May 2026, 23:59 IST).
              </p>
              <a
                href="#"
                className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1"
              >
                → Open Self-Review
              </a>
              <p className="text-gray-500 mt-2">— HR Operations</p>
            </div>
          </div>

          <button className="w-full sm:w-auto sm:self-start rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 flex items-center justify-center">
            Edit template
          </button>
        </section>

        {/* Quiet Hours */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <Typography
            variant="caption"
            className="font-bold text-gray-500 uppercase tracking-widest mb-4 block"
          >
            Quiet Hours
          </Typography>
          <div className="flex flex-col gap-1.5 mb-3">
            <Typography
              variant="bodyMedium"
              className="font-bold text-gray-800"
            >
              Mon–Fri · 21:00–08:00 IST
            </Typography>
            <Typography
              variant="bodyMedium"
              className="font-bold text-gray-800"
            >
              Weekends · all-day quiet
            </Typography>
          </div>
          <Typography variant="caption" className="text-gray-500">
            Inherited from org · Individual users can opt-out
          </Typography>
        </section>
      </aside>
    </>
  );
};

export default Notifications;
