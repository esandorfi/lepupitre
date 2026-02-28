---

# RFC-0002 — Lepupitre Hub API (Local-First + Talk-First)

**Status**: Draft  
**Version**: 0.2  
**Date**: 2026-02-22  
**Audience**: engineering, security, product  
**Scope**: Hub API + SPA dashboard contract for local-first sync, sharing, feedback, challenges, and export

---

**1. Goal**

Provide a minimal cloud interface that lets the local-first app:
1. Sync private workspace state.
2. Share selected talk outputs with consent.
3. Receive authenticated feedback.
4. Receive hub-assigned Challenges (optional).
5. Publish talks or export to external RAG systems via explicit actions.

The hub does not replace local workflows. Local remains the source of truth.

---

**2. Non-Goals (v0.2)**

1. Real-time collaborative editing or CRDT merge.
2. Anonymous feedback.
3. Arbitrary rule engine or policy DSL for Challenges.
4. Implicit publishing or implicit exports.

---

**3. Principles**

1. Local-first wins: the hub never overwrites local state without client consent.
2. Explicit sharing only: community exposure requires a publish action.
3. Private sync boundary: sync is for private data only.
4. Least privilege: network access is opt-in and scoped.
5. Community signals are opt-in and never include content.

---

**4. Glossary**

1. Talk: a single recorded session.
2. Transcript: text derived from a talk.
3. Knowledge Note: structured note derived from a talk.
4. Decision: a structured decision derived from a talk.
5. Quest: a local-only task created by the local app.
6. Challenge: a hub-assigned task suggested by the hub.
7. Publication: a community snapshot of a talk.
8. Export: an explicit push to an external system (RAG, LightOn, etc.).

---

**5. System Boundary**

**Local App (source of truth)**
1. Talk capture and transcription.
2. Knowledge extraction (notes, decisions).
3. Local quests, local history, and conflict resolution UI.
4. Consent UI for share, publish, and export.

**Hub API**
1. Sync engine and conflict records.
2. Storage of allowed artifacts and transcripts.
3. Feedback storage (authenticated only).
4. Challenges service.
5. Notifications service.
6. Publication and export services.

**SPA Dashboard**
1. Session-based access for humans.
2. Workspace and publication management.
3. Feedback review and moderation.
4. Challenge review and settings.
5. Export configuration and job history.

---

**6. Auth Model**

1. SPA dashboard: cookie session (same-domain).
2. Machine clients: `Authorization: Bearer <api_key>`.
3. API keys are scoped and revocable.
4. Machine clients inherit the permissions of the key owner.

---

**7. Core Data Model (Minimal Shapes)**

**Workspace**
```json
{
  "id": "wsp_...",
  "owner_id": "usr_...",
  "name": "Talks Q1",
  "local_uuid": "uuid-from-local",
  "visibility": "private|shared|community",
  "created_at": "...",
  "updated_at": "..."
}
```

**Talk**
```json
{
  "id": "tlk_...",
  "workspace_id": "wsp_...",
  "title": "Design Session 01",
  "recorded_at": "...",
  "duration_sec": 1200,
  "storage_policy": "hub_full|transcript_only",
  "created_at": "...",
  "updated_at": "..."
}
```

**AudioArtifact**
```json
{
  "id": "aud_...",
  "talk_id": "tlk_...",
  "hash": "sha256...",
  "size_bytes": 12345,
  "storage_policy": "hub_full|transcript_only",
  "created_at": "..."
}
```

**Transcript**
```json
{
  "id": "trc_...",
  "talk_id": "tlk_...",
  "text": "...",
  "language": "en",
  "created_at": "..."
}
```

**KnowledgeNote**
```json
{
  "id": "kno_...",
  "talk_id": "tlk_...",
  "title": "Key insight",
  "body": "...",
  "tags": ["design", "risk"],
  "created_at": "..."
}
```

**Decision**
```json
{
  "id": "dec_...",
  "talk_id": "tlk_...",
  "statement": "We will X because Y.",
  "confidence": "low|med|high",
  "created_at": "..."
}
```

