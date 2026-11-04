// The launch email (Collins, 4 Nov 2026, mock D on
// https://claude.ai/artifact/QdP8wKwtFZdX6ySvB5wqQ4): the gates are open, your
// shirt and queue number, today's Daily, your waitlist league (sign in with
// this email to be its captain), the three games, and an unsubscribe line.
// Pure, so it's tested; built as tables with inline styles, which is what
// email clients read. The masthead, headline and shirt are one PNG (hero), so
// they look the same in every inbox; everything said in it is in the alt text.

export type LaunchEmail = {
  /** The name they put on their shirt, if any. */
  name: string | null;
  /** Their number on the team sheet. */
  position: number;
  /** Today's Daily ("Chelsea v Man City"), if it's scheduled. */
  fixture: string | null;
  /** The league they named, and whether it's already been made (beta testers). */
  league: { name: string; made: boolean } | null;
  /** The site, without a trailing slash. */
  site: string;
  /** The PNG with the masthead, the headline and their shirt. */
  heroUrl: string;
  unsubscribeUrl: string;
  /** Where replies go. */
  replyTo: string | null;
};

const NAVY = "#0C1330";
const TEAL = "#00A3A3";
const TEAL_LIGHT = "#7FE3E0";
const MIST = "#EDF0FF";
const TRACK = "#D9DFFF";
const SLATE = "#3A4466";
const SKY = "#5CB8FF";
const DISPLAY = "'Big Shoulders','Arial Narrow','Helvetica Neue',Arial,sans-serif";
const BODY = "Barlow,'Helvetica Neue',Arial,sans-serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function launchSubject(e: Pick<LaunchEmail, "name">): string {
  return e.name ? `The gates are open, ${e.name}. Your shirt's ready.` : "The gates are open. Your shirt's ready.";
}

/** The line inboxes show after the subject. */
export function launchPreview(e: Pick<LaunchEmail, "league">): string {
  if (e.league && !e.league.made) return `Today's Daily is live, and ${e.league.name} kicks off when you sign in.`;
  return "Today's Daily is live. One try, closes at midnight.";
}

const heading = (text: string, size: number) =>
  `<div style="font-family:${DISPLAY};font-weight:900;font-size:${size}px;line-height:0.95;text-transform:uppercase;color:${NAVY}">${text}</div>`;
const small = (text: string, color = NAVY) =>
  `<div style="font-family:${BODY};font-weight:600;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${color}">${text}</div>`;
const body = (text: string, size = 16) => `<div style="font-family:${BODY};font-size:${size}px;line-height:1.5;color:${NAVY}">${text}</div>`;

