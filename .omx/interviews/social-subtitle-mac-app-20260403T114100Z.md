# Deep Interview Transcript Summary

- Slug: social-subtitle-mac-app
- Profile: standard
- Context type: greenfield
- Final ambiguity: 17.1%
- Threshold: 20%
- Context snapshot: `.omx/context/social-subtitle-mac-app-20260403T113909Z.md`

## Condensed Transcript

1. **Q:** What is the main job this app must do in real life?
   **A:** Take a video, show a preview of the subtitles, make them configurable, and output a newly rendered video with subtitles.

2. **Q:** Why build this instead of using an existing editor?
   **A:** Existing tools charge subscription fees for something that should be possible locally; local transcription models exist, and API fallback could be offered for weaker machines.

3. **Q:** Is local-first mandatory if cloud is better?
   **A:** MVP can start with an API key for OpenAI Whisper.

4. **Q:** What is explicitly out of scope for MVP?
   **A:** Timeline editing and support for many transcription providers.

5. **Q:** If the transcript has mistakes, what editing is needed in v1?
   **A:** Small subtitle text edits are needed, but not timing edits.

6. **Q:** What makes MVP good enough?
   **A:** Import video, transcribe with OpenAI key, lightly edit subtitle text, change style settings, preview, export burned-in subtitled video.

## Pressure-pass finding
The scope was tightened by revisiting the transcription-error case. Initial scope suggested a broad caption workflow; the pressure pass established that v1 needs only light text correction and explicitly does **not** need timing editing.
