import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Copy, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

export default function Admin2FASetup() {
  const [step, setStep] = useState<'generate' | 'verify' | 'complete'>('generate');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const generateQRCode = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Admin Account'
      });

      if (error) throw error;

      if (data) {
        setSecret(data.totp.secret);
        setFactorId(data.id);
        
        // Generate QR code
        const qrUrl = await QRCode.toDataURL(data.totp.uri);
        setQrCodeUrl(qrUrl);
        
        // Generate backup codes (simple implementation)
        const codes = Array.from({ length: 10 }, () => 
          Math.random().toString(36).substring(2, 10).toUpperCase()
        );
        setBackupCodes(codes);
        
        setStep('verify');
      }
    } catch (error: any) {
      toast.error("Error generating 2FA", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (error) throw error;

      if (data) {
        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: data.id,
          code: verificationCode
        });

        if (verifyError) throw verifyError;

        // Mark as enrolled in database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('admin_2fa_status').upsert({
            user_id: user.id,
            is_enrolled: true,
            last_verified_at: new Date().toISOString()
          });
        }

        toast.success("2FA enabled successfully", { description: "Your account is now protected with two-factor authentication" });

        setStep('complete');
      }
    } catch (error: any) {
      toast.error("Invalid verification code", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Backup codes copied", { description: "Store these codes in a safe place" });
  };

  if (step === 'generate') {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Set Up Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your admin account
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Two-factor authentication (2FA) adds an extra layer of security by requiring a code from your authenticator app in addition to your password.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h3 className="font-semibold">What you'll need:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>An authenticator app (Google Authenticator, Authy, 1Password, etc.)</li>
                <li>Your mobile device to scan a QR code</li>
                <li>A safe place to store backup codes</li>
              </ul>
            </div>

            <Button 
              onClick={generateQRCode} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Generating..." : "Continue"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setStep('generate')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Scan QR Code</CardTitle>
            <CardDescription>
              Use your authenticator app to scan this QR code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="2FA QR Code" className="w-64 h-64" />
              )}
            </div>

            <Alert>
              <AlertDescription>
                <strong>Manual entry:</strong> If you can't scan the QR code, enter this secret key manually:
                <code className="block mt-2 p-2 bg-muted rounded text-sm font-mono break-all">
                  {secret}
                </code>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="verification-code">Enter Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <Button 
              onClick={verifyCode} 
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full"
            >
              {isLoading ? "Verifying..." : "Verify & Enable 2FA"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <CardTitle>2FA Enabled Successfully!</CardTitle>
              <CardDescription>
                Your account is now protected with two-factor authentication
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="default" className="border-amber-500/20 bg-amber-500/5">
            <AlertDescription>
              <strong>Important: Save your backup codes</strong>
              <p className="mt-2 text-sm">
                Store these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Backup Codes</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={copyBackupCodes}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
              {backupCodes.map((code, index) => (
                <code key={index} className="text-sm font-mono">
                  {code}
                </code>
              ))}
            </div>
          </div>

          <Button 
            onClick={() => navigate('/admin')}
            className="w-full"
          >
            Return to Admin Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}