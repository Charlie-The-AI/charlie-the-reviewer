# React Native / Expo Integration Example

This example demonstrates how to configure `@thesonofman/ai-code-reviewer` for mobile applications using React Native or Expo.

## Key Features

- **Google Gemini Provider:** Leverages `gemini-2.5-flash` for ultra-fast reviews and generous rate limits.
- **Mobile Lifecycle & Cleanups:** Enforces unmount cleanup of `AppState`, `BackHandler`, and WebSocket listeners.
- **Native Bridges & Security:** Higher scrutiny on native iOS (`ios/**`) and Android (`android/**`) source changes.

## Usage

```bash
# Set Gemini credentials
export GEMINI_API_KEY="your-gemini-key"

# Review staged mobile changes
npx ai-code-reviewer review --staged
```
