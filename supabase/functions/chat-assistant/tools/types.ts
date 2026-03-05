export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface FunctionCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ExecutorContext {
  supabase: any;
  clientId: string;
  userId: string;
  userRole: string;
  submissionId: string | null;
}
