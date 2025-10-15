import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save } from "lucide-react";
import ColorPalettePicker from "@/components/brand/ColorPalettePicker";
import FontPairingSelector from "@/components/brand/FontPairingSelector";
import AestheticSelector from "@/components/brand/AestheticSelector";
import BrandPersonalitySelector from "@/components/brand/BrandPersonalitySelector";
import BrandGuidePreview from "@/components/brand/BrandGuidePreview";

export default function BrandGuide() {
  const { selectedClient, loading: clientLoading } = useClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandGuideId, setBrandGuideId] = useState<string | null>(null);
  
  const [brandGuide, setBrandGuide] = useState({
    primary_color: "#3B82F6",
    secondary_color: "#8B5CF6",
    accent_color: "#10B981",
    primary_font: "Inter",
    secondary_font: "Poppins",
    font_pairing_style: "modern",
    aesthetic: "professional",
    brand_personality: [] as string[],
    color_usage_notes: "",
    typography_notes: "",
    imagery_style: "",
    logo_usage_guidelines: "",
    dos_and_donts: { dos: [] as string[], donts: [] as string[] }
  });

  useEffect(() => {
    if (selectedClient) {
      loadBrandGuide();
    }
  }, [selectedClient]);

  const loadBrandGuide = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("brand_guides")
        .select("*")
        .eq("client_id", selectedClient.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        setBrandGuideId(existing.id);
        setBrandGuide({
          primary_color: existing.primary_color || "#3B82F6",
          secondary_color: existing.secondary_color || "#8B5CF6",
          accent_color: existing.accent_color || "#10B981",
          primary_font: existing.primary_font || "Inter",
          secondary_font: existing.secondary_font || "Poppins",
          font_pairing_style: existing.font_pairing_style || "modern",
          aesthetic: existing.aesthetic || "professional",
          brand_personality: Array.isArray(existing.brand_personality) ? existing.brand_personality : [],
          color_usage_notes: existing.color_usage_notes || "",
          typography_notes: existing.typography_notes || "",
          imagery_style: existing.imagery_style || "",
          logo_usage_guidelines: existing.logo_usage_guidelines || "",
          dos_and_donts: typeof existing.dos_and_donts === 'object' && existing.dos_and_donts !== null 
            ? existing.dos_and_donts as { dos: string[], donts: string[] }
            : { dos: [], donts: [] }
        });
      } else {
        // Try to auto-populate from Launch Pad
        await loadLaunchPadData();
      }
    } catch (error: any) {
      console.error("Error loading brand guide:", error);
      toast({
        title: "Error",
        description: "Failed to load brand guide",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLaunchPadData = async () => {
    if (!selectedClient) return;

    try {
      const { data: launchpadData } = await supabase
        .from("launchpad_submissions")
        .select("responses_json, brand_colors")
        .eq("client_id", selectedClient.id)
        .maybeSingle();

      if (launchpadData?.brand_colors) {
        const colors = launchpadData.brand_colors as any;
        setBrandGuide(prev => ({
          ...prev,
          primary_color: colors.primary || prev.primary_color,
          secondary_color: colors.secondary || prev.secondary_color,
          accent_color: colors.accent || prev.accent_color
        }));
      }

      if (launchpadData?.responses_json) {
        const responses = launchpadData.responses_json as any;
        if (responses.discovery?.voice?.tone) {
          // Map tone to aesthetic
          const tone = responses.discovery.voice.tone.toLowerCase();
          if (tone.includes("professional")) setBrandGuide(prev => ({ ...prev, aesthetic: "professional" }));
          else if (tone.includes("playful")) setBrandGuide(prev => ({ ...prev, aesthetic: "playful" }));
          else if (tone.includes("luxury")) setBrandGuide(prev => ({ ...prev, aesthetic: "luxury" }));
        }
      }
    } catch (error) {
      console.error("Error loading Launch Pad data:", error);
    }
  };

  const handleSave = async () => {
    if (!selectedClient) return;

    setSaving(true);
    try {
      if (brandGuideId) {
        const { error } = await supabase
          .from("brand_guides")
          .update(brandGuide)
          .eq("id", brandGuideId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("brand_guides")
          .insert([{ ...brandGuide, client_id: selectedClient.id }])
          .select()
          .single();

        if (error) throw error;
        setBrandGuideId(data.id);
      }

      toast({
        title: "Success",
        description: "Brand guide saved successfully"
      });
    } catch (error: any) {
      console.error("Error saving brand guide:", error);
      toast({
        title: "Error",
        description: "Failed to save brand guide",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (clientLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">No Client Selected</h2>
          <p className="text-muted-foreground">Please select a client to manage their brand guide</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Brand Guide</h1>
          <p className="text-muted-foreground mt-1">Define your brand identity and visual guidelines</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Brand Guide
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="colors" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="colors">Colors</TabsTrigger>
              <TabsTrigger value="typography">Typography</TabsTrigger>
              <TabsTrigger value="aesthetic">Aesthetic</TabsTrigger>
              <TabsTrigger value="personality">Personality</TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="mt-6">
              <ColorPalettePicker
                primaryColor={brandGuide.primary_color}
                secondaryColor={brandGuide.secondary_color}
                accentColor={brandGuide.accent_color}
                onPrimaryChange={(color) => setBrandGuide({ ...brandGuide, primary_color: color })}
                onSecondaryChange={(color) => setBrandGuide({ ...brandGuide, secondary_color: color })}
                onAccentChange={(color) => setBrandGuide({ ...brandGuide, accent_color: color })}
                notes={brandGuide.color_usage_notes}
                onNotesChange={(notes) => setBrandGuide({ ...brandGuide, color_usage_notes: notes })}
              />
            </TabsContent>

            <TabsContent value="typography" className="mt-6">
              <FontPairingSelector
                primaryFont={brandGuide.primary_font}
                secondaryFont={brandGuide.secondary_font}
                pairingStyle={brandGuide.font_pairing_style}
                onPrimaryFontChange={(font) => setBrandGuide({ ...brandGuide, primary_font: font })}
                onSecondaryFontChange={(font) => setBrandGuide({ ...brandGuide, secondary_font: font })}
                onPairingStyleChange={(style) => setBrandGuide({ ...brandGuide, font_pairing_style: style })}
                notes={brandGuide.typography_notes}
                onNotesChange={(notes) => setBrandGuide({ ...brandGuide, typography_notes: notes })}
              />
            </TabsContent>

            <TabsContent value="aesthetic" className="mt-6">
              <AestheticSelector
                selectedAesthetic={brandGuide.aesthetic}
                onAestheticChange={(aesthetic) => setBrandGuide({ ...brandGuide, aesthetic })}
                imageryStyle={brandGuide.imagery_style}
                onImageryStyleChange={(style) => setBrandGuide({ ...brandGuide, imagery_style: style })}
              />
            </TabsContent>

            <TabsContent value="personality" className="mt-6">
              <BrandPersonalitySelector
                selectedTraits={brandGuide.brand_personality}
                onTraitsChange={(traits) => setBrandGuide({ ...brandGuide, brand_personality: traits })}
                dosAndDonts={brandGuide.dos_and_donts}
                onDosAndDontsChange={(dd) => setBrandGuide({ ...brandGuide, dos_and_donts: dd })}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-1">
          <BrandGuidePreview brandGuide={brandGuide} clientName={selectedClient.name} />
        </div>
      </div>
    </div>
  );
}
