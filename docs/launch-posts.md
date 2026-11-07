# Launch posts

The plan for the posts outside the app: LinkedIn, Product Hunt, Hacker News and the short videos
(Collins, 7 Nov 2026). The player-facing launch is X and WhatsApp on Fri 20 Nov (`docs/launch-plan.md`);
these follow it. Nairaland is still to be decided. Times are WAT.

Rules that hold for every post:
- Never post a question from an upcoming Daily. Videos and examples use past Dailies only.
- Every link carries its source so PostHog can tell the channels apart:
  `https://playiknowball.com/?utm_source=<linkedin|producthunt|hackernews|tiktok|instagram|youtube|x>`.
- The site takes no money while it's on Vercel Hobby, so nothing says "support us", "donate" or "pro".
- Use real numbers only. Anything in [brackets] below gets filled in on the day from the maker, PostHog or
  Supabase, or comes out.

## The calendar

| When | What | Where |
| --- | --- | --- |
| Mon 16 Nov | Build story: "I'm launching on Friday" | LinkedIn |
| Thu 19 Nov | Demo video | X, WhatsApp, TikTok, Reels, Shorts |
| Fri 20 Nov | Launch day post | LinkedIn |
| From Sat 21 Nov | Short videos, three a week | TikTok, Reels, Shorts, X, WhatsApp Status |
| Tue 1 Dec | Product Hunt launch (09:01 WAT, when PH's day starts) | Product Hunt, LinkedIn, X |
| Thu 3 Dec | Show HN (about 14:00 WAT, 8 am in New York) | Hacker News |
| Tue 8 Dec | "Two weeks in": what the numbers say | LinkedIn |
| Fri 18 Dec | Rate mode goes live: a second wave of videos | All |

Product Hunt and Show HN come after launch on purpose: the beta bugs are gone by then, there's real data to
show, and they don't split the attention of launch day. They're two days apart, so each one gets watched
properly.

## LinkedIn

Three posts, written in the first person by Collins, each with one image or video. The link goes in the
first comment, not the post: LinkedIn shows posts with links to fewer people.

### 1. Mon 16 Nov: the build story

Image: the logo canvas with three screens (home, a Daily, a Clash sprint), or a 20 s screen capture.

> On Friday I'm launching iKnowBall, a football knowledge game I've built on my own over the last six weeks.
>
> One Daily a day: name the players, put them in order, beat the clock. Then Clash, 60 seconds of higher
> or lower you can send to a mate. Then leagues with your friends, scored every Premier League week.
>
> A few things I'm proud of:
> - The questions draft themselves. Every night a job reads player histories from Wikidata, finds the
>   fixtures, and writes the next week of Dailies. I review them; the answers always come from data.
> - Every shirt is drawn in code. No crests, no photos, just the kits.
> - The clock and the answers are checked on the server, so nobody can pause or peek.
> - It's built for Nigeria first: every answer is one database call, because half a second matters on a
>   phone in Lagos.
>
> Next.js, Supabase, Vercel, Wikidata. Gates open Friday 20 Nov.
>
> If you think you know ball, the waitlist is in the comments.

### 2. Fri 20 Nov: launch day

Video: the demo video (16:9 cut).

> iKnowBall is live.
>
> A football knowledge game: a Daily, Clash sprints, and leagues with your mates. Free, in the browser,
> installs to your phone.
>
> Today's Daily is [fixture]. My score is [score]. Beat it.
>
> [link in the comments]

### 3. Tue 8 Dec: two weeks in

Image: one chart (players a day, or Dailies played) from PostHog.

> Two weeks since I launched iKnowBall. What the numbers say:
> - [players] people have played [Dailies] Dailies.
> - [share]% came back the next day.
> - The most-missed answer so far: [player], [percent]% got him.
> - What surprised me: [one honest thing, good or bad].
> - What I changed because of it: [one change].
>
> Next up: [Rate mode on 18 Dec / whatever's next].

## Product Hunt: Tue 1 Dec

Launch as maker (no hunter needed). The day runs from 09:01 WAT to 09:00 the next day: post the first
comment at once, then answer every comment that day.

- **Name:** iKnowBall
- **Tagline** (60 characters max): `A daily football quiz to prove you know ball`
- **Description** (260 max): `One Daily a day: name the players, put them in order, beat the clock. Clash: 60 seconds of higher or lower you can send to a mate. Leagues with friends, scored every Premier League week. Free, no sign-up to play.`
- **Topics:** Games, Sports, Web App
- **Thumbnail:** the No. 10 shirt app icon (512 × 512, `/icons/512.png`).
- **Gallery** (1270 × 760, in this order):
  1. Home: "Matchday is on" with the three games.
  2. A Daily in play: Free Recall's pitch filling up.
  3. A Clash sprint: the chain and the slant.
  4. Full time with the share card.
  5. A league table.
  6. The demo video (YouTube link) as the last item.
- **Link:** `https://playiknowball.com/?utm_source=producthunt`
- **First comment (the maker's):**

> Hi Product Hunt. I built iKnowBall because football quizzes either ask about trophies from 1974 or are
> buried in ads. This one is about the players you actually watched.
>
> Three games:
> - **The Daily**: one go a day, two parts, timed. It's drafted every night from Wikidata's player
>   histories and the week's fixtures.
> - **Clash**: 60 seconds of higher or lower. Every sprint makes a link, so a mate plays the same players
>   and tries to beat you.
> - **The League**: start one with your friends and the table runs every Premier League week.
>
> You can play straight away without signing up. I'd love to hear which Daily got you, and what you'd add.

Before the day: ask the beta testers to follow the launch page (Product Hunt's "Notify me"), not to upvote
on demand, which Product Hunt penalises.

## Hacker News: Show HN, Thu 3 Dec

HN rewards plain titles, no sign-up, and the interesting technical bits. Post once; don't ask for upvotes.

- **Title:** `Show HN: iKnowBall – a daily football quiz drafted from Wikidata`
- **URL:** `https://playiknowball.com/?utm_source=hackernews`
- **Text:**

> I built a football (soccer) knowledge game as a solo project: a Daily quiz, 60-second higher or lower
> sprints you can challenge friends to, and private leagues.
>
> Some things that might interest people here:
>
> - The questions are drafted automatically. A nightly job imports Premier League-era club spells from
>   Wikidata (CC0) and writes each day's two rounds from the week's fixtures: players who played for both
>   clubs, who joined first, and so on. Loans are left out, either by Wikidata's flag or by a short spell
>   inside a longer one elsewhere. I review the drafts; the answers always come from data, never an LLM.
> - Wikidata files women's team players under the men's club, so the import filters by sex or gender, and
>   a re-import never deletes more than a quarter of a club's spells at once.
> - The timer starts on the server when the round is on screen, not when you press start, and every
>   answer is one Postgres function call. Most players are in Nigeria, where each extra round trip costs
>   about half a second.
> - Every shirt is drawn in SVG from a club's colours, pattern and collar. No crests or photos, and clubs
>   that share colours have to differ by pattern.
>
> Stack: Next.js 16, Supabase (Postgres, anonymous auth), Vercel, Highlightly for fixtures and match data.
> No sign-up to play: you're a guest until you choose to save your shirt.
>
> Happy to answer questions about any of it.

Be at the keyboard for the first three hours to answer comments. If it doesn't catch, HN allows one repost
after a few days; don't repost sooner.

## Short videos

Made in code with Remotion (`video/`, on `claude/clash-video`): the app's own shirts, fonts and logo, so
every video looks like the app. Each one is rendered as 9:16 (1080 × 1920) for TikTok, Reels, Shorts and
WhatsApp Status, and as 16:9 (1920 × 1080) for X and LinkedIn. Add trending music when posting, not in the
render.

### The series

| Series | Length | When | What happens |
| --- | --- | --- | --- |
| **The demo** | 30 s | Thu 19 Nov, once | All three games in order, ending on "Kick-off Fri 20 Nov". Built from `ClashIntro`'s pattern; the end card's `endLine`/`endTag` switch to the launch. |
| **Name them** | 15–20 s | Fri or Sat, before the weekend's big game | A past Daily's Free Recall: the shirts fill one by one with a clock running, then "How many would you get?". Uses a Daily that has already been played. |
| **Clash chain** | 15 s | Wed | A real sprint's chain building up (like the PL goals chain in `ClashIntro`), ending on the miss and "Beat 14". |
| **Team of the week** | 10 s | Mon | The week's top 11 dropping onto the pitch from `/league/everyone/card`, the matchweek stamp, "Make the XI". |
| **The group chat** | 20 s | Now and then | `ClashChat`: a challenge landing in a WhatsApp-style chat. Good for WhatsApp Status. |

Three a week from Sat 21 Nov: Monday team of the week, Wednesday Clash chain, and Friday or Saturday Name
them. Rate mode on Fri 18 Dec gets its own demo-style video and a week of extra posts.

### To build in `video/`

1. `LaunchDemo` (by Wed 18 Nov): the demo, 30 s, both shapes.
2. `NameThem`: takes a past Daily's answers and kits as props, so each week's is a new render with no new
   code.
3. `ClashChain`: takes a sprint's chain as props.
4. `TeamOfTheWeek`: takes the week's top 11.

The data-driven ones (2 to 4) read a JSON file exported from the database, so a new video each week is one
export and one render.

## Measuring it

Per channel, in PostHog by `utm_source`: visits, first Daily played, and the share of those who come back
the next day. Two weeks in (Tue 8 Dec), keep the channels that bring players who return, and drop the rest.
