import React, { memo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Avatar from "../../../shared/Avatar";
import { Typography } from "../../../shared/atoms/Typography";

interface KeyPeopleCardProps {
  spocOpen: boolean;
  recruiterOpen: boolean;
  buddiesOpen: boolean;
  onSpocToggle: () => void;
  onRecruiterToggle: () => void;
  onBuddiesToggle: () => void;
}

const KeyPeopleCard = ({
  spocOpen,
  recruiterOpen,
  buddiesOpen,
  onSpocToggle,
  onRecruiterToggle,
  onBuddiesToggle,
}: KeyPeopleCardProps) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-5">
    <Typography variant="bodyMedium" className="font-bold text-slate-800">
      Key People
    </Typography>

    <div className="space-y-4 divide-y divide-slate-100">
      <KeyPeopleSection title="Onboarding SPOC" isOpen={spocOpen} onToggle={onSpocToggle}>
        <PersonRow avatarSize="h-14 w-14" />
      </KeyPeopleSection>

      <KeyPeopleSection
        title="Recruiter"
        isOpen={recruiterOpen}
        onToggle={onRecruiterToggle}
        className="pt-4"
      >
        <PersonRow avatarSize="h-12 w-12" />
      </KeyPeopleSection>

      <KeyPeopleSection
        title="Buddies"
        isOpen={buddiesOpen}
        onToggle={onBuddiesToggle}
        className="pt-4"
      >
        <div className="pt-2 pb-1">
          <Typography variant="bodySmall" className="text-slate-400 italic">
            No buddies assigned
          </Typography>
        </div>
      </KeyPeopleSection>
    </div>
  </div>
);

const KeyPeopleSection = memo(({
  title,
  isOpen,
  onToggle,
  children,
  className = "pt-2",
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <button
      onClick={onToggle}
      className="w-full flex justify-between items-center py-2 text-left"
    >
      <Typography
        variant="bodySmall"
        className="font-semibold text-slate-500 uppercase tracking-wider text-xs"
      >
        {title}
      </Typography>
      {isOpen ? (
        <ChevronUp size={16} className="text-slate-400" />
      ) : (
        <ChevronDown size={16} className="text-slate-400" />
      )}
    </button>

    {isOpen && children}
  </div>
));

const PersonRow = memo(({ avatarSize }: { avatarSize: string }) => (
  <div className="flex gap-3 sm:gap-4 items-start pt-3 pb-2 animate-fadeIn">
    <Avatar name="Poornima Sanap" src="/profile.svg" size={avatarSize} />
    <div className="min-w-0 space-y-1">
      <Typography variant="body" className="font-bold text-slate-800 leading-tight block break-words">
        Poornima Sanap
      </Typography>
      <Typography variant="caption" className="text-slate-500 leading-relaxed block break-words">
        Human Resources | Corporate - KLJ Noida One - Noida - UP, Noida, Uttar Pradesh , ( Corporate - Remote )
      </Typography>
    </div>
  </div>
));

export default memo(KeyPeopleCard);
