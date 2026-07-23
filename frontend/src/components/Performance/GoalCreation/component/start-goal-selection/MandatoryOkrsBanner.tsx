import React, { Suspense, useState } from 'react';
import { ArrowRight, FileText } from 'lucide-react';
import { Typography } from '../../../../shared/atoms/Typography';
import Button from '../../../../shared/atoms/Button';
import Modal from '../../../../shared/Modal';
import { LazySectionFallback } from '../../NewGaol';
import AcknowledgmentPopup from '../define-goal/AcknowledgmentPopup';



const MandatoryOkrsBanner = () => {
    const [openAcknowledgmentPopup, setOpenAcknowledgePopu] = useState(false);

    return (
        <div className="bg-[#fff8f6] border border-red-100 rounded-xl p-4 sm:p-5 mb-6 sm:mb-8 flex flex-col md:flex-row gap-4 sm:gap-5 items-start">
            <div className="bg-white border border-red-100 text-red-500 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-md tracking-wider">3 MANDATORY OKRs ASSIGNED</span>
                    <span className="text-gray-500 text-sm">Pushed by HR · India Tech BU · lock 21 May 2026</span>
                </div>
                <Typography variant="subheading" className="font-semibold text-gray-900 mb-4">
                    You have 3 mandatory OKRs to acknowledge before adding your own.
                </Typography>
                <div className="flex flex-wrap gap-3">
                    <div className="w-full sm:w-auto bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-start sm:items-center gap-2 text-sm shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="min-w-0 flex-1 text-gray-700">Complete FY26 compliance & a11y training</span>
                        <span className="shrink-0 text-red-500 font-medium">5%</span>
                    </div>
                    <div className="w-full sm:w-auto bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-start sm:items-center gap-2 text-sm shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        <span className="min-w-0 flex-1 text-gray-700">Maintain team DEI pulse score ≥ 4.0 / 5</span>
                        <span className="shrink-0 text-orange-500 font-medium">5%</span>
                    </div>
                    <div className="w-full sm:w-auto bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-start sm:items-center gap-2 text-sm shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="min-w-0 flex-1 text-gray-700">Drive customer-facing NPS ≥ 70 (PW-wide)</span>
                        <span className="shrink-0 text-blue-500 font-medium">10%</span>
                    </div>
                </div>
            </div>
            <div className="w-full md:w-auto mt-1 md:mt-0 self-start md:self-center">
                <Button onClick={()=>setOpenAcknowledgePopu(true)} variant="contain" bgColor="error" className="w-full md:w-auto justify-center bg-[#cd2c41] hover:bg-[#b02235] text-white">
                    Acknowledge 3 <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
            <Modal
                isOpen={openAcknowledgmentPopup}
                onClose={() => setOpenAcknowledgePopu(false)}
                size="lg"
                className="max-w-[780px] p-0"
            >
                <Suspense fallback={<LazySectionFallback />}>
                    <AcknowledgmentPopup onClose={() => setOpenAcknowledgePopu(false)} />
                </Suspense>
            </Modal>
        </div>
    );
};

export default React.memo(MandatoryOkrsBanner);
