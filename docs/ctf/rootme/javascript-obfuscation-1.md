# Root-Me – JavaScript: Obfuscation 1
| Platform | Category | Difficulty | Points |
|---|---|---|---|
| Root-Me | Web-Client | Medium | 10 |

## Objective
Find and decode a password hidden in obfuscated client-side code.

## Recon
- Target: Root-Me challenge.
- Observation: the JS script is obfuscated (meaningless variable names, encoded strings).

## Steps
1. Retrieve the obfuscated script from the page source.
2. Isolate the encoded string.
3. Decode it (for example with `decodeURIComponent()` in the browser console) to reveal the password.

## Root Cause
Weak obfuscation used to hide secrets on the client side.
**CWE-200: Exposure of Sensitive Information.**

## Mitigations
- Keep secrets on the server side.
- If obfuscation is used, always pair it with server-side checks.

## Lessons Learned
Knowing decoding tools makes it fast to analyze obfuscated JavaScript.
