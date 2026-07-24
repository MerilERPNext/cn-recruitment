import React from 'react';
import { ArrowRight, Inbox } from 'lucide-react';
import { Typography } from '../../../../shared/atoms/Typography';
import Button from '../../../../shared/atoms/Button';

const BulkImportBanner = () => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm mb-8 lg:mb-12">
            <div className="flex w-full min-w-0 items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center shrink-0">
                    <Inbox className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                    <Typography variant="subheading" className="font-semibold text-gray-900">Need to create many goals at once?</Typography>
                    <Typography variant="bodyMedium" className="text-gray-500 text-sm">Bulk-import via CSV/XLSX — up to 5,000 rows with row-level validation. Suitable for managers cascading to a team.</Typography>
                </div>
            </div>
            <Button variant="outline" bgColor="text" className="w-full sm:w-auto justify-center whitespace-nowrap bg-white">
                Bulk Import <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
        </div>
    );
};

export default React.memo(BulkImportBanner);
