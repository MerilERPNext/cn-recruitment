type LTAItem = {
    sl_no: number;
    lta_exempted: string;
    amount: number;
    date: string;
    year: string;
  };
  
  type LTACardsProps = {
    LTAData: LTAItem[];
  };
  
  const LTACards = ({ LTAData }: LTACardsProps) => {
    return (
      <div className="grid grid-cols-1 gap-4">
        {LTAData.map((item) => (
          <div
            key={item.sl_no}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">
                LTA Record {item.sl_no}
              </h3>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  item.lta_exempted === "Yes"
                    ? "bg-success-100 text-success-600"
                    : "bg-error-100 text-error-600"
                }`}
              >
                Exempted: {item.lta_exempted}
              </span>
            </div>

            <div className="space-y-1 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="font-medium text-lg">Year</span>
                <span className="bg-gray-50 px-2 rounded text-lg">{item.year}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  export default LTACards;
  
  