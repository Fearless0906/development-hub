import { 
  MessageSquareCode, 
  BookOpen, 
  Users, 
  FileCode2, 
  Zap, 
  Shield 
} from "lucide-react";

const features = [
  {
    icon: MessageSquareCode,
    title: "Smart Q&A",
    description: "Get answers from experts and AI. Upvote the best solutions and build your reputation.",
    color: "primary",
  },
  {
    icon: BookOpen,
    title: "Interactive Docs",
    description: "Unified documentation with live code examples. Search across all major frameworks.",
    color: "accent",
  },
  {
    icon: FileCode2,
    title: "Code Snippets",
    description: "Share, fork, and remix code. Version control built-in with instant previews.",
    color: "primary",
  },
  {
    icon: Users,
    title: "Community",
    description: "Join study groups, participate in challenges, and connect with developers worldwide.",
    color: "accent",
  },
  {
    icon: Zap,
    title: "AI Assistant",
    description: "Get contextual code suggestions, debugging help, and learning recommendations.",
    color: "primary",
  },
  {
    icon: Shield,
    title: "Enterprise Ready",
    description: "Private spaces, SSO, and compliance features for teams of all sizes.",
    color: "accent",
  },
];

export const Features = () => {
  return (
    <section id="learn" className="py-24 md:py-32 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,hsl(222_30%_10%),transparent_70%)]" />
      
      <div className="container relative z-10 mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Everything you need to{" "}
            <span className="text-gradient-primary">level up</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From beginner tutorials to advanced system design, DevHub has the tools 
            and community to accelerate your growth.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass-card-hover p-6 md:p-8 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div 
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 ${
                  feature.color === "primary" 
                    ? "bg-primary/10 text-primary" 
                    : "bg-accent/10 text-accent"
                }`}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
