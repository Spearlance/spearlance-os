import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";
import { useState } from "react";

const PERSONALITY_TRAITS = [
  "Trustworthy",
  "Innovative",
  "Friendly",
  "Sophisticated",
  "Energetic",
  "Professional",
  "Creative",
  "Reliable",
  "Bold",
  "Authentic",
  "Caring",
  "Expert",
  "Modern",
  "Traditional",
  "Fun",
  "Serious"
];

interface BrandPersonalitySelectorProps {
  selectedTraits: string[];
  onTraitsChange: (traits: string[]) => void;
  dosAndDonts: { dos: string[]; donts: string[] };
  onDosAndDontsChange: (dosAndDonts: { dos: string[]; donts: string[] }) => void;
}

export default function BrandPersonalitySelector({
  selectedTraits,
  onTraitsChange,
  dosAndDonts,
  onDosAndDontsChange
}: BrandPersonalitySelectorProps) {
  const [newDo, setNewDo] = useState("");
  const [newDont, setNewDont] = useState("");

  const toggleTrait = (trait: string) => {
    if (selectedTraits.includes(trait)) {
      onTraitsChange(selectedTraits.filter((t) => t !== trait));
    } else {
      onTraitsChange([...selectedTraits, trait]);
    }
  };

  const addDo = () => {
    if (newDo.trim()) {
      onDosAndDontsChange({
        ...dosAndDonts,
        dos: [...dosAndDonts.dos, newDo.trim()]
      });
      setNewDo("");
    }
  };

  const addDont = () => {
    if (newDont.trim()) {
      onDosAndDontsChange({
        ...dosAndDonts,
        donts: [...dosAndDonts.donts, newDont.trim()]
      });
      setNewDont("");
    }
  };

  const removeDo = (index: number) => {
    onDosAndDontsChange({
      ...dosAndDonts,
      dos: dosAndDonts.dos.filter((_, i) => i !== index)
    });
  };

  const removeDont = (index: number) => {
    onDosAndDontsChange({
      ...dosAndDonts,
      donts: dosAndDonts.donts.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brand Personality</CardTitle>
          <CardDescription>
            Select 3-5 traits that best describe your brand's character
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY_TRAITS.map((trait) => (
              <Badge
                key={trait}
                variant={selectedTraits.includes(trait) ? "default" : "outline"}
                className="cursor-pointer text-sm py-2 px-4"
                onClick={() => toggleTrait(trait)}
              >
                {trait}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Guidelines</CardTitle>
          <CardDescription>Define clear do's and don'ts for your brand</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-green-600 font-semibold">Do's</Label>
            <div className="flex gap-2">
              <Input
                placeholder="E.g., Use our primary color for all CTA buttons"
                value={newDo}
                onChange={(e) => setNewDo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDo()}
              />
              <Button onClick={addDo} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {dosAndDonts.dos.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg"
                >
                  <p className="text-sm">{item}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDo(index)}
                    className="h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-red-600 font-semibold">Don'ts</Label>
            <div className="flex gap-2">
              <Input
                placeholder="E.g., Don't stretch or distort the logo"
                value={newDont}
                onChange={(e) => setNewDont(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDont()}
              />
              <Button onClick={addDont} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {dosAndDonts.donts.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg"
                >
                  <p className="text-sm">{item}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDont(index)}
                    className="h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
