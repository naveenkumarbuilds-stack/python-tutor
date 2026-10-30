# Phase 5 — completed

Added /api/issues, /api/quiz and /api/prediction with strict response schemas, source checks, a retry on malformed responses, shared usage limits, caching and friendly errors. Reviews show possible logic issues and corrected examples without editing the student's source. Parser errors remain separately identified as parser results.

Quizzes are generated from the current code and include exactly one question of each of five types, four distinct choices, validated correct-answer indices, feedback, scores, mistake review and retry. Scores are saved to browser-local history.

Prediction mode compares a student's guess with the AI prediction only. The UI clearly distinguishes external dependencies. Conservative AST checks for input, file access, imports and dynamic behavior prevent exact-output claims for obvious dependencies.

Flowcharts now come from the real Python AST rather than prepared samples or AI. Branches, loops, loop-else, break/continue, returns and independent function bodies are represented. try/with/match/class bodies and implicit exception paths remain explicitly documented structural limitations. Diagrams are capped at 240 nodes and source labels are encoded before Mermaid rendering.

Mode and language apply to explanations, tutor replies and all generated learning activities.

Verification: 70 backend tests passed across all phases; the new browser flow covers quiz mistakes/score/retry, suggestions without overwrite, prediction matching/dependency warnings, and real AST rendering. Live Groq returned valid quiz, issues, prediction and trace results. Kannada explanation succeeded on retry after a provider timeout. Evidence is in checks/phase56-results.txt and checks/live-phase56-results.json.
