# Root-Me – JavaScript: Authentication
| Platform | Category | Difficulty | Points |
|---|---|---|---|
| Root-Me | Web-Client | Easy | 5 |

## Objective
Find the username and password.

## Recon
- Target: Root-Me login page.
- Observation: the page loads a JavaScript file (`login.js`) that contains the authentication logic.

## Steps
1. Open the page and append `login.js` to the URL.
2. Read the JavaScript file.
3. Extract the hard-coded credentials and use them on the form.

## Tools
Browser, curl/wget, text editor.

## Root Cause
Poor secret management: credentials embedded in a publicly accessible client-side file.
**CWE-200: Exposure of Sensitive Information.**

## Mitigations
- Never store secrets or credentials on the client side.
- Perform authentication on the server side.

## Lessons Learned
Always review the scripts a page loads: every client-side JS file is visible to an attacker.
