import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * How OpenNext packages Next.js for Cloudflare Workers.
 *
 * Left at the defaults deliberately. Incremental cache and tag handling are
 * only worth configuring once there is something worth caching; every page
 * here is either dynamic and personalised or statically prerendered at build,
 * so the default in-memory behaviour is correct.
 */
export default defineCloudflareConfig();
