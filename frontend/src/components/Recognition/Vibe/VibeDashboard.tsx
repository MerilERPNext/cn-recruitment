import React from "react";
import { Typography } from "../../shared/atoms/Typography";
import { ActivePrograms } from "../ActivePrograms";

/**
 * Surfaces the existing (already-built) recognition dashboard widgets inside the
 * Vibe sub-section layout. Mirrors RecognitionPage's dashboard content but
 * without the page-level layout wrapper, so it can live inside a Vibe tab.
 */
const VibeDashboard: React.FC = () => {
  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Typography variant="h2" className="text-xl md:text-2xl font-bold mb-1">
            All Programs
          </Typography>
          <Typography variant="bodyMedium" color="body2">
            Recognise your colleagues' achievements and track your team's success.
          </Typography>
        </div>

        <ActivePrograms />
      </div>
    </div>
  );
};

export default VibeDashboard;
