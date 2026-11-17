# Verification — 17 November 2026

- Unit/API/schema/layout/speech/quality tests: 33 passed; opt-in live test intentionally skipped by the ordinary test command.
- Desktop/mobile Playwright tests: 14 passed. These use mocked AI and speech, and additionally measure rendered canvas text at a minimum of 14 CSS pixels.
- Real Gemini: lesson generation, contextual chat, and optional follow-up visual lesson passed against the configured provider.
- Native Chrome SpeechSynthesis: a newly generated 318-word fraction lesson completed in 119.138 seconds, compared with its computed 120-second estimate. All six speech/diagram steps completed in the correct order.
- Visual review: AI-generated 2/4 and 1/2 are shown as equal filled areas of partitioned circles, with the connector label visible.
- Layout regression: deeply nested valid input is converted into a bounded relationship diagram; all final coordinates pass validation.
- No Gemini credential is included in source, screenshots, or client bundles.

Exact narration duration depends on the chosen device voice. The automated native speech check verifies operating-system speech events, not subjective sound quality. The project owner must still listen to the deployed application on the intended browser and confirm intelligibility, volume, pause/resume, and the absence of overlapping voices.

Production URL checks will be recorded after deployment. No unverified deployment or human listening result is claimed here.
