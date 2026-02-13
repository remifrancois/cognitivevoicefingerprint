# Security Implementation — HIPAA-Aligned Architecture

**MemoVoice CVF Engine V2**
Last updated: 2026-02-11

---

## Overview

MemoVoice processes cognitive health data derived from voice conversations — potential Protected Health Information (PHI) under HIPAA. This document describes the end-to-end security architecture implemented across the platform.

```
Browser → [JWT Bearer token] → Fastify
  → Helmet (security headers)
  → Rate Limiter (100 req/min)
  → CORS (locked to specific origins)
  → Auth Plugin (verify JWT signature + expiry)
  → RBAC Middleware (role check + patient ownership)
  → Audit Logger (append-only JSONL)
  → Route Handler
  → Encrypted File I/O (AES-256-GCM)
```

---

## 1. Authentication — JWT (HS256)

**HIPAA Reference:** §164.312(a) Access Controls, §164.312(d) Person Authentication

### Token Lifecycle

| Stage | Detail |
|---|---|
| Login | `POST /api/auth/login` with `{ userId }` or `{ email, password }` |
| Signing | HS256 with `JWT_SECRET` env variable |
| Payload | `{ sub, role, email, name, patientIds, iat, exp }` |
| TTL | 8 hours (`exp` claim enforced server-side) |
| Transport | `Authorization: Bearer <token>` header on every request |
| Verification | Timing-safe HMAC comparison via `crypto.timingSafeEqual` |

### Implementation

- **Server:** `server/src/plugins/auth.js`
  - Hand-rolled JWT (no external dependency) using Node.js `crypto`
  - `base64url` encoding for header, payload, and signature
  - Global `onRequest` hook validates every non-public request
  - Public routes exempted: `/api/auth/login`, `/health`, `/healthz`
  - Invalid/expired tokens return `401 Unauthorized`

- **Dashboard:** `dashboard/src/lib/auth.jsx` + `dashboard/src/lib/api.js`
  - `setTokenGetter(fn)` wires token injection into every `fetch` call
  - Auto-login on mount (default: superadmin for demo)
  - Graceful fallback to local-only mode if server is unreachable
  - `AuthLoadingGuard` blocks UI rendering until first authentication completes

### Security Properties

- No tokens stored in `localStorage` or cookies (memory-only)
- No refresh token mechanism — re-login required after 8h
- JWT secret configurable via `JWT_SECRET` environment variable
- Default dev secret logged as warning at startup

---

## 2. Role-Based Access Control (RBAC)

**HIPAA Reference:** §164.312(a) Access Controls, §164.502(b) Minimum Necessary

### Role Definitions

| Role | Access Scope | Patient Data | Admin Functions |
|---|---|---|---|
| `superadmin` | Full platform management | **NEVER** | All |
| `admin` | Organization management | **NEVER** | Limited |
| `clinician` | Assigned patients only | Yes (scoped) | None |
| `family` | Own family member only | Yes (1 patient) | None |

### Enforcement Points

**Server-side** (`server/src/plugins/rbac.js`):

```
preHandler: [requireRole('clinician', 'family'), requirePatientAccess()]
```

- `requireRole(...roles)` — Rejects with `403` if user's role not in allowed list
- `requirePatientAccess(paramName)` — Rejects if:
  - User is `superadmin` or `admin` (admin roles **cannot** access patient data)
  - Patient ID not in user's `patientIds` array from JWT
- `filterPatientsForUser(request, patients)` — Filters patient list to only those in the user's scope

**Client-side** (`dashboard/src/lib/auth.jsx`):

- `hasRole(...roles)` — Boolean role check
- `hasPermission(permission)` — Granular permission check against role's permission array
- `canAccessPatientData()` — Only `clinician` and `family`
- `canAccessAdmin()` — Only `superadmin` and `admin`
- Route guards: `PatientDataGuard`, `AdminGuard`, `SuperAdminGuard`

### Route-to-Role Matrix

