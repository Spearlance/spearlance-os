import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
export function TldvCallout() {
  const affiliateUrl = "https://tldv.cello.so/pKI06iNGgWA";
  return <Alert className="bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800">
      <img src="https://www.google.com/s2/favicons?domain=tldv.io&sz=64" alt="TLDV" className="h-5 w-5" />
      
      <AlertDescription className="text-gray-700 dark:text-gray-300 space-y-3">
        <p>
          Record and transcribe your meetings with TLDV. Add summaries here so our AI assistant can provide better recommendations based on your calls.
        </p>
        <Button variant="outline" size="sm" onClick={() => window.open(affiliateUrl, '_blank')} className="border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
          Try TLDV Free
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
      </AlertDescription>
    </Alert>;
}