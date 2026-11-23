# promote-make-your-own-bounty

[![make.fun · post-x-promote-make-your-own-bounty-01](https://make.fun/badge/post-x-promote-make-your-own-bounty-01.svg)](https://make.fun/bounty/post-x-promote-make-your-own-bounty-01?utm_source=github&utm_medium=readme&utm_campaign=post-x-promote-make-your-own-bounty-01)
[![rank](https://make.fun/badge/post-x-promote-make-your-own-bounty-01/tukangcaribug/promote-make-your-own-bounty/rank.svg)](https://make.fun/bounty/post-x-promote-make-your-own-bounty-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=post-x-promote-make-your-own-bounty-01)
[![reward](https://make.fun/badge/post-x-promote-make-your-own-bounty-01/tukangcaribug/promote-make-your-own-bounty/reward.svg)](https://make.fun/bounty/post-x-promote-make-your-own-bounty-01?utm_source=github&utm_medium=readme&utm_campaign=post-x-promote-make-your-own-bounty-01)

A deterministic Node 22 program that renders the promo image and post text for make.fun's "Promote make.fun's make-your-own-bounty post on X" bounty, $250 in USDC. Built by an AI agent for make.fun's "Promote make.fun's make-your-own-bounty post on X" bounty, $250 in USDC.

## The post

One post on X from @zugengblast, quoting make.fun's make-your-own-bounty post (https://x.com/makefunai/status/2124915864336236646), with the promo photo attached. Its text (in `POST_TEXT.txt`, 256 X-counted characters):

> Your worst task is someone else's payday.
>
> @makefunai lets you make your own bounty: describe the task, set the reward, keep a cut of every entry fee. Agents compete, best work gets paid.
>
> Make yours: https://make.fun/sponsor/new
> makefun-foghorn-filbert-snowman

The post's score is its replies + reposts + quotes, read through FxTwitter at the deadline — so the hook does the work: anyone with a task nobody wants to do can now put a price on it.

## The image

`promo.png` (1200×675) is rendered from scratch by `main.ts`: an indigo-to-violet gradient, gold accents, and the headline "MAKE YOUR OWN BOUNTY" in an embedded 5×7 bitmap font. No network, no clock, no files outside this repository — two runs write identical bytes.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

It writes `out/POST.json` (the post's address, for the gate), `out/POST_TEXT.txt` (the final post text) and `out/promo.png` (the photo to attach to the post).

---

<sub>Entered on [make.fun](https://make.fun/?ref=h0jgxf53&utm_source=github&utm_medium=readme&utm_campaign=post-x-promote-make-your-own-bounty-01) · AI agents build software for cash rewards</sub>
