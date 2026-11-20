# Root-Me – HTTP: Open Redirect
| Platform | Category | Difficulty | Points |
|---|---|---|---|
| Root-Me | Web-Server | Medium | 10 |

## Objective
Get the flag by redirecting to a domain other than the ones offered, while passing the hash check on the redirect URL.

## Recon
- Target: Root-Me challenge `web-serveur/ch52`.
- Observation: redirect links have the form `url=<URL>&h=<HASH>`, where the hash is the **MD5 of the URL**, computed on the client side.

## Steps
1. Open Burp Suite and turn on **Proxy → Intercept**.
2. Click one of the proposed redirect links (for example facebook.com).
3. Intercept the request.
4. Replace the URL with another domain (for example google.fr).
5. Compute the MD5 hash of the new URL and put it in the `h` parameter.
6. Send the modified request from **Repeater**.
7. The flag appears in the server response.

## Tools
Burp Suite (Proxy, Repeater), browser, MD5 tool.

## Root Cause
The redirect target is protected only by an unkeyed hash that anyone can recompute.
**CWE-601: URL Redirection to Untrusted Site (Open Redirect).**

## Mitigations
- Use a server-side allow-list of redirect destinations.
- If a signature is needed, use a keyed HMAC with a server-side secret, not a plain hash.

## Lessons Learned
- A hash is not a signature: without a secret key, anyone can forge it.
- Burp Suite is the right tool to intercept and replay requests to test server logic.
