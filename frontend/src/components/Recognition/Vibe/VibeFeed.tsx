import React from "react";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import { Heart, MessageCircle, Share2, Star } from "lucide-react";
import Avatar from "./Avatar";
import { FEED_POSTS } from "./vibeMockData";

/**
 * Vibe activity feed — a stream of recent recognitions. Pure dummy data so the
 * tab works standalone without any backend wiring.
 */
const VibeFeed: React.FC = () => {
  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="mb-2">
          <Typography variant="h2" className="text-xl md:text-2xl font-bold mb-1">
            Feed
          </Typography>
          <Typography variant="bodyMedium" color="body2">
            See the latest appreciations flowing across your team.
          </Typography>
        </div>

        {FEED_POSTS.map((post) => (
          <Card key={post.id} radius="xl" className="border border-gray-100 shadow-sm p-4 md:p-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Avatar name={post.from} size={44} />
              <div className="min-w-0 flex-1">
                <Typography variant="bodyMedium" className="font-semibold leading-tight">
                  <span>{post.from}</span>
                  <span className="text-gray-400 font-normal"> appreciated </span>
                  <span>{post.to}</span>
                </Typography>
                <Typography variant="caption" color="body2">
                  {post.time}
                </Typography>
              </div>
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-full ${post.badgeColor} px-3 py-1 text-xs font-medium text-white shrink-0`}
              >
                <Star className="size-3.5 fill-white" />
                {post.badge}
              </span>
            </div>

            {/* Badge on mobile */}
            <span
              className={`mt-3 sm:hidden inline-flex items-center gap-1.5 rounded-full ${post.badgeColor} px-3 py-1 text-xs font-medium text-white`}
            >
              <Star className="size-3.5 fill-white" />
              {post.badge}
            </span>

            {/* Message */}
            <Typography variant="bodyMedium" className="mt-3 block">
              {post.message}
            </Typography>

            {/* Values */}
            <div className="mt-3 flex flex-wrap gap-2">
              {post.values.map((v) => (
                <span
                  key={v}
                  className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600"
                >
                  {v}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-6 border-t border-gray-100 pt-3 text-gray-500">
              <button className="flex items-center gap-1.5 text-sm hover:text-rose-500 transition-colors">
                <Heart className="size-4" />
                {post.likes}
              </button>
              <button className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
                <MessageCircle className="size-4" />
                {post.comments}
              </button>
              <button className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
                <Share2 className="size-4" />
                Share
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default VibeFeed;
