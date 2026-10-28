import Link from "next/link";
import { SOCIAL, SUPPORT_URL } from "@/lib/site";
import { Logo } from "./SiteNav";

// The site footer (21 Oct 2026, after futoteca's): the mark and a line on the
// left; support, privacy and the maker's links on the right, each with its
// icon. Social marks are drawn inline, so nothing loads from elsewhere.

const ICON = "h-4 w-4 shrink-0";

export function SiteFooter() {
  return (
    <footer
      data-site-footer
      className="mt-10 border-t-[4px] border-double border-navy"
    >
      <div className="mx-auto flex max-w-[1184px] flex-col gap-5 px-4 py-6 xl:flex-row xl:items-center xl:justify-between xl:gap-8">
        <div className="flex flex-col gap-2 xl:max-w-[300px]">
          <Link
            href="/"
            aria-label="iKnowBall home"
            className="flex shrink-0 items-center gap-2"
          >
            <Logo className="h-[33px]" />
            <span className="font-display text-[28px] leading-none">
              iKnow<span className="text-teal">Ball</span>
            </span>
          </Link>
          <p className="text-sm leading-snug text-navy/80">
            Think you know ball? One Daily a day to prove it.
            <span className="block text-xs text-navy/70">
              Not affiliated with the Premier League or any club.
            </span>
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-3 text-[15px] lg:text-sm xl:flex-nowrap xl:gap-x-4 2xl:gap-x-5">
            <li>
              {SUPPORT_URL ? (
                <FooterLink href={SUPPORT_URL} icon={<Heart />} external>
                  Support iKnowBall
                </FooterLink>
              ) : (
                <span className="flex items-center gap-1.5 whitespace-nowrap text-navy/70">
                  <Heart />
                  Support iKnowBall
                  <span className="label bg-teal-light px-1.5 py-px text-[10px] text-navy">
                    Soon
                  </span>
                </span>
              )}
            </li>
            <li>
              <FooterLink href="/privacy" icon={<Shield />}>
                Privacy &amp; data
              </FooterLink>
            </li>
            <li>
              <FooterLink href={SOCIAL.x.url} icon={<XMark />} external>
                /{SOCIAL.x.handle}
              </FooterLink>
            </li>
            <li>
              <FooterLink
                href={SOCIAL.github.url}
                icon={<GitHubMark />}
                external
              >
                / {SOCIAL.github.handle}
              </FooterLink>
            </li>
            <li>
              <FooterLink
                href={SOCIAL.linkedin.url}
                icon={<LinkedInMark />}
                external
              >
                / {SOCIAL.linkedin.name}
              </FooterLink>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  icon,
  external = false,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  external?: boolean;
  children: React.ReactNode;
}) {
  const className =
    "flex items-center gap-1.5 whitespace-nowrap underline-offset-4 hover:text-royal hover:underline";
  const inner = (
    <>
      {icon}
      <span>{children}</span>
      {external && <span className="sr-only">(opens in a new tab)</span>}
    </>
  );
  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {inner}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

function Heart() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={ICON}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    >
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    </svg>
  );
}

function Shield() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={ICON}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    >
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6L12 3Z" />
      <path d="m8.8 12.2 2.2 2.2 4.2-4.4" strokeLinecap="round" />
    </svg>
  );
}

function XMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={ICON}
      fill="currentColor"
    >
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.59-6.64 7.59H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={ICON}
      fill="currentColor"
    >
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}

function LinkedInMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={ICON}
      fill="currentColor"
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}
