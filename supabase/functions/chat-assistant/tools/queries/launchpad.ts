import { getAvatars, getMarketingChannels, getMarketingIdeas } from './assets.ts';
import { getServices } from './assets.ts';
import { getClientInfo } from './client-info.ts';
import { getReports } from './content.ts';

// Helper function to deeply merge objects without overwriting existing values
export function deepMerge(target: any, source: any): any {
  if (!target || typeof target !== 'object') return source;
  if (!source || typeof source !== 'object') return target;

  const output = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      // Recursively merge nested objects
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else if (Array.isArray(source[key])) {
      // Special handling for service_renames - always replace, don't merge
      if (key === 'service_renames') {
        output[key] = source[key];
      } else {
        // For other arrays, merge unique values
        const targetArray = Array.isArray(target[key]) ? target[key] : [];
        const sourceArray = source[key];
        output[key] = [...new Set([...targetArray, ...sourceArray])];
      }
    } else {
      // Only overwrite if target value is empty/null/undefined
      if (target[key] === null || target[key] === undefined || target[key] === '') {
        output[key] = source[key];
      }
    }
  }

  return output;
}

// Extract and save Launchpad data from conversation
export async function extractLaunchpadData(
  supabase: any,
  params: any,
  clientId: string,
  submissionId: string
) {
  const { stage, data, completeness } = params;

  try {
    // Get current submission
    const { data: submission } = await supabase
      .from('launchpad_submissions')
      .select('responses_json')
      .eq('id', submissionId)
      .single();

    const currentResponses = submission?.responses_json || {};
    const existingStageData = currentResponses[stage] || {};

    // MERGE new data with existing (don't overwrite non-empty fields)
    const mergedStageData = deepMerge(existingStageData, data);

    // Save data to appropriate tables based on stage
    if (stage === 'discovery' && mergedStageData) {
      // Update clients table with company info
      if (mergedStageData.company) {
        await supabase
          .from('clients')
          .update({
            name: mergedStageData.company.brand_name || undefined,
            website_url: mergedStageData.company.website_url || undefined,
          })
          .eq('id', clientId);
      }

      // Handle service renames first (if provided)
      if (mergedStageData.service_renames && Array.isArray(mergedStageData.service_renames)) {
        console.log('[Rename Detection - Discovery] Attempting renames:', mergedStageData.service_renames);

        for (const rename of mergedStageData.service_renames) {
          const { old_name, new_name } = rename;

          const { data: existingService } = await supabase
            .from('services')
            .select('id, name')
            .eq('client_id', clientId)
            .eq('name', old_name)
            .maybeSingle();

          if (existingService) {
            console.log(`[Service Rename - Discovery] Found existing service: ${old_name} (id: ${existingService.id})`);

            await supabase
              .from('services')
              .update({ name: new_name })
              .eq('client_id', clientId)
              .eq('name', old_name);

            console.log(`[Service Rename - Discovery] ✓ "${old_name}" → "${new_name}"`);
          } else {
            console.warn(`[Service Rename - Discovery] ⚠️ Service "${old_name}" not found, skipping rename`);
          }
        }
      }

      // Insert/update services
      if (mergedStageData.model?.services && Array.isArray(mergedStageData.model.services)) {
        // Get list of old names being renamed (to avoid creating duplicates)
        const renamedOldNames = mergedStageData.service_renames?.map((r: { old_name: string; new_name: string }) => r.old_name) || [];

        for (const serviceName of mergedStageData.model.services) {
          // Skip if this was just renamed FROM (old name)
          if (renamedOldNames.includes(serviceName)) {
            console.log(`[Skip - Discovery] Not creating "${serviceName}" - it was renamed`);
            continue;
          }

          // Check if service exists
          const { data: existing } = await supabase
            .from('services')
            .select('id')
            .eq('client_id', clientId)
            .eq('name', serviceName)
            .maybeSingle();

          if (!existing) {
            await supabase
              .from('services')
              .insert({
                client_id: clientId,
                name: serviceName,
              });
          }
        }
      }

      // Update client_business_model
      if (mergedStageData.model || mergedStageData.goals) {
        await supabase
          .from('client_business_model')
          .upsert({
            client_id: clientId,
            aov: mergedStageData.model?.aov || null,
            ltv: mergedStageData.model?.ltv || null,
            sales_process: mergedStageData.model?.sales_process || null,
            quarterly_goals: mergedStageData.goals?.quarter_goals || [],
            annual_revenue_goal: mergedStageData.goals?.annual_revenue_goal || null,
          });
      }

      // Update client_brand_voice
      if (mergedStageData.voice) {
        await supabase
          .from('client_brand_voice')
          .upsert({
            client_id: clientId,
            tone: mergedStageData.voice.tone || null,
            words_to_avoid: mergedStageData.voice.words_to_avoid || null,
          });
      }
    } else if (stage === 'marketing' && mergedStageData) {
      console.log('[Marketing Stage] Processing data:', {
        has_renames: !!mergedStageData.service_renames,
        rename_count: mergedStageData.service_renames?.length || 0,
        services_count: mergedStageData.services?.length || 0
      });

      // Handle service renames first (if provided)
      if (mergedStageData.service_renames && Array.isArray(mergedStageData.service_renames)) {
        console.log('[Rename Detection - Marketing] Attempting renames:', mergedStageData.service_renames);

        for (const rename of mergedStageData.service_renames) {
          const { old_name, new_name } = rename;

          const { data: existingService } = await supabase
            .from('services')
            .select('id, name')
            .eq('client_id', clientId)
            .eq('name', old_name)
            .maybeSingle();

          if (existingService) {
            console.log(`[Service Rename - Marketing] Found existing service: ${old_name} (id: ${existingService.id})`);

            // Update the service name in the database
            await supabase
              .from('services')
              .update({ name: new_name })
              .eq('client_id', clientId)
              .eq('name', old_name);

            console.log(`[Service Rename - Marketing] ✓ "${old_name}" → "${new_name}"`);
          } else {
            console.warn(`[Service Rename - Marketing] ⚠️ Service "${old_name}" not found, skipping rename`);
          }
        }
      }

      // Update services with marketing details
      if (mergedStageData.services && Array.isArray(mergedStageData.services)) {
        for (const serviceData of mergedStageData.services) {
          await supabase
            .from('services')
            .update({
              description: serviceData.description || null,
              differentiators: serviceData.differentiators || null,
              key_benefits: serviceData.key_benefits || null,
            })
            .eq('client_id', clientId)
            .eq('name', serviceData.name);
        }
      }
    }

    // Update submission with merged data and completeness
    const updatedResponses = {
      ...currentResponses,
      [stage]: mergedStageData
    };

    await supabase
      .from('launchpad_submissions')
      .update({
        responses_json: updatedResponses,
        [`${stage}_completeness`]: completeness,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    // Auto-advance when stage is 100% complete
    if (completeness >= 100) {
      const { data: currentSubmission } = await supabase
        .from('launchpad_submissions')
        .select('stage, completed_at')
        .eq('id', submissionId)
        .single();

      const completedAt = currentSubmission?.completed_at || {};
      const newCompletedAt = {
        ...completedAt,
        [stage]: new Date().toISOString()
      };

      // Determine next stage
      let nextStage = currentSubmission?.stage;
      if (stage === 'discovery' && currentSubmission?.stage === 'discovery') {
        nextStage = 'marketing';
      } else if (stage === 'marketing' && currentSubmission?.stage === 'marketing') {
        nextStage = 'avatar';
      } else if (stage === 'avatar' && currentSubmission?.stage === 'avatar') {
        nextStage = 'complete';
      }

      await supabase
        .from('launchpad_submissions')
        .update({
          completed_at: newCompletedAt,
          stage: nextStage
        })
        .eq('id', submissionId);
    }

    return {
      success: true,
      message: `Saved ${stage} data (${completeness}% complete)`,
      completeness: completeness
    };
  } catch (error: any) {
    console.error(`Error in extractLaunchpadData:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to gather all Complete Offer inputs
export async function gatherGSOInputs(supabase: any, clientId: string) {
  const [avatars, services, channels, reports, client, marketingIdeas] = await Promise.all([
    getAvatars(supabase, clientId),
    getServices(supabase, clientId),
    getMarketingChannels(supabase, {}, clientId),
    getReports(supabase, {}, clientId),
    getClientInfo(supabase, clientId),
    getMarketingIdeas(supabase, clientId)
  ]);

  return {
    avatars: avatars.items,
    services: services.items,
    assets: channels.items,
    proof: reports.items.filter((r: any) => r.summary), // Reports with summaries can serve as proof
    client_info: client,
    marketing_ideas: marketingIdeas.items
  };
}

// Create or update marketing idea draft for Offer Mode auto-save
export async function createOrUpdateOfferDraft(
  supabase: any,
  clientId: string,
  userId: string,
  conversationId: string,
  step: number,
  partialContent: string,
  offerData: any
) {
  // Check if this conversation already has a linked marketing idea
  const { data: existingIdea } = await supabase
    .from('marketing_ideas')
    .select('id')
    .eq('source_conversation_id', conversationId)
    .maybeSingle();

  const content = {
    raw_markdown: partialContent,
    offer_progress: {
      step: step,
      data: offerData,
      last_updated: new Date().toISOString()
    }
  };

  if (existingIdea) {
    // Update existing draft
    await supabase
      .from('marketing_ideas')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingIdea.id);

    return existingIdea.id;
  } else {
    // Create new draft
    const { data: newIdea } = await supabase
      .from('marketing_ideas')
      .insert({
        client_id: clientId,
        created_by: userId,
        title: `Offer in Progress - ${new Date().toLocaleDateString()}`,
        status: 'draft',
        content,
        offer_type: 'complete_offer',
        source_conversation_id: conversationId
      })
      .select('id')
      .single();

    return newIdea?.id;
  }
}
