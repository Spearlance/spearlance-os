import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const AESTHETICS = [
  {
    value: "minimalist",
    label: "Minimalist",
    description: "Clean, simple, and uncluttered design with ample white space"
  },
  {
    value: "luxury",
    label: "Luxury / Premium",
    description: "Sophisticated, elegant, and high-end visual language"
  },
  {
    value: "playful",
    label: "Playful / Fun",
    description: "Vibrant, energetic, and approachable with bright colors"
  },
  {
    value: "professional",
    label: "Professional / Corporate",
    description: "Trustworthy, polished, and business-focused appearance"
  },
  {
    value: "modern",
    label: "Modern / Tech",
    description: "Contemporary, cutting-edge, and innovation-focused"
  },
  {
    value: "vintage",
    label: "Vintage / Retro",
    description: "Classic, nostalgic, and timeless design elements"
  },
  {
    value: "natural",
    label: "Natural / Organic",
    description: "Earth-toned, sustainable, and eco-friendly aesthetic"
  },
  {
    value: "bold",
    label: "Bold / Edgy",
    description: "Striking, daring, and attention-grabbing visuals"
  }
];

interface AestheticSelectorProps {
  selectedAesthetic: string;
  onAestheticChange: (aesthetic: string) => void;
  imageryStyle: string;
  onImageryStyleChange: (style: string) => void;
}

export default function AestheticSelector({
  selectedAesthetic,
  onAestheticChange,
  imageryStyle,
  onImageryStyleChange
}: AestheticSelectorProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brand Aesthetic</CardTitle>
          <CardDescription>Define the overall look and feel of your brand</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AESTHETICS.map((aesthetic) => (
              <div
                key={aesthetic.value}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedAesthetic === aesthetic.value
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => onAestheticChange(aesthetic.value)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{aesthetic.label}</h3>
                  {selectedAesthetic === aesthetic.value && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{aesthetic.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imagery Style</CardTitle>
          <CardDescription>
            Describe the type of photos, illustrations, and graphics you'll use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Imagery Guidelines</Label>
            <Textarea
              value={imageryStyle}
              onChange={(e) => onImageryStyleChange(e.target.value)}
              placeholder="E.g., Bright natural lighting, minimal backgrounds, candid shots, flat illustrations, outlined icons..."
              rows={5}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Include details about photography style, illustration preferences, icon style, and any specific visual treatments
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
