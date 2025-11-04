import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClient } from "@/contexts/ClientContext";
import { BlogTopicDrawer } from "./BlogTopicDrawer";

interface BlogTopic {
  id: string;
  topic_title: string;
  summary: string | null;
  category: string | null;
  suggested_publish_date: string;
  status: string;
  client_id: string;
  blog_posts: any;
}

interface BlogCalendarTableProps {
  topics: BlogTopic[];
  onRefresh: () => void;
  selectedMonth: number;
  selectedYear: number;
  expectedPostCount?: number;
}

export const BlogCalendarTable = ({ 
  topics, 
  onRefresh, 
  selectedMonth, 
  selectedYear, 
  expectedPostCount 
}: BlogCalendarTableProps) => {
  const { selectedClient } = useClient();
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [generatingArticles, setGeneratingArticles] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<BlogTopic | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getDaysInMonth = (month: number, year: number) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const days: Date[] = [];
    
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    
    return days;
  };

  const allDays = getDaysInMonth(selectedMonth, selectedYear);

  const topicsByDate = topics.reduce((acc, topic) => {
    const dateKey = format(new Date(topic.suggested_publish_date), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(topic);
    return acc;
  }, {} as Record<string, BlogTopic[]>);

  const toggleTopicSelection = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTopics.length === topics.length) {
      setSelectedTopics([]);
    } else {
      setSelectedTopics(topics.map(t => t.id));
    }
  };

  const handleGenerateArticles = async (topicIds: string[]) => {
    if (topicIds.length === 0) return;

    setGeneratingArticles(true);
    try {
      for (const topicId of topicIds) {
        await supabase.functions.invoke('blog-generate-article', {
          body: { topic_id: topicId },
        });
      }

      toast.success(`Successfully generated ${topicIds.length} articles!`);
      setSelectedTopics([]);
      onRefresh();
    } catch (error: any) {
      console.error('Error generating articles:', error);
      toast.error(error.message || "Failed to generate articles.");
    } finally {
      setGeneratingArticles(false);
    }
  };

  const getTopicStatus = (topic: BlogTopic) => {
    if (topic.blog_posts) {
      const posts = Array.isArray(topic.blog_posts) ? topic.blog_posts : [topic.blog_posts];
      if (posts.length > 0 && posts[0]) {
        const post = posts[0];
        if (post.status === 'published') return "published";
        if (post.status === 'scheduled') return "scheduled";
        return "draft";
      }
    }
    return "idea";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "scheduled": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "draft": return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "published": return "✓ Published";
      case "scheduled": return "⏰ Scheduled";
      case "draft": return "📝 Draft";
      default: return "Idea Only";
    }
  };

  const daysWithReadyPosts = Object.keys(topicsByDate).filter(dateKey => {
    const dayTopics = topicsByDate[dateKey];
    return dayTopics.some(t => ['draft', 'scheduled', 'published'].includes(getTopicStatus(t)));
  }).length;

  const totalDays = expectedPostCount && expectedPostCount > 0 ? expectedPostCount : allDays.length;
  const progressPercent = totalDays > 0 ? Math.round((daysWithReadyPosts / totalDays) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')} Plan Progress
          </span>
          <span className="font-semibold">
            {daysWithReadyPosts}/{totalDays} days with ready posts ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {selectedTopics.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-secondary/50 rounded-lg">
          <span className="text-sm font-medium">{selectedTopics.length} selected</span>
          <Button
            size="sm"
            onClick={() => handleGenerateArticles(selectedTopics)}
            disabled={generatingArticles}
          >
            {generatingArticles ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <>Generate Articles</>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedTopics([])}
          >
            Clear Selection
          </Button>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedTopics.length === topics.length && topics.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTopics = topicsByDate[dateKey] || [];
              const hasTopics = dayTopics.length > 0;

              if (!hasTopics) {
                return (
                  <TableRow key={dateKey} className="hover:bg-muted/30">
                    <TableCell>
                      <Checkbox disabled className="opacity-50" />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-semibold">{format(day, 'MMM d')}</div>
                        <div className="text-xs text-muted-foreground">{format(day, 'EEEE')}</div>
                      </div>
                    </TableCell>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No topics scheduled
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toast.info("Use 'Generate All Topics' to create topics")}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Topic
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }

              return dayTopics.map((topic, index) => {
                const status = getTopicStatus(topic);
                const isFirstTopicOfDay = index === 0;

                return (
                  <TableRow 
                    key={topic.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedTopic(topic);
                      setDrawerOpen(true);
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedTopics.includes(topic.id)}
                        onCheckedChange={() => toggleTopicSelection(topic.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {isFirstTopicOfDay && (
                        <div>
                          <div className="font-semibold">{format(day, 'MMM d')}</div>
                          <div className="text-xs text-muted-foreground">{format(day, 'EEEE')}</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{topic.topic_title}</div>
                        {topic.summary && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {topic.summary}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{topic.category || 'General'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(status)}>
                        {getStatusLabel(status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {status === 'idea' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateArticles([topic.id])}
                        >
                          Generate Article
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              });
            })}
          </TableBody>
        </Table>
      </div>

      <BlogTopicDrawer
        topic={selectedTopic}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onRefresh={onRefresh}
      />
    </div>
  );
};