# Synchronous Hydrated-DOM Extraction

For V1, extraction captures only the elements currently hydrated and rendered in the browser DOM, appending explicit truncation metadata to the output if unexpanded comments exist. Automated scrolling and programmatic clicking of "View more comments" creates unpredictable UI jitter, 5–15 second delays, bot-detection risks, and fragile timeout handling; synchronous snapshot extraction guarantees instantaneous (<50ms) execution.
