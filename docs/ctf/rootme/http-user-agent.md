# Root-Me – HTTP: User-Agent
| Platform | Category | Difficulty | Points |
|---|---|---|---|
| Root-Me | Web-Server | Easy | 10 |

## Objective
Access the page by sending the browser identity (User-Agent) that the server expects.

## Recon
The page says the visitor's browser is not the expected one, which shows that access depends on the `User-Agent` header.

## Steps
1. Capture the request with Burp Suite, or use curl.
2. Replace the `User-Agent` header with the value the page asks for (`admin`):
   ```bash
   curl -A "admin" http://challenge01.root-me.org/web-serveur/ch2/
   ```
3. The server returns the validation password.

## Root Cause
Access control based on a header fully controlled by the client.
**CWE-290: Authentication Bypass by Spoofing.**

## Mitigations
Never use `User-Agent` (or any client header) for authorization; use real server-side authentication.

## Lessons Learned
Every part of an HTTP request (headers, cookies, parameters) can be modified by the client.
