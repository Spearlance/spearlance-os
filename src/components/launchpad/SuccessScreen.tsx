import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Palette, Sparkles, Home, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SuccessScreen() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center py-8">
        <CheckCircle2 className="h-20 w-20 text-[#13cf48] mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">All Set!</h1>
        <p className="text-muted-foreground mb-4">
          Your marketing operation is ready to go.
        </p>
        <Badge className="text-lg px-6 py-2 bg-[#13cf48] hover:bg-[#10b93d]">
          Launchpad Complete
        </Badge>
      </div>

      {/* Next Steps Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4 text-center">What's Next?</h2>
          <p className="text-center text-muted-foreground mb-6">
            Your marketing foundation is set! Here's how to get started:
          </p>
          <div className="space-y-3">
            <div className="bg-background/60 backdrop-blur rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Follow Your Action Plan</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Check your homepage for a personalized daily action plan based on your goals and priorities.
                  </p>
                  <Button className="w-full" onClick={() => navigate("/")}>
                    <Home className="mr-2 h-4 w-4" />
                    Go to Homepage
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-background/60 backdrop-blur rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Set Up Your Brand Guide</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Define your colors, fonts, and visual identity so all your marketing materials stay on-brand.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/brand/guide")}>
                    <Palette className="mr-2 h-4 w-4" />
                    Go to Brand Guide
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-background/60 backdrop-blur rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Configure Your Marketing Channels</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Connect your social media accounts and marketing tools to start reaching your ideal customers.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/marketing/services")}>
                    <Target className="mr-2 h-4 w-4" />
                    Set Up Channels
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          onClick={() => navigate("/")}
          size="lg"
        >
          <Home className="mr-2 h-4 w-4" />
          Go to Homepage
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>💡 Need help? Ask your AI Assistant anything - it's available on every page!</p>
      </div>
    </div>
  );
}
