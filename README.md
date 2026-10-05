# Alibi 🕵️

**Witness protection for Alice and Bob.**

Alice and Bob have been "playing a game on an array" since 2008. Candies
split. Messages passed. Stones taken from piles. In every contest ever held.

They've suffered enough. We're relocating them.

Alibi swaps every Alice and Bob on competitive programming sites for fresh
identities — Sharmaji ka Beta and Pintu, Zeus and Hades, NullPointer and
SegFault — or whoever you want them to be.

## Install

1. `chrome://extensions` → **Developer mode** ON → **Load unpacked** → pick this folder.
2. Open any Codeforces problem. Notice who's missing. Smile.
3. Pin the extension. You'll want it handy.

Works on Chrome, Edge, Brave. Firefox port coming soon.

No build. No dependencies. No bundler. It's just files.

## The lineup

| Pack | Alice becomes | Bob becomes |
|---|---|---|
| Desi | Sharmaji ka Beta | Pintu |
| Corporate | Karen from Accounts | Dave from IT |
| Anime | Sasuke | Naruto |
| Mythic | Zeus | Hades |
| Debug | NullPointer | SegFault |
| Gigachad | Alpha Alice | Sigma Bob |

Each pack has 10+ pairs. Hit the 🎲 whenever the current one stops being funny.

**Chaos mode** gives every mention its own alias. One problem, fourteen
Bobs, zero survivors.

**Custom swaps** let you widen the net: any name → any alias (up to 10).
Charlie keeps showing up uninvited? Relocate him too.

## Ground rules

- Samples and your code are **never touched**. Alibi can't break your
  solution — only your concentration.
- `Bobcat`, `Malice` and `Bobby` are innocent bystanders. Whole words only.
- `ALICE` shouts, `alice` whispers — case is preserved.
- Flip the **On leave** stamp and the originals walk free. No reload needed.
- Nothing leaves your browser. No accounts, no analytics, no funny business.
  (The extension is the funny business.)

## Sites covered

LeetCode, Codeforces, HackerRank, HackerEarth, CodeChef, AtCoder,
GeeksforGeeks, CSES, SPOJ, Timus. If Alice and Bob are suffering there,
we're there.

## Files

```
manifest.json   the paperwork
content.js      the field agent (finds them, swaps them, denies everything)
packs.json      the fake IDs
popup.html/css/js  the police station front desk
icons/          mugshots
```

## Contributing

Keep it stupid. Plain scripts, no deps, smallest diff wins. Verify with
`node --check content.js popup.js` and one Codeforces problem.

---

*No Alices were harmed. The Bobs have been notified.*