| Endpoint | Roles | Patient Scoped |
|---|---|---|
| `POST /api/auth/login` | Public | No |
| `GET /health` | Public | No |
| `GET /api/patients` | clinician, family | Filtered |
| `POST /api/patients` | clinician | No |
| `GET /api/patients/:id` | clinician, family | Yes |
| `POST /api/cvf/process` | clinician | Yes |
| `GET /api/cvf/timeline/:patientId` | clinician, family | Yes |
| `POST /api/cvf/weekly-analysis` | clinician | Yes |
| `GET /api/cvf/weekly-report/:patientId/:week` | clinician, family | Yes |
| `GET /api/memories/:patientId` | clinician, family | Yes |
| `POST /api/memories/:patientId` | clinician, family | Yes |
| `GET /api/gdpr/export/:patientId` | clinician, family | Yes |
| `DELETE /api/gdpr/erase/:patientId` | clinician | Yes |
| `DELETE /api/gdpr/erase-all` | superadmin | No |
| `POST /api/v2/deep-analysis/:patientId` | clinician | Yes |
| `GET /api/v2/deep-analysis/:patientId(/:week)` | clinician, family | Yes |
| `GET /api/v2/differential/:patientId` | clinician, family | Yes |
| `GET /api/v2/semantic-map/:patientId` | clinician, family | Yes |
| `GET /api/v2/twin/:patientId` | clinician, family | Yes |
| `GET /api/v2/cohort-match/:patientId` | clinician, family | Yes |
| `POST /api/v2/cohort/generate` | clinician, superadmin | No |
| `GET /api/v2/library/status` | Any authenticated | No |
| `GET /api/v2/cost-estimate/:patientId` | clinician, family | Yes |
| `GET /api/admin/audit` | superadmin, admin | No |
| `GET /api/admin/audit-logs` | superadmin | No |
| `GET /api/admin/organizations` | superadmin | No |
| `GET /api/admin/security/sessions` | superadmin | No |
| `GET /api/admin/clinical/assignments` | superadmin | No |
| `GET /api/admin/billing/revenue` | superadmin | No |
| `GET /api/admin/incidents` | superadmin, admin | No |
| `GET /api/admin/compliance` | superadmin, admin | No |

### Patient Assignment Model

```
User Store (data/users.json):
  clinician.assignedPatients = [patientId, patientId, ...]
  family.patientId = patientId

JWT Payload:
  patientIds = getUserPatientIds(user)
    → clinician: assignedPatients array
    → family: [patientId] (single-element array)
    → admin/superadmin: [] (empty — no patient access)
```

---

## 3. Encryption at Rest — AES-256-GCM

**HIPAA Reference:** §164.312(a)(2)(iv) Encryption and Decryption, §164.312(c) Integrity

### Algorithm

| Parameter | Value |
|---|---|
| Cipher | AES-256-GCM |
| Key Derivation | PBKDF2 (SHA-512, 100,000 iterations) |
| Salt | Static application salt (`memovoice-cvf-v2`) |
| IV Length | 12 bytes (random per encryption) |
| Auth Tag | 16 bytes |
| Output Format | Base64 string: `IV (12B) + AuthTag (16B) + Ciphertext` |

### Implementation

**Files:** `server/src/lib/crypto.js`, `server/src/lib/secure-fs.js`

- `encrypt(plaintext)` — returns base64-encoded blob (IV + auth tag + ciphertext)
- `decrypt(base64Blob)` — returns original plaintext
- `isEncryptionEnabled()` — returns `true` if `ENCRYPTION_KEY` env var is set
- `writeSecureJSON(filePath, obj)` — stringify + encrypt + write
- `readSecureJSON(filePath)` — read + decrypt + parse
- `readSecureJSONSafe(filePath, fallback)` — safe variant that returns fallback on error

### Coverage

All patient data files are encrypted when `ENCRYPTION_KEY` is configured:

