import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/integrations/django/api";
import { 
  Trophy, 
  Medal, 
  Award, 
  Star, 
  MessageSquare, 
  HelpCircle,
  Loader2,
  Crown,
  Zap,
  Shield,
  Gem,
  Flame
} from "lucide-react";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  reputation: number;
  questions_count: number;
  answers_count: number;
  bio: string | null;
  created_at: string;
}

interface Badge {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
}

const getBadges = (profile: Profile): Badge[] => {
  const badges: Badge[] = [];
  
  // Reputation-based badges
  if (profile.reputation >= 10000) {
    badges.push({
      name: "Legend",
      icon: <Crown className="h-3.5 w-3.5" />,
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/10",
      description: "10,000+ reputation"
    });
  } else if (profile.reputation >= 5000) {
    badges.push({
      name: "Master",
      icon: <Gem className="h-3.5 w-3.5" />,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
      description: "5,000+ reputation"
    });
  } else if (profile.reputation >= 1000) {
    badges.push({
      name: "Expert",
      icon: <Shield className="h-3.5 w-3.5" />,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
      description: "1,000+ reputation"
    });
  } else if (profile.reputation >= 500) {
    badges.push({
      name: "Pro",
      icon: <Zap className="h-3.5 w-3.5" />,
      color: "text-cyan-400",
      bgColor: "bg-cyan-400/10",
      description: "500+ reputation"
    });
  }

  // Activity-based badges
  if (profile.answers_count >= 100) {
    badges.push({
      name: "Mentor",
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      color: "text-green-400",
      bgColor: "bg-green-400/10",
      description: "100+ answers"
    });
  } else if (profile.answers_count >= 50) {
    badges.push({
      name: "Helper",
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
      description: "50+ answers"
    });
  }

  if (profile.questions_count >= 50) {
    badges.push({
      name: "Curious",
      icon: <HelpCircle className="h-3.5 w-3.5" />,
      color: "text-orange-400",
      bgColor: "bg-orange-400/10",
      description: "50+ questions"
    });
  }

  // Early adopter (joined in 2025 or earlier simulation)
  const joinDate = new Date(profile.created_at);
  const now = new Date();
  const monthsActive = (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsActive >= 12) {
    badges.push({
      name: "Veteran",
      icon: <Flame className="h-3.5 w-3.5" />,
      color: "text-red-400",
      bgColor: "bg-red-400/10",
      description: "1+ year member"
    });
  }

  return badges;
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-6 w-6 text-yellow-400" />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-300" />;
    case 3:
      return <Medal className="h-6 w-6 text-amber-600" />;
    default:
      return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return "border-yellow-400/30 bg-gradient-to-r from-yellow-400/5 to-transparent";
    case 2:
      return "border-gray-300/30 bg-gradient-to-r from-gray-300/5 to-transparent";
    case 3:
      return "border-amber-600/30 bg-gradient-to-r from-amber-600/5 to-transparent";
    default:
      return "";
  }
};

