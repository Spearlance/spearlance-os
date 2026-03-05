import { redactForRole, sanitizeDataForPrompt } from '../../validation/sanitize.ts';

export async function getTasks(supabase: any, params: any, clientId: string, userId: string) {
  try {
    const {
      status,
      priority,
      assignee_id,
      assigned_to_me,
      keyword,
      due_date_from,
      due_date_to,
      overdue,
      limit = 20,
      offset = 0
    } = params;

    // Build base query
    let query = supabase
      .from('tasks')
      .select(`
        id, title, description, status, priority, due_date,
        created_at, updated_at,
        assignee:profiles!tasks_assignee_user_id_fkey(id, name, email),
        creator:profiles!tasks_creator_user_id_fkey(id, name, email)
      `, { count: 'exact' })
      .eq('client_id', clientId)
      .is('parent_task_id', null); // Exclude subtasks by default

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (assignee_id) {
      query = query.eq('assignee_user_id', assignee_id);
    }

    if (assigned_to_me) {
      query = query.eq('assignee_user_id', userId);
    }

    if (keyword) {
      query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`);
    }

    if (due_date_from) {
      query = query.gte('due_date', due_date_from);
    }

    if (due_date_to) {
      query = query.lte('due_date', due_date_to);
    }

    if (overdue) {
      const today = new Date().toISOString().split('T')[0];
      query = query.lt('due_date', today).neq('status', 'done');
    }

    // Sort by priority (urgent first), then due date (soonest first)
    query = query
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .range(offset, offset + Math.min(limit, 50) - 1);

    const { data: tasks, error, count } = await query;

    if (error) throw error;

    // Format tasks with human-readable info
    const formattedTasks = tasks?.map((task: any) => {
      const today = new Date().toISOString().split('T')[0];
      const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        assignee_name: task.assignee?.name || 'Unassigned',
        assignee_id: task.assignee?.id,
        creator_name: task.creator?.name || 'Unknown',
        created_at: task.created_at,
        updated_at: task.updated_at,
        is_overdue: isOverdue
      };
    }) || [];

    const nextOffset = offset + formattedTasks.length < (count || 0)
      ? offset + formattedTasks.length
      : null;

    return {
      items: formattedTasks,
      result_count: formattedTasks.length,
      total_count: count || 0,
      next_offset: nextOffset
    };

  } catch (error: any) {
    console.error('Get tasks error:', error);
    throw error;
  }
}

export async function searchTasks(supabase: any, params: any, clientId: string, userRole: string) {
  let query = supabase
    .from('tasks')
    .select('id, title, description, status, priority, due_date, assignee:profiles!assignee_user_id(name, email)', { count: 'exact' })
    .eq('client_id', clientId);

  if (params.status) query = query.eq('status', params.status);
  if (params.priority) query = query.eq('priority', params.priority);
  if (params.due_date_from) query = query.gte('due_date', params.due_date_from);
  if (params.due_date_to) query = query.lte('due_date', params.due_date_to);
  if (params.assignee_user_id) query = query.eq('assignee_user_id', params.assignee_user_id);

  const limit = Math.min(params.limit || 20, 50);
  const offset = params.offset || 0;

  query = query.order('due_date', { ascending: true }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  const redacted = redactForRole(data || [], userRole);

  return {
    items: sanitizeDataForPrompt(redacted),
    result_count: data?.length || 0,
    total_count: count || 0,
    next_offset: (data?.length || 0) >= limit ? offset + limit : null
  };
}

// Create a general-purpose task (not tied to submissions)
export async function createGeneralTask(supabase: any, params: any, clientId: string, userId: string) {
  try {
    const {
      title,
      description,
      due_date,
      assignee_id,
      priority = 'normal',
      status = 'to_do'
    } = params;

    if (!title || title.trim().length === 0) {
      throw new Error('Task title is required');
    }

    // Calculate default due date (tomorrow) if not provided
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 1);
    const taskDueDate = due_date || defaultDueDate.toISOString().split('T')[0];

    // Create task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        client_id: clientId,
        title: title.trim(),
        description: description || null,
        status,
        assignee_user_id: assignee_id || userId,
        creator_user_id: userId,
        priority,
        due_date: taskDueDate
      })
      .select()
      .single();

    if (taskError) {
      if (taskError.code === '23503' && taskError.message.includes('assignee_user_id_fkey')) {
        throw new Error('Invalid assignee: The user ID provided does not exist in the profiles table. Use get_team_members to find valid user IDs, or omit assignee_id to assign to yourself.');
      }
      throw taskError;
    }

    // Get assignee name if different from creator
    let assigneeName = 'You';
    if (assignee_id && assignee_id !== userId) {
      const { data: assignee } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', assignee_id)
        .single();
      assigneeName = assignee?.name || 'Team member';
    }

    return {
      success: true,
      task_id: task.id,
      task_title: task.title,
      due_date: taskDueDate,
      assignee_name: assigneeName,
      priority: task.priority,
      status: task.status
    };

  } catch (error: any) {
    console.error('Create general task error:', error);
    throw error;
  }
}

// Update an existing task
export async function updateTask(supabase: any, params: any, clientId: string, userId: string) {
  try {
    const {
      task_id,
      title,
      description,
      due_date,
      assignee_id,
      priority,
      status
    } = params;

    if (!task_id) {
      throw new Error('Task ID is required');
    }

    // Verify task exists and belongs to client
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, client_id, assignee_user_id')
      .eq('id', task_id)
      .eq('client_id', clientId)
      .single();

    if (fetchError || !existingTask) {
      // Check if this was a flagged task_id from validation
      if (params._flagged_task_id) {
        throw new Error('Task not found: The task_id provided does not exist. This usually means you need to retrieve the correct task_id first. Try calling get_tasks with appropriate filters, or use the task_id from your most recent create_general_task result.');
      }
      throw new Error('Task not found or access denied');
    }

    // Build update object with only provided fields
    const updates: any = {};

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (due_date !== undefined) updates.due_date = due_date;
    if (priority !== undefined) updates.priority = priority;
    if (status !== undefined) updates.status = status;
    if (assignee_id !== undefined) updates.assignee_user_id = assignee_id;

    // Ensure we have something to update
    if (Object.keys(updates).length === 0) {
      throw new Error('No fields to update');
    }

    // Update the task
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', task_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Get assignee name if changed
    let assigneeName = null;
    if (assignee_id && assignee_id !== existingTask.assignee_user_id) {
      if (assignee_id === userId) {
        assigneeName = 'You';
      } else {
        const { data: assignee } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', assignee_id)
          .single();
        assigneeName = assignee?.name || 'Team member';
      }
    }

    return {
      success: true,
      task_id: updatedTask.id,
      task_title: updatedTask.title,
      updated_fields: Object.keys(updates),
      new_assignee: assigneeName,
      new_status: status,
      new_priority: priority,
      new_due_date: due_date
    };

  } catch (error: any) {
    console.error('Update task error:', error);
    throw error;
  }
}

// Create a general follow-up task from a form submission (non-email)
export async function createTaskFromSubmission(supabase: any, params: any, clientId: string, userId: string) {
  try {
    const {
      submission_id,
      title,
      due_date,
      assignee_id,
      priority = 'normal',
      notes
    } = params;

    // Fetch submission data
    const { data: submission, error: subError } = await supabase
      .from('website_form_submissions')
      .select('*')
      .eq('id', submission_id)
      .eq('client_id', clientId)
      .single();

    if (subError || !submission) {
      if (params._flagged_submission_id) {
        throw new Error('Submission not found: The submission_id provided does not exist in recent results. Call get_form_submissions first to find the correct submission ID.');
      }
      throw new Error('Form submission not found');
    }

    const formData = submission.form_data || {};
    const contactName = formData.name || submission.contact_name || 'Lead';
    const projectType = formData.project_type || formData.service || 'inquiry';

    // Auto-generate title if not provided
    const taskTitle = title || `Follow up with ${contactName} - ${projectType}`;

    // Calculate default due date (2 business days from now)
    let defaultDueDate = new Date();
    let daysAdded = 0;
    while (daysAdded < 2) {
      defaultDueDate.setDate(defaultDueDate.getDate() + 1);
      const dayOfWeek = defaultDueDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
        daysAdded++;
      }
    }

    const taskDueDate = due_date || defaultDueDate.toISOString().split('T')[0];

    // Build task description
    let taskDescription = `Follow up on form submission from ${contactName}\n\n`;
    taskDescription += `**Contact:** ${submission.contact_email || 'N/A'}\n`;
    taskDescription += `**Submitted:** ${new Date(submission.submitted_at).toLocaleDateString()}\n`;
    if (formData.message || formData.comments) {
      taskDescription += `\n**Their message:**\n${formData.message || formData.comments}\n`;
    }
    if (notes) {
      taskDescription += `\n**Notes:**\n${notes}`;
    }

    // Create task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        client_id: clientId,
        title: taskTitle,
        description: taskDescription,
        status: 'to_do',
        assignee_user_id: assignee_id || userId,
        creator_user_id: userId,
        priority,
        due_date: taskDueDate
      })
      .select()
      .single();

    if (taskError) throw taskError;

    return {
      success: true,
      task_id: task.id,
      task_title: taskTitle,
      due_date: taskDueDate,
      assignee_name: assignee_id ? 'Team member' : 'You',
      contact_name: contactName
    };

  } catch (error: any) {
    console.error('Create task from submission error:', error);
    throw error;
  }
}

// Create a task reminder to send a drafted email
export async function createEmailTask(supabase: any, params: any, clientId: string, userId: string) {
  try {
    const {
      submission_id,
      email_subject,
      email_body,
      recipient_email,
      recipient_name,
      due_date,
      priority = 'medium'
    } = params;

    // Verify submission exists
    const { data: submission, error: subError } = await supabase
      .from('website_form_submissions')
      .select('submitted_at')
      .eq('id', submission_id)
      .eq('client_id', clientId)
      .single();

    if (subError || !submission) {
      if (params._flagged_submission_id) {
        throw new Error('Submission not found: The submission_id provided does not exist. Use get_form_submissions to retrieve valid submission IDs first.');
      }
      throw new Error('Form submission not found');
    }

    const taskTitle = `Send email to ${recipient_name}`;

    // Format task description with email details
    const taskDescription = `**Email Ready to Send:**

**To:** ${recipient_email}
**Subject:** ${email_subject}

**Body:**
${email_body}

---
*This email was drafted for form submission from ${recipient_name} on ${new Date(submission.submitted_at).toLocaleDateString()}*`;

    // Set due date (default to today if not provided)
    const taskDueDate = due_date || new Date().toISOString().split('T')[0];

    // Create the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        client_id: clientId,
        title: taskTitle,
        description: taskDescription,
        status: 'to_do',
        assignee_user_id: userId,
        creator_user_id: userId,
        priority,
        due_date: taskDueDate
      })
      .select()
      .single();

    if (taskError) throw taskError;

    return {
      success: true,
      task_id: task.id,
      task_title: taskTitle,
      due_date: taskDueDate,
      recipient_name,
      recipient_email
    };

  } catch (error: any) {
    console.error('Create email task error:', error);
    throw error;
  }
}
