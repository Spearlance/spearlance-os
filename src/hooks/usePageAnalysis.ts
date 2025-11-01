import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePageAnalysis = (clientId: string) => {
  return useQuery({
    queryKey: ['page-analysis', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_content_analysis')
        .select(`
          *,
          website_pages!inner(
            page_path,
            page_title,
            last_crawled_at
          )
        `)
        .eq('client_id', clientId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });
};

export const useAnalyzePage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      clientId,
      pagePath,
      avatarId,
    }: {
      clientId: string;
      pagePath: string;
      avatarId?: string;
    }) => {
      // Step 1: Check if page is already crawled
      const { data: existingPage } = await supabase
        .from('website_pages')
        .select('id')
        .eq('client_id', clientId)
        .eq('page_path', pagePath)
        .maybeSingle();

      let pageId = existingPage?.id;

      // Step 2: Crawl page if not already crawled
      if (!pageId) {
        toast({
          title: "Crawling page...",
          description: "Extracting content from your website.",
        });

        const { data: crawlData, error: crawlError } = await supabase.functions.invoke(
          'crawl-website-page',
          {
            body: {
              client_id: clientId,
              page_path: pagePath,
            },
          }
        );

        if (crawlError) throw crawlError;
        if (!crawlData.success) throw new Error(crawlData.error);

        pageId = crawlData.page.id;
      }

      // Step 3: Analyze content
      toast({
        title: "Analyzing content...",
        description: "AI is evaluating your page. This may take 30-60 seconds.",
      });

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        'analyze-page-content',
        {
          body: {
            page_id: pageId,
            avatar_id: avatarId,
          },
        }
      );

      if (analysisError) throw analysisError;
      if (!analysisData.success) throw new Error(analysisData.error);

      return analysisData.analysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['page-analysis'] });
      toast({
        title: "Analysis Complete",
        description: `Overall grade: ${getLetterGrade(data.overall_score)}`,
      });
    },
    onError: (error: any) => {
      if (error.message?.includes('Avatar not found')) {
        toast({
          title: "Customer Avatar Required",
          description: "Please create a customer avatar first in the Avatar section.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: error.message || "Failed to analyze page. Please try again.",
          variant: "destructive",
        });
      }
    },
  });
};

export const useDeleteAnalysis = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (analysisId: string) => {
      const { error } = await supabase
        .from('page_content_analysis')
        .delete()
        .eq('id', analysisId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-analysis'] });
      toast({ title: "Analysis disregarded" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disregard analysis.",
        variant: "destructive",
      });
    },
  });
};

const getLetterGrade = (score: number) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};
