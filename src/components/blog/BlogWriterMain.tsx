import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlogCreationWizard } from "./BlogCreationWizard";
import { BlogTopicGenerator } from "./BlogTopicGenerator";
import { BlogPostsList } from "./BlogPostsList";
import { PenTool, Lightbulb, FileText, CheckCircle } from "lucide-react";

export function BlogWriterMain() {
  const [activeTab, setActiveTab] = useState("write");
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePostCreated = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab("drafts");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">AI Blog Writer</h2>
        <p className="text-muted-foreground mt-2">
          Create high-quality blog content with Claude AI, generate images, and publish directly to your website.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="write" className="flex items-center gap-2">
            <PenTool className="w-4 h-4" />
            Write
          </TabsTrigger>
          <TabsTrigger value="topics" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Topics
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Drafts
          </TabsTrigger>
          <TabsTrigger value="published" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Published
          </TabsTrigger>
        </TabsList>

        <TabsContent value="write" className="mt-6">
          <BlogCreationWizard onComplete={handlePostCreated} />
        </TabsContent>

        <TabsContent value="topics" className="mt-6">
          <BlogTopicGenerator />
        </TabsContent>

        <TabsContent value="drafts" className="mt-6">
          <BlogPostsList status="draft" key={`drafts-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="published" className="mt-6">
          <BlogPostsList status="published" key={`published-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