const Leaderboard = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "week">("all");

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await api
        .from("profiles")
        .select("*")
        .order("reputation", { ascending: false })
        .limit(100);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4">
              <Trophy className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              Leaderboard
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Top contributors in our developer community, ranked by reputation and achievements
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
              {(["all", "month", "week"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter === "all" ? "All Time" : filter === "month" ? "This Month" : "This Week"}
                </button>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                No users yet
              </h3>
              <p className="text-muted-foreground">
                Be the first to join and start earning reputation!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Top 3 Podium */}
              {profiles.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {/* Second Place */}
                  <div className="glass-card p-5 text-center order-1 mt-8">
                    <div className="flex justify-center mb-3">
                      <Medal className="h-10 w-10 text-gray-300" />
                    </div>
                    <Avatar className="h-16 w-16 mx-auto mb-3 border-2 border-gray-300/50">
                      <AvatarImage src={profiles[1].avatar_url || undefined} />
                      <AvatarFallback className="bg-gray-300/10 text-gray-300 text-lg font-bold">
                        {getInitials(profiles[1].username)}
                      </AvatarFallback>
                    </Avatar>
                    <Link
                      to={`/profile/${profiles[1].id}`}
                      className="font-display font-semibold text-foreground hover:text-primary transition-colors block truncate"
                    >
                      {profiles[1].display_name || profiles[1].username}
                    </Link>
                    <p className="text-2xl font-bold text-gray-300 mt-1">
                      {formatNumber(profiles[1].reputation)}
                    </p>
                    <p className="text-xs text-muted-foreground">reputation</p>
                  </div>

                  {/* First Place */}
                  <div className="glass-card p-5 text-center order-2 border-yellow-400/30 bg-gradient-to-b from-yellow-400/5 to-transparent">
                    <div className="flex justify-center mb-3">
                      <Crown className="h-12 w-12 text-yellow-400" />
                    </div>
                    <Avatar className="h-20 w-20 mx-auto mb-3 border-2 border-yellow-400/50">
                      <AvatarImage src={profiles[0].avatar_url || undefined} />
                      <AvatarFallback className="bg-yellow-400/10 text-yellow-400 text-xl font-bold">
                        {getInitials(profiles[0].username)}
                      </AvatarFallback>
                    </Avatar>
                    <Link
                      to={`/profile/${profiles[0].id}`}
                      className="font-display font-semibold text-foreground hover:text-primary transition-colors block truncate"
                    >
                      {profiles[0].display_name || profiles[0].username}
                    </Link>
                    <p className="text-3xl font-bold text-yellow-400 mt-1">
                      {formatNumber(profiles[0].reputation)}
                    </p>
                    <p className="text-xs text-muted-foreground">reputation</p>
                    <div className="flex flex-wrap justify-center gap-1 mt-3">
                      {getBadges(profiles[0]).slice(0, 3).map((badge, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color} ${badge.bgColor}`}
                          title={badge.description}
                        >
                          {badge.icon}
                          {badge.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Third Place */}
                  <div className="glass-card p-5 text-center order-3 mt-12">
                    <div className="flex justify-center mb-3">
                      <Medal className="h-9 w-9 text-amber-600" />
                    </div>
                    <Avatar className="h-14 w-14 mx-auto mb-3 border-2 border-amber-600/50">
                      <AvatarImage src={profiles[2].avatar_url || undefined} />
                      <AvatarFallback className="bg-amber-600/10 text-amber-600 text-base font-bold">
                        {getInitials(profiles[2].username)}
                      </AvatarFallback>
                    </Avatar>
                    <Link
                      to={`/profile/${profiles[2].id}`}
                      className="font-display font-semibold text-foreground hover:text-primary transition-colors block truncate"
                    >
                      {profiles[2].display_name || profiles[2].username}
                    </Link>
                    <p className="text-xl font-bold text-amber-600 mt-1">
                      {formatNumber(profiles[2].reputation)}
                    </p>
                    <p className="text-xs text-muted-foreground">reputation</p>
                  </div>
                </div>
              )}

              {/* Rest of the list */}
              {profiles.slice(3).map((profile, index) => {
                const rank = index + 4;
                const badges = getBadges(profile);
                
                return (
                  <div
                    key={profile.id}
                    className={`glass-card p-4 flex items-center gap-4 ${getRankStyle(rank)}`}
                  >
                    {/* Rank */}
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      {getRankIcon(rank)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(profile.username)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/profile/${profile.id}`}
                          className="font-display font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {profile.display_name || profile.username}
                        </Link>
                        {badges.slice(0, 2).map((badge, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color} ${badge.bgColor}`}
                            title={badge.description}
                          >
                            {badge.icon}
                            <span className="hidden sm:inline">{badge.name}</span>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <HelpCircle className="h-3.5 w-3.5" />
                          {profile.questions_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {profile.answers_count}
                        </span>
                      </div>
                    </div>

                    {/* Reputation */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-primary">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-bold text-lg">{formatNumber(profile.reputation)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">reputation</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Badges Legend */}
          <div className="glass-card p-6 mt-10">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Achievement Badges
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "Legend", icon: <Crown className="h-4 w-4" />, color: "text-yellow-400", bgColor: "bg-yellow-400/10", desc: "10,000+ reputation" },
                { name: "Master", icon: <Gem className="h-4 w-4" />, color: "text-purple-400", bgColor: "bg-purple-400/10", desc: "5,000+ reputation" },
                { name: "Expert", icon: <Shield className="h-4 w-4" />, color: "text-blue-400", bgColor: "bg-blue-400/10", desc: "1,000+ reputation" },
                { name: "Pro", icon: <Zap className="h-4 w-4" />, color: "text-cyan-400", bgColor: "bg-cyan-400/10", desc: "500+ reputation" },
                { name: "Mentor", icon: <MessageSquare className="h-4 w-4" />, color: "text-green-400", bgColor: "bg-green-400/10", desc: "100+ answers" },
                { name: "Curious", icon: <HelpCircle className="h-4 w-4" />, color: "text-orange-400", bgColor: "bg-orange-400/10", desc: "50+ questions" },
              ].map((badge) => (
                <div key={badge.name} className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${badge.color} ${badge.bgColor}`}>
                    {badge.icon}
                    {badge.name}
                  </span>
                  <span className="text-sm text-muted-foreground">{badge.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Leaderboard;
