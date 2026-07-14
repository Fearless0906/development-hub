import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bookmark, Code2, LogOut, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavBody,
  Navbar as ResizableNavbar,
} from "@/components/ui/resizable-navbar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Learning", href: "/learning" },
  { name: "Quiz", href: "/quiz" },
  { name: "Leaderboard", href: "/leaderboard" },
];

const Brand = ({ onClick }: { onClick?: () => void }) => (
  <Link
    to="/"
    onClick={onClick}
    className="relative z-20 flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-2 py-1"
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary shadow-sm">
      <Code2 className="h-5 w-5 text-primary-foreground" />
    </span>
    <span className="font-display text-base font-bold text-foreground sm:text-lg">
      CDS Crash Course
    </span>
  </Link>
);

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut, loading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const visibleNavLinks = navLinks.filter(
    (link) => link.href !== "/quiz" || isAdmin,
  );
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const initials = (user?.email || "U").slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    closeMobileMenu();
    navigate("/");
  };

  const accountMenu = user && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage
              src={user.user_metadata?.avatar_url}
              alt="Avatar"
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <div className="p-2">
          <p className="text-sm font-medium">
            {user.user_metadata?.username || user.email?.split("@")[0]}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/bookmarks">
            <Bookmark className="mr-2 h-4 w-4" />
            Bookmarks
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <ResizableNavbar className="fixed inset-x-0 top-0 z-50 px-3 py-3">
      <NavBody className="border border-border/60 bg-background/85 px-3 shadow-lg shadow-black/5 backdrop-blur dark:bg-background/85">
        <Brand />

        <nav
          className="absolute inset-0 hidden items-center justify-center xl:flex"
          aria-label="Primary navigation"
        >
          <div className="flex items-center gap-0.5 rounded-full border border-border/50 bg-background/70 p-1 2xl:gap-1">
            {visibleNavLinks.map((link) => {
              const active =
                link.href === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(link.href);
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground 2xl:px-4",
                    active && "bg-primary/10 text-primary",
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="relative z-20 flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/search" aria-label="Search">
              <Search className="h-5 w-5" />
            </Link>
          </Button>
          <ThemeToggle />
          {user && <NotificationBell />}
          {loading ? (
            <div className="h-9 w-16 animate-pulse rounded-full bg-secondary/60" />
          ) : user ? (
            accountMenu
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/auth?mode=signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </NavBody>

      <MobileNav className="border border-border/60 bg-background/90 px-3 shadow-lg shadow-black/5 backdrop-blur dark:bg-background/90">
        <MobileNavHeader>
          <Brand onClick={closeMobileMenu} />
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <MobileNavToggle
              isOpen={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            />
          </div>
        </MobileNavHeader>
        <MobileNavMenu
          isOpen={mobileMenuOpen}
          onClose={closeMobileMenu}
          className="border border-border bg-background"
        >
          {visibleNavLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              onClick={closeMobileMenu}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary",
                location.pathname === link.href && "bg-primary/10 text-primary",
              )}
            >
              {link.name}
            </Link>
          ))}
          <div className="flex w-full flex-col gap-2 border-t border-border/60 pt-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/search" onClick={closeMobileMenu}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Link>
            </Button>
            {user ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/profile" onClick={closeMobileMenu}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/bookmarks" onClick={closeMobileMenu}>
                    <Bookmark className="mr-2 h-4 w-4" />
                    Bookmarks
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth" onClick={closeMobileMenu}>
                    Sign In
                  </Link>
                </Button>
                <Button variant="hero" size="sm" asChild>
                  <Link to="/auth?mode=signup" onClick={closeMobileMenu}>
                    Get Started
                  </Link>
                </Button>
              </>
            )}
          </div>
        </MobileNavMenu>
      </MobileNav>
    </ResizableNavbar>
  );
};