**Quest (local)**
```json
{
  "id": "qst_...",
  "workspace_id": "wsp_...",
  "title": "Refine summary",
  "status": "active|completed|archived",
  "origin": "local"
}
```

**Challenge (hub)**
```json
{
  "id": "chl_...",
  "workspace_id": "wsp_...",
  "title": "Share transcript with expert",
  "status": "new|accepted|completed|dismissed",
  "origin": "hub"
}
```

**Feedback**
```json
{
  "id": "fbk_...",
  "target_type": "talk|transcript|note|decision",
  "target_id": "trc_...",
  "author_id": "usr_...",
  "body": "Consider clarifying X.",
  "rating": 4,
  "created_at": "..."
}
```

**Publication**
```json
{
  "id": "pub_...",
  "talk_id": "tlk_...",
  "visibility": "community|unlisted",
  "license": "cc-by|all-rights",
  "snapshot_mode": "talk+transcript|transcript_only",
  "created_at": "..."
}
```

**ExportTarget**
```json
{
  "id": "ext_...",
  "type": "lighton|custom",
  "config": { "...": "..." },
  "created_at": "..."
}
```

**ExportJob**
```json
{
  "id": "job_...",
  "workspace_id": "wsp_...",
  "target_id": "ext_...",
  "scope": "transcripts|notes|decisions|all",
  "mode": "full|delta",
  "status": "queued|running|done|failed",
  "created_at": "..."
}
```

---

**8. Sync Contract (Private State Only)**

Sync is only for private, local-first state. It does not include Challenges, Publications, or Exports.

**Change format**
```json
{
  "op": "upsert|delete",
  "entity": "talk|audio|transcript|note|decision|quest|workspace",
  "id": "tlk_...",
  "payload": { "...": "..." },
  "ts": "..."
}
```

**Endpoints**
1. `POST /v1/sync/commits`
2. `GET /v1/sync/deltas?workspace_id=&cursor=`
3. `POST /v1/sync/resolve`

**Conflict policy**
1. Default: client resolves.
2. Hub never auto-overwrites local state.

---

**9. Sharing and Feedback**

1. Storage policy is explicit per talk.
2. `hub_full` allows raw audio upload.
3. `transcript_only` stores transcript only.
4. Feedback is authenticated only.
5. Feedback requires explicit sharing permission.

---

**10. Publishing (Community Talk)**

Publishing is an explicit action that creates a community snapshot.

**Endpoints**
1. `POST /v1/publications`
2. `GET /v1/community/talks/{id}`
3. `DELETE /v1/publications/{id}`

---

**11. Challenges (Hub-Assigned)**

Challenges are hub-generated and are not part of sync.

**Endpoints**
1. `GET /v1/challenges?workspace_id=`
2. `POST /v1/challenges/{id}/accept`
3. `POST /v1/challenges/{id}/complete`
4. `POST /v1/challenges/{id}/dismiss`

---

**12. Export to External Services**

Exports are explicit connector jobs and never implicit in sync.

**Endpoints**
1. `POST /v1/exports/targets`
2. `POST /v1/exports/jobs`
3. `GET /v1/exports/jobs/{id}`

---

**13. Notifications (Fixed Triggers)**

No rule engine yet. The hub emits fixed events.

**Event types**
1. `feedback.new`
2. `challenge.new`
3. `publication.ready`
4. `permission.changed`

**Endpoints**
1. `POST /v1/events/subscribe`
2. `DELETE /v1/events/subscribe/{id}`

---

**14. Community Signals (Opt-In, Metrics Only)**

Local quest completions can be published as community gaming signals with no content.
Signals are opt-in per workspace or profile and contain only categorization or metrics.

**CommunityEvent**
```json
{
  "id": "cme_...",
  "type": "quest.completed",
  "workspace_id": "wsp_...",
  "quest_id": "qst_...",
  "category": "clarity|structure|delivery|other",
  "metrics": {
    "duration_sec": 180,
    "score": 82
  },
  "created_at": "..."
}
```

