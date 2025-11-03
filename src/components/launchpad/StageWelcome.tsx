import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, Target, Users, Rocket } from "lucide-react";
interface StageWelcomeProps {
  onStart: () => void;
  currentProgress?: number;
}
export function StageWelcome({
  onStart,
  currentProgress = 0
}: StageWelcomeProps) {
  return <div className="max-w-4xl mx-auto space-y-8 py-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Marketing Setup Wizard</span>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to SpearlanceOS
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          In the next 10 minutes, you'll build the foundation that powers all your marketing. 
          Think of this as teaching your AI co-pilot everything it needs to guide your business.
        </p>
      </div>

      {/* Progress Badges */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center space-y-2 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">Discovery</h3>
          <p className="text-xs text-muted-foreground">Business basics</p>
        </Card>

        <Card className="p-4 text-center space-y-2 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">Marketing</h3>
          <p className="text-xs text-muted-foreground">Services & strategy</p>
        </Card>

        <Card className="p-4 text-center space-y-2 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">Avatar</h3>
          <p className="text-xs text-muted-foreground">Ideal customer</p>
        </Card>

        <Card className="p-4 text-center space-y-2 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">Complete</h3>
          <p className="text-xs text-muted-foreground">Ready to launch</p>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Marketing Clarity Setup</span>
          <span className="text-sm text-muted-foreground">
            {currentProgress}% → 100%
          </span>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{
          width: `${currentProgress}%`
        }} />
        </div>
      </Card>

      {/* What You'll Get */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-lg">What You'll Get</h3>
        <div className="space-y-3">
          {["AI-powered customer avatar that understands your ideal buyers", "Personalized marketing strategy tailored to your business", "Social media content plan with optimal posting schedule", "Daily action plans to execute your marketing with confidence"].map((benefit, index) => <div key={index} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{benefit}</span>
            </div>)}
        </div>
      </Card>

      {/* CTA */}
      <div className="text-center space-y-4">
        <Button onClick={onStart} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base">Continue with Launchpad</Button>
        <p className="text-xs text-muted-foreground">
          Takes about 10 minutes • Your progress is saved automatically
        </p>
      </div>
    </div>;
}