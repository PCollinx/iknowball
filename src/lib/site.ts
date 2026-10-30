// Links shown in the site footer. Change them here and nowhere else.

export const SOCIAL = {
  x: { handle: "@playiKnowBall", url: "https://x.com/playiKnowBall" },
  github: { handle: "PCollinx", url: "https://github.com/PCollinx" },
  linkedin: { name: "Collins Paul", url: "https://www.linkedin.com/in/collins-paul-60006b19b" },
} as const;

/** Where "Support iKnowBall" goes. #todo before launch (Collins, 21 Oct 2026):
 * set up a support page. Until then the footer shows the link as "Soon". */
export const SUPPORT_URL: string | null = null;

/** Where privacy requests go. Cloudflare Email Routing forwards it to Collins's
 * inbox; replies go out through Resend's SMTP. */
export const PRIVACY_EMAIL: string | null = "privacy@playiknowball.com";
