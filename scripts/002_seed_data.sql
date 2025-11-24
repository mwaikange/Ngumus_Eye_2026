-- Seed incident types
insert into public.incident_types (code, label, severity) values
  ('ALERT', 'Emergency Alert', 5),
  ('CRIME', 'Crime Report', 4),
  ('GBV', 'Gender-Based Violence', 5),
  ('FIRE', 'Fire Emergency', 5),
  ('MEDICAL', 'Medical Emergency', 5),
  ('MISSING', 'Missing Person', 4),
  ('SUSPICIOUS', 'Suspicious Activity', 2),
  ('LOST', 'Lost & Found', 1)
on conflict (code) do nothing;

-- Seed subscription plans
insert into public.plans (code, label, period_days, price_cents) values
  ('INDIVIDUAL', 'Individual Package', 30, 7000),
  ('FAMILY', 'Family Package', 90, 15000),
  ('TOURIST', 'Tourist Package', 7, 20000)
on conflict (code) do nothing;
