# Environment & Deployment

## Frontend Environment
Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never expose:
- Supabase service-role key
- payment gateway secret
- webhook secret

If Edge Functions are used, secrets belong only in Supabase project secrets.

## Supabase
- Create production project
- Run migrations
- Enable Auth
- Configure allowed redirect URLs
- Enable RLS
- Add indexes
- Create required RPCs/functions
- Seed initial owner/gym only through secure setup

## Deployment
Recommended:
- Frontend on Vercel
- Supabase for backend/database/auth
- Custom domain optional

## Production Checklist
- [ ] Production env vars
- [ ] RLS verified
- [ ] Auth redirects verified
- [ ] No service-role key in browser bundle
- [ ] Database backups enabled
- [ ] Error logging configured
- [ ] HTTPS enabled
- [ ] Mobile QA completed
- [ ] QR URL tested from real phone
- [ ] WhatsApp link tested on Android and iOS
