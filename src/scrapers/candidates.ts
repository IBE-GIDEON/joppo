/**
 * Candidate board tokens for discovery to probe.
 *
 * These are guesses, not a verified list. Discovery tries each against every
 * applicant tracking system and keeps only the ones that answer with a real
 * board. Roughly a third hit, so a miss costs one cheap request and nothing
 * else.
 *
 * Growing this list is the single highest-leverage thing you can do to the
 * catalogue. Add company names in lower case with no spaces. Anything already
 * on the crawl list is skipped automatically, so duplicates are harmless.
 */
export const CANDIDATE_TOKENS: string[] = [
  // developer tools and infrastructure
  'vercel', 'netlify', 'render', 'fly', 'railway', 'planetscale', 'neon', 'supabase',
  'cockroachlabs', 'timescale', 'clickhouse', 'starburst', 'dbtlabs', 'fivetran',
  'airbyte', 'temporal', 'hashicorp', 'gitlab', 'circleci', 'sentry', 'grafana',
  'datadoghq', 'newrelic', 'sourcegraph', 'jetbrains', 'docker', 'pulumi', 'chainguard',
  'gitpod', 'codeium', 'sourcegraph', 'warp', 'linear', 'height', 'raycast',

  // data and analytics
  'databricks', 'snowflake', 'confluent', 'dremio', 'sigmacomputing', 'hex',
  'amplitude', 'mixpanel', 'heap', 'posthog', 'segment', 'census', 'hightouch',
  'montecarlodata', 'greatexpectations', 'preset', 'metabase',

  // fintech and payments
  'stripe', 'adyen', 'checkout', 'gocardless', 'wise', 'revolut', 'monzo', 'starling',
  'n26', 'klarna', 'affirm', 'marqeta', 'brex', 'ramp', 'mercury', 'modernTreasury',
  'plaid', 'chime', 'robinhood', 'coinbase', 'kraken', 'circle', 'paystack',
  'flutterwave', 'chipper', 'moniepoint', 'kuda', 'opay', 'interswitch',

  // security
  'cloudflare', 'okta', 'auth0', 'onelogin', 'snyk', 'vanta', 'drata', 'secureframe',
  'crowdstrike', 'sentinelone', 'wiz', 'orca', 'lacework', 'tailscale', '1password',
  'bitwarden', 'yubico', 'abnormalsecurity', 'huntress',

  // productivity and collaboration
  'notion', 'airtable', 'asana', 'monday', 'clickup', 'miro', 'figma', 'canva',
  'loom', 'calendly', 'zapier', 'make', 'retool', 'webflow', 'framer', 'contentful',
  'sanity', 'storyblok', 'typeform', 'docusign', 'dropbox', 'box', 'slack',

  // commerce and marketplaces
  'shopify', 'bigcommerce', 'faire', 'whatnot', 'depop', 'vinted', 'etsy', 'wayfair',
  'instacart', 'doordash', 'deliveroo', 'gopuff', 'gorillas', 'getir', 'ocado',
  'thumbtack', 'taskrabbit', 'turo', 'getaround', 'vrbo', 'hopper', 'kayak',

  // artificial intelligence
  'openai', 'anthropic', 'cohere', 'mistral', 'huggingface', 'scaleai', 'perplexity',
  'runwayml', 'elevenlabs', 'synthesia', 'suno', 'together', 'replicate', 'modal',
  'baseten', 'weightsandbiases', 'labelbox', 'adept', 'sierra', 'harvey', 'glean',
  'cresta', 'abridge', 'decagon', 'clay', 'writer', 'typeface', 'jasper',

  // health
  'oscarhealth', 'rohealth', 'hims', 'carbonhealth', 'devoted', 'included', 'spring',
  'headway', 'alma', 'lyrahealth', 'omadahealth', 'benchling', 'tempus', 'flatiron',
  'komodohealth', 'zocdoc', 'babylonhealth', 'kry', 'pelago',

  // climate and energy
  'octopusenergy', 'northvolt', 'sunrun', 'enphase', 'arcadia', 'watershed',
  'persefoni', 'climeworks', 'terraformindustries', 'formenergy', 'redwoodmaterials',
  'ecoligo', 'sunfire', 'enpal', '1komma5grad',

  // logistics and mobility
  'flexport', 'convoy', 'samsara', 'motive', 'bolt', 'grab', 'gojek', 'careem',
  'lime', 'tier', 'voi', 'zipline', 'nuro', 'waymo', 'aurora', 'einride', 'sennder',
  'forto', 'shippo', 'shipbob',

  // media, social and gaming
  'reddit', 'discord', 'twitch', 'patreon', 'substack', 'medium', 'spotify',
  'soundcloud', 'bandcamp', 'epicgames', 'riotgames', 'unity', 'roblox', 'scopely',
  'voodoo', 'supercell', 'rovio', 'miniclip', 'duolingo',

  // enterprise and services
  'atlassian', 'zendesk', 'freshworks', 'intercom', 'front', 'gong', 'outreach',
  'salesloft', 'clari', 'people', 'gusto', 'rippling', 'deel', 'remote', 'oyster',
  'personio', 'hibob', 'lattice', 'culturamp', 'greenhouse', 'ashbyhq', 'workable',

  // Africa, Middle East and emerging markets
  'andela', 'jumia', 'mpesa', 'yassir', 'wave', 'sendwave', 'kobo360', 'twiga',
  'mnt-halan', 'swvl', 'fawry', 'valu', 'tabby', 'tamara', 'trella', 'paymob',
  'sokowatch', 'copia', 'apollo-agriculture', 'lori', 'mfsafrica', 'onafriq',

  // Europe
  'spotify', 'klarna', 'zalando', 'delivery-hero', 'hellofresh', 'trivago',
  'booking', 'adyen', 'mollie', 'messagebird', 'bird', 'backbase', 'sennder',
  'personio', 'celonis', 'contentsquare', 'algolia', 'datadome', 'dataiku',
  'younited', 'qonto', 'pennylane', 'swile', 'alan', 'doctolib', 'payfit',
];
