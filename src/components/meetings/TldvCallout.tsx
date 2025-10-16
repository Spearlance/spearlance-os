import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, ExternalLink } from "lucide-react";

export function TldvCallout() {
  const affiliateUrl = "https://tldv.cello.so/pKI06iNGgWA";
  
  return (
    <Alert className="bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">
        Record Your Meetings with TLDV
      </AlertTitle>
      <AlertDescription className="text-blue-800 dark:text-blue-200 space-y-3">
        <p>
          TLDV automatically records, transcribes, and summarizes your marketing meetings 
          on Zoom, Google Meet, and Teams. When you log meetings here with TLDV summaries, 
          our AI assistant can reference your calls to provide better recommendations.
        </p>
        <Button 
          variant="default" 
          size="sm"
          onClick={() => window.open(affiliateUrl, '_blank')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Try TLDV Free
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