**Endpoints**
1. `POST /v1/community/quest-completions`
2. `GET /v1/community/quest-completions`

**Rules**
1. No transcript, audio, or note content may be included.
2. User must explicitly opt in to community signals.
3. Hub may aggregate or rate-limit community visibility.

---

**15. Encryption**

1. TLS in transit is required.
2. At-rest encryption is required.
3. Optional end-to-end encryption per workspace or artifact.

---

**16. Permission Matrix**

**Roles**
1. Owner: creator of the workspace.
2. Collaborator: explicitly granted access to a shared workspace or artifact.
3. Community: unauthenticated viewer of a publication.
4. Admin: platform administrator.

**Matrix**

| Action | Owner | Collaborator | Community | Admin |
| --- | --- | --- | --- | --- |
| Read own workspace | Yes | Yes, if shared | No | Yes |
| Write own workspace | Yes | No | No | Yes |
| Upload audio (hub_full) | Yes | No | No | Yes |
| Upload transcript | Yes | Yes, if shared | No | Yes |
| Read transcript | Yes | Yes, if shared | No | Yes |
| Create local Quest | Yes | No | No | Yes |
| Read local Quests | Yes | No | No | Yes |
| Read Challenges | Yes | No | No | Yes |
| Accept or complete Challenge | Yes | No | No | Yes |
| Create feedback | Yes | Yes, if explicitly invited | No | Yes |
| Read feedback | Yes | Yes, if shared | No | Yes |
| Publish a talk | Yes | No | No | Yes |
| View community talk | Yes | Yes, if shared | Yes | Yes |
| Publish quest completion metrics | Yes | No | No | Yes |
| View community signals | Yes | Yes, if shared | Yes | Yes |
| Configure export target | Yes | No | No | Yes |
| Run export job | Yes | No | No | Yes |
| Manage API keys | Yes | No | No | Yes |
| Moderate content | No | No | No | Yes |

**Notes**
1. Machine clients inherit the role of the API key owner.
2. Collaborator permissions are granted only when the workspace or artifact is explicitly shared.
3. Community access is limited to published snapshots only.

---

**17. API Surface Summary (Clear Separation)**

**A. Local-First API (machine clients, API key required)**

Used by the local app to sync private state and pull hub Challenges.
1. `POST /v1/sync/commits`
2. `GET /v1/sync/deltas`
3. `POST /v1/sync/resolve`
4. `POST /v1/feedback`
5. `GET /v1/challenges`
6. `POST /v1/challenges/{id}/accept`
7. `POST /v1/challenges/{id}/complete`
8. `POST /v1/exports/jobs`
9. `POST /v1/community/quest-completions`

**B. Dashboard API (browser session required)**

Used by the SPA for management, moderation, and publish/export configuration.
1. `POST /v1/auth/login`
2. `POST /v1/auth/logout`
3. `GET /v1/me`
4. `GET /v1/workspaces`
5. `GET /v1/feedback`
6. `GET /v1/publications`
7. `POST /v1/publications`
8. `POST /v1/admin/api-keys`
9. `POST /v1/admin/revoke-key`
10. `POST /v1/exports/targets`
11. `GET /v1/exports/jobs/{id}`

**C. Community API (no auth)**

Read-only community access to published talks and aggregated quest completion signals.
1. `GET /v1/community/talks/{id}`
2. `GET /v1/community/quest-completions`

---

**18. Hub + SPA Implementation Notes**

**Hub services**
1. API gateway (routing, auth, rate limits).
2. Sync service (commit log, cursor, conflict records).
3. Metadata DB (workspaces, talks, transcripts, notes, decisions).
4. Object storage (audio artifacts when allowed).
5. Feedback service (authenticated only).
6. Challenges service (hub-assigned).
7. Publication service (community snapshots).
8. Export service (connector jobs).
9. Notification service (webhooks or push).
10. Audit logs and admin moderation.

**SPA dashboard**
1. Session auth and workspace management.
2. Feedback moderation and review.
3. Challenge settings and review.
4. Publication management and community preview.
5. Export target configuration and job history.
