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
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-1 lg:tw-grid-cols-1 tw-gap-4">
        {LTAData.map((item) => (
          <div
            key={item.sl_no}
            className="tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-p-4 tw-shadow-sm"
          >
            <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
              <h3 className="tw-text-lg tw-font-semibold">
                LTA Record {item.sl_no}
              </h3>
              <span
                className={`tw-text-xs tw-font-medium tw-px-2 tw-py-1 tw-rounded ${
                  item.lta_exempted === "Yes"
                    ? "tw-bg-green-100 tw-text-green-700"
                    : "tw-bg-red-100 tw-text-red-700"
                }`}
              >
                Exempted: {item.lta_exempted}
              </span>
            </div>
  
            <div className="tw-space-y-1 tw-text-sm tw-text-gray-700">
  
              <div className="tw-flex tw-justify-between">
                <span className="tw-font-medium text-lg">Year</span>
                <span className="bg-slate-100 px-2 rounded  text-lg">{item.year}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  export default LTACards;
  
  