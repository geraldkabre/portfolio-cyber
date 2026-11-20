# Root-Me – HTTP: Weak Password
| Platform | Category | Difficulty | Points |
|---|---|---|---|
| Root-Me | Web-Server | Easy | 5 |

## Objective
Access a protected page by bypassing authentication with default credentials.

## Recon
- The resource is protected by **HTTP Basic Auth** (`Authorization` header).
- The header value is only **Base64**, so it can be read and rewritten.

## Steps
1. Open the challenge page in the browser.
2. In **Burp Suite**, capture the request (Proxy → HTTP history) and send it to **Repeater**.
3. Note the header: `Authorization: Basic <base64(user:password)>`.
4. Replace the credentials with common default ones: `admin:admin` becomes `YWRtaW46YWRtaW4=`.
5. Send the request → access granted and the challenge password is displayed.

## Tools
Burp Suite (Proxy, Repeater, Decoder).

## Root Cause
Unchanged default credentials. **CWE-1392: Use of Default Credentials** / **CWE-521: Weak Password Requirements.**

## Mitigations
- Remove default accounts, enforce strong passwords and rate-limit login attempts.
- Always use **HTTPS**: Basic Auth without TLS exposes the credentials.
- Prefer a stronger mechanism (sessions, tokens, MFA).

## Lessons Learned
- **Basic Auth is not encryption**: without TLS, the Base64 value is trivial to read.
- Default passwords are still one of the most common ways in.
