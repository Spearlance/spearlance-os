import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { 
  Eye, 
  Users, 
  Heart, 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MousePointerClick 
} from "lucide-react";

interface PostAnalyticsProps {
  analytics: {
    platform: string;
    impressions: number | null;
    reach: number | null;
    engagement: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
    clicks: number | null;
    synced_at: string | null;
  } | null;
}

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  tiktok: "TikTok",
};

const platformEmojis: Record<string, string> = {
  instagram: "📷",
  facebook: "👥",
  linkedin: "💼",
  twitter: "🐦",
  tiktok: "🎵",
};

const formatNumber = (num: number | null) => {
  if (num === null || num === undefined) return "—";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

export function PostAnalytics({ analytics }: PostAnalyticsProps) {
  if (!analytics) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p>No analytics data available</p>
      </Card>
    );
  }

  const { platform, impressions, reach, engagement, likes, comments, shares, saves, clicks, synced_at } = analytics;
  const platformLabel = platformLabels[platform] || platform;
  const platformEmoji = platformEmojis[platform] || "📱";

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{platformEmoji}</span>
          <Badge variant="secondary">{platformLabel}</Badge>
        </div>
        {synced_at && (
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(synced_at), { addSuffix: true })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Primary Metrics */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{formatNumber(impressions)}</p>
              <p className="text-xs text-muted-foreground">Impressions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{formatNumber(reach)}</p>
              <p className="text-xs text-muted-foreground">Reach</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{formatNumber(engagement)}</p>
              <p className="text-xs text-muted-foreground">Engagement</p>
            </div>
          </div>
        </div>

        {/* Interaction Metrics */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xl font-semibold">{formatNumber(likes)}</p>
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xl font-semibold">{formatNumber(comments)}</p>
              <p className="text-xs text-muted-foreground">Comments</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xl font-semibold">{formatNumber(shares)}</p>
              <p className="text-xs text-muted-foreground">Shares</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="flex items-center justify-around mt-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-muted-foreground" />
          <div className="text-center">
            <p className="text-lg font-semibold">{formatNumber(saves)}</p>
            <p className="text-xs text-muted-foreground">Saves</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          <div className="text-center">
            <p className="text-lg font-semibold">{formatNumber(clicks)}</p>
            <p className="text-xs text-muted-foreground">Clicks</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
