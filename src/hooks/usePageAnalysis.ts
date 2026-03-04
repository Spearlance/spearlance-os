import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
        .eq('client_id', clientId)
        // Filter out editor/platform domains at query level
        .not('website_pages.page_path', 'like', '%my.duda.co%')
        .not('website_pages.page_path', 'like', '%edit.duda.co%')
        .not('website_pages.page_path', 'like', '%mywebsitemanager.co%')
        .not('website_pages.page_path', 'like', '%/editor/%')
        .not('website_pages.page_path', 'like', '%/preview/%')
        .not('website_pages.page_path', 'like', '%/edit-site/%')
        .not('website_pages.page_path', 'like', '%/site/%'); // Duda internal site editor paths

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });
};

export const useAnalyzePage = () => {
  const queryClient = useQueryClient();

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
        toast.info("Crawling page...", { description: "Extracting content from your website." });

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

      // Step 3: Match avatar and analyze content
      if (!avatarId) {
        toast.info("Matching to customer avatar...", { description: "Finding the best avatar match for this content." });
      }

      toast.info("Analyzing content...", { description: "AI is evaluating your page. This may take 30-60 seconds." });

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

      const avatarInfo = data.matched_avatar_name
        ? ` (Matched to: ${data.matched_avatar_name})`
        : '';

      toast.success("Analysis Complete", { description: `Overall grade: ${getLetterGrade(data.overall_score)}${avatarInfo}` });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Failed to analyze page";

      if (errorMessage.includes('Avatar not found')) {
        toast.error("Customer Avatar Required", { description: "Please create a customer avatar in the Avatar section." });
      } else if (errorMessage.includes('website URL') || errorMessage.includes('Website URL')) {
        toast.error("Website URL Required", { description: "Please add your website URL in LaunchPad > Discovery." });
      } else if (errorMessage.includes('timeout') || errorMessage.includes('took too long') || errorMessage.includes('10')) {
        toast.error("Page Took Too Long", { description: "Your website didn't respond in time. Try again or check your website URL." });
      } else {
        toast.error("Analysis Failed", { description: errorMessage });
      }
    },
  });
};

export const useDeleteAnalysis = () => {
  const queryClient = useQueryClient();

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
      toast.success("Analysis disregarded");
    },
    onError: (error: Error) => {
      toast.error("Error", { description: error.message || "Failed to disregard analysis." });
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
