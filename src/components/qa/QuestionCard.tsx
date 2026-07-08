import { Link } from "react-router-dom";
import { MessageSquare, Eye, Check } from "lucide-react";
import { VoteButton } from "./VoteButton";
import { TagBadge } from "./TagBadge";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
interface QuestionCardProps {
  id: string;
  title: string;
  content: string;
  slug: string;
  votesCount: number;
  answersCount: number;
  viewsCount: number;
  isSolved: boolean;
  createdAt: string;
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
    reputation: number;
  };
  tags: Array<{ id: string; name: string; color: string }>;
  userVote?: number | null;
}

export const QuestionCard = ({
  id,
  title,
  content,
  slug,
  votesCount,
  answersCount,
  viewsCount,
  isSolved,
  createdAt,
  author,
  tags,
  userVote,
}: QuestionCardProps) => {
  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const truncatedContent = content.length > 200 ? content.substring(0, 200) + "..." : content;

  return (
    <div className="glass-card-hover p-5 md:p-6">
      <div className="flex gap-4">
        {/* Vote Column */}
        <div className="hidden sm:block">
          <VoteButton
            voteableType="question"
            voteableId={id}
            currentVotes={votesCount}
            userVote={userVote}
          />
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-start gap-2 flex-1">
              {isSolved && (
                <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/20 text-primary">
                  <Check className="h-3 w-3" />
                  Solved
                </span>
              )}
              <Link
                to={`/questions/${id}`}
                className="font-display text-lg font-semibold text-foreground hover:text-primary transition-colors line-clamp-2"
              >
                {title}
              </Link>
            </div>
            <BookmarkButton bookmarkableType="question" bookmarkableId={id} />
          </div>

          {/* Preview */}
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {truncatedContent}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
            ))}
          </div>

          {/* Meta Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="sm:hidden flex items-center gap-1">
                <span className="font-medium text-foreground">{votesCount}</span>
                <span>votes</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium text-foreground">{answersCount}</span>
                <span className="hidden sm:inline">answers</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span className="font-medium text-foreground">{viewsCount}</span>
                <span className="hidden sm:inline">views</span>
              </div>
            </div>

            {/* Author */}
            <div className="flex items-center gap-2 text-sm">
              <Avatar className="h-6 w-6">
                <AvatarImage src={author.avatarUrl} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(author.username)}
                </AvatarFallback>
              </Avatar>
              <Link
                to={`/profile/${author.id}`}
                className="text-primary hover:underline font-medium"
              >
                {author.username}
              </Link>
              <span className="text-muted-foreground">
                • {author.reputation} rep
              </span>
              <span className="text-muted-foreground">
                • {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
