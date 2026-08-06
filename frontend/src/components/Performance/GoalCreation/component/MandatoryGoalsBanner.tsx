import React, { useMemo, useState } from 'react';
import Button from '../../../shared/atoms/Button';
import { ArrowRight, CheckCircle, FileText } from 'lucide-react';
import { Templates } from '../../../../types/goal';
import { Typography } from '../../../shared/atoms/Typography';
import { MandatoryGoalsError, MandatoryGoalsSkeleton } from './MandatoryGoalsStatus';
import { useGetMandotaryGoals } from '../../../../hooks/usePerformance';
import Modal from '../../../shared/Modal';
import AcknowledgmentPopup, { getWeightageColor } from './AcknowledgmentPopup';

export interface MandatoryGoalsBannerProps {
  className?: string;
}

export const MandatoryGoalsBanner: React.FC<MandatoryGoalsBannerProps> = ({
}) => {
  const [acknowledgementGoalsData, setAcknowledgementGoalsData] = useState<
    Templates[] | undefined
  >(undefined);
  const {
      data: mandatoryGoals,
      isLoading,
      error,
      refetch,
    } = useGetMandotaryGoals();
  const goalsCount = mandatoryGoals?.data?.goals?.length ?? 0;
  const pushedBy = mandatoryGoals?.data?.pushed_by;
  const lockDate = mandatoryGoals?.data?.lock_date;
  const metadataText = useMemo(() => {
    return `Pushed by - ${pushedBy ?? ""} . India Tech BU . lock ${lockDate ?? ""}`;
  }, [pushedBy, lockDate]);
  return (
    <>
    <div className="bg-[#fff8f6] border border-red-100 rounded-xl p-4 sm:p-5 mb-6 sm:mb-8 flex flex-col md:flex-row gap-4 sm:gap-5 items-start">
            <div className="bg-white border border-red-100 text-red-500 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            {error ? (
              <MandatoryGoalsError onRetry={() => refetch()} />
            ) : isLoading ? (
              <MandatoryGoalsSkeleton />
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-md tracking-wider">
                      {goalsCount} MANDATORY OKRs ASSIGNED
                    </span>
                    {metadataText && goalsCount > 0 && (
                      <span className="text-gray-500 text-sm">{metadataText}</span>
                    )}
                  </div>
                  <Typography
                    variant="subheading"
                    className="font-semibold text-gray-900 mb-4"
                  >
                    {goalsCount > 0
                      ? `You have ${goalsCount} mandatory OKRs to acknowledge before adding your own.`
                      : "No Mandatory OKRs Assigned."}
                  </Typography>
                  <div className="flex flex-wrap gap-3">
                    {goalsCount > 0 ? (
                      mandatoryGoals?.data?.goals?.map(
                        (Goal: Templates, index: number) => {
                          const colorConfig = getWeightageColor(
                            Goal?.weightage,
                            index,
                          );
                          return (
                            <div
                              key={Goal?.template}
                              className="w-full sm:w-auto bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-start sm:items-center gap-2 text-sm shadow-sm"
                            >
                              <div
                                className={`w-2 h-2 rounded-full ${colorConfig.dot}`}
                              ></div>
                              <span className="min-w-0 flex-1 text-gray-700">
                                {Goal?.title ?? "no title"}
                              </span>
                              <span
                                className={`shrink-0 ${colorConfig.text} font-medium`}
                              >
                                {Goal?.weightage}%
                              </span>
                            </div>
                          );
                        },
                      )
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <CheckCircle className="w-4 h-4 text-gray-400" />
                        <span>
                          You're all set! You can proceed to create your custom
                          OKRs.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full md:w-auto mt-1 md:mt-0 self-start md:self-center">
                  <Button
                    onClick={() =>
                      setAcknowledgementGoalsData(mandatoryGoals?.data?.goals)
                    }
                    variant="contain"
                    bgColor="error"
                    disabled={goalsCount === 0}
                    className="w-full md:w-auto justify-center bg-[#E35D6A] hover:bg-[#cb4f5b] text-white disabled:bg-gray-300 disabled:text-gray-500 disabled:opacity-60"
                  >
                    Acknowledge {goalsCount} <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </div>
      <Modal
        isOpen={!!acknowledgementGoalsData}
        onClose={() => setAcknowledgementGoalsData(undefined)}
        size="lg"
        className="max-w-[780px] p-0"
      >
        <AcknowledgmentPopup
          text={metadataText}
          goalData={acknowledgementGoalsData}
          onClose={() => setAcknowledgementGoalsData(undefined)}
        />
      </Modal>
    </>
  );
};

export default MandatoryGoalsBanner;
