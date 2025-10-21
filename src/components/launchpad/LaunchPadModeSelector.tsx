import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, FileText } from "lucide-react";

interface LaunchPadModeSelectorProps {
  onSelectMode: (mode: 'chat' | 'form') => void;
}

export function LaunchPadModeSelector({ onSelectMode }: LaunchPadModeSelectorProps) {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to Launchpad!</h1>
        <p className="text-lg text-muted-foreground">
          Let's get your marketing operation set up. Choose how you'd like to get started:
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Chat Mode - Coming Soon */}
        <Card className="relative overflow-hidden opacity-60 cursor-not-allowed border-2 transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
            </div>
            <CardTitle className="text-2xl">Chat with AI</CardTitle>
            <CardDescription className="text-base">
              Natural conversation with AI assistant (coming soon)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>More casual and conversational</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Answer in your own words</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Progress saved as you go</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Feels like talking to a consultant</span>
              </li>
            </ul>
            <Button className="w-full" size="lg" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        {/* Form Mode */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary" onClick={() => onSelectMode('form')}>
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Form Mode</CardTitle>
            <CardDescription className="text-base">
              Traditional step-by-step form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Structured and organized</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Clear sections and fields</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>See exactly what's required</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Traditional onboarding experience</span>
              </li>
            </ul>
            <Button className="w-full" variant="outline" size="lg">
              Start Form
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Don't worry - you can switch between modes at any time!
      </p>
    </div>
  );
}
