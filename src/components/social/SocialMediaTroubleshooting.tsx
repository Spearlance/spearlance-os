import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Instagram, Facebook, AlertCircle } from "lucide-react";

export const SocialMediaTroubleshooting = () => {
  return (
    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">Having trouble connecting?</AlertTitle>
      <AlertDescription>
        <Accordion type="single" collapsible className="mt-4">
          {/* Facebook Issues */}
          <AccordionItem value="facebook">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Facebook className="h-4 w-4" />
                Facebook Connection Steps & Issues
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm space-y-4">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  What to Expect During Connection
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
                  <li>
                    <strong>Login:</strong> You'll be prompted to log into your Facebook account if you're not already logged in
                  </li>
                  <li>
                    <strong>Two-Factor Authentication (if enabled):</strong> 
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                      <li>Open Facebook on your phone or trusted device</li>
                      <li>Click "It Was Me" to approve the login attempt</li>
                      <li>Wait 1-2 minutes for Facebook to process the approval</li>
                      <li>The browser will automatically continue once approved</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Select Page & Business Portfolio:</strong> Choose which Facebook Page you want to connect and your Business Portfolio
                  </li>
                  <li>
                    <strong>Final Confirmation:</strong> Facebook will show a final confirmation screen to verify which page connects to our app
                  </li>
                </ol>
              </div>

              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Connection Process Taking Too Long
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  <li>If waiting on 2FA approval, this is normal - can take 1-2 minutes</li>
                  <li>Check your phone for Facebook notification</li>
                  <li>Don't close the popup window while waiting</li>
                  <li>Ensure you approve on a device where Facebook is already logged in</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Can't Select a Page
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  <li>You must have admin access to the Facebook Page</li>
                  <li>Personal profiles cannot be connected (must be a Page)</li>
                  <li>Verify the page exists and you have proper role permissions</li>
                  <li>Check that the Page isn't restricted or unpublished</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Business Portfolio Issues
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  <li>If you don't see your portfolio, check Business Manager settings</li>
                  <li>Contact Facebook support if portfolio access is restricted</li>
                  <li>Try connecting with just Page permissions first</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Final Confirmation Screen Doesn't Appear
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  <li>Don't close popup during any step of the process</li>
                  <li>Check for browser popup blockers</li>
                  <li>Ensure JavaScript is enabled</li>
                  <li>Try disabling browser extensions temporarily</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Instagram Issues */}
          <AccordionItem value="instagram">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram Connection Issues
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm space-y-4">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  "Instagram is Blocked" Error
                </p>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Instagram's security system blocked the login attempt from an unfamiliar location or device.
                </p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  <li>Open Instagram app on your phone or trusted device</li>
                  <li>Look for a security notification about a blocked login attempt</li>
                  <li>Tap "This was me" to approve the login</li>
                  <li>Return to this page and try connecting again</li>
                </ol>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  💡 This is Instagram's security measure. It usually resolves immediately after approval on your mobile device, though it may take 1-2 minutes.
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Account Type Requirements
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  <li>Instagram account must be a Business or Creator account</li>
                  <li>Personal accounts cannot be connected via API</li>
                  <li>To convert: Go to Instagram Settings → Account → Switch to Professional Account</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Other Common Issues
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  <li>Ensure you're logged into the correct Instagram account</li>
                  <li>Try disabling browser extensions that might block OAuth</li>
                  <li>Check that your account isn't restricted or disabled</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* General Issues */}
          <AccordionItem value="general">
            <AccordionTrigger className="text-sm font-medium">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                General Connection Issues
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-sm space-y-4">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Popup Blocked</p>
                <p className="text-gray-700 dark:text-gray-300">
                  Check your browser's address bar for a popup blocker icon. 
                  Click it and allow popups for this site. You may need to try connecting again after allowing popups.
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Network Issues</p>
                <p className="text-gray-700 dark:text-gray-300">
                  Corporate networks may block social media connections. 
                  Try connecting from a different network or personal device if you're on a restricted network.
                </p>
              </div>
              
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Account Restrictions</p>
                <p className="text-gray-700 dark:text-gray-300">
                  Ensure your account isn't restricted or in violation of 
                  platform policies. Check your account status on the respective platform before attempting to connect.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Browser Compatibility</p>
                <p className="text-gray-700 dark:text-gray-300">
                  If you continue to experience issues, try using a different browser (Chrome, Firefox, Safari, or Edge) or clear your browser cache and cookies.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </AlertDescription>
    </Alert>
  );
};
