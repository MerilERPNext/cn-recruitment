import { useMemo } from "react";
import { getDatesBetween } from "../../utils/helperUtils";

type DayConfig = "Full Day" | "First Half" | "Second Half";
interface DailyConfigProps {
  fromDate: string;
  toDate: string;
  value: Record<string, DayConfig>;
  onChange: (val: Record<string, DayConfig>) => void;
}

const DailyConfiguration: React.FC<DailyConfigProps> = ({
  fromDate,
  toDate,
  value,
  onChange,
}) => {
  const dates = useMemo(
    () => getDatesBetween(fromDate, toDate),
    [fromDate, toDate]
  );

  const applyToAll = (type: DayConfig) => {
    const next: Record<string, DayConfig> = {};
    dates.forEach((d) => {
      next[d] = type;
    });
    onChange(next);
  };

  const allSame: DayConfig | null = useMemo(() => {
    if (!dates.length) return null;

    const first = value[dates[0]] ?? "Full Day";
    return dates.every((d) => (value[d] ?? "Full Day") === first)
      ? first
      : null;
  }, [dates, value]);

  return (
    <div className="mx-2 mt-4 border rounded-lg overflow-hidden">
      <div className="px-4 py-2 font-semibold text-gray-700 bg-gray-50">
        Daily Configuration
      </div>
      <div className="px-4 py-3 border-b bg-white flex items-center gap-6 text-sm">
        <span className="font-medium text-gray-700">Apply to all:</span>

        <label>
          <input
            type="radio"
            name="apply-all"
            checked={allSame === "Full Day"}
            onChange={() => applyToAll("Full Day")}
          />{" "}
          Full Day
        </label>

        <label>
          <input
            type="radio"
            name="apply-all"
            checked={allSame === "First Half"}
            onChange={() => applyToAll("First Half")}
          />{" "}
          First Half
        </label>

        <label>
          <input
            type="radio"
            name="apply-all"
            checked={allSame === "Second Half"}
            onChange={() => applyToAll("Second Half")}
          />{" "}
          Second Half
        </label>
      </div>

      <table className="w-full border-collapse">
        <thead className="bg-gray-100 text-left text-sm text-gray-600">
          <tr>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Leave Options</th>
          </tr>
        </thead>

        <tbody>
          {dates.map((date) => {
            const selected = value[date] ?? "Full Day";

            return (
              <tr key={date} className="border-t">
                <td className="px-4 py-2 font-medium">
                  {new Date(date).toLocaleDateString("en-GB")}
                </td>

                <td className="px-4 py-2">
                  <label className="mr-6">
                    <input
                      type="radio"
                      name={`half-${date}`}
                      checked={selected === "Full Day"}
                      onChange={() =>
                        onChange({ ...value, [date]: "Full Day" })
                      }
                    />{" "}
                    Full Day
                  </label>

                  <label className="mr-6">
                    <input
                      type="radio"
                      name={`half-${date}`}
                      checked={selected === "First Half"}
                      onChange={() =>
                        onChange({ ...value, [date]: "First Half" })
                      }
                    />{" "}
                    First Half
                  </label>

                  <label>
                    <input
                      type="radio"
                      name={`half-${date}`}
                      checked={selected === "Second Half"}
                      onChange={() =>
                        onChange({ ...value, [date]: "Second Half" })
                      }
                    />{" "}
                    Second Half
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DailyConfiguration;
