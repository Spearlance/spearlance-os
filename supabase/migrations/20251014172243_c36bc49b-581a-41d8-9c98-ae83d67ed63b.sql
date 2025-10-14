-- Insert comprehensive marketing flow task templates across all 6 stages

-- 🧱 FOUNDATIONS Stage (3 channels, 15 tasks)
INSERT INTO marketing_flow_task_templates (standard_stage_id, channel_name, title, priority) VALUES
-- Offer Creation (5 tasks)
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Offer Creation', 'Use the AI Assistant to generate marketing ideas', 'high'),
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Offer Creation', 'Review and select best offer ideas', 'high'),
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Offer Creation', 'Finalize the primary offer', 'high'),
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Offer Creation', 'Approve pricing and guarantee', 'normal'),
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Offer Creation', 'Document final offer in client workspace', 'normal'),

-- Brand Assets (4 tasks)
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Brand Assets', 'Go to Launchpad and complete brand assets section', 'high'),
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Brand Assets', 'Upload logos, fonts, and colors', 'normal'),
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Brand Assets', 'Add brand tone and messaging preferences', 'normal'),
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Brand Assets', 'Confirm business description and services', 'normal'),

-- Access & Tracking Setup (6 tasks)
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Access & Tracking Setup', 'Go to Launchpad and complete access section', 'high'),
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Access & Tracking Setup', 'Share access to Facebook Business Manager', 'normal'),
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Access & Tracking Setup', 'Share access to Google Ads', 'normal'),
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Access & Tracking Setup', 'Share access to Google Analytics', 'normal'),
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Access & Tracking Setup', 'Share access to website', 'normal'),
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Access & Tracking Setup', 'Share access to domain registrar', 'normal'),
('4a40dc1f-8b2e-4090-9bf0-fee02eef4633', 'Access & Tracking Setup', 'Verify all access connections are active and tested', 'high'),

-- 🚀 CREATE DEMAND Stage (6 channels, 27 tasks)
-- Facebook & Instagram Ads (5 tasks)
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Facebook & Instagram Ads', 'Define campaign objective', 'high'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Facebook & Instagram Ads', 'Identify target audiences', 'high'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Facebook & Instagram Ads', 'Create ad copy and creative', 'normal'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Facebook & Instagram Ads', 'Launch campaign', 'high'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Facebook & Instagram Ads', 'Monitor performance and optimize', 'normal'),

-- YouTube Ads (5 tasks)
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'YouTube Ads', 'Write ad script', 'normal'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'YouTube Ads', 'Record or upload video', 'normal'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'YouTube Ads', 'Choose targeting and placements', 'normal'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'YouTube Ads', 'Add call-to-action', 'normal'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'YouTube Ads', 'Launch and track performance', 'high'),

-- LinkedIn Ads (4 tasks)
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'LinkedIn Ads', 'Identify target roles and industries', 'high'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'LinkedIn Ads', 'Create ad copy and visuals', 'normal'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'LinkedIn Ads', 'Launch campaign', 'high'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'LinkedIn Ads', 'Review performance weekly', 'normal'),

-- Organic Social Media (5 tasks)
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Organic Social Media', 'Set up posting calendar', 'high'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Organic Social Media', 'Add brand templates', 'normal'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Organic Social Media', 'Schedule posts', 'normal'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Organic Social Media', 'Engage with comments and messages', 'normal'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Organic Social Media', 'Track growth metrics', 'normal'),

-- PR & Partnerships (4 tasks)
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'PR & Partnerships', 'Identify outreach opportunities (podcasts, blogs, media)', 'normal'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'PR & Partnerships', 'Write outreach messages', 'normal'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'PR & Partnerships', 'Send initial outreach', 'high'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'PR & Partnerships', 'Track responses and results', 'normal'),

-- Cold Email Outreach (5 tasks)
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Cold Email Outreach', 'Create or upload contact list', 'high'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Cold Email Outreach', 'Write email sequence using AI Assistant', 'normal'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Cold Email Outreach', 'Verify sending domain', 'high'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Cold Email Outreach', 'Launch campaign', 'high'),
('41b1f4ec-1b68-404c-ad10-eae009aabfc2', 'Cold Email Outreach', 'Review replies and engagement', 'normal'),

-- 🔎 CAPTURE DEMAND Stage (4 channels, 19 tasks)
-- Google Ads (Search) (5 tasks)
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Google Ads (Search)', 'Perform keyword research', 'high'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Google Ads (Search)', 'Create ad groups and headlines', 'normal'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Google Ads (Search)', 'Add extensions', 'normal'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Google Ads (Search)', 'Set up conversion tracking', 'high'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Google Ads (Search)', 'Launch and optimize weekly', 'high'),

-- Google Business Profile (5 tasks)
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Google Business Profile', 'Claim or verify listing', 'high'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Google Business Profile', 'Add photos, hours, and services', 'normal'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Google Business Profile', 'Write business description', 'normal'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Google Business Profile', 'Post weekly updates', 'normal'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Google Business Profile', 'Request reviews', 'normal'),

-- SEO (5 tasks)
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'SEO', 'Audit current website', 'high'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'SEO', 'Optimize page titles and meta descriptions', 'normal'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'SEO', 'Create city or service landing pages', 'normal'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'SEO', 'Add schema markup', 'normal'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'SEO', 'Begin link-building plan', 'normal'),

-- Directory Listings (4 tasks)
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Directory Listings', 'Add business to niche directories', 'normal'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Directory Listings', 'Confirm NAP consistency', 'high'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Directory Listings', 'Add description and services', 'normal'),
('59a6f40e-af2d-4a77-8c76-6d66b6b89446', 'Directory Listings', 'Track traffic from directories', 'normal'),

