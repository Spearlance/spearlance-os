import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

export function SocialMediaCallout() {
  return (
    <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      
      <AlertDescription className="text-blue-900 dark:text-blue-100">
        <p className="mb-2">
          Create your social media posts and build your content calendar right here. For now, download the images and copy/paste your captions into your social media pages.
        </p>
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700">
          Coming Soon: Direct scheduling to social platforms
        </Badge>
      </AlertDescription>
    </Alert>
  );
}
