import { Target } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import reviewFormSchema from "./reviewFormSchema.json";
import { Form } from '@tsed/react-formio';
import { OverallSection, ScaleSettings } from '../../../types/goalReviewDetails';
import { getRatingShapFromScalesSettings } from './utils';

interface OverallGoalSectionProps {
  overallSection: OverallSection;
  scales?: ScaleSettings;
}

const OverallGoalSection: React.FC<OverallGoalSectionProps> = ({ scales, overallSection }) => {
  const [formSchema, setFormSchema] = useState<any>(null);

  const currentUserConfig = overallSection?.goals_overall.find(goal => goal.is_current_user);
  const canEdit = currentUserConfig?.can_edit || false;

  useEffect(() => {
    // defensive copy of schema
    const schema = JSON.parse(JSON.stringify(reviewFormSchema));

    // sanity checks
    if (!schema || typeof schema !== 'object') {
      console.error('reviewFormSchema missing or invalid', reviewFormSchema);
      setFormSchema(schema);
      return;
    }

    if (!Array.isArray(schema.components)) {
      console.error('reviewFormSchema.components missing or not an array', schema);
      setFormSchema(schema);
      return;
    }

    // Defensive defaults + coercion
    const canViewComment = !!currentUserConfig?.can_view_comment;
    const commentMandatory = !!currentUserConfig?.comment_mandatory;

    const canViewRating = !!currentUserConfig?.can_view_rating;
    const ratingMandatory = !!currentUserConfig?.rating_mandatory;

    schema.components = schema.components.map((comp: any) => {
      if (comp.key === 'comment') {
        comp.hidden = !canViewComment;
        comp.validate = comp.validate || {};
        comp.validate.required = commentMandatory;
        comp.label = (commentMandatory ? "Comment <span style='color:red;margin-left:4px;'>*</span>" : "Comment");
      } else if (comp.key === 'rating') {
        comp.hidden = !canViewRating;
        if (scales) {
          comp.shape = getRatingShapFromScalesSettings(scales?.settings);

          let compItems = scales.goal_scale.scale_details.map(sd => ({
            label: sd.scale_marker,
            value: sd.marks,
            description: sd.description
          }));
          comp.items = compItems;
        }

        comp.validate = comp.validate || {};
        comp.validate.required = ratingMandatory;
        comp.label = (ratingMandatory ? "Overall Rating <span style='color:red;margin-left:4px;'>*</span>" : "Overall Rating");
      }

      comp.hidden = !!comp.hidden;
      return comp;
    });

    setFormSchema(schema);

  }, [scales, currentUserConfig])
  console.log("overrall review", overallSection);
  return (
    <div className=" bg-white mt-8  rounded-xl border border-gray-200 p-5 shadow-xl">
      <h4 className="font-bold text-gray-700 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
        <Target size={16} className='' />  Overall Goal Section
      </h4>

      {formSchema &&
        <Form
          form={formSchema}
          options={{
            noAlerts: false,
            submitButton: false,
            readOnly: !canEdit
          }}
        />
      }
    </div>
  );
};

export default OverallGoalSection;