import type { MetadataRoute } from "next";

/**
 * Specter is a single-user app. Nothing here is meant to be discovered, so keep
 * it out of every index — the deployment URL is unlisted, and a crawler finding
 * it is the one exposure route that does not depend on the link being shared.
 *
 * next.config.ts sends X-Robots-Tag alongside this, so a crawler arriving by
 * some other route is still told not to index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
