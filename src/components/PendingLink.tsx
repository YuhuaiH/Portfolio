"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useNavigationPending } from "./NavigationPendingProvider";

// A next/link that kicks off the page-wide fade (see
// NavigationPendingProvider.tsx) on click, for the server-rendered work
// pages that can't call the hook themselves. Same guard as SiteNav.tsx:
// only for an actual route change — clicking a link to the page you're
// already on never fires a pathname change, and would leave `pending`
// stuck true forever.
export default function PendingLink({ href, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const pathname = usePathname();
  const { startNavigating } = useNavigationPending();

  return <Link href={href} onClick={pathname !== href ? startNavigating : undefined} {...props} />;
}
