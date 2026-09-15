# Infrastructure migration roadmap

## Completed locally

- Neon schema/data baseline and runtime validation
- Cloudinary signed portfolio-cover uploads and base64-cover backfill (0 remaining)
- GitHub profile/repository/contribution/README features fetched live with bounded in-memory caching, not Neon mirrors
- Five transient GitHub mirror tables removed from Neon
- Durable portfolio GitHub verification retained
- Portfolio cache pagination metadata and delete invalidation corrected

## Pending production cutover

- Integrate/rebase latest upstream, push, open/review/merge PR
- Configure Vercel production Neon and Cloudinary variables
- Production smoke test and rollback observation window
- Decide eventual Supabase retirement
