-- Add page_id column to website_build_tasks for page-specific tasks
ALTER TABLE website_build_tasks 
ADD COLUMN page_id UUID REFERENCES website_build_pages(id) ON DELETE CASCADE;

-- Add dev_notes column to website_build_pages for page-specific technical notes
ALTER TABLE website_build_pages
ADD COLUMN dev_notes TEXT,
ADD COLUMN ai_content TEXT,
ADD COLUMN ai_prompt_template TEXT;

-- Create index for efficient page task lookups
CREATE INDEX idx_website_build_tasks_page_id ON website_build_tasks(page_id);

-- Create standardized prompt templates table
CREATE TABLE website_page_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  output_structure JSONB,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE website_page_prompt_templates ENABLE ROW LEVEL SECURITY;

-- Templates are readable by all authenticated users
CREATE POLICY "Templates are readable by authenticated users"
ON website_page_prompt_templates FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage templates
CREATE POLICY "Admins can manage templates"
ON website_page_prompt_templates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Insert default prompt templates
INSERT INTO website_page_prompt_templates (page_type, template_name, prompt_template, output_structure, is_default) VALUES
(
  'home',
  'Home Page',
  E'OBJECTIVE: Create compelling homepage content that immediately communicates the value proposition.\n\nREQUIRED SECTIONS:\n1. Hero Section\n   - Hero Headline (10 words max, benefit-focused)\n   - Hero Subheadline (25 words max, problem-solution)\n   - Primary CTA button text\n   - Secondary CTA button text (optional)\n\n2. Trust Signals Section\n   - 3 proof points (awards, certifications, years in business)\n\n3. Services Overview Section\n   - Section headline\n   - 3-4 service cards with title and brief description (2 sentences each)\n\n4. Why Choose Us Section\n   - Section headline\n   - 3-4 key differentiators with supporting text\n\n5. Social Proof Section\n   - Section headline\n   - 2-3 testimonial placeholders with suggested content themes\n\n6. Final CTA Section\n   - Compelling headline\n   - Supporting text\n   - CTA button text\n\nFORMAT: Output as structured HTML with proper heading hierarchy (h1 for hero, h2 for sections, h3 for subsections).\n\nTONE: Professional yet approachable, confident but not arrogant.\nFOCUS: Benefits over features, outcomes over processes.',
  '{"sections": ["hero", "trust_signals", "services", "why_choose_us", "social_proof", "final_cta"]}',
  true
),
(
  'services',
  'Service Page',
  E'OBJECTIVE: Create a service page that educates visitors and drives conversions.\n\nREQUIRED SECTIONS:\n1. Hero Section\n   - Service headline (benefit-focused, not just service name)\n   - Subheadline explaining the transformation/outcome\n   - Primary CTA\n\n2. Problem Section\n   - Headline addressing the pain point\n   - 2-3 paragraphs describing the problem the audience faces\n   - Emotional connection to their frustration\n\n3. Solution Section\n   - Headline introducing your approach\n   - Overview of how this service solves their problem\n   - Key methodology or approach highlights\n\n4. Process Section (How It Works)\n   - Section headline\n   - 3-5 numbered steps with title and description\n   - Make it feel simple and achievable\n\n5. Benefits Section\n   - Section headline\n   - 5-7 key benefits with brief explanations\n   - Focus on outcomes, not features\n\n6. FAQ Section\n   - 4-5 common questions with answers\n   - Address objections subtly\n\n7. CTA Section\n   - Compelling headline\n   - Urgency or value proposition\n   - Clear next step\n\nFORMAT: Output as structured HTML with proper heading hierarchy.\nTONE: Expert and reassuring, build confidence in your capabilities.',
  '{"sections": ["hero", "problem", "solution", "process", "benefits", "faq", "cta"]}',
  true
),
(
  'about',
  'About Page',
  E'OBJECTIVE: Build trust and connection through authentic brand storytelling.\n\nREQUIRED SECTIONS:\n1. Hero Section\n   - Engaging headline (not just "About Us")\n   - Brief intro statement about who you are and why you exist\n\n2. Brand Story Section\n   - Origin story headline\n   - 2-3 paragraphs telling the authentic founding story\n   - Include the "why" behind starting the business\n   - Make it relatable and human\n\n3. Mission & Vision Section\n   - Mission statement (what you do and for whom)\n   - Vision statement (the future you''re building toward)\n\n4. Values Section\n   - Section headline\n   - 3-4 core values with explanations\n   - Show how values translate to client experience\n\n5. Team Section (if applicable)\n   - Section headline\n   - Founder/key team member introductions\n   - Keep it personal and approachable\n\n6. Why Work With Us Section\n   - Section headline\n   - 3-4 differentiators that set you apart\n   - Social proof integration points\n\n7. CTA Section\n   - Invitation to connect\n   - Personal and warm tone\n\nFORMAT: Output as structured HTML with proper heading hierarchy.\nTONE: Authentic, warm, confident but humble.',
  '{"sections": ["hero", "story", "mission_vision", "values", "team", "differentiators", "cta"]}',
  true
),
(
  'contact',
  'Contact Page',
  E'OBJECTIVE: Encourage visitors to reach out with warm, approachable copy that reduces friction.\n\nREQUIRED SECTIONS:\n1. Hero Section\n   - Welcoming headline (not just "Contact Us")\n   - Brief, friendly intro encouraging them to reach out\n   - Set expectations (response time, what happens next)\n\n2. Contact Methods Section\n   - Phone section with copy\n   - Email section with copy\n   - Address/location section with copy (if applicable)\n   - Business hours (if applicable)\n\n3. Form Introduction\n   - Brief text above the contact form\n   - Reassurance about what they can expect\n   - Make it feel low-pressure\n\n4. FAQ Section (optional)\n   - 2-3 quick questions about contacting\n   - "What should I include in my message?"\n   - "How quickly will you respond?"\n\n5. Alternative CTA\n   - For those not ready to contact\n   - Offer another resource or action\n\nFORMAT: Output as structured HTML with proper heading hierarchy.\nTONE: Warm, inviting, low-pressure, helpful.',
  '{"sections": ["hero", "contact_methods", "form_intro", "faq", "alternative_cta"]}',
  true
),
(
  'gallery',
  'Gallery/Portfolio Page',
  E'OBJECTIVE: Showcase work in a way that builds credibility and inspires action.\n\nREQUIRED SECTIONS:\n1. Hero Section\n   - Compelling headline about your work/results\n   - Brief intro about what visitors will see\n   - Set context for the quality and range of work\n\n2. Featured Project Section\n   - Template for 1 featured/highlighted project\n   - Project title\n   - Brief description of the challenge\n   - Solution overview\n   - Results or impact (if applicable)\n\n3. Project Categories (if applicable)\n   - Category names and brief descriptions\n   - Help visitors navigate to relevant work\n\n4. Individual Project Template\n   - Title format suggestions\n   - Description structure (challenge, solution, result)\n   - Suggested caption style for images\n\n5. Social Proof Integration\n   - Where to place testimonials\n   - Client logo placement suggestions\n\n6. CTA Section\n   - "Like what you see?" type headline\n   - Encourage next step\n   - Clear action button text\n\nFORMAT: Output as structured HTML with proper heading hierarchy.\nTONE: Confident, results-focused, let the work speak but provide context.',
  '{"sections": ["hero", "featured", "categories", "project_template", "social_proof", "cta"]}',
  true
),
(
  'landing',
  'Landing Page',
  E'OBJECTIVE: Create a high-converting landing page focused on a single offer or action.\n\nREQUIRED SECTIONS:\n1. Hero Section\n   - Attention-grabbing headline (focus on outcome/benefit)\n   - Subheadline with supporting value proposition\n   - Primary CTA (clear, action-oriented)\n   - Hero image/video caption suggestion\n\n2. Problem Agitation Section\n   - Headline calling out the pain\n   - 3-4 bullet points of specific frustrations\n   - Emotional connection to current state\n\n3. Solution Introduction\n   - Transition headline ("There''s a better way")\n   - Brief introduction to your offer\n   - Key promise or transformation\n\n4. Benefits/Features Section\n   - 4-6 benefit-focused bullet points\n   - Each with a headline and 1-2 sentence explanation\n   - Focus on "what''s in it for them"\n\n5. Social Proof Section\n   - 2-3 testimonials or case study snippets\n   - Stats or numbers if available\n   - Trust badges/logos\n\n6. Offer Details Section\n   - What exactly they get\n   - Pricing or value stack (if applicable)\n   - Any bonuses or guarantees\n\n7. FAQ Section\n   - 4-5 objection-handling questions\n   - Keep answers concise\n\n8. Final CTA Section\n   - Urgency-creating headline\n   - Risk reversal (guarantee mention)\n   - Clear, compelling button text\n\nFORMAT: Output as structured HTML with proper heading hierarchy.\nTONE: Persuasive but not pushy, benefit-focused, creates urgency.',
  '{"sections": ["hero", "problem", "solution", "benefits", "social_proof", "offer", "faq", "final_cta"]}',
  true
);