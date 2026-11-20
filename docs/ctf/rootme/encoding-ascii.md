# Root-Me – Encoding: ASCII
| Platform | Category | Difficulty | Points |
|---|---|---|---|
| Root-Me | Cryptanalysis | Easy | 5 |

## Objective
Decode a string made of ASCII codes to recover the message (flag).

## Recon
The challenge provides a sequence of values that represent ASCII characters.

## Steps
1. Identify the format (decimal or hexadecimal).
2. Convert each value to its character, for example in Python with `bytes.fromhex(...).decode()`.
3. Read the decoded message.

## Lessons Learned
- Identifying the format quickly (decimal vs hex) makes decoding immediate.
- Simple tools (Python, printf) are enough for this kind of exercise.
