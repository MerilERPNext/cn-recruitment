import { memo } from 'react';
import { Form } from '@tsed/react-formio';
import { format, isValid, parse } from 'date-fns';
import { Sparkles, X } from 'lucide-react';
import Badge from '../../../../shared/Badge';
import Button from '../../../../shared/atoms/Button';
import { Card } from '../../../../shared/atoms/Card';
import { Select } from '../../../../shared/atoms/Select';
import { Typography } from '../../../../shared/atoms/Typography';
import type { CategorySelectOption } from '../../Type';

interface ObjectiveCardProps {
    weightage: number;
    setWeightage: (weightage: number) => void;
    selectedCategory: CategorySelectOption;
    setSelectedCategory: (category: CategorySelectOption) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
    labelClass: string;
    categorySelectOptions: CategorySelectOption[];
    tags: string[];
}

const goalPeriodFormSchema = {
    display: 'form',
    components: [
        {
            type: 'columns',
            key: 'periodDates',
            label: '',
            hideLabel: true,
            columns: [
                {
                    width: 6,
                    offset: 0,
                    push: 0,
                    pull: 0,
                    components: [
                        {
                            type: 'datetime',
                            key: 'start_date',
                            label: 'Start Date',
                            placeholder: 'Select start date',
                            format: 'dd-MM-yyyy',
                            enableTime: false,
                            validate: { required: true },
                            customClass: 'mb-0',
                            input: true,
                            widget: {
                                type: 'calendar',
                                displayInTimezone: 'viewer',
                                locale: 'en',
                                useLocaleSettings: false,
                                allowInput: true,
                                mode: 'single',
                                enableTime: false,
                                noCalendar: false,
                                format: 'yyyy-MM-dd',
                                hourIncrement: 1,
                                minuteIncrement: 5,
                                time_24hr: false,
                                minDate: null,
                                disabledDates: '',
                                maxDate: null,
                            },
                        },
                    ],
                },
                {
                    width: 6,
                    offset: 0,
                    push: 0,
                    pull: 0,
                    components: [
                        {
                            type: 'datetime',
                            key: 'end_date',
                            label: 'End Date',
                            placeholder: 'Select end date',
                            format: 'dd-MM-yyyy',
                            enableTime: false,
                            validate: { required: true },
                            customClass: 'mb-0',
                            input: true,
                            widget: {
                                type: 'calendar',
                                displayInTimezone: 'viewer',
                                locale: 'en',
                                useLocaleSettings: false,
                                allowInput: true,
                                mode: 'single',
                                enableTime: false,
                                noCalendar: false,
                                format: 'yyyy-MM-dd',
                                hourIncrement: 1,
                                minuteIncrement: 5,
                                time_24hr: false,
                                minDate: null,
                                disabledDates: '',
                                maxDate: null,
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

const parseGoalDate = (value: string, pattern = 'yyyy-MM-dd') => {
    if (!value) return null;
    const parsedDate = parse(value, pattern, new Date());
    return isValid(parsedDate) ? parsedDate : null;
};

const formatGoalDateForForm = (value: string) => {
    const parsedDate =
        parseGoalDate(value, 'yyyy-MM-dd') ||
        parseGoalDate(value, 'MM/dd/yyyy') ||
        parseGoalDate(value, 'dd-MM-yyyy');
    return parsedDate ? format(parsedDate, 'yyyy-MM-dd') : '';
};

const formatFormDateForGoal = (value?: string) => {
    if (!value) return '';
    const dateValue = String(value).split('T')[0];
    const parsedDate =
        parseGoalDate(dateValue, 'yyyy-MM-dd') ||
        parseGoalDate(dateValue, 'dd-MM-yyyy') ||
        parseGoalDate(dateValue, 'MM/dd/yyyy');
    return parsedDate ? format(parsedDate, 'yyyy-MM-dd') : '';
};

export const ObjectiveCard = memo(({
    weightage,
    setWeightage,
    selectedCategory,
    setSelectedCategory,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    labelClass,
    categorySelectOptions,
    tags,
}: ObjectiveCardProps) => {
    return (
        <Card className="border border-violet-200 bg-white p-5 shadow-sm" radius="xl" padding="none">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge label="Objective" variant="purple" size="sm" />
                    <Typography variant="caption" className="text-gray-500">
                        What you want to achieve - qualitative
                    </Typography>
                </div>

                <Button
                    type="button"
                    variant="soft"
                    bgColor="primary"
                    className="h-8 justify-center rounded-lg bg-violet-50 px-3 text-xs text-violet-700 hover:bg-violet-100"
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    Rewrite with AI
                </Button>
            </div>

            <input
                className="mb-3 h-12 w-full rounded-lg border border-violet-200 bg-white px-4 text-base font-semibold text-gray-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                defaultValue="Ship Oxygen 2.0 dashboard to 100% of PW employees"
                aria-label="Goal objective title"
            />

            <textarea
                className="mb-5 min-h-[76px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-5 text-gray-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                defaultValue="Lead the design + research for the redesigned dashboard. Drive adoption past 80% WAU. Coordinate with PMM and CS for rollout comms. Quarterly progress reviews with Aditi."
                aria-label="Goal objective description"
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr]">
                <div>
                    <label className={labelClass}>Weightage</label>
                    <div className="flex items-center gap-3">
                        <input
                            aria-label="Goal weightage"
                            className="h-2 w-full accent-blue-600"
                            type="range"
                            min="0"
                            max="100"
                            value={weightage}
                            onChange={(event) => setWeightage(Number(event.target.value))}
                        />
                        <span className="w-10 text-sm font-semibold text-blue-600">{weightage}%</span>
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Category</label>
                    <Select
                        options={categorySelectOptions}
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        className="relative w-full"
                    />
                </div>

                <div className="lg:col-span-2 [&_.formio-component]:!mb-0 [&_.formio-component-datetime_input]:!mb-0 [&_label]:!mt-0 [&_label]:!pt-0 [&_label]:!pb-0 [&_label]:!mb-1.5 [&_label]:!text-xs [&_label]:!font-medium [&_label]:!text-gray-600 [&_label]:!h-auto [&_label]:!block [&_.form-group]:!mt-0 [&_.form-group]:!mb-0 [&_.formio-form]:!mt-0 [&_.form-control]:h-[46px] [&_.form-control]:w-full [&_.form-control]:rounded-lg [&_.form-control]:border [&_.form-control]:border-gray-300 [&_.form-control]:bg-white [&_.form-control]:px-4 [&_.form-control]:text-sm [&_.form-control]:text-gray-900 [&_.form-control]:shadow-sm [&_.form-control]:outline-none [&_.form-control]:transition [&_.form-control:focus]:border-blue-400 [&_.form-control:focus]:ring-2 [&_.form-control:focus]:ring-blue-100 [&_.row]:-mx-2 [&_.row>div]:px-2">
                    <Form
                        form={goalPeriodFormSchema}
                        submission={{
                            data: {
                                start_date: formatGoalDateForForm(startDate),
                                end_date: formatGoalDateForForm(endDate),
                            },
                        }}
                        onChange={(form: { data: Record<string, string> }) => {
                            const start = formatFormDateForGoal(form.data.start_date);
                            const end = formatFormDateForGoal(form.data.end_date);
                            if (start) setStartDate(start);
                            if (end) setEndDate(end);
                        }}
                        options={{
                            noAlerts: true,
                            submitButton: false,
                        }}
                    />
                </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">Tags:</span>
                {tags.map((tag) => (
                    <div key={tag} className="inline-flex h-7 items-center gap-1 border-violet-200 bg-white pl-1 pr-2">
                        <Badge label={tag} variant="purple" size="sm" icon={<X className="h-3 w-3" />} />
                    </div>
                ))}
                <Badge variant="white" label="+ Add tag" />
            </div>
        </Card>
    );
});
