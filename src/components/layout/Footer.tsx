import { Code2 } from "lucide-react";
import { Link } from "react-router-dom";

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "Learning", href: "/learning" },
  { label: "Questions", href: "/questions" },
  { label: "Snippets", href: "/snippets" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Playground", href: "/playground" },
];

export const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-background/50">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="mb-10 flex flex-col justify-between gap-8 md:flex-row">
          <div>
            <Link to="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
                <Code2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">
                CDS Crash Course
              </span>
            </Link>
            <p className="mb-6 max-w-xs text-sm text-muted-foreground">
              CDS Crash Course is a focused learning space for lessons,
              practice, and steady progress.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-3" aria-label="Footer navigation">
            {footerLinks.map((link) => (
              <Link key={link.href} to={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CDS Crash Course. All rights reserved.
          </p>
          <Link to="/search" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Search all content</Link>
        </div>
      </div>
    </footer>
  );
};
