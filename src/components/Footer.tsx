import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mt-12 flex justify-center pb-2">
      <Link
        to="/privacy"
        className="text-xs text-ink-muted/60 underline-offset-2 hover:text-ink-muted hover:underline"
      >
        Personvern
      </Link>
    </footer>
  );
}
