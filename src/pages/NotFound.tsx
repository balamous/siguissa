import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen grid place-items-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-60 -z-10" aria-hidden />
      <div className="text-center px-6">
        <div className="font-display text-9xl font-bold text-gradient leading-none">404</div>
        <h1 className="font-display text-3xl font-bold mt-6">This track doesn't exist</h1>
        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">The page you're looking for got remixed into oblivion.</p>
        <Button asChild variant="hero" size="lg" className="mt-8">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
