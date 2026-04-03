# Test Spec Outline — macOS Subtitler

## Unit
- Chunking logic
- OpenAI request builder
- Style serialization
- Export config mapping

## Integration
- Import -> audio extraction
- Chunked transcription assembly
- Subtitle -> Remotion pipeline
- IPC boundaries between UI and native/process layer

## E2E
- Import -> transcribe -> edit -> style -> export

## Error / UX
- Bad API key
- API failure
- Oversize media handling
- Export interruption

## Packaging
- Install
- Launch
- Sample export on packaged app