/** The light-teal sticker button: navy frame and hard navy shadow, label left, arrow right. */
function button(href: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>
<td style="background:${TEAL_LIGHT};border:3px solid ${NAVY};box-shadow:5px 5px 0 ${NAVY}">
<a href="${href}" style="display:block;padding:14px 20px;font-family:${DISPLAY};font-weight:900;font-size:26px;line-height:1;text-transform:uppercase;color:${NAVY};text-decoration:none">${label}<span style="float:right">&rarr;</span></a>
</td></tr></table>`;
}

const GAMES = [
  ["The Daily", "One a day, two halves, themed on the weekend's games."],
  ["Clash", "60 seconds of higher or lower. Send the score to a mate."],
  ["The League", "Your mates, one table, a new week every Monday."],
] as const;

export function launchHtml(e: LaunchEmail): string {
  const daily = `${e.site}/daily`;
  const shirt = e.name ? `${esc(e.name)}, you` : "You";
  const alt = `iKnowBall. Fri 20 Nov, kick-off. The gates are open. Your shirt, No. ${e.position}${e.name ? `, ${esc(e.name)}` : ""}.`;

  const league = e.league
    ? `<tr><td style="padding:28px 28px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:3px solid ${NAVY}"><tr>
<td style="padding:16px 18px">${small("Your league")}
<div style="height:6px"></div>${heading(esc(e.league.name), 32)}
<div style="height:8px"></div>${body(
        e.league.made
          ? `It's already up, and you're captain. Send your mates the invite from <a href="${e.site}/league" style="color:${NAVY};font-weight:600">your league's page</a>.`
          : `It starts the moment you <a href="${e.site}/profile" style="color:${NAVY};font-weight:600">sign in with this email</a>, and you're captain. Then send your mates the invite.`,
      )}</td>
<td width="104" style="background:${NAVY};padding:16px 12px;text-align:center">
<div style="font-family:${BODY};font-weight:600;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#FFFFFF">Out of</div>
<div style="font-family:${DISPLAY};font-weight:900;font-size:40px;line-height:1;color:${SKY}">600</div>
<div style="font-family:${BODY};font-weight:600;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#FFFFFF">a week</div>
</td></tr></table></td></tr>`
    : "";

  const games = GAMES.map(
    ([name, line], i) => `<tr><td style="padding:12px 0;border-bottom:${i < GAMES.length - 1 ? `1px solid ${TRACK}` : "0"}">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td width="34" valign="top" style="font-family:${DISPLAY};font-weight:900;font-size:26px;line-height:1;color:${NAVY}">${i + 1}</td>
<td>${heading(name, 22)}<div style="height:2px"></div>${body(line, 15)}</td>
</tr></table></td></tr>`,
  ).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(launchSubject(e))}</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600&amp;family=Big+Shoulders:wght@900&amp;display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${MIST}">
<div style="display:none;max-height:0;overflow:hidden">${esc(launchPreview(e))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${MIST}"><tr><td align="center" style="padding:20px 12px 28px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse">
<tr><td style="background:#FFFFFF;border:3px solid ${NAVY}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
<tr><td><a href="${daily}"><img src="${e.heroUrl}" width="594" alt="${alt}" style="display:block;width:100%;height:auto;border:0"></a></td></tr>
<tr><td style="padding:22px 28px 0">${body(`${shirt} were No. ${e.position} on the team sheet. Your shirt's been hanging up since. Today it's yours.`, 18)}</td></tr>
<tr><td style="padding:22px 28px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${MIST}"><tr><td style="padding:18px 20px">
${small("Today's Daily")}<div style="height:6px"></div>${heading(esc(e.fixture ?? "Today's Daily is live"), 34)}<div style="height:6px"></div>${body("One try. Closes at midnight.")}
</td></tr></table></td></tr>
<tr><td style="padding:22px 28px 0">${button(daily, "Play today's Daily")}</td></tr>
${league}
<tr><td style="padding:30px 28px 0">${small("Three games, one rating")}<div style="height:8px;border-bottom:4px double ${NAVY}"></div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${games}</table></td></tr>
<tr><td style="padding:12px 28px 28px;font-family:${BODY};font-size:14px;line-height:1.5;color:${SLATE}">Tip: add it to your home screen from the Daily's full time. It opens like an app.</td></tr>
</table></td></tr>
<tr><td style="padding:16px 8px 0;font-family:${BODY};font-size:12px;line-height:1.6;color:${SLATE}">
You're getting this because you put your name down at ${esc(e.site.replace(/^https?:\/\//, ""))}. This is the one email we promised.
<a href="${e.unsubscribeUrl}" style="color:${SLATE}">Unsubscribe</a> &middot; <a href="${e.site}/privacy" style="color:${SLATE}">Privacy</a>${e.replyTo ? ` &middot; Questions: <a href="mailto:${e.replyTo}" style="color:${SLATE}">${e.replyTo}</a>` : ""}
</td></tr>
<tr><td style="padding:10px 8px 0;font-family:${DISPLAY};font-weight:900;font-size:16px;color:${NAVY}">iKnow<span style="color:${TEAL}">Ball</span></td></tr>
</table></td></tr></table>
</body>
</html>`;
}

/** The plain-text version, for inboxes that don't show HTML. */
export function launchText(e: LaunchEmail): string {
  const lines = [
    "THE GATES ARE OPEN.",
    "",
    `${e.name ? `${e.name}, you` : "You"} were No. ${e.position} on the team sheet. Your shirt's been hanging up since. Today it's yours.`,
    "",
    `Today's Daily: ${e.fixture ?? "it's live"}. One try. Closes at midnight.`,
    `Play it: ${e.site}/daily`,
  ];
  if (e.league)
    lines.push(
      "",
      `Your league: ${e.league.name}`,
      e.league.made
        ? `It's already up, and you're captain. Send your mates the invite: ${e.site}/league`
        : `It starts the moment you sign in with this email, and you're captain: ${e.site}/profile`,
    );
  lines.push(
    "",
    "Three games, one rating:",
    ...GAMES.map(([name, line], i) => `${i + 1}. ${name}: ${line}`),
    "",
    "Tip: add it to your home screen from the Daily's full time. It opens like an app.",
    "",
    "--",
    `You're getting this because you put your name down at ${e.site.replace(/^https?:\/\//, "")}. This is the one email we promised.`,
    `Unsubscribe: ${e.unsubscribeUrl}`,
  );
  return lines.join("\n");
}
