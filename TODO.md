# Commonality — Production To-Dos

## Now
- [ ] **Verify theendurancegroup.com in Resend** — add DNS TXT records in GoDaddy, then set `RESEND_FROM_EMAIL=Commonality <commonality@theendurancegroup.com>` in Railway prod
- [ ] **Re-onboard workspace + reconnect Claude MCP connector** — sign in at commonality.theendurancegroup.com, complete onboarding, then remove old Claude connector and re-add with production URL

## Soon
- [ ] **Set up dev environment** — new Supabase project (free tier) + Railway dev service on `dev` branch + custom domain `dev.commonality.theendurancegroup.com` + Clerk dev keys

## Before onboarding paying customers
- [ ] **Upgrade Supabase prod to Pro ($25/mo)** — free tier pauses after 1 week of inactivity; Pro adds no-pause, daily backups, point-in-time recovery
- [ ] **Upgrade Railway to Pro ($20/mo)** — adds 99.9% SLA, better observability, priority support

## When billing is ready
- [ ] **Enable Stripe** — register webhook URL in Stripe dashboard → set `STRIPE_ENABLED=true` in Railway
