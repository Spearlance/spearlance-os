import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Edit, Loader2, ChevronDown } from "lucide-react";
import { DiscoveryData } from "@/lib/launchpadTypes";

interface BrandVoiceForm {
  tone: string;
  words_to_avoid: string;
}

interface BrandStoryForm {
  executive_summary: string;
  key_themes: string[];
  pain_points: string[];
  value_propositions: string[];
  target_audience_insights: string;
  marketing_angles: string[];
}

interface BrandVoiceTabProps {
  discoveryData: DiscoveryData;
  brandVoiceForm: BrandVoiceForm;
  setBrandVoiceForm: (form: BrandVoiceForm) => void;
  editingBrandVoice: boolean;
  setEditingBrandVoice: (editing: boolean) => void;
  savingBrandVoice: boolean;
  handleSaveBrandVoice: () => void;
  brandStoryForm: BrandStoryForm;
  setBrandStoryForm: (form: BrandStoryForm) => void;
  editingBrandStory: boolean;
  setEditingBrandStory: (editing: boolean) => void;
  savingBrandStory: boolean;
  handleSaveBrandStory: () => void;
  handleCancelBrandStoryEdit: () => void;
  storyModalOpen: boolean;
  setStoryModalOpen: (open: boolean) => void;
  transcript: string;
  summary: any;
}

export function BrandVoiceTab({
  discoveryData,
  brandVoiceForm,
  setBrandVoiceForm,
  editingBrandVoice,
  setEditingBrandVoice,
  savingBrandVoice,
  handleSaveBrandVoice,
  brandStoryForm,
  setBrandStoryForm,
  editingBrandStory,
  setEditingBrandStory,
  savingBrandStory,
  handleSaveBrandStory,
  handleCancelBrandStoryEdit,
  setStoryModalOpen,
  transcript,
  summary,
}: BrandVoiceTabProps) {
  return (
    <TabsContent value="voice" className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Voice & Tone</CardTitle>
            {editingBrandVoice ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingBrandVoice(false);
                    setBrandVoiceForm({
                      tone: discoveryData.voice.tone || "",
                      words_to_avoid: discoveryData.voice.words_to_avoid || "",
                    });
                  }}
                  disabled={savingBrandVoice}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveBrandVoice} disabled={savingBrandVoice}>
                  {savingBrandVoice ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingBrandVoice(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingBrandVoice ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="tone">Brand Personality/Tone</Label>
                <Textarea
                  id="tone"
                  value={brandVoiceForm.tone}
                  onChange={(e) =>
                    setBrandVoiceForm({ ...brandVoiceForm, tone: e.target.value })
                  }
                  placeholder="Describe your brand's voice and personality..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="words_to_avoid">Words to Avoid</Label>
                <Textarea
                  id="words_to_avoid"
                  value={brandVoiceForm.words_to_avoid}
                  onChange={(e) =>
                    setBrandVoiceForm({ ...brandVoiceForm, words_to_avoid: e.target.value })
                  }
                  placeholder="List words or phrases to avoid..."
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <>
              {discoveryData.voice.tone && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Brand Personality</p>
                  <p className="whitespace-pre-wrap">{discoveryData.voice.tone}</p>
                </div>
              )}
              {discoveryData.voice.words_to_avoid && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Words to Avoid</p>
                  <p className="text-sm whitespace-pre-wrap">{discoveryData.voice.words_to_avoid}</p>
                </div>
              )}
              {!discoveryData.voice.tone && !discoveryData.voice.words_to_avoid && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No brand voice information. Click "Edit" to add details.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Brand Story</CardTitle>
              <CardDescription>Your origin story and what makes you different</CardDescription>
            </div>
            <div className="flex gap-2">
              {editingBrandStory ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelBrandStoryEdit}
                    disabled={savingBrandStory}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveBrandStory}
                    disabled={savingBrandStory}
                  >
                    {savingBrandStory ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {discoveryData.story?.completed && summary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingBrandStory(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStoryModalOpen(true)}
                  >
                    {discoveryData.story?.completed ? "Re-record" : "Record Story"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {discoveryData.story?.completed && summary ? (
            <div className="space-y-6">
              {editingBrandStory ? (
                // EDITING MODE
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="executive_summary">Executive Summary</Label>
                    <Textarea
                      id="executive_summary"
                      value={brandStoryForm.executive_summary}
                      onChange={(e) =>
                        setBrandStoryForm({
                          ...brandStoryForm,
                          executive_summary: e.target.value,
                        })
                      }
                      placeholder="Summarize your brand story..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="key_themes">Key Themes (one per line)</Label>
                    <Textarea
                      id="key_themes"
                      value={brandStoryForm.key_themes.join("\n")}
                      onChange={(e) =>
                        setBrandStoryForm({
                          ...brandStoryForm,
                          key_themes: e.target.value.split("\n").filter((t) => t.trim()),
                        })
                      }
                      placeholder="Enter key themes, one per line..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pain_points">Pain Points (one per line)</Label>
                    <Textarea
                      id="pain_points"
                      value={brandStoryForm.pain_points.join("\n")}
                      onChange={(e) =>
                        setBrandStoryForm({
                          ...brandStoryForm,
                          pain_points: e.target.value.split("\n").filter((p) => p.trim()),
                        })
                      }
                      placeholder="Enter pain points, one per line..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="value_propositions">Value Propositions (one per line)</Label>
                    <Textarea
                      id="value_propositions"
                      value={brandStoryForm.value_propositions.join("\n")}
                      onChange={(e) =>
                        setBrandStoryForm({
                          ...brandStoryForm,
                          value_propositions: e.target.value.split("\n").filter((v) => v.trim()),
                        })
                      }
                      placeholder="Enter value propositions, one per line..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="target_audience_insights">Target Audience Insights</Label>
                    <Textarea
                      id="target_audience_insights"
                      value={brandStoryForm.target_audience_insights}
                      onChange={(e) =>
                        setBrandStoryForm({
                          ...brandStoryForm,
                          target_audience_insights: e.target.value,
                        })
                      }
                      placeholder="Describe your target audience..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="marketing_angles">Marketing Angles (one per line)</Label>
                    <Textarea
                      id="marketing_angles"
                      value={brandStoryForm.marketing_angles.join("\n")}
                      onChange={(e) =>
                        setBrandStoryForm({
                          ...brandStoryForm,
                          marketing_angles: e.target.value.split("\n").filter((a) => a.trim()),
                        })
                      }
                      placeholder="Enter marketing angles, one per line..."
                      rows={4}
                    />
                  </div>
                </div>
              ) : (
                // VIEW MODE
                <>
                  {summary.executive_summary && (
                    <div>
                      <h4 className="font-semibold mb-2">Executive Summary</h4>
                      <p className="text-sm text-muted-foreground">{summary.executive_summary}</p>
                    </div>
                  )}

                  {summary.key_themes && summary.key_themes.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Key Themes</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {summary.key_themes.map((theme: string, i: number) => (
                          <li key={i}>{theme}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.pain_points && summary.pain_points.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Pain Points</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {summary.pain_points.map((point: string, i: number) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.value_propositions && summary.value_propositions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Value Propositions</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {summary.value_propositions.map((prop: string, i: number) => (
                          <li key={i}>{prop}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.target_audience_insights && (
                    <div>
                      <h4 className="font-semibold mb-2">Target Audience Insights</h4>
                      <p className="text-sm text-muted-foreground">
                        {summary.target_audience_insights}
                      </p>
                    </div>
                  )}

                  {summary.marketing_angles && summary.marketing_angles.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Marketing Angles</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {summary.marketing_angles.map((angle: string, i: number) => (
                          <li key={i}>{angle}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* Keep transcript collapsible - not editable */}
              {!editingBrandStory && transcript && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                    <ChevronDown className="h-4 w-4" />
                    View Full Transcript
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                      {transcript}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No story recorded yet. Record your brand story to unlock AI-powered marketing
                insights.
              </p>
              <Button onClick={() => setStoryModalOpen(true)}>Record Your Story</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
