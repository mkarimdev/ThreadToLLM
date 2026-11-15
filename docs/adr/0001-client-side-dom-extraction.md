# Client-Side DOM Extraction Over Reddit JSON Endpoint

We extract discussion thread data directly from the client-side DOM (`<shreddit-post>`, `<shreddit-comment>`) rather than querying Reddit's unauthenticated `.json` URL endpoints. While Reddit's JSON endpoints provide clean structured trees, Reddit aggressively rate-limits, serves CAPTCHAs, and blocks unauthenticated requests, whereas client-side DOM parsing runs locally against content the browser has already hydrated with zero network overhead.
