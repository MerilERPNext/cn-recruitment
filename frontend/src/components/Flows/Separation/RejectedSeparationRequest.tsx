import React, { useMemo } from 'react'
import { useGetSeparationFunnelDetails } from '../../../hooks/useSeparation';
import ApprovalTracker from './components/ApprovalTracker';
import HeaderBar from '../../HeaderBar';
import { useNavigate } from 'react-router-dom';
import { SeparationSkeleton } from '../../shared/molecules/Skeletons/TableSkeleton';
import { Typography } from '../../shared/atoms/Typography';
import emptyStateImage from '../../../assets/data-not-found.png';

interface AestheticStateProps {
  title: string;
  subtitle: string;
}

const AestheticState: React.FC<AestheticStateProps> = ({ title, subtitle }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-4">
      {/* Empty State Illustration */}
      <div className="mb-8 relative transition-transform duration-500 hover:scale-105">
        <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl opacity-60"></div>
        <img
          src={emptyStateImage}
          alt={title}
          width="320"
          height="280"
          className="relative z-10 object-contain drop-shadow-md"
        />
      </div>

      {/* Text Content */}
      <Typography
        variant="h3"
        color="primary"
        align="center"
        className="mb-3 font-semibold tracking-tight"
      >
        {title}
      </Typography>

      <Typography
        variant="body"
        color="body2"
        align="center"
        className="max-w-md leading-relaxed"
      >
        {subtitle}
      </Typography>
    </div>
  );
};

const RejectedSeparationRequest = () => {
  const { data: separationFunnelDetails, isLoading, isError } = useGetSeparationFunnelDetails();
  const navigate = useNavigate();

  // check for current and previous request
  const rejectedSeparationRequest = useMemo(() => {
    if (!separationFunnelDetails?.data || separationFunnelDetails?.data?.length === 0) {
      return null;
    }
    if (separationFunnelDetails.data[0].approval_status === "Rejected")
      return separationFunnelDetails.data[0];
    if (separationFunnelDetails?.data?.length >= 2 && separationFunnelDetails.data[1].approval_status === "Rejected")
      return separationFunnelDetails.data[1];
    return null;
  }, [separationFunnelDetails]);


  if (isLoading) {
    return (
      <div>
        <HeaderBar
          title="Rejected Separation Request"
          onBack={() => navigate(-1)}
        />
        <main className="min-h-full mb-2 p-4">
          <div className="max-w-full">
            <SeparationSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col">
        <HeaderBar
          title="Rejected Separation Request"
          onBack={() => navigate(-1)}
        />
        <main className="flex-1 flex items-center justify-center p-4">
          <AestheticState
            title="Error Loading Request"
            subtitle="We encountered an unexpected error while trying to fetch the rejected separation details. Please try again later."
          />
        </main>
      </div>
    )
  }

  if (!rejectedSeparationRequest) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col">
        <HeaderBar
          title="Rejected Separation Request"
          onBack={() => navigate(-1)}
        />
        <main className="flex-1 flex items-center justify-center p-4">
          <AestheticState
            title="No Valid Requests Found"
            subtitle="It seems there are no rejected separation requests associated with this employee at the moment."
          />
        </main>
      </div>
    );
  }

  return (
    <div >
      <HeaderBar
        title="Rejected Separation Request"
        onBack={() => navigate(-1)}
      />
      <main className="min-h-full mb-2 p-4">
        <div className="max-w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <ApprovalTracker For="Employee Separation" data={rejectedSeparationRequest} />
        </div>
      </main>
    </div>
  )
}

export default RejectedSeparationRequest