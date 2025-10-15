import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const COLOR_PRESETS = [
  {
    name: "Modern Tech",
    primary: "#3B82F6",
    secondary: "#8B5CF6",
    accent: "#10B981"
  },
  {
    name: "Natural Organic",
    primary: "#059669",
    secondary: "#84CC16",
    accent: "#F59E0B"
  },
  {
    name: "Bold Energetic",
    primary: "#DC2626",
    secondary: "#EA580C",
    accent: "#FBBF24"
  },
  {
    name: "Luxury Premium",
    primary: "#1F2937",
    secondary: "#D97706",
    accent: "#F3F4F6"
  },
  {
    name: "Playful Creative",
    primary: "#EC4899",
    secondary: "#8B5CF6",
    accent: "#06B6D4"
  }
];

interface ColorPalettePickerProps {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  onPrimaryChange: (color: string) => void;
  onSecondaryChange: (color: string) => void;
  onAccentChange: (color: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export default function ColorPalettePicker({
  primaryColor,
  secondaryColor,
  accentColor,
  onPrimaryChange,
  onSecondaryChange,
  onAccentChange,
  notes,
  onNotesChange
}: ColorPalettePickerProps) {
  const { toast } = useToast();
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const copyToClipboard = (color: string, label: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    toast({
      title: "Copied!",
      description: `${label} color ${color} copied to clipboard`
    });
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    onPrimaryChange(preset.primary);
    onSecondaryChange(preset.secondary);
    onAccentChange(preset.accent);
    toast({
      title: "Preset Applied",
      description: `Applied ${preset.name} color palette`
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Color Presets</CardTitle>
          <CardDescription>Quick start with professionally curated color palettes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {COLOR_PRESETS.map((preset) => (
              <div
                key={preset.name}
                className="border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
                onClick={() => applyPreset(preset)}
              >
                <p className="font-medium mb-3">{preset.name}</p>
                <div className="flex gap-2">
                  <div
                    className="h-12 w-full rounded"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div
                    className="h-12 w-full rounded"
                    style={{ backgroundColor: preset.secondary }}
                  />
                  <div
                    className="h-12 w-full rounded"
                    style={{ backgroundColor: preset.accent }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Colors</CardTitle>
          <CardDescription>Define your unique brand color palette</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => onPrimaryChange(e.target.value)}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => onPrimaryChange(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(primaryColor, "Primary")}
                >
                  {copiedColor === primaryColor ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div
                className="h-20 rounded-lg border"
                style={{ backgroundColor: primaryColor }}
              />
            </div>

            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => onSecondaryChange(e.target.value)}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => onSecondaryChange(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(secondaryColor, "Secondary")}
                >
                  {copiedColor === secondaryColor ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div
                className="h-20 rounded-lg border"
                style={{ backgroundColor: secondaryColor }}
              />
            </div>

            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={accentColor}
                  onChange={(e) => onAccentChange(e.target.value)}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={accentColor}
                  onChange={(e) => onAccentChange(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(accentColor, "Accent")}
                >
                  {copiedColor === accentColor ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div
                className="h-20 rounded-lg border"
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color Usage Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="E.g., Use primary color for CTAs, secondary for highlights, accent sparingly for emphasis..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
