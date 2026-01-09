import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import { FAQArticle } from "../../hooks/useFAQ";

interface FAQAccordionProps {
  categoryName: string;
  articleCount: number;
  articles: FAQArticle[];
}

const FAQAccordion: React.FC<FAQAccordionProps> = ({
  categoryName,
  articleCount,
  articles,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Strip HTML tags from content for display
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  return (
    <div className="w-full">
      {/* Category Header */}
      <Typography
        variant="h3"
        className="text-primary-600 mb-4"
      >
        {categoryName} ({articleCount})
      </Typography>

      {/* FAQ Items */}
      <div className="space-y-0">
        {articles.map((article, index) => (
          <div key={article.name} className="border-b border-gray-200">
            {/* Question Row */}
            <button
              className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(index)}
            >
              <Typography
                variant="body"
                color="primary"
                className="pr-4 font-medium"
              >
                {article.title}
              </Typography>
              <span className="flex-shrink-0 text-gray-400">
                {expandedIndex === index ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </span>
            </button>

            {/* Answer Content (Expandable) */}
            {expandedIndex === index && (
              <div className="pb-4 pr-10">
                <Typography variant="bodySmall" color="body2">
                  {stripHtml(article.content)}
                </Typography>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQAccordion;
