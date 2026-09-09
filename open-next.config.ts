import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * How OpenNext packages Next.js for Cloudflare Workers.
 *
 * Caching is left at the defaults deliberately. Every page here is either
 * dynamic and personalised or statically prerendered at build, so there is
 * nothing an incremental cache would earn.
 */
const config = defineCloudflareConfig();

/**
 * By default OpenNext shells out to `npm run build`, which means `build` can
 * never be the Cloudflare build itself without recursing forever. That forced
 * the deploy platform to be configured with a non-default build command, and a
 * deploy silently produced no Worker bundle when it was not.
 *
 * Pointing OpenNext at the underlying commands instead breaks the cycle, so
 * `npm run build` can safely be the full Cloudflare build and any CI that runs
 * the default command produces a deployable Worker.
 */
config.buildCommand = 'npx prisma generate && npx next build';

export default config;
