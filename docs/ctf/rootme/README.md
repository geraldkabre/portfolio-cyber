# Root-Me Write-ups

My Root-Me write-ups: how I solved each challenge, the vulnerability behind it, and how to fix it.

## Profile
[godboy on Root-Me](https://www.root-me.org/godboy?lang=en)

> Flags and validation passwords are not published, out of respect for the Root-Me rules.

## Write-ups
| Challenge | Category | Difficulty | Vulnerability |
|---|---|---|---|
| [HTML – Disabled Buttons](html-disabled-buttons.md) | Web-Client | Easy | Client-side enforcement (CWE-602) |
| [JavaScript – Source](javascript-source.md) | Web-Client | Easy | Secret in source code (CWE-200) |
| [JavaScript – Authentication](javascript-authentication-1.md) | Web-Client | Easy | Hard-coded credentials (CWE-200) |
| [JavaScript – Authentication 2](javascript-authentication-2.md) | Web-Client | Medium | Hard-coded credentials (CWE-200) |
| [JavaScript – Obfuscation 1](javascript-obfuscation-1.md) | Web-Client | Medium | Weak obfuscation (CWE-200) |
| [HTTP – IP Restriction Bypass](http-ip-restriction-bypass.md) | Web-Server | Medium | Header spoofing (CWE-290) |
| [HTTP – Open Redirect](http-open-redirect.md) | Web-Server | Medium | Open redirect (CWE-601) |
| [HTTP – User-Agent](http-user-agent.md) | Web-Server | Easy | Header spoofing (CWE-290) |
| [HTTP – Weak Password](http-weak-password.md) | Web-Server | Easy | Default credentials (CWE-1392) |
| [Encoding – ASCII](encoding-ascii.md) | Cryptanalysis | Easy | Encoding is not encryption |
| [Encoding – UU](encoding-uu.md) | Cryptanalysis | Easy | Encoding is not encryption |

## Methodology
Each write-up follows the same structure: **Objective → Recon → Steps → Root Cause (CWE) → Mitigations → Lessons Learned**.
