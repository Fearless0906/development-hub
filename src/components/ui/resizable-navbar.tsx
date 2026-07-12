import React, { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

type WithClassName = { children: React.ReactNode; className?: string };
type VisibleProps = WithClassName & { visible?: boolean };

export const Navbar = ({ children, className }: WithClassName) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 100);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div className={cn("sticky inset-x-0 top-20 z-40 w-full", className)}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ visible?: boolean }>, { visible })
          : child,
      )}
    </div>
  );
};

export const NavBody = ({ children, className, visible }: VisibleProps) => (
  <div
    className={cn(
      "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between self-start rounded-full bg-transparent px-4 py-2 transition-[width,transform,background-color,box-shadow,backdrop-filter] duration-300 xl:flex",
      visible && "w-[min(90%,72rem)] translate-y-5 bg-white/80 shadow-lg backdrop-blur-[10px] dark:bg-neutral-950/80",
      className,
    )}
  >
    {children}
  </div>
);

export const MobileNav = ({ children, className, visible }: VisibleProps) => (
  <div
    className={cn(
      "relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between rounded-[2rem] bg-transparent px-0 py-2 transition-[width,transform,background-color,box-shadow,backdrop-filter] duration-300 xl:hidden",
      visible && "w-[90%] translate-y-5 rounded-lg bg-white/80 shadow-lg backdrop-blur-[10px] dark:bg-neutral-950/80",
      className,
    )}
  >
    {children}
  </div>
);

export const MobileNavHeader = ({ children, className }: WithClassName) => (
  <div className={cn("flex w-full flex-row items-center justify-between", className)}>{children}</div>
);

export const MobileNavMenu = ({ children, className, isOpen }: WithClassName & { isOpen: boolean; onClose: () => void }) =>
  isOpen ? (
    <div className={cn("absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start gap-4 rounded-lg bg-white px-4 py-8 shadow-xl dark:bg-neutral-950", className)}>
      {children}
    </div>
  ) : null;

export const MobileNavToggle = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => {
  const Icon = isOpen ? X : Menu;
  return (
    <button type="button" onClick={onClick} aria-label={isOpen ? "Close navigation" : "Open navigation"} className="rounded-md p-1 text-foreground">
      <Icon className="h-6 w-6" />
    </button>
  );
};

export const NavItems = ({ items, className, onItemClick }: { items: { name: string; link: string }[]; className?: string; onItemClick?: () => void }) => (
  <div className={cn("absolute inset-0 hidden items-center justify-center gap-2 xl:flex", className)}>
    {items.map((item) => <a key={item.link} href={item.link} onClick={onItemClick} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">{item.name}</a>)}
  </div>
);