| Data Layer | Files | Location |
|---|---|---|
| Patient records | `patient_*.json` | `data/patients/` |
| Session data | `session_*.json` | `data/sessions/` |
| Memory profiles | `memory_*.json` | `data/patients/` |
| CVF baselines | `baseline_*.json` | `data/cvf/` |
| Weekly reports | `weekly_*_*.json` | `data/reports/` |
| Temporal holograms | `hologram_*_*.json` | `data/hologram/` |
| Cognitive twin | `twin_*.json` | `data/twins/` |
| Semantic maps | `semantic_map_*.json` | `data/archaeology/` |
| Synthetic cohort | `cohort.json` | `data/cohort/` |
| Differential | `differential_*.json` | `data/hologram/` |

### Graceful Degradation

- **No `ENCRYPTION_KEY`:** Files stored as plaintext JSON (development mode)
- **With `ENCRYPTION_KEY`:** All file I/O passes through encrypt/decrypt
- **Migration support:** `decrypt()` auto-detects unencrypted JSON (content starting with `{`) for seamless migration from plaintext to encrypted storage

### Key Generation

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Audit Logging

**HIPAA Reference:** §164.312(b) Audit Controls

### Implementation

**File:** `server/src/plugins/audit.js`

- Fastify `onResponse` hook captures every API request
- Append-only newline-delimited JSON (JSONL) at `data/audit/audit.log`
- Non-blocking, best-effort writes (does not slow down responses)

### Log Entry Schema

```json
{
  "timestamp": "2026-02-11T14:30:00.000Z",
  "method": "GET",
  "url": "/api/patients/abc-123",
  "status": 200,
  "user": "u2",
  "role": "clinician",
  "ip": "127.0.0.1",
  "duration_ms": 12,
  "patientId": "abc-123",
  "phiAccess": true
}
```

### Fields

| Field | Description |
|---|---|
| `timestamp` | ISO 8601 timestamp |
| `method` | HTTP method (GET, POST, DELETE) |
| `url` | Request URL path |
| `status` | HTTP response status code |
| `user` | JWT `sub` claim (user ID) or `"anonymous"` |
| `role` | User role from JWT or `"none"` |
| `ip` | Client IP address |
| `duration_ms` | Request processing time |
| `patientId` | Extracted patient ID from URL (when applicable) |
| `phiAccess` | `true` when request accessed patient-specific data |

### PHI Access Tracking

Patient IDs are extracted from URL patterns matching:
```
/patients/:id
/memories/:id
/cvf/timeline/:id
/cvf/weekly-report/:id/...
/gdpr/export/:id
/gdpr/erase/:id
/v2/<any-layer>/:id
```

Every request touching patient data is flagged with `phiAccess: true` for compliance reporting.

### Admin Access

`GET /api/admin/audit-logs` — Superadmin-only paginated log reader:
- `?limit=100` — Max entries per page (capped at 1000)
- `?offset=0` — Pagination offset
- Returns most recent entries first (reverse chronological)

---

## 5. Transport Security

**HIPAA Reference:** §164.312(e) Transmission Security

### Security Headers — Helmet

**File:** `server/src/index.js` (line 28)

```js
await app.register(helmet, { contentSecurityPolicy: false })
```

Helmet sets security headers including:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (when behind HTTPS proxy)
- `X-Download-Options: noopen`
- `X-Permitted-Cross-Domain-Policies: none`

CSP disabled for dashboard SPA compatibility.

### CORS Lockdown

```js
await app.register(cors, {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ],
  credentials: true,
})
```

Only explicitly listed development origins are allowed. Production deployment must update this list to the actual domain.

### Rate Limiting

```js
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
```

100 requests per minute per IP address. Prevents brute-force attacks on the login endpoint and DoS against analysis endpoints.

---

## 6. Data Privacy — GDPR Compliance

### Right to Data Portability (Art. 20)

`GET /api/gdpr/export/:patientId`

Returns a complete export of all patient data:
- Patient record
- All session transcripts and feature vectors
- Memory profile
- CVF baseline and weekly reports

