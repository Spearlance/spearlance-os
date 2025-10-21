import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-semibold">Well, this is awkward...</h2>
        <p className="text-muted-foreground max-w-md">
          This page went on vacation without telling anyone. 
          But hey, you've still got the whole app at your fingertips! 👈
        </p>
      </div>

      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>Try using the sidebar menu to find what you're looking for,</p>
        <p>or head back to the dashboard to get back on track.</p>
      </div>

      <Button asChild>
        <Link to="/">
          <Home className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
};

export default NotFound;
