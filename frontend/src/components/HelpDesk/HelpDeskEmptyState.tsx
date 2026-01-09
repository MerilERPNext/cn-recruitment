import React from "react";
import { Typography } from "../shared/atoms/Typography";
import emptyStateImage from "../../assets/helpdesk-empty-state.png";

const HelpDeskEmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-4">
      {/* Empty State Illustration */}
      <div className="mb-8">
        <img
          src={emptyStateImage}
          alt="No issues found"
          width="320"
          height="280"
          className="object-contain"
        />
      </div>

      {/* Text Content */}
      <Typography
        variant="h3"
        color="primary"
        align="center"
        className="mb-2"
      >
        No Issues Found
      </Typography>

      <Typography
        variant="body"
        color="body2"
        align="center"
        className="max-w-md"
      >
        There are currently no issues requested by you.
      </Typography>
    </div>
  );
};

export default HelpDeskEmptyState;
