# Root-Me – JavaScript: Source
| Platform | Category | Difficulty | Points |
|---|---|---|---|
| Root-Me | Web-Client | Easy | 5 |

## Objective
Find the password.

## Recon
- Target: Root-Me challenge.
- Observation: the source code contains comments or variables that expose the password.

## Steps
1. Open the challenge page.
2. Press `Ctrl+U` (View Source) or open DevTools → Sources.
3. Search the code for the password check.
4. Copy the value and submit it.

## Tools
Browser, View Source, DevTools.

## Root Cause
Sensitive data left in the source code (comments/variables).
**CWE-200: Exposure of Sensitive Information.**

## Mitigations
- Clean the code before deployment.
- Manage secrets on the server side.

## Lessons Learned
Reading the source code is always the first step of a web audit.
