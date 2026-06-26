# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context

This is a Luma Labs engineering take-home challenge. The goal is to pick one problem, build real working software in ~1 working day, and submit. AI coding tools are required and expected.

## Environment Setup

```bash
cp .env.example .env
# Fill in the keys your solution needs
```

Available provider keys (stubs in `.env.example`): Anthropic, OpenAI, ElevenLabs, Google Cloud, AWS.

## Problem Choices

Pick **one**:

1. **Where Should We Eat?** — A group decision tool for picking a restaurant and time for lunch/dinner.
2. **People and Agents Write Together** — A collaborative document authoring environment where humans and AI agents draft and review together in one loop (no paste-into-Docs hand-off).
3. **Managing Prompt & Model Behavior in Production** — A team tool to introduce, evaluate, and manage changes to AI behavior (prompts, routing, temperature, guardrails, etc.).
4. **High-Scale TTS API** — A text-to-speech API built on a real open-source TTS model, designed for real-time streaming in voice agent use cases with high concurrency and sustained throughput.

## Required Deliverables

| File / Artifact | What it needs |
|---|---|
| Working software (in this repo) | Runs in a fresh Linux container; include a `docker-compose.yml` if using Docker |
| `APPROACH.md` | What you built and why, key decisions, intentional omissions, what breaks first, what's next |
| `video.md` | Paste your Loom / Drive / YouTube link here |
| AI session history | Packaged automatically by `./submit.sh`; export ChatGPT logs manually if used |

If the project is deployable, deploy it and include the live URL in `APPROACH.md`.

## Submission

```bash
./submit.sh
```

The script fetches the latest packaging logic, bundles AI session history, pushes to the remote, grants reviewer access, and registers the submission. Use `--download-only` to cache scripts without submitting, or `--skip-download` to run from a cached copy.
