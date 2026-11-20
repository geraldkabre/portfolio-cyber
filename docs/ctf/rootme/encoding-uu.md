# Root-Me – Encoding: UU
| Platform | Category | Difficulty | Points |
|---|---|---|---|
| Root-Me | Cryptanalysis | Easy | 5 |

## Objective
Decode a UU-encoded block (UUEncode) to extract the hidden secret.

## Recon
The file contains a classic UU block, with a `begin <mode> <filename>` header and an `end` line.

## Steps
1. Save the UU block to a local file, for example `challenge.uu`.
2. Decode it:
   ```bash
   uudecode -o decoded.txt challenge.uu
   ```
3. Open `decoded.txt` to read the password.

## Technical Details
UUEncode turns binary data into printable characters (6 bits per character). It is an ancestor of formats such as Base64.

## Security Takeaway
Secrets distributed in accessible resources, even encoded, are exposed (**CWE-200**). Encoding is a transport transformation, **not encryption**.

## Lessons Learned
- Recognizing common encodings (UU, Base64, hex) saves a lot of time in CTFs.
- **Encoding is not encryption.**
