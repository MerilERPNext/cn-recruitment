import React, { memo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Avatar from "../../../shared/Avatar";
import { Typography } from "../../../shared/atoms/Typography";
import { OnboardingPerson, EmployeeOnboardingDetail } from "../../../../types/onboarding";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";

interface KeyPeopleCardProps {
  keyPeople?: EmployeeOnboardingDetail["key_people"];
  spocOpen: boolean;
  recruiterOpen: boolean;
  buddiesOpen: boolean;
  teammatesOpen: boolean;
  onSpocToggle: () => void;
  onRecruiterToggle: () => void;
  onBuddiesToggle: () => void;
  onTeammatesToggle: () => void;
  isLoading?: boolean;
}

const KeyPeopleCard = ({
  keyPeople,
  spocOpen,
  recruiterOpen,
  buddiesOpen,
  teammatesOpen,
  onSpocToggle,
  onRecruiterToggle,
  onBuddiesToggle,
  onTeammatesToggle,
  isLoading,
}: KeyPeopleCardProps) => (
  <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col h-full min-h-0">
    <div className="p-4 sm:p-6 pb-0 shrink-0">
      <Typography variant="bodyMedium" className="font-bold text-text-title">
        Key People
      </Typography>
    </div>

    <div className="pt-5 pb-4 space-y-2 divide-y divide-border overflow-y-auto no-scrollbar">
      {isLoading ? (
        <div className="px-4 sm:px-6 space-y-6 pt-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-4">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="h-12 w-12 rounded-full bg-gray-200 shrink-0" />
                <div className="min-w-0 space-y-2 flex-1 pt-1.5">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <KeyPeopleSection title="Onboarding SPOC" isOpen={spocOpen} onToggle={onSpocToggle}>
        {keyPeople?.onboarding_spoc ? (
          <PersonRow person={keyPeople.onboarding_spoc} avatarSize="h-14 w-14" />
        ) : (
          <div className="pt-2 pb-1">
            <Typography variant="bodySmall" className="text-slate-400 italic">
              Not assigned yet
            </Typography>
          </div>
        )}
      </KeyPeopleSection>

      <KeyPeopleSection
        title="Recruiter"
        isOpen={recruiterOpen}
        onToggle={onRecruiterToggle}
      >
        {keyPeople?.recruiter ? (
          <PersonRow person={keyPeople.recruiter} avatarSize="h-12 w-12" />
        ) : (
          <div className="pt-2 pb-1">
            <Typography variant="bodySmall" className="text-slate-400 italic">
              Not assigned yet
            </Typography>
          </div>
        )}
      </KeyPeopleSection>

      <KeyPeopleSection
        title="Buddies"
        isOpen={buddiesOpen}
        onToggle={onBuddiesToggle}
      >
        {keyPeople?.buddies && keyPeople.buddies.length > 0 ? (
          keyPeople.buddies.map((buddy, index) => (
            <PersonRow key={buddy.user || index} person={buddy} avatarSize="h-12 w-12" />
          ))
        ) : (
          <div className="pt-2 pb-1">
            <Typography variant="bodySmall" className="text-slate-400 italic">
              No buddies assigned
            </Typography>
          </div>
        )}
      </KeyPeopleSection>

      <KeyPeopleSection
        title="Teammates"
        isOpen={teammatesOpen}
        onToggle={onTeammatesToggle}
      >
        {keyPeople?.teammates && keyPeople.teammates.length > 0 ? (
          keyPeople.teammates.map((teammate, index) => (
            <PersonRow key={teammate.user || index} person={teammate} avatarSize="h-12 w-12" />
          ))
        ) : (
          <div className="pt-2 pb-1">
            <Typography variant="bodySmall" className="text-slate-400 italic">
              No teammates assigned
            </Typography>
          </div>
        )}
      </KeyPeopleSection>
        </>
      )}
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
      className="w-full flex justify-between items-center py-3 px-4 sm:px-6 text-left transition-colors hover:bg-gray-50 group"
    >
      <Typography
        variant="bodySmall"
        className="font-semibold text-text-body2 uppercase tracking-wider text-xs group-hover:text-text-title transition-colors"
      >
        {title}
      </Typography>
      {isOpen ? (
        <ChevronUp size={16} className="text-text-body2 group-hover:text-primary transition-colors" />
      ) : (
        <ChevronDown size={16} className="text-text-body2 group-hover:text-primary transition-colors" />
      )}
    </button>

    {isOpen && (
      <div className="px-4 sm:px-6 pb-4">
        {children}
      </div>
    )}
  </div>
));

const PersonRow = memo(({ person, avatarSize }: { person: OnboardingPerson; avatarSize: string }) => (
  <div className="flex gap-3 sm:gap-4 items-start pt-3 pb-2 animate-fadeIn">
    <Avatar name={person.full_name || person.employee || ""} src={person.image || ""} size={avatarSize} />
    <div className="min-w-0 space-y-1">
      <WrapperHoverCard employeeId={person.employee ?? ""}>
        <Typography variant="body" className="font-bold text-text-title leading-tight block break-words hover:underline cursor-pointer">
          {person.full_name || person.employee || "-"}
        </Typography>
      </WrapperHoverCard>
      <Typography variant="caption" className="text-text-body2 leading-relaxed block break-words">
        {person.subtitle || "-"}
      </Typography>
    </div>
  </div>
));

export default memo(KeyPeopleCard);
