# TikTok Autoposter — Project Checklist

## 1. Architecture
- [x] Use a maintained public uploader instead of reimplementing TikTok upload internals.
- [x] Pin upstream dependency to a known commit.
- [x] Keep the automation isolated from the storefront runtime.
- [x] Store no TikTok cookies or secrets in GitHub.

## 2. Content policy
- [x] English-only captions.
- [x] English-only CTA text.
- [x] Target-market presets for US, Canada, UK, Australia, and New Zealand.
- [x] Reject common Portuguese commerce terms before publishing.

## 3. Queue and publishing
- [x] SQLite-backed queue.
- [x] Add videos to queue.
- [x] Generate a default English caption.
- [x] Allow custom English captions.
- [x] Show queue status.
- [x] Publish the next queued item through TiktokAutoUploader.
- [x] Support public/private test visibility.
- [x] Record published/failed state locally.
- [x] Dry-run mode before real publication.
- [x] Require explicit `Published successfully` response before marking success.

## 4. Authentication
- [x] Import a Netscape cookie export.
- [x] Filter strictly to TikTok domains.
- [x] Keep only a minimal TikTok session subset.
- [x] Require `sessionid` and `tt-target-idc`.
- [x] Local importer test completed with the supplied export.
- [ ] Validate the supplied TikTok session against TikTok from an execution machine with outbound network access.

## 5. Upstream compatibility
- [x] Pin `makiisthenes/TiktokAutoUploader`.
- [x] Patch upstream to load the complete TikTok-only session cookie subset.
- [x] Patch upstream to respect visibility/comment/duet/stitch settings.
- [x] Automated setup script created.

## 6. Verification
- [x] Python syntax checks passed locally.
- [x] English-only policy tests passed: 3/3.
- [x] Supplied cookie export imported locally without copying third-party cookies.
- [ ] Install upstream dependencies on the execution machine.
- [ ] Import the supplied TikTok session on the execution machine.
- [ ] Prepare/queue one real English-only test video.
- [ ] Run a dry-run using the real test video.
- [ ] Publish one controlled test video.
- [ ] Confirm the post is visible on the TikTok profile.

## Definition of Done
The project is considered complete only when a real TikTok post has been published and confirmed on the profile. The remaining unchecked items require an execution environment that can reach TikTok.
