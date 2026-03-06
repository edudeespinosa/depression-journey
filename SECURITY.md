# Security & Data Encryption

## Overview

Phantom Prophet applies **two layers of encryption** to protect sensitive user data:

1. **Infrastructure-level encryption** — Supabase (hosted on AWS) encrypts all data on disk using AES-256. This is automatic and requires no configuration.
2. **Application-level field encryption** — sensitive text fields are encrypted by the Next.js server *before* being written to the database. Even with direct database access or a backup, the data cannot be read without the application encryption key.

---

## Application-Level Encryption

### Algorithm

**AES-256-GCM** (Advanced Encryption Standard, 256-bit key, Galois/Counter Mode)

- Industry-standard symmetric encryption
- GCM mode provides both confidentiality and **authenticated integrity** — any tampering with the ciphertext is detected
- Each encrypted value uses a **unique random IV** (Initialization Vector), so identical inputs produce different ciphertext

### Encrypted Fields

| Table | Field | Reason |
|---|---|---|
| `journal_entries` | `content` | Full journal text written by the user |
| `journal_entries` | `ai_response` | AI reflection generated in response to the user's entry |
| `thought_records` | `situation` | Description of the triggering event |
| `thought_records` | `automatic_thought` | The user's internal thought |
| `thought_records` | `evidence_for` | Supporting evidence for the thought |
| `thought_records` | `evidence_against` | Contradicting evidence |
| `thought_records` | `balanced_thought` | Reframed perspective |
| `thought_records` | `outcome_emotion` | Emotional outcome after reframing |
| `daily_checkins` | `ai_response` | AI's Socratic reflection question |

### Fields NOT Encrypted

Some fields are intentionally stored in plaintext because they are used for server-side aggregation and cannot be encrypted without breaking functionality:

| Table | Field | Reason not encrypted |
|---|---|---|
| `daily_checkins` | `emotion` | Used to compute mood trends and patient summaries |
| `daily_checkins` | `intensity` | Used for mood trend analysis (improving/stable/declining) |
| `habits` | `name` | Used for display and habit tracking logic |
| `habit_logs` | `completed_at` | Date used for streak and weekly progress calculations |

---

## Stored Format

Encrypted values are stored as a colon-separated hex string:

```
<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
```

Example stored value in the database:
```
a3f1c8b2...:9d4e2f1a...:7c8b3e9f...
```

- `iv` — 16-byte random Initialization Vector (unique per value)
- `auth_tag` — 16-byte GCM authentication tag (detects tampering)
- `ciphertext` — encrypted content

---

## Key Management

### Encryption Key

- Algorithm: AES-256 requires a **32-byte (256-bit)** key
- Stored as: 64-character lowercase hexadecimal string
- Location: `.env.local` on the server (never committed to git)
- Variable name: `DATA_ENCRYPTION_KEY`

```
DATA_ENCRYPTION_KEY=<64-char hex string>
```

### Generating a New Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# or
python3 -c "import secrets; print(secrets.token_hex(32))"
# or
openssl rand -hex 32
```

### Key Rotation

If you need to rotate the key:
1. Generate a new key
2. Write a one-time migration script that reads all encrypted rows, decrypts with the old key, re-encrypts with the new key, and writes back
3. Update `DATA_ENCRYPTION_KEY` in all environments
4. **Never delete the old key** until all rows have been migrated

---

## Implementation

Encryption logic lives in [`lib/encryption.ts`](lib/encryption.ts):

```ts
encrypt(plaintext: string): string       // AES-256-GCM encrypt → iv:tag:ciphertext
decrypt(ciphertext: string): string      // Decrypt (throws if tampered)
safeDecrypt(value: string | null): string | null  // Backward-compatible (returns plaintext if not encrypted)
```

`safeDecrypt` is used in all read paths so that existing plaintext rows (created before encryption was introduced) continue to display correctly. New writes are always encrypted.

---

## Threat Model

### What this protects against

- **Database breach** — someone gains access to the Supabase database (via SQL injection, leaked credentials, or a vendor incident). Encrypted fields are unreadable without `DATA_ENCRYPTION_KEY`.
- **Backup exposure** — database backups contain only ciphertext.
- **Infrastructure access** — even Supabase employees cannot read encrypted field content.

### What this does NOT protect against

| Scenario | Status | Notes |
|---|---|---|
| Compromised application server | ❌ Not covered | The server holds the key and decrypts data in memory. A full server compromise exposes everything. |
| Anthropic API access | ❌ Not covered | Journal entries and check-in content are sent to Claude (Anthropic API) in plaintext to generate reflections. This is by design. |
| Authenticated user reading their own data | ❌ Not covered | By design — users can see their own decrypted data. |
| Therapist reading shared patient data | ❌ Not covered | By design — therapist data sharing is permission-controlled via `patient_therapist_links`. |
| `DATA_ENCRYPTION_KEY` exposure | ❌ Not covered | If the key leaks, all data can be decrypted. Protect this key as carefully as a database password. |

---

## Compliance Notes

### GDPR (EU)
- ✅ Data minimization: only necessary fields collected
- ✅ Right to erasure: deleting a user cascades to all their data
- ✅ Encryption at rest: both infrastructure and application layers
- ⚠️ Still needed: cookie consent banner, privacy policy, DPA with Supabase

### HIPAA (US)
- ✅ Encryption at rest: both layers implemented
- ✅ Access controls: Row Level Security (RLS) enforced on all tables
- ✅ Minimum necessary: therapist data sharing uses explicit permission flags
- ⚠️ Still needed: Business Associate Agreement (BAA) with Supabase (requires Pro plan), audit logging, incident response plan, written security policies

---

## Security Checklist

- [x] AES-256-GCM field encryption on sensitive text fields
- [x] Unique IV per encrypted value
- [x] GCM authentication tag (tamper detection)
- [x] `DATA_ENCRYPTION_KEY` in `.env.local`, never in git
- [x] Row Level Security on all tables
- [x] Service role key (`SUPABASE_SERVICE_ROLE_KEY`) server-only, never in client code
- [x] HTTPS enforced (Supabase + deployment)
- [ ] BAA with Supabase (required for HIPAA)
- [ ] Audit logging
- [ ] Cookie consent / Privacy policy
- [ ] Key rotation procedure documented and tested