Access: clinician (assigned) or family (own member).

### Right to Erasure (Art. 17)

`DELETE /api/gdpr/erase/:patientId`

Requires confirmation body: `{ "confirmPatientId": "<matching-id>" }`

Deletes:
- Patient record
- All sessions
- All CVF data (baseline, weekly reports)
- Memory profile

Access: clinician only.

### Full Platform Erasure

`DELETE /api/gdpr/erase-all`

Requires confirmation body: `{ "confirm": "DELETE_ALL_DATA" }`

Deletes all `.json` files across all data directories.

Access: superadmin only.

---

## 7. User Store

**File:** `server/src/lib/users.js`

### Demo Users

| ID | Name | Role | Patient Access |
|---|---|---|---|
| u1 | Super Admin | superadmin | None (admin) |
| u2 | Dr. Remi Francois | clinician | Marie, Thomas |
| u3 | Dr. Sophie Martin | clinician | Mike, Jenny |
| u4 | Pierre Dupont | family | Marie |
| u5 | Marie-Claire Petit | family | Jenny |
| u6 | Jean Administrateur | admin | None (admin) |

### Storage

- Persisted at `data/users.json` (generated by demo data script)
- Falls back to hardcoded defaults if file is missing
- In-memory cache with `clearUserCache()` for reloading after data regeneration

---

## 8. Environment Configuration

### Required Variables

| Variable | Purpose | Example |
|---|---|---|
| `JWT_SECRET` | HMAC key for JWT signing | `memovoice-hackathon-jwt-secret-2026` |
| `PORT` | Server listen port | `3001` |

### Optional Variables

| Variable | Purpose | Example |
|---|---|---|
| `ENCRYPTION_KEY` | AES-256-GCM passphrase (enables encryption at rest) | 64-char hex string |
| `ANTHROPIC_API_KEY` | Claude API key for live analysis | `sk-ant-...` |
| `DATA_DIR` | Data storage directory | `./data` |

### Key Generation

```bash
# Generate ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## 9. HIPAA Alignment Matrix

| HIPAA Requirement | Section | Implementation |
|---|---|---|
| Access Controls §164.312(a) | 2 | JWT authentication + 4-role RBAC on every route |
| Unique User Identification §164.312(a)(2)(i) | 1 | JWT `sub` claim with unique user ID |
| Emergency Access §164.312(a)(2)(ii) | — | Superadmin can manage platform but cannot access PHI |
| Automatic Logoff §164.312(a)(2)(iii) | 1 | 8-hour JWT expiry, memory-only token storage |
| Encryption/Decryption §164.312(a)(2)(iv) | 3 | AES-256-GCM on all patient JSON files |
| Audit Controls §164.312(b) | 4 | Append-only JSONL log of all API access with PHI tracking |
| Integrity Controls §164.312(c)(1) | 3 | GCM authentication tag prevents file tampering |
| Person Authentication §164.312(d) | 1 | JWT signature verification on every request |
| Transmission Security §164.312(e)(1) | 5 | Helmet security headers + CORS lockdown + rate limiting |
| Minimum Necessary §164.502(b) | 2 | Patient list filtered by user assignment; admin roles blocked from PHI |

---

## 10. File Architecture

```
server/
├── src/
│   ├── lib/
│   │   ├── crypto.js            ← AES-256-GCM encrypt/decrypt
│   │   ├── secure-fs.js         ← Encrypted JSON file I/O
│   │   └── users.js             ← User store + patient access checks
│   ├── plugins/
│   │   ├── auth.js              ← JWT login + onRequest verification
│   │   ├── rbac.js              ← Role + patient access middleware
│   │   └── audit.js             ← Append-only audit logging
│   ├── models/
│   │   ├── patient.js           ← Uses secure-fs
│   │   ├── session.js           ← Uses secure-fs
│   │   ├── memory.js            ← Uses secure-fs
│   │   └── cvf.js               ← Uses secure-fs
│   ├── services/
│   │   ├── temporal-hologram.js ← Uses secure-fs
│   │   ├── cognitive-twin.js    ← Uses secure-fs
│   │   ├── cognitive-archaeology.js ← Uses secure-fs
│   │   └── synthetic-cohort.js  ← Uses secure-fs
│   ├── scripts/
│   │   └── generate-demo-data.js ← Generates users.json + encrypted data
│   └── index.js                 ← Security plugins + RBAC on all routes
├── .env                         ← JWT_SECRET, ENCRYPTION_KEY
└── .env.example                 ← Configuration template

