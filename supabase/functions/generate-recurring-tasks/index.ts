import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval: number;
  days_of_week?: number[];
  day_of_month?: number;
  end_date?: string;
  max_occurrences?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting recurring task generation...');
    
    const today = new Date();
    const oneWeekAhead = new Date(today);
    oneWeekAhead.setDate(oneWeekAhead.getDate() + 7);

    // Fetch all recurring templates that need generation
    const { data: recurringTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_recurring', true)
      .lte('next_occurrence_date', oneWeekAhead.toISOString().split('T')[0])
      .not('next_occurrence_date', 'is', null);

    if (fetchError) {
      console.error('Error fetching recurring tasks:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${recurringTasks?.length || 0} recurring tasks to process`);
    
    let generatedCount = 0;
    
    for (const task of recurringTasks || []) {
      try {
        const pattern = task.recurrence_pattern as RecurrencePattern;
        
        // Check if we've reached end conditions
        if (pattern.end_date && new Date(pattern.end_date) < today) {
          console.log(`Task ${task.id} has ended, skipping`);
          continue;
        }

        // Check if already generated
        const { data: existingHistory } = await supabase
          .from('task_recurrence_history')
          .select('id')
          .eq('recurring_task_id', task.id)
          .eq('scheduled_for', task.next_occurrence_date)
          .single();

        if (existingHistory) {
          console.log(`Task ${task.id} already generated for ${task.next_occurrence_date}, updating next occurrence`);
          // Calculate next occurrence and update
          const nextDate = calculateNextOccurrence(new Date(task.next_occurrence_date), pattern);
          if (nextDate) {
            await supabase
              .from('tasks')
              .update({ next_occurrence_date: nextDate.toISOString().split('T')[0] })
              .eq('id', task.id);
          }
          continue;
        }

        // Check max occurrences
        if (pattern.max_occurrences) {
          const { count } = await supabase
            .from('task_recurrence_history')
            .select('*', { count: 'exact', head: true })
            .eq('recurring_task_id', task.id);
          
          if (count && count >= pattern.max_occurrences) {
            console.log(`Task ${task.id} has reached max occurrences (${pattern.max_occurrences})`);
            continue;
          }
        }

        // Create new task instance
        const { data: newTask, error: createError } = await supabase
          .from('tasks')
          .insert({
            client_id: task.client_id,
            title: task.title,
            description: task.description,
            status: 'to_do',
            priority: task.priority,
            due_date: task.next_occurrence_date,
            original_due_date: task.next_occurrence_date,
            color: task.color,
            parent_recurring_task_id: task.id,
            is_recurring: false,
            is_recurring_instance: true,
            creator_user_id: task.creator_user_id,
            related_asset_ids: task.related_asset_ids,
            related_meeting_ids: task.related_meeting_ids,
          })
          .select()
          .single();

        if (createError) {
          console.error(`Error creating instance for task ${task.id}:`, createError);
          continue;
        }

        console.log(`Created instance ${newTask.id} for recurring task ${task.id}`);

        // Copy assignees
        const { data: assignees } = await supabase
          .from('task_assignees')
          .select('user_id')
          .eq('task_id', task.id);

        if (assignees && assignees.length > 0) {
          await supabase
            .from('task_assignees')
            .insert(assignees.map(a => ({
              task_id: newTask.id,
              user_id: a.user_id,
            })));
        }

        // Copy tags
        const { data: tags } = await supabase
          .from('task_tag_links')
          .select('tag_id')
          .eq('task_id', task.id);

        if (tags && tags.length > 0) {
          await supabase
            .from('task_tag_links')
            .insert(tags.map(t => ({
              task_id: newTask.id,
              tag_id: t.tag_id,
            })));
        }

        // Record in history
        await supabase
          .from('task_recurrence_history')
          .insert({
            recurring_task_id: task.id,
            generated_task_id: newTask.id,
            scheduled_for: task.next_occurrence_date,
          });

        // Calculate and update next occurrence
        const nextDate = calculateNextOccurrence(new Date(task.next_occurrence_date), pattern);
        if (nextDate) {
          await supabase
            .from('tasks')
            .update({ next_occurrence_date: nextDate.toISOString().split('T')[0] })
            .eq('id', task.id);
        }

        generatedCount++;
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error);
      }
    }

    console.log(`Successfully generated ${generatedCount} recurring task instances`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: recurringTasks?.length || 0,
        generated: generatedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-recurring-tasks:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function calculateNextOccurrence(currentDate: Date, pattern: RecurrencePattern): Date | null {
  const next = new Date(currentDate);
  
  switch (pattern.frequency) {
    case 'daily':
      next.setDate(next.getDate() + (pattern.interval || 1));
      break;
      
    case 'weekly':
      // Move to next week(s)
      next.setDate(next.getDate() + (7 * (pattern.interval || 1)));
      
      // If specific days are set, find the next matching day
      if (pattern.days_of_week && pattern.days_of_week.length > 0) {
        const currentDay = next.getDay();
        const sortedDays = pattern.days_of_week.sort((a, b) => a - b);
        const nextDay = sortedDays.find(day => day > currentDay) || sortedDays[0];
        
        if (nextDay > currentDay) {
          next.setDate(next.getDate() + (nextDay - currentDay));
        } else {
          next.setDate(next.getDate() + (7 - currentDay + nextDay));
        }
      }
      break;
      
    case 'monthly':
      next.setMonth(next.getMonth() + (pattern.interval || 1));
      
      // Handle specific day of month
      if (pattern.day_of_month) {
        next.setDate(Math.min(pattern.day_of_month, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      }
      break;
      
    case 'quarterly':
      next.setMonth(next.getMonth() + (3 * (pattern.interval || 1)));
      break;
      
    case 'yearly':
      next.setFullYear(next.getFullYear() + (pattern.interval || 1));
      break;
  }
  
  // Check if we've passed end date
  if (pattern.end_date && next > new Date(pattern.end_date)) {
    return null;
  }
  
  return next;
}
