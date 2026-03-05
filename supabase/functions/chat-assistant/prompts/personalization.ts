// Helper function to generate expertise-based guidelines
export function getExpertiseGuidelines(level: string | null): string {
  switch(level) {
    case 'beginner':
      return `- Use simple language and avoid jargon
- Explain marketing concepts from basics
- Provide step-by-step guidance
- Use analogies and examples when helpful`;
    case 'advanced':
      return `- Use industry terminology freely
- Focus on strategy and optimization
- Assume knowledge of fundamentals
- Provide data-driven insights`;
    default: // intermediate or null
      return `- Balance technical terms with explanations when needed
- Build on existing knowledge
- Provide context for recommendations`;
  }
}

// Helper function to generate communication style guidelines
export function getCommunicationGuidelines(style: string | null): string {
  switch(style) {
    case 'concise':
      return `- Keep responses brief and actionable
- Use bullet points
- Get straight to the point
- Focus on what to do next`;
    case 'detailed':
      return `- Provide comprehensive explanations
- Include background context
- Explain the "why" behind recommendations
- Give thorough analysis`;
    default: // balanced or null
      return `- Mix context with action items
- Provide enough detail without overwhelming
- Balance explanation with practicality`;
  }
}
