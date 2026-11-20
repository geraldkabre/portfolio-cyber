# Root-Me – HTML: Disabled Buttons
| Platform | Category | Difficulty | Points |
|---|---|---|---|
| Root-Me | Web-Client | Easy | 5 |

## Objective
Bypass an HTML form whose input field and submit button are disabled on the client side, in order to get the password.

## Recon
- Target: Root-Me challenge page with a form.
- Observation: both the `<input>` and the `<button>` have the `disabled` attribute in the DOM.

## Steps
1. Open the challenge page in the browser.
2. Open DevTools (Inspect Element).
3. Locate the `<input>` and `<button>` elements carrying `disabled`.
4. Remove the `disabled` attribute in the Elements panel.
5. Submit the form → the server returns the password.

## Tools
Browser (Firefox/Chrome), DevTools (live DOM editing).

## Root Cause
Security enforced only on the client side. The `disabled` attribute does not stop a valid request from reaching the server.
**CWE-602: Client-Side Enforcement of Server-Side Security.**

## Mitigations
- Always check and validate requests on the server side.
- Reject unauthorized input in the backend.

## Lessons Learned
Never rely on client-side protections: the user controls everything in the browser.