-- 💡 CONVERT Stage (4 channels, 19 tasks)
-- CRO (Website Optimization) (5 tasks)
('58d03b31-3207-4d15-9506-2bef104433f9', 'CRO (Website Optimization)', 'Review layout and clarity', 'high'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'CRO (Website Optimization)', 'Add testimonials or case studies', 'normal'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'CRO (Website Optimization)', 'Simplify calls-to-action', 'high'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'CRO (Website Optimization)', 'Set up chat widget or lead form', 'normal'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'CRO (Website Optimization)', 'Test conversion flow', 'high'),

-- Lead Magnets (5 tasks)
('58d03b31-3207-4d15-9506-2bef104433f9', 'Lead Magnets', 'Use AI Assistant to brainstorm lead magnet ideas', 'high'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'Lead Magnets', 'Create downloadable or video resource', 'normal'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'Lead Magnets', 'Build landing page', 'normal'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'Lead Magnets', 'Connect to CRM', 'normal'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'Lead Magnets', 'Test opt-in flow', 'high'),

-- Email Nurturing (5 tasks)
('58d03b31-3207-4d15-9506-2bef104433f9', 'Email Nurturing', 'Create automated email nurture campaign', 'high'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'Email Nurturing', 'Write emails using AI Assistant', 'normal'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'Email Nurturing', 'Add tags and automations', 'normal'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'Email Nurturing', 'Connect to offer or call booking', 'normal'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'Email Nurturing', 'Review open and click metrics', 'normal'),

-- Retargeting Ads (4 tasks)
('58d03b31-3207-4d15-9506-2bef104433f9', 'Retargeting Ads', 'Build custom audiences', 'high'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'Retargeting Ads', 'Design testimonial or offer-based ads', 'normal'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'Retargeting Ads', 'Launch on Meta and Google', 'high'),
('58d03b31-3207-4d15-9506-2bef104433f9', 'Retargeting Ads', 'Track conversions and frequency', 'normal'),

-- 💰 CLOSE Stage (3 channels, 13 tasks)
-- Sales Process (5 tasks)
('b1e92880-85c4-4a4e-b17f-e7d3c26cb8cd', 'Sales Process', 'Map out current sales flow', 'high'),
('b1e92880-85c4-4a4e-b17f-e7d3c26cb8cd', 'Sales Process', 'Add or create sales script', 'normal'),
('b1e92880-85c4-4a4e-b17f-e7d3c26cb8cd', 'Sales Process', 'Add booking calendar', 'normal'),
('b1e92880-85c4-4a4e-b17f-e7d3c26cb8cd', 'Sales Process', 'Set follow-up automation', 'normal'),
('b1e92880-85c4-4a4e-b17f-e7d3c26cb8cd', 'Sales Process', 'Review pipeline weekly', 'normal'),

-- Payment & Transactions (3 tasks)
('b1e92880-85c4-4a4e-b17f-e7d3c26cb8cd', 'Payment & Transactions', 'Connect payment processor (Stripe, QuickBooks, etc.)', 'high'),
('b1e92880-85c4-4a4e-b17f-e7d3c26cb8cd', 'Payment & Transactions', 'Test transaction flow', 'high'),
('b1e92880-85c4-4a4e-b17f-e7d3c26cb8cd', 'Payment & Transactions', 'Verify receipts and notifications', 'normal'),

-- Reporting (5 tasks)
('b1e92880-85c4-4a4e-b17f-e7d3c26cb8cd', 'Reporting', 'Use the built-in Reporting Tool', 'high'),
('b1e92880-85c4-4a4e-b17f-e7d3c26cb8cd', 'Reporting', 'Review key metrics (leads, conversion rates, ad spend, ROI)', 'normal'),
('b1e92880-85c4-4a4e-b17f-e7d3c26cb8cd', 'Reporting', 'Share insights in weekly meeting', 'normal'),
('b1e92880-85c4-4a4e-b17f-e7d3c26cb8cd', 'Reporting', 'Identify trends and opportunities', 'normal'),
('b1e92880-85c4-4a4e-b17f-e7d3c26cb8cd', 'Reporting', 'Create custom dashboards', 'low'),

-- 🔁 RETAIN & REACTIVATE Stage (4 channels, 18 tasks)
-- Newsletters (4 tasks)
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Newsletters', 'Create monthly or quarterly newsletter', 'normal'),
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Newsletters', 'Segment contacts', 'normal'),
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Newsletters', 'Schedule send', 'normal'),
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Newsletters', 'Track open and click metrics', 'normal'),

-- Reactivation Campaigns (4 tasks)
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Reactivation Campaigns', 'Identify inactive clients', 'high'),
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Reactivation Campaigns', 'Use AI Assistant to write reactivation sequence', 'normal'),
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Reactivation Campaigns', 'Launch campaign', 'high'),
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Reactivation Campaigns', 'Track replies and sales', 'normal'),

-- Referral Program (4 tasks)
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Referral Program', 'Create referral landing page', 'normal'),
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Referral Program', 'Write announcement email', 'normal'),
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Referral Program', 'Automate referral tracking', 'normal'),
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Referral Program', 'Send rewards', 'normal'),

-- Review & Reputation (3 tasks)
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Review & Reputation', 'Request reviews post-purchase', 'normal'),
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Review & Reputation', 'Add automation for review requests', 'normal'),
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Review & Reputation', 'Collect and display on site', 'normal'),

-- Loyalty & Retention Offers (3 tasks)
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Loyalty & Retention Offers', 'Plan quarterly retention offer', 'normal'),
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Loyalty & Retention Offers', 'Announce via email', 'normal'),
('0552b774-3ef1-4a6b-92c7-91bea2445b43', 'Loyalty & Retention Offers', 'Track returning clients and renewals', 'normal');