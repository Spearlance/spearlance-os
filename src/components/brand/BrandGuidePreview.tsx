import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BrandGuidePreviewProps {
  brandGuide: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    primary_font: string;
    secondary_font: string;
    aesthetic: string;
    brand_personality: string[];
  };
  clientName: string;
}

export default function BrandGuidePreview({ brandGuide, clientName }: BrandGuidePreviewProps) {
  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle>Live Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className="p-6 rounded-lg text-white"
          style={{ backgroundColor: brandGuide.primary_color }}
        >
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: brandGuide.primary_font }}
          >
            {clientName}
          </h1>
          <p
            className="text-sm opacity-90"
            style={{ fontFamily: brandGuide.secondary_font }}
          >
            Your brand in action
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Color Palette</h3>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div
                className="h-16 rounded-lg border mb-1"
                style={{ backgroundColor: brandGuide.primary_color }}
              />
              <p className="text-xs text-center text-muted-foreground">Primary</p>
            </div>
            <div>
              <div
                className="h-16 rounded-lg border mb-1"
                style={{ backgroundColor: brandGuide.secondary_color }}
              />
              <p className="text-xs text-center text-muted-foreground">Secondary</p>
            </div>
            <div>
              <div
                className="h-16 rounded-lg border mb-1"
                style={{ backgroundColor: brandGuide.accent_color }}
              />
              <p className="text-xs text-center text-muted-foreground">Accent</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Typography</h3>
          <div className="space-y-2">
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Headings</p>
              <p className="text-lg font-bold" style={{ fontFamily: brandGuide.primary_font }}>
                {brandGuide.primary_font}
              </p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Body</p>
              <p style={{ fontFamily: brandGuide.secondary_font }}>
                {brandGuide.secondary_font}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Aesthetic</h3>
          <Badge variant="secondary" className="capitalize">
            {brandGuide.aesthetic}
          </Badge>
        </div>

        {brandGuide.brand_personality.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Personality</h3>
            <div className="flex flex-wrap gap-2">
              {brandGuide.brand_personality.slice(0, 5).map((trait) => (
                <Badge key={trait} variant="outline">
                  {trait}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
