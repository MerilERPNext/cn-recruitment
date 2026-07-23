import React, { Suspense, useState } from 'react';
import Modal from '../../../shared/Modal';

import { LazySectionFallback } from '../NewGaol';
import GoalLibraryPopup from './GoalLibraryPopup';

import MandatoryOkrsBanner from './start-goal-selection/MandatoryOkrsBanner';
import GoalCards from './start-goal-selection/GoalCards';
import BulkImportBanner from './start-goal-selection/BulkImportBanner';

const StartGoalSelection = () => {
    const [isGoalLibraryOpen, setIsGoalLibraryOpen] = useState(false);
    const [blankGoalDescription, setBlankGoalDescription] = useState(
        "Write your Objective + Key Results yourself. Best when your goal doesn't match anything in the library."
    );

    return (
        <>
            <MandatoryOkrsBanner />

            <GoalCards
                blankGoalDescription={blankGoalDescription}
                onBlankGoalDescriptionChange={setBlankGoalDescription}
                onOpenLibrary={() => setIsGoalLibraryOpen(true)}
            />

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
