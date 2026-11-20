# Root-Me – JavaScript: Authentication 2
| Platform | Category | Difficulty | Points |
|---|---|---|---|
| Root-Me | Web-Client | Medium | 10 |

## Objective
Find credentials stored on the client side but harder to spot.

## Recon
- Target: Root-Me challenge.
- Observation: the authentication logic is in a JS script, but the information is not immediately visible (light obfuscation/encoding).

## Steps
1. Append `login.js` to the URL.
2. Open the JS file.
3. Locate the password in the code.
4. Use the recovered username/password to log in.

## Root Cause
Secrets embedded on the client side, sometimes hidden by light obfuscation that is easy to reverse.
**CWE-200: Exposure of Sensitive Information.**

## Mitigations
- Do not store secrets on the client side.
- Use secure server-side authentication.

## Lessons Learned
Client-side obfuscation is not protection: an attacker can easily deobfuscate or decode it.
