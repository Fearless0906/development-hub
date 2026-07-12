import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/integrations/django/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoteButtonProps {
  voteableType: "question" | "answer" | "snippet";
  voteableId: string;
  currentVotes: number;
  userVote?: number | null;
  onVoteChange?: (newVotes: number, userVote: number | null) => void;
  size?: "sm" | "md";
}

export const VoteButton = ({
  voteableType,
  voteableId,
  currentVotes,
  userVote = null,
  onVoteChange,
  size = "md",
}: VoteButtonProps) => {
  const { user } = useAuth();
  const [votes, setVotes] = useState(currentVotes);
  const [vote, setVote] = useState<number | null>(userVote);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async (value: 1 | -1) => {
    if (!user) {
      toast.error("Please sign in to vote");
      return;
    }

    setIsLoading(true);

    try {
      if (vote === value) {
        // Remove vote
        const { error } = await api
          .from("votes")
          .delete()
          .eq("user_id", user.id)
          .eq("voteable_type", voteableType)
          .eq("voteable_id", voteableId);

        if (error) throw error;

        const newVotes = votes - value;
        setVotes(newVotes);
        setVote(null);
        onVoteChange?.(newVotes, null);
      } else {
        // Upsert vote
        const { error } = await api
          .from("votes")
          .upsert({
            user_id: user.id,
            voteable_type: voteableType,
            voteable_id: voteableId,
            value,
          }, {
            onConflict: "user_id,voteable_type,voteable_id",
          });

        if (error) throw error;

        const voteDiff = vote ? value - vote : value;
        const newVotes = votes + voteDiff;
        setVotes(newVotes);
        setVote(value);
        onVoteChange?.(newVotes, value);
      }
    } catch (error: any) {
      toast.error("Failed to vote");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const buttonSize = size === "sm" ? "p-1" : "p-1.5";

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => handleVote(1)}
        disabled={isLoading}
        className={cn(
          "rounded-md transition-colors",
          buttonSize,
          vote === 1
            ? "text-primary bg-primary/20"
            : "text-muted-foreground hover:text-primary hover:bg-primary/10"
        )}
      >
        <ChevronUp className={iconSize} />
      </button>
      <span className={cn(
        "font-display font-bold",
        size === "sm" ? "text-sm" : "text-lg",
        votes > 0 ? "text-primary" : votes < 0 ? "text-destructive" : "text-muted-foreground"
      )}>
        {votes}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={isLoading}
        className={cn(
          "rounded-md transition-colors",
          buttonSize,
          vote === -1
            ? "text-destructive bg-destructive/20"
            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        )}
      >
        <ChevronDown className={iconSize} />
      </button>
    </div>
  );
};
