# duda-comments-webhook

Turns Duda site-comment webhooks into client-board tasks (token auth via `client_webhook_tokens`).

## Viktor dispatch for Fairs (disabled, signing pending)

After a task change is saved for client `fe2879c1-adfe-42fe-a8f0-7dc68bb548e5`
(`external_source = duda_comment`), the function can forward a small event to a
Viktor inbound webhook (`_shared/viktorFairsDispatch.ts`). It only covers
task_created, reply_appended, edit_appended, task_completed, task_reopened and
deletion_noted.

**Right now nothing is sent, even with secrets set.** The Viktor source requires an HMAC
signature, but the signing convention (header names, signed string, algorithm,
encoding) isn't verified. No `Signer` is wired up, so `canDispatch()` stays false: there's
no extra DB lookup and no network call. It fails closed.

To turn it on later:
1. Get the official Viktor webhook signing spec and implement a `Signer`
   with a known-vector unit test. Then set `viktorSigner` in `index.ts`.
2. Set the secrets on dev first, then prod:
   `supabase secrets set VIKTOR_FAIRS_WEBHOOK_URL=... VIKTOR_FAIRS_WEBHOOK_SECRET=... --project-ref <ref>`
   (dev `zlljsdaxsggkasvympku`, prod `chikljxwgiskyjsnjelf`). Only the user can see the secret.
3. `supabase functions deploy duda-comments-webhook --project-ref <ref>` (this isn't synced automatically).

Behaviour once enabled:
- Best effort only. The DB lookup has a 1.5s cap and the POST a 3s abort.
- It never fails the Duda request and never logs the secret or payload.
- Dedup key: `id` = `event_id` = `duda_comment:<task_id>:<updated_at>`.
- Lost deliveries are covered by Viktor's recovery poll. There's no durable guarantee.
