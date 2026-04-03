# PRD: Subtitle Style Presets

## Problem
The app currently offers one locked subtitle animation preset, a freeform font-family field, and no drag interaction or alternate caption chunking. That is too limited for TikTok/Reels-style caption workflows.

## Users
- Solo creator editing short-form social videos on macOS.

## Goal
Let creators switch among five high-impact subtitle looks quickly, choose creator-friendly fonts, and place subtitles visually without losing preview/export consistency.

## In Scope
- Five curated subtitle presets
- Emoji-enhanced preset
- 2-3-word preset
- 1-word preset
- Curated font selector backed by redistributable bundled fonts
- Global draggable subtitle position
- Automated test coverage for new shared behavior

## Out of Scope
- Per-cue timeline editing
- Multi-track subtitle layouts
- AI-generated emoji via external API
- Arbitrary user-uploaded fonts in this milestone

## User Stories
1. As a creator, I want to pick a preset so I can make captions feel native to short-form platforms.
2. As a creator, I want a font selector with creator-friendly fonts so I do not need to guess font-family strings.
3. As a creator, I want 2-3-word and 1-word caption modes so I can create faster, more rhythmic subtitle pacing.
4. As a creator, I want an emoji-enhanced style so captions feel more expressive.
5. As a creator, I want to drag subtitle placement in preview so I can avoid covering faces or UI.

## Success Criteria
- All five presets are selectable and export correctly.
- Dragged position survives export.
- Test suite covers reversible source-to-presentation rechunking, position clamping, preset propagation, font selection, and export parity.
