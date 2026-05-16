import { ChevronLeft, Home, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
}

export function Header({ title, showBack, rightSlot }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const onRoot = location.pathname === "/";

  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-cream/80 backdrop-blur-md">
      <div
        className="mx-auto flex max-w-xl items-center gap-2 px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)", paddingBottom: "0.5rem" }}
      >
        {showBack ? (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Tilbake">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="h-11 w-11" />
        )}
        <h1 className="flex-1 truncate font-display text-xl font-bold text-ink">{title}</h1>
        {rightSlot ?? (
          onRoot ? (
            <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Logg ut">
              <LogOut className="h-5 w-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Mine lag">
              <Home className="h-5 w-5" />
            </Button>
          )
        )}
      </div>
    </header>
  );
}
