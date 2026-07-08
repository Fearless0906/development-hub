import { Link } from "react-router-dom";
import { Eye, GitFork, Copy, Check } from "lucide-react";
import { VoteButton } from "@/components/qa/VoteButton";
import { TagBadge } from "@/components/qa/TagBadge";
import { CodeBlock } from "@/components/code/CodeBlock";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { useState } from "react";
import { toast } from "sonner";

interface SnippetCardProps {
  id: string;
  title: string;
  description?: string;
  code: string;
  language: string;
  votesCount: number;
  viewsCount: number;
  forksCount: number;
  createdAt: string;
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  tags: Array<{ id: string; name: string; color: string }>;
  userVote?: number | null;
  forkedFrom?: { id: string; title: string } | null;
}

export const SnippetCard = ({
  id,
  title,
  description,
  code,
  language,
  votesCount,
  viewsCount,
  forksCount,
  createdAt,
  author,
  tags,
  userVote,
  forkedFrom,
}: SnippetCardProps) => {
  const [copied, setCopied] = useState(false);

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedCode = code.split("\n").slice(0, 8).join("\n");

  return (
    <div className="glass-card-hover overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-border/50">
        <div className="flex items-start gap-4">
          {/* Vote */}
          <div className="hidden sm:block">
            <VoteButton
              voteableType="snippet"
              voteableId={id}
              currentVotes={votesCount}
              userVote={userVote}
              size="sm"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {forkedFrom && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <GitFork className="h-3 w-3" />
                  forked from
                  <Link to={`/snippets/${forkedFrom.id}`} className="text-primary hover:underline">
                    {forkedFrom.title}
                  </Link>
                </span>
              )}
            </div>
            <Link
              to={`/snippets/${id}`}
              className="font-display text-lg font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
            >
              {title}
            </Link>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {description}
              </p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="tag-badge">{language}</span>
              {tags.map((tag) => (
                <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </button>
            <BookmarkButton bookmarkableType="snippet" bookmarkableId={id} />
          </div>
        </div>
      </div>

      {/* Code Preview */}
      <Link to={`/snippets/${id}`} className="block">
        <CodeBlock code={truncatedCode} language={language} showLineNumbers={false} maxHeight="200px" />
      </Link>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="sm:hidden flex items-center gap-1">
            <span className="font-medium text-foreground">{votesCount}</span> votes
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{viewsCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <GitFork className="h-4 w-4" />
            <span>{forksCount}</span>
          </div>
        </div>

        {/* Author */}
        <div className="flex items-center gap-2 text-sm">
          <Avatar className="h-5 w-5">
            <AvatarImage src={author.avatarUrl} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(author.username)}
            </AvatarFallback>
          </Avatar>
          <Link
            to={`/profile/${author.id}`}
            className="text-primary hover:underline"
          >
            {author.username}
          </Link>
          <span className="text-muted-foreground">
            • {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
};
