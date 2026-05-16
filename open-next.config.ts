import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import cache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: cache,
});
