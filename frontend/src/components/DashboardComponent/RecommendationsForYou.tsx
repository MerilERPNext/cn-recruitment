import { Bot, FileText } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useCarouselCards } from "../../hooks/useCarousel";
import { Typography } from "../shared/atoms/Typography";

interface RecommendationsForYouProps {
  isMobile?: boolean;
}

export const RecommendationsForYou: React.FC<RecommendationsForYouProps> = ({
  isMobile = false,
}) => {
  const { data: cards, isLoading } = useCarouselCards();
  const navigate = useNavigate();

  const displayCards = React.useMemo(() => {
    if (!cards) return [];
    const filtered = isMobile
      ? cards.filter((card) => card.show_on_mobile_app === 1)
      : cards;
    return [...filtered].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
    );
  }, [cards, isMobile]);

  if (isLoading || displayCards.length === 0) return null;

  return (
    <div className="w-full flex gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto relative mb-4">
      {/* Left fixed banner box */}
      <div
        className={`flex-shrink-0 ${isMobile ? "w-32 p-2" : "w-48 p-4"} rounded-xl flex flex-col justify-center items-start bg-blue-50 border border-blue-100 relative`}
      >
        <Bot
          className={`${isMobile ? "w-8 h-8" : "w-10 h-10"} text-primary-500 mb-2 relative z-10`}
        />
        <Typography
          variant={isMobile ? "bodyMedium" : "subheading"}
          className="font-bold text-gray-800 relative z-10 w-fit"
        >
          Recommendations for You
        </Typography>
        {/* Subtle decorative waves background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full text-primary-300 fill-current"
          >
            <path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" />
          </svg>
        </div>
      </div>

      {/* Cards list */}
      {displayCards.map((card, idx) => (
        <div
          key={card.card_type || card.card_label || idx}
          onClick={() => {
            if (card.redirect_url) {
              // Determine if it's an absolute url or route
              if (card.redirect_url.startsWith("http")) {
                window.open(card.redirect_url, "_blank", "noopener,noreferrer");
              } else {
                navigate(`/${card.redirect_url.replace(/^\/+/, "")}`);
              }
            }
          }}
          className={`${isMobile ? "w-40 p-3" : "w-56 p-4"} flex-shrink-0 rounded-xl border border-primary-200 hover:border-primary-400 transition-all cursor-pointer bg-white hover:shadow-md flex flex-col justify-between group`}
        >
          <div>
            <div className="flex items-start justify-between">
              {card.icon ? (
                <img
                  src={card.icon}
                  alt={card.card_label}
                  className="w-6 h-6 object-contain mb-2 rounded-full"
                />
              ) : (
                <FileText className="w-5 h-5 text-primary-500 mb-2" />
              )}
            </div>
            <Typography
              variant={isMobile ? "bodySmall" : "bodyMedium"}
              className="font-bold text-gray-800 mb-2 leading-tight group-hover:text-primary-600 transition-colors"
            >
              {card.slogan || card.card_label}
            </Typography>
            <Typography
              variant="label"
              className="text-gray-500 line-clamp-3 leading-relaxed"
            >
              {card.description}
            </Typography>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecommendationsForYou;
