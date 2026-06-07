-- ============================================================================
-- Legal documents — Terms of service & Community guidelines (app copy)
-- Run after 001_api_routes.sql
-- ============================================================================

create table if not exists public.legal_documents (
  id text primary key check (id in ('terms', 'guidelines')),
  title text not null,
  intro text not null,
  safety_note text not null default '',
  footer text not null default '',
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.legal_documents is 'Terms of service and community guidelines served to the app.';

alter table public.legal_documents enable row level security;

drop policy if exists "Public read legal documents" on public.legal_documents;
create policy "Public read legal documents"
  on public.legal_documents for select
  using (true);

insert into public.legal_documents (id, title, intro, safety_note, footer, sections) values
(
  'guidelines',
  'Community guidelines',
  'Lavey is built for real connections. These rules keep the community respectful, safe, and fun for everyone.',
  'We use automated and human review to enforce these guidelines. Reports are confidential — the person you report will not be told who filed it.',
  'Breaking these guidelines may result in warnings, restrictions, or a permanent ban.',
  '[
    {"title": "Be yourself", "body": ["Use recent photos that clearly show you.", "Do not impersonate others or use misleading profile information.", "One account per person."]},
    {"title": "Be respectful", "body": ["No harassment, hate speech, threats, or bullying.", "Take \"no\" gracefully — unmatched or blocked means stop contacting that person.", "Keep conversations appropriate for a dating community."]},
    {"title": "Stay safe", "body": ["Never share passwords, banking details, or send money to matches.", "Meet in public places and tell a friend when meeting someone new.", "Use in-app reporting if something feels wrong."]},
    {"title": "Not allowed", "body": ["Sexual content involving minors, exploitation, or non-consensual material.", "Spam, scams, multi-level marketing, or off-platform payment requests.", "Violence, illegal activity, or weapons in profile content."]}
  ]'::jsonb
),
(
  'terms',
  'Terms of service',
  'By using Lavey you agree to these terms. Please read them so you know how the app works and how we protect you.',
  'Your data is encrypted in transit, stored securely, and never sold to third-party advertisers. You control what appears on your profile and who can see you in Discover.',
  'We may update these terms. Continued use after changes means you accept the updated terms.',
  '[
    {"title": "Your account", "body": ["You must be 18 or older to use Lavey.", "You are responsible for activity on your account and keeping your login secure.", "You may delete your account at any time from Safety & privacy."]},
    {"title": "Your content", "body": ["You own the photos and messages you post; you grant Lavey a license to display them in the app.", "We may remove content that violates our Community Guidelines.", "AI-assisted features (e.g. match suggestions) are provided as-is and may be updated over time."]},
    {"title": "Privacy & data", "body": ["We collect only what we need to run the service: profile info, messages, and usage to improve safety.", "Location is used for Nearby and distance filters — you can limit visibility in Safety & privacy.", "Contact support anytime to request a copy of your data or ask privacy questions."]},
    {"title": "Subscriptions", "body": ["Platinum and other paid features are billed through your app store account.", "Refunds follow the store''s policies; contact support if you need help."]}
  ]'::jsonb
)
on conflict (id) do update set
  title = excluded.title,
  intro = excluded.intro,
  safety_note = excluded.safety_note,
  footer = excluded.footer,
  sections = excluded.sections,
  updated_at = now();

insert into public.api_routes (method, path_pattern, handler_key, description) values
  ('GET', '/legal/terms',       'legal.getTerms',       'Terms of service copy'),
  ('GET', '/legal/guidelines',  'legal.getGuidelines',  'Community guidelines copy')
on conflict (method, path_pattern) do update set
  handler_key = excluded.handler_key,
  description = excluded.description,
  is_active = true;

notify pgrst, 'reload schema';
