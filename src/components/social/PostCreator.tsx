import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb } from "lucide-react";
import { TopicSelector } from "./TopicSelector";
import { CaptionEditor } from "./CaptionEditor";
import { ImageSelector } from "./ImageSelector";
import { PostSaver } from "./PostSaver";

type CreatorStep = 'topic' | 'caption' | 'image' | 'save';

export const PostCreator = () => {
  const [step, setStep] = useState<CreatorStep>('topic');
  const [postData, setPostData] = useState({
    topic_category: '',
    selected_idea: null as any,
    caption_text: '',
    caption_tone: '',
    hashtags: [] as string[],
    image_url: '',
    image_source: '',
    nano_banana_prompt: '',
  });

  const updatePostData = (updates: Partial<typeof postData>) => {
    setPostData(prev => ({ ...prev, ...updates }));
  };

  const handleTopicComplete = (topic: string, idea: any) => {
    updatePostData({ topic_category: topic, selected_idea: idea });
    setStep('caption');
  };

  const handleCaptionComplete = (caption: string, tone: string, hashtags: string[]) => {
    updatePostData({ caption_text: caption, caption_tone: tone, hashtags });
    setStep('image');
  };

  const handleImageComplete = (imageUrl: string, source: string, prompt: string) => {
    updatePostData({ image_url: imageUrl, image_source: source, nano_banana_prompt: prompt });
    setStep('save');
  };

  const handleBack = () => {
    if (step === 'caption') setStep('topic');
    else if (step === 'image') setStep('caption');
    else if (step === 'save') setStep('image');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Let's make your next post!</h2>
        <p className="text-muted-foreground">
          Choose a topic, write your caption, and add or generate your image.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2 max-w-2xl mx-auto">
        {['topic', 'caption', 'image', 'save'].map((s, i) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full transition-colors ${
              ['topic', 'caption', 'image', 'save'].indexOf(step) >= i
                ? 'bg-primary'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Helpful Tip */}
      <Alert className="max-w-2xl mx-auto bg-blue-50 border-blue-200">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          {step === 'topic' && "Pick a topic that shows what makes your business special"}
          {step === 'caption' && "Keep it short and sound like you're talking to a friend"}
          {step === 'image' && "Choose an image that catches attention as people scroll"}
          {step === 'save' && "Schedule your post or save it as a draft to publish later"}
        </AlertDescription>
      </Alert>

      {/* Steps */}
      <div className="max-w-4xl mx-auto">
        {step === 'topic' && (
          <TopicSelector onComplete={handleTopicComplete} />
        )}

        {step === 'caption' && (
          <CaptionEditor
            postIdea={postData.selected_idea}
            onComplete={handleCaptionComplete}
            onBack={handleBack}
          />
        )}

        {step === 'image' && (
          <ImageSelector
            caption={postData.caption_text}
            onComplete={handleImageComplete}
            onBack={handleBack}
          />
        )}

        {step === 'save' && (
          <PostSaver
            postData={postData}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
};