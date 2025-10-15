import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const FONT_PAIRINGS = [
  {
    name: "Professional Serif",
    primary: "Playfair Display",
    secondary: "Open Sans",
    style: "professional"
  },
  {
    name: "Modern Sans",
    primary: "Poppins",
    secondary: "Inter",
    style: "modern"
  },
  {
    name: "Classic Editorial",
    primary: "Merriweather",
    secondary: "Lato",
    style: "classic"
  },
  {
    name: "Tech Forward",
    primary: "Space Grotesk",
    secondary: "Roboto",
    style: "tech"
  },
  {
    name: "Creative Display",
    primary: "Bebas Neue",
    secondary: "Nunito",
    style: "creative"
  }
];

const GOOGLE_FONTS = [
  "Inter",
  "Poppins",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Raleway",
  "Playfair Display",
  "Merriweather",
  "Nunito",
  "Space Grotesk",
  "Bebas Neue",
  "Work Sans",
  "DM Sans",
  "Plus Jakarta Sans"
];

interface FontPairingSelectorProps {
  primaryFont: string;
  secondaryFont: string;
  pairingStyle: string;
  onPrimaryFontChange: (font: string) => void;
  onSecondaryFontChange: (font: string) => void;
  onPairingStyleChange: (style: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export default function FontPairingSelector({
  primaryFont,
  secondaryFont,
  pairingStyle,
  onPrimaryFontChange,
  onSecondaryFontChange,
  onPairingStyleChange,
  notes,
  onNotesChange
}: FontPairingSelectorProps) {
  const applyPairing = (pairing: typeof FONT_PAIRINGS[0]) => {
    onPrimaryFontChange(pairing.primary);
    onSecondaryFontChange(pairing.secondary);
    onPairingStyleChange(pairing.style);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Font Pairing Presets</CardTitle>
          <CardDescription>Choose from expertly curated font combinations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FONT_PAIRINGS.map((pairing) => (
              <div
                key={pairing.name}
                className="border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
                onClick={() => applyPairing(pairing)}
              >
                <p className="font-medium mb-3 text-sm">{pairing.name}</p>
                <div className="space-y-2">
                  <p className="text-2xl" style={{ fontFamily: pairing.primary }}>
                    {pairing.primary}
                  </p>
                  <p className="text-sm" style={{ fontFamily: pairing.secondary }}>
                    {pairing.secondary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Font Selection</CardTitle>
          <CardDescription>Choose individual fonts for your brand</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Font (Headings)</Label>
              <Select value={primaryFont} onValueChange={onPrimaryFontChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOOGLE_FONTS.map((font) => (
                    <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div
                className="p-4 border rounded-lg"
                style={{ fontFamily: primaryFont }}
              >
                <h1 className="text-3xl font-bold mb-2">Headline Example</h1>
                <h2 className="text-2xl font-semibold">Subheading Example</h2>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Secondary Font (Body Text)</Label>
              <Select value={secondaryFont} onValueChange={onSecondaryFontChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOOGLE_FONTS.map((font) => (
                    <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div
                className="p-4 border rounded-lg"
                style={{ fontFamily: secondaryFont }}
              >
                <p className="mb-2">
                  This is how your body text will look throughout your website and marketing materials.
                </p>
                <p className="text-sm text-muted-foreground">
                  Make sure it's readable at various sizes.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Typography Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="E.g., Use primary font for all headings H1-H3, secondary font for body copy and H4-H6..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