dashboard/
├── src/
│   ├── lib/
│   │   ├── api.js               ← Token injection via setTokenGetter
│   │   └── auth.jsx             ← JWT login flow + loading state
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.jsx      ← Role switcher with auth loading
│   │   └── guards/
│   │       └── RoleGuard.jsx    ← Client-side route protection
│   └── App.jsx                  ← AuthLoadingGuard wrapper

data/
├── audit/
│   └── audit.log                ← Append-only JSONL audit trail
├── users.json                   ← User store with patient assignments
├── patients/                    ← Encrypted patient records
├── sessions/                    ← Encrypted session data
├── cvf/                         ← Encrypted CVF baselines
├── reports/                     ← Encrypted weekly reports
├── hologram/                    ← Encrypted deep analysis
├── twins/                       ← Encrypted cognitive twin data
├── archaeology/                 ← Encrypted semantic maps
└── cohort/                      ← Encrypted synthetic cohort
```

---

## 11. Verification

```bash
# 1. Generate demo data with user assignments
cd server && npm run demo:data

# 2. Start server
npm run dev

# 3. Unauthenticated request → 401
curl http://localhost:3001/api/patients
# {"error":"Authentication required"}

# 4. Login as Dr. Remi → JWT
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"userId":"u2"}' | jq .token

# 5. Authenticated request → filtered patient list (Marie + Thomas only)
curl http://localhost:3001/api/patients \
  -H "Authorization: Bearer <remi-token>"

# 6. Cross-patient access → 403
curl http://localhost:3001/api/patients/<jenny-id> \
  -H "Authorization: Bearer <remi-token>"
# {"error":"Access denied for this patient"}

# 7. Admin accessing patient data → 403
curl http://localhost:3001/api/patients/<any-id> \
  -H "Authorization: Bearer <admin-token>"
# {"error":"Admin roles cannot access patient data"}

# 8. Audit log populated
cat data/audit/audit.log | jq .

# 9. Public health check (no auth required)
curl http://localhost:3001/health
```

---

## 12. Production Considerations

The following items are implemented for the demo/hackathon context but would need hardening for production:

| Item | Current State | Production Recommendation |
|---|---|---|
| JWT Secret | Env variable with dev fallback | Hardware security module (HSM) or secrets manager |
| Password Storage | Plaintext in users.json | bcrypt/argon2 hashed passwords |
| Token Storage | Memory-only (React state) | HttpOnly secure cookie with CSRF protection |
| Audit Storage | Local JSONL file | Immutable log service (CloudWatch, Splunk, etc.) |
| Encryption Key | Env variable | AWS KMS / Azure Key Vault / HashiCorp Vault |
| CORS Origins | Localhost only | Production domain allowlist |
| Rate Limiting | In-memory (single process) | Redis-backed distributed rate limiter |
| User Management | Static JSON file | Database with proper user lifecycle |
| Session Revocation | None (JWT stateless) | Token blocklist / short TTL + refresh tokens |
| TLS | Not configured (dev) | TLS 1.2+ termination at load balancer |
| MFA | Not implemented | TOTP or WebAuthn for clinician accounts |
| Data Backup | None | Encrypted backups with tested restore procedures |

---

## Security Contacts

If you find a security vulnerability, do NOT open a public issue.

Contact: remifrancois [at] github

---

**Status:** Development (Private)
