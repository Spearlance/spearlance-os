# Namecheap API — Complete Reference

> **Last Verified:** February 2026

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Base URLs](#2-base-urls)
3. [API Format](#3-api-format)
4. [DNS Commands — CRITICAL](#4-dns-commands--critical)
5. [Record Types](#5-record-types)
6. [Domain Management](#6-domain-management)
7. [Domain Transfers](#7-domain-transfers)
8. [SSL Certificates](#8-ssl-certificates)
9. [WhoisGuard / Domain Privacy](#9-whoisguard--domain-privacy)
10. [Pagination](#10-pagination)
11. [Error Handling](#11-error-handling)
12. [Rate Limits](#12-rate-limits)
13. [Common Mistakes](#13-common-mistakes)

---

## 1. Authentication

Every API request requires these 4 global query parameters. No exceptions.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `ApiUser` | Yes | Your Namecheap account username |
| `ApiKey` | Yes | API key — get from Profile → Tools → Namecheap API Access |
| `UserName` | Yes | Namecheap username performing the action (usually same as `ApiUser`) |
| `ClientIp` | Yes | IPv4 address of the machine making the request (must be whitelisted) |

### Enabling API Access

1. Log in to Namecheap account
2. Navigate to **Profile → Tools**
3. Find **Namecheap API Access** → click **Manage**
4. Toggle API access on and accept the terms
5. Copy your API Key — treat it like a password

### Account Requirements (Production)

The production API requires your account to meet **at least one** of these criteria:

| Requirement | Threshold |
|-------------|-----------|
| Account balance | Minimum $50 |
| Domains registered | 20 or more |
| Total purchases | $50+ within the last 2 years |

Sandbox has no restrictions.

### IP Whitelisting

- Only **IPv4 addresses** are supported — IPv6 will not work
- Find your IPv4 at https://whatismyipaddress.com
- Add IPs in Profile → Tools → API Access → Edit/Add IP
- You can whitelist up to a small number of IPs per account
- CI/CD environments: whitelist the static egress IP of your runner

---

## 2. Base URLs

| Environment | URL |
|-------------|-----|
| **Production** | `https://api.namecheap.com/xml.response` |
| **Sandbox** | `https://api.sandbox.namecheap.com/xml.response` |

### Sandbox Notes

- Sandbox requires a **separate account** created at https://www.sandbox.namecheap.com
- Production credentials do NOT work in sandbox
- Domain registrations in sandbox are free and simulated
- Always develop and test in sandbox before touching production

---

## 3. API Format

### Request Format

All requests are **HTTP GET** with parameters in the query string. The `Command` parameter specifies the operation.

```
GET https://api.namecheap.com/xml.response
  ?ApiUser=myuser
  &ApiKey=abc123
  &UserName=myuser
  &ClientIp=1.2.3.4
  &Command=namecheap.domains.getList
```

For operations with many parameters (e.g., `setHosts` with 20+ records), you can use **HTTP POST** with params in the request body instead of the query string to avoid URL length limits.

### Response Structure

All responses are XML with the `<ApiResponse>` root element.

**Successful response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ApiResponse xmlns="https://api.namecheap.com/xml.response" Status="OK">
  <Errors />
  <Warnings />
  <RequestedCommand>namecheap.domains.getList</RequestedCommand>
  <CommandResponse Type="namecheap.domains.getList">
    <!-- command-specific data here -->
  </CommandResponse>
  <Server>SERVER-NAME</Server>
  <GMTTimeDifference>+5</GMTTimeDifference>
  <ExecutionTime>0.123</ExecutionTime>
</ApiResponse>
```

**Error response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ApiResponse xmlns="https://api.namecheap.com/xml.response" Status="ERROR">
  <Errors>
    <Error Number="1011102">Parameter ApiKey is Missing</Error>
  </Errors>
  <RequestedCommand>namecheap.domains.getList</RequestedCommand>
  <Server>SERVER-NAME</Server>
  <GMTTimeDifference>+5</GMTTimeDifference>
  <ExecutionTime>0.005</ExecutionTime>
</ApiResponse>
```

Always check `Status` attribute on `<ApiResponse>` — `"OK"` or `"ERROR"`.

---

## 4. DNS Commands — CRITICAL

### ⚠ THE #1 RULE: setHosts Replaces Everything

**`namecheap.domains.dns.setHosts` overwrites the entire DNS record set for the domain.** There is no partial update. If you call `setHosts` with 2 records and the domain had 10, the other 8 are gone.

**The required workflow for any DNS change:**

```
1. Call getHosts → receive all current records
2. Parse the XML response into a list of records
3. Apply your changes (add new record / modify existing / remove one)
4. Call setHosts with the COMPLETE modified list
```

Skipping step 1–3 will silently delete records. There is no undo.

---

### 4.1 namecheap.domains.dns.getHosts

Retrieves all DNS host records for a domain using Namecheap's nameservers.

**Required Parameters:**

| Parameter | Description |
|-----------|-------------|
| `SLD` | Second-level domain (e.g., `example` from `example.com`) |
| `TLD` | Top-level domain (e.g., `com`) |

**Example Request:**

```
GET https://api.namecheap.com/xml.response
  ?ApiUser=myuser&ApiKey=abc123&UserName=myuser&ClientIp=1.2.3.4
  &Command=namecheap.domains.dns.getHosts
  &SLD=example&TLD=com
```

**Example Response:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ApiResponse xmlns="https://api.namecheap.com/xml.response" Status="OK">
  <Errors />
  <RequestedCommand>namecheap.domains.dns.getHosts</RequestedCommand>
  <CommandResponse Type="namecheap.domains.dns.getHosts">
    <DomainDNSGetHostsResult Domain="example.com" EmailType="MX" IsUsingOurDNS="true">
      <host HostId="12345" Name="@" Type="A" Address="1.2.3.4" MXPref="10" TTL="1800" IsActive="true" IsDDNSEnabled="false" />
      <host HostId="12346" Name="www" Type="CNAME" Address="example.com." MXPref="10" TTL="1800" IsActive="true" IsDDNSEnabled="false" />
      <host HostId="12347" Name="@" Type="MX" Address="mail.example.com." MXPref="10" TTL="1800" IsActive="true" IsDDNSEnabled="false" />
      <host HostId="12348" Name="@" Type="TXT" Address="v=spf1 include:_spf.google.com ~all" MXPref="10" TTL="1800" IsActive="true" IsDDNSEnabled="false" />
    </DomainDNSGetHostsResult>
  </CommandResponse>
  <Server>SERVER-NAME</Server>
  <GMTTimeDifference>+5</GMTTimeDifference>
  <ExecutionTime>0.456</ExecutionTime>
</ApiResponse>
```

**Response Fields per `<host>` element:**

| Field | Description |
|-------|-------------|
| `HostId` | Internal ID (not needed for setHosts) |
| `Name` | Subdomain/hostname (`@` = root, `www`, `mail`, `*`) |
| `Type` | Record type (A, AAAA, CNAME, MX, TXT, etc.) |
| `Address` | The record value (IP, hostname, text string) |
| `MXPref` | MX priority (only relevant for MX records) |
| `TTL` | Time to live in seconds |
| `IsActive` | Whether the record is active |
| `IsDDNSEnabled` | Whether dynamic DNS is enabled |

---

### 4.2 namecheap.domains.dns.setHosts

Sets ALL DNS host records for a domain. Replaces everything.

**Required Parameters:**

| Parameter | Description |
|-----------|-------------|
| `SLD` | Second-level domain |
| `TLD` | Top-level domain |
| `HostName[n]` | Hostname/subdomain for record n (`@`, `www`, `mail`, etc.) |
| `RecordType[n]` | Record type for record n |
| `Address[n]` | Value for record n (IP, hostname, text) |

**Optional Parameters per record:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `TTL[n]` | 1800 | Time to live in seconds (60–60000) |
| `MXPref[n]` | 10 | MX priority (MX records only; lower = higher priority) |

Records are numbered sequentially: `HostName1`, `HostName2`, ..., `HostName[n]`.

**Example Request (preserving existing + adding new TXT record):**

```
GET https://api.namecheap.com/xml.response
  ?ApiUser=myuser&ApiKey=abc123&UserName=myuser&ClientIp=1.2.3.4
  &Command=namecheap.domains.dns.setHosts
  &SLD=example&TLD=com
  &HostName1=@&RecordType1=A&Address1=1.2.3.4&TTL1=1800
  &HostName2=www&RecordType2=CNAME&Address2=example.com.&TTL2=1800
  &HostName3=@&RecordType3=MX&Address3=mail.example.com.&TTL3=1800&MXPref3=10
  &HostName4=@&RecordType4=TXT&Address4=v%3Dspf1+include%3A_spf.google.com+~all&TTL4=1800
  &HostName5=@&RecordType5=TXT&Address5=google-site-verification%3Dabc123&TTL5=1800
```

URL-encode special characters in TXT record values (spaces → `+` or `%20`, `=` → `%3D`).

**Example Success Response:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ApiResponse xmlns="https://api.namecheap.com/xml.response" Status="OK">
  <Errors />
  <RequestedCommand>namecheap.domains.dns.setHosts</RequestedCommand>
  <CommandResponse Type="namecheap.domains.dns.setHosts">
    <DomainDNSSetHostsResult Domain="example.com" IsSuccess="true" />
  </CommandResponse>
  <Server>SERVER-NAME</Server>
  <GMTTimeDifference>+5</GMTTimeDifference>
  <ExecutionTime>32.76</ExecutionTime>
</ApiResponse>
```

Check `IsSuccess="true"` in `<DomainDNSSetHostsResult>`.

---

### 4.3 Other DNS Commands

| Command | Description |
|---------|-------------|
| `namecheap.domains.dns.setDefault` | Switch domain to Namecheap's default nameservers |
| `namecheap.domains.dns.setCustom` | Set custom nameservers for the domain |
| `namecheap.domains.dns.getList` | Get list of DNS servers for a domain |
| `namecheap.domains.dns.getEmailForwarding` | Get email forwarding settings |
| `namecheap.domains.dns.setEmailForwarding` | Set email forwarding rules |

---

### 4.4 Complete setHosts Workflow (Code Pattern)

```javascript
// Node.js example using axios + xml2js
const axios = require('axios');
const xml2js = require('xml2js');

const BASE = 'https://api.namecheap.com/xml.response';
const AUTH = `ApiUser=${process.env.NC_USER}&ApiKey=${process.env.NC_API_KEY}&UserName=${process.env.NC_USER}&ClientIp=${process.env.NC_CLIENT_IP}`;

async function getHosts(sld, tld) {
  const res = await axios.get(`${BASE}?${AUTH}&Command=namecheap.domains.dns.getHosts&SLD=${sld}&TLD=${tld}`);
  const parsed = await xml2js.parseStringPromise(res.data);
  const apiResponse = parsed.ApiResponse;
  if (apiResponse.$.Status === 'ERROR') {
    throw new Error(apiResponse.Errors[0].Error[0]._);
  }
  const hosts = apiResponse.CommandResponse[0].DomainDNSGetHostsResult[0].host || [];
  return hosts.map(h => h.$); // return attribute objects
}

async function setHosts(sld, tld, records) {
  const params = new URLSearchParams({ Command: 'namecheap.domains.dns.setHosts', SLD: sld, TLD: tld });
  records.forEach((r, i) => {
    const n = i + 1;
    params.set(`HostName${n}`, r.Name);
    params.set(`RecordType${n}`, r.Type);
    params.set(`Address${n}`, r.Address);
    params.set(`TTL${n}`, r.TTL || '1800');
    if (r.Type === 'MX') params.set(`MXPref${n}`, r.MXPref || '10');
  });
  const res = await axios.post(BASE, `${AUTH}&${params.toString()}`);
  const parsed = await xml2js.parseStringPromise(res.data);
  const result = parsed.ApiResponse.CommandResponse[0].DomainDNSSetHostsResult[0].$;
  if (result.IsSuccess !== 'true') throw new Error('setHosts failed');
}

// Usage: add a new TXT record safely
async function addTxtRecord(sld, tld, name, value) {
  const existing = await getHosts(sld, tld); // 1. GET all
  const newRecord = { Name: name, Type: 'TXT', Address: value, TTL: '1800' };
  await setHosts(sld, tld, [...existing, newRecord]); // 2. SET complete list
}
```

---

## 5. Record Types

| Type | Use Case | Address Format |
|------|----------|---------------|
| `A` | IPv4 address | `1.2.3.4` |
| `AAAA` | IPv6 address | `2001:db8::1` |
| `CNAME` | Alias to hostname | `target.example.com.` (trailing dot optional) |
| `MX` | Mail server | `mail.example.com.` (use `MXPref` for priority) |
| `MXE` | Mail exchange extended | Email address (Namecheap-specific redirect) |
| `TXT` | Text record (SPF, DKIM, verification) | Any text string |
| `NS` | Nameserver delegation | `ns1.example.com.` |
| `CAA` | CA Authorization | `0 issue "letsencrypt.org"` |
| `URL` | HTTP redirect (301 or 302) | Full URL |
| `URL301` | Permanent redirect | Full URL |
| `URL302` | Temporary redirect | Full URL |
| `FRAME` | URL frame (masked redirect) | Full URL |

**Notes:**
- `@` in `Name` field = root domain
- `*` in `Name` field = wildcard
- `www` in `Name` field = `www.example.com`
- TTL range: 60–60000 seconds; default 1800

---

## 6. Domain Management

Base command structure: `&Command=namecheap.domains.<method>`

### 6.1 getList — List Domains

```
Command=namecheap.domains.getList
  &ListType=ALL         (ALL | EXPIRING | EXPIRED)
  &SearchTerm=          (optional filter)
  &Page=1
  &PageSize=20          (max 100)
  &SortBy=NAME          (NAME | NAME_DESC | EXPIREDATE | EXPIREDATE_DESC | CREATEDATE | CREATEDATE_DESC)
```

Response includes per domain: `ID`, `Name`, `User`, `Created`, `Expires`, `IsExpired`, `IsLocked`, `AutoRenew`, `WhoisGuard`, `IsPremium`, `IsOurDNS`.

### 6.2 getInfo — Domain Details

```
Command=namecheap.domains.getInfo
  &DomainName=example.com
  &HostName=            (optional — subdomain to get info for)
```

Returns full domain details: registrar lock, nameservers, contact IDs, creation/expiry dates, transfer eligibility.

### 6.3 check — Domain Availability

```
Command=namecheap.domains.check
  &DomainList=example.com,example.net,example.org
```

Batch check up to 50 domains. Response includes `Available` boolean per domain.

### 6.4 create — Register a Domain

```
Command=namecheap.domains.create
  &DomainName=example.com
  &Years=1
  &WhoisguardEnable=YES
  &RegistrantFirstName=John
  &RegistrantLastName=Doe
  &RegistrantAddress1=123 Main St
  &RegistrantCity=New York
  &RegistrantStateProvince=NY
  &RegistrantPostalCode=10001
  &RegistrantCountry=US
  &RegistrantPhone=+1.2125551234
  &RegistrantEmailAddress=john@example.com
  (TechFirstName, TechLastName, etc. — same fields for Tech/Admin/AuxBilling contacts)
```

All 4 contact types (Registrant, Tech, Admin, AuxBilling) require the same set of fields. You can duplicate the same data for each.

### 6.5 renew — Renew a Domain

```
Command=namecheap.domains.renew
  &DomainName=example.com
  &Years=1
```

### 6.6 reactivate — Reactivate Expired Domain

```
Command=namecheap.domains.reactivate
  &DomainName=example.com
```

### 6.7 getRegistrarLock — Check Lock Status

```
Command=namecheap.domains.getRegistrarLock
  &DomainName=example.com
```

Returns `RegistrarLockStatus` — `true` (locked) or `false` (unlocked).

### 6.8 setRegistrarLock — Set Lock Status

```
Command=namecheap.domains.setRegistrarLock
  &DomainName=example.com
  &LockAction=LOCK       (LOCK | UNLOCK)
```

### 6.9 getContacts — Get Domain Contacts

```
Command=namecheap.domains.getContacts
  &DomainName=example.com
```

Returns registrant, tech, admin, and AuxBilling contact details.

### 6.10 setContacts — Update Domain Contacts

Same parameters as `create` for each contact type. Updates all 4 contact types at once.

---

## 7. Domain Transfers

### 7.1 create — Initiate Transfer

```
Command=namecheap.domains.transfer.create
  &DomainName=example.com
  &Years=1
  &EPPCode=transferauthcode
```

If EPPCode contains special characters, encode as base64 and prefix with `base64:` — e.g., `EPPCode=base64:dHJhbnNmZXJjb2Rl`.

Supported TLDs for API transfer: `.biz`, `.ca`, `.cc`, `.co`, `.com`, `.info`, `.me`, `.mobi`, `.net`, `.org`, `.tv`, `.us`, and various ccTLDs.

### 7.2 getStatus — Check Transfer Status

```
Command=namecheap.domains.transfer.getStatus
  &TransferID=12345
```

Returns status: `Pending`, `Active`, `Cancelled`, `Completed`.

### 7.3 updateStatus — Update Transfer

```
Command=namecheap.domains.transfer.updateStatus
  &TransferID=12345
  &Resubmit=true
```

Use to resubmit a transfer after releasing the registry lock.

### 7.4 getList — List All Transfers

```
Command=namecheap.domains.transfer.getList
  &ListType=ALL          (ALL | INPROGRESS | CANCELLED | COMPLETED)
  &Page=1
  &PageSize=10
```

---

## 8. SSL Certificates

### 8.1 create — Purchase SSL Certificate

```
Command=namecheap.ssl.create
  &Type=PositiveSSL       (certificate product type)
  &Years=1
```

Returns `SSLCertificateID` needed for subsequent operations.

### 8.2 activate — Activate SSL Certificate

```
Command=namecheap.ssl.activate
  &CertificateID=12345
  &CSR=-----BEGIN+CERTIFICATE+REQUEST-----...
  &AdminEmailAddress=admin@example.com
  &WebServerType=apacheopenssl
  &ApproverEmail=admin@example.com
  &DNSDCValidation=false
```

Submits CSR to CA (Sectigo/Comodo). Returns validation options.

### 8.3 getInfo — Get Certificate Details

```
Command=namecheap.ssl.getInfo
  &CertificateID=12345
```

Returns status, expiry, domain, certificate body, CA bundle.

### 8.4 getList — List All SSL Certificates

```
Command=namecheap.ssl.getList
  &ListType=ALL           (ALL | PROCESSING | EMAILSENT | TECHPROBLEM | INPROGRESS | COMPLETED | DEACTIVATED | ACTIVE | CANCELLED | NEWPURCHASE | NEWRENEWAL)
  &Page=1
  &PageSize=20
```

### 8.5 parseCSR — Parse a CSR

**HTTP POST only** (CSR is too long for query string).

```
POST https://api.namecheap.com/xml.response
Body: ApiUser=...&ApiKey=...&Command=namecheap.ssl.parseCSR&CSR=-----BEGIN+CERTIFICATE+REQUEST-----...
```

Returns: `CommonName`, `Organization`, `OrganizationUnit`, `Country`, `State`, `Locality`, key type and size.

### 8.6 reissue — Reissue Certificate

```
Command=namecheap.ssl.reissue
  &CertificateID=12345
  &CSR=-----BEGIN+CERTIFICATE+REQUEST-----...
  &WebServerType=apacheopenssl
  &ApproverEmail=admin@example.com
```

---

## 9. WhoisGuard / Domain Privacy

Namecheap's domain privacy service. API uses `whoisguard` namespace (provider may show as WithheldforPrivacy in WHOIS but API params remain `whoisguard`).

### 9.1 getWhoisGuardList — List Privacy Services

```
Command=namecheap.whoisguard.getList
  &ListType=ALL          (ALL | ALLOTTED | FREE | DISCARD)
  &Page=1
  &PageSize=20
```

### 9.2 enable — Enable Privacy Protection

```
Command=namecheap.whoisguard.enable
  &WhoisguardID=12345
  &ForwardedToEmail=forwarding@example.com
```

### 9.3 disable — Disable Privacy Protection

```
Command=namecheap.whoisguard.disable
  &WhoisguardID=12345
```

### 9.4 getContacts — Get WHOIS Contact Info

```
Command=namecheap.domains.getContacts
  &DomainName=example.com
```

Returns the actual registrant contacts (visible when privacy is off).

### 9.5 setContacts — Update WHOIS Contacts

Same contact parameters as `domains.create`. Updates the underlying contacts even when privacy is enabled.

---

## 10. Pagination

Several list commands support pagination:

| Parameter | Description | Default | Max |
|-----------|-------------|---------|-----|
| `Page` | Page number (1-indexed) | 1 | — |
| `PageSize` | Results per page | 20 | 100 (domains), 50 (most others) |

**Paged response example:**

```xml
<CommandResponse Type="namecheap.domains.getList">
  <DomainGetListResult>
    <Domain Name="example.com" ... />
    <Domain Name="example.net" ... />
  </DomainGetListResult>
  <Paging>
    <TotalItems>150</TotalItems>
    <CurrentPage>1</CurrentPage>
    <PageSize>20</PageSize>
  </Paging>
</CommandResponse>
```

Use `TotalItems / PageSize` (rounded up) to determine total pages. Iterate until all pages fetched.

---

## 11. Error Handling

### Response Structure

Errors are in the `<Errors>` element. `Status="ERROR"` on `<ApiResponse>`.

```xml
<ApiResponse Status="ERROR">
  <Errors>
    <Error Number="1011102">Parameter ApiKey is Missing</Error>
    <Error Number="1010900">Unknown Error</Error>
  </Errors>
</ApiResponse>
```

Multiple errors can appear in a single response.

### Common Error Codes

| Code | Description | Fix |
|------|-------------|-----|
| `1011102` | Parameter missing | Check all 4 auth params are present |
| `1011150` | Invalid IP | Whitelist the ClientIp in API settings |
| `2030280` | Domain not found | Verify domain is in your account |
| `2019166` | Domain uses custom DNS | Can't use setHosts when not on Namecheap nameservers |
| `500000` | Too many requests | Slow down — hit rate limit |
| `1010900` | Unknown error | Retry; if persistent, check Namecheap status page |

### Parsing Errors (Node.js)

```javascript
const parsed = await xml2js.parseStringPromise(xmlString);
const status = parsed.ApiResponse.$.Status;
if (status === 'ERROR') {
  const errors = parsed.ApiResponse.Errors[0].Error || [];
  const messages = errors.map(e => `[${e.$.Number}] ${e._}`);
  throw new Error(messages.join('; '));
}
```

---

## 12. Rate Limits

| Limit | Value |
|-------|-------|
| Soft rate limit | ~20 requests/minute |
| Error code when exceeded | `500000` — "Too many requests" |
| Strategy | Exponential backoff starting at 1s delay |

Namecheap does not publish hard rate limit numbers. In practice, ~20 req/min is safe. Batch operations (e.g., domain checks support up to 50 names per call) to reduce request volume.

```javascript
// Simple retry with backoff
async function withRetry(fn, maxAttempts = 3, delayMs = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxAttempts - 1 || !err.message.includes('500000')) throw err;
      await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i)));
    }
  }
}
```

---

## 13. Common Mistakes

| Mistake | What Happens | Fix |
|---------|-------------|-----|
| **Calling setHosts without getHosts first** | All existing DNS records deleted silently | Always GET → modify list → SET complete list |
| **Using IPv6 in ClientIp** | `1011150` Invalid IP error | Use IPv4 only — find at whatismyipaddress.com |
| **Production creds in sandbox** | Authentication failure | Create separate account at sandbox.namecheap.com |
| **Expecting JSON** | XML parse errors in code | Use an XML parser (xml2js, lxml, ElementTree) |
| **Omitting ClientIp on any request** | Auth failure | ClientIp is required on every single request |
| **Special chars in TXT records not URL-encoded** | Malformed records or API error | URL-encode TXT values, especially `=`, `;`, spaces |
| **Not checking IsSuccess on setHosts** | Silent failure — assuming success when it failed | Check `DomainDNSSetHostsResult.IsSuccess="true"` |
| **Custom nameservers + setHosts** | Error 2019166 | Switch to Namecheap DNS first with `dns.setDefault` |
| **Requesting PageSize > 100** | Error or truncated results | Stay at or below 100 for domain lists, 50 for others |
| **Large setHosts via GET** | URL too long (>8KB) | Switch to HTTP POST with params in body |
| **TTL below 60** | Rejected | Minimum TTL is 60 seconds |
| **Not handling multiple TXT records** | Overwrites all TXT records including SPF/DKIM | Parse ALL existing records before setHosts — TXT records are not unique by name |
