import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import Avatar from "./Avatar";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import { useVibeFeed, type WorkConnectPost } from "../../../services/recognitionService";
import formatToIndianDate from "../../../utils/formatToIndianDate";

// Mirrors chatnext_work_connect/frontend's PostCard.tsx sanitize config
// EXACTLY — banner_html is generated once on the backend and rendered by both
// frontends, so the allowlist has to stay identical (kept in sync by hand,
// there's no shared package between the two apps).
const sanitizeBanner = (html: string) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "div", "span", "p", "img",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["style", "src", "alt", "class", "width", "height"],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  });

const FeedPostCard: React.FC<{
  post: WorkConnectPost;
  canLike: boolean;
  canComment: boolean;
  canShare: boolean;
}> = ({ post, canLike, canComment, canShare }) => {
  const sanitizedBanner = useMemo(
    () => (post.is_award && post.banner_html ? sanitizeBanner(post.banner_html) : ""),
    [post.is_award, post.banner_html]
  );
  const timestamp = post.published_at || post.created;

  return (
    <Card radius="xl" className="border border-gray-100 shadow-sm p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Avatar name={post.author.name} photo={post.author.image ?? undefined} size={44} />
        <div className="min-w-0 flex-1">
          <Typography variant="bodyMedium" className="font-semibold leading-tight">
            {post.is_award ? (
              <span>{post.author.name}</span>
            ) : (
              <span>{post.content}</span>
            )}
          </Typography>
          {timestamp && (
            <Typography variant="caption" color="body2">
              {formatToIndianDate(timestamp)}
            </Typography>
          )}
        </div>
      </div>

      {/* Award banner (rich gold card) or plain post content */}
      {post.is_award && post.banner_html ? (
        <div
          className="mt-3 rounded-lg overflow-hidden"
          dangerouslySetInnerHTML={{ __html: sanitizedBanner }}
        />
      ) : (
        <Typography variant="bodyMedium" className="mt-3 block">
          {post.content}
        </Typography>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-6 border-t border-gray-100 pt-3 text-gray-500">
        {canLike && (
          <button className="flex items-center gap-1.5 text-sm hover:text-rose-500 transition-colors">
            <Heart className="size-4" />
            {post.reaction_count}
          </button>
        )}
        {canComment && (
          <button className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
            <MessageCircle className="size-4" />
            {post.comment_count}
          </button>
        )}
        {canShare && (
          <button className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
            <Share2 className="size-4" />
            Share
          </button>
        )}
      </div>
    </Card>
  );
};

/**
 * Vibe activity feed — a stream of recent recognitions, including rich Award
 * announcement cards, pulled from the real Work Connect feed
 * (chatnext_work_connect.chatnext_work_connect.api.post.get_feed).
 */
const VibeFeed: React.FC = () => {
  // Feed actions gated by the "Recognition" app action permissions.
  const { data: uiPermission } = useGetUiPermission("Recognition");
  const canLike = isActionEnabled(uiPermission, "like", "Feed");
  const canComment = isActionEnabled(uiPermission, "comment", "Feed");
  const canShare = isActionEnabled(uiPermission, "share", "Feed");
  const { data: feed, isLoading } = useVibeFeed();
  const posts = feed?.posts ?? [];

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

        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading feed...</div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No posts yet — recognitions and appreciations will show up here.
          </div>
        ) : (
          posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              canLike={canLike}
              canComment={canComment}
              canShare={canShare}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default VibeFeed;
