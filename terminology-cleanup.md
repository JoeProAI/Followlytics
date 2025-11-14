# Terminology Cleanup - Remove "Extraction/Scraping" Language

## Status: Phase 1 Complete ✅

### Phase 1: User-Facing Success Page ✅ DEPLOYED
- ✅ src/app/export/success/page.tsx

### Phase 2: Critical API Logs (Shows in Production Console)
- src/app/api/export/trigger-extraction/route.ts
- src/app/api/export/followers/route.ts  
- src/app/api/gamma/auto-generate/route.ts

### Phase 3: Database Fields (Requires Migration)
- extractionProgress → analysisProgress
- lastExtractedAt → lastAnalyzedAt
- extractedBy → analyzedBy
- needsExtraction → needsAnalysis

### Phase 4: Component Names & Files
- FollowerExtractor.tsx → FollowerAnalyzer.tsx
- follower-extractor.ts → follower-analyzer.ts

### Replacement Rules:
- extraction → analysis
- extracting → analyzing  
- extracted → analyzed
- extract → analyze
- scraping → analyzing/collecting
- scrape → analyze/collect

### Notes:
- Keep API endpoint URLs same for now (breaking change)
- Focus on user-visible language first
- Database migrations can happen later
