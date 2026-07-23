import React, { Suspense, useState } from 'react';
import Modal from '../../../shared/Modal';

import { LazySectionFallback } from '../NewGaol';
import GoalLibraryPopup from './GoalLibraryPopup';
import AcknowledgmentPopup from './define-goal/AcknowledgmentPopup';

import MandatoryOkrsBanner from './start-goal-selection/MandatoryOkrsBanner';
import BlankGoalCard from './start-goal-selection/BlankGoalCard';
import GoalLibraryCard from './start-goal-selection/GoalLibraryCard';
import AiSuggestionCard from './start-goal-selection/AiSuggestionCard';
import CascadeGoalCard from './start-goal-selection/CascadeGoalCard';
import BulkImportBanner from './start-goal-selection/BulkImportBanner';

const StartGoalSelection = () => {
    const [isGoalLibraryOpen, setIsGoalLibraryOpen] = useState(false);
    const [blankGoalDescription, setBlankGoalDescription] = useState(
        "Write your Objective + Key Results yourself. Best when your goal doesn't match anything in the library."
    );


    return (
        <>
            <MandatoryOkrsBanner  />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <BlankGoalCard
                    value={blankGoalDescription}
                    onChange={setBlankGoalDescription}
                    onUse={() => setIsGoalLibraryOpen(true)}
                />

                <GoalLibraryCard onUse={() => setIsGoalLibraryOpen(true)} />

                <AiSuggestionCard onUse={() => setIsGoalLibraryOpen(true)} />

                <CascadeGoalCard onUse={() => setIsGoalLibraryOpen(true)} />
            </div>

            <BulkImportBanner />

            <Modal
                isOpen={isGoalLibraryOpen}
                onClose={() => setIsGoalLibraryOpen(false)}
                size="xl"
                className="max-w-[1300px] p-0"
            >
                <Suspense fallback={<LazySectionFallback />}>
                    <GoalLibraryPopup onClose={() => setIsGoalLibraryOpen(false)} />
                </Suspense>
            </Modal>

          
        </>
    );
};

export default React.memo(StartGoalSelection);
