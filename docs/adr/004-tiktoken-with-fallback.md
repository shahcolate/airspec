# ADR-004: Tiktoken with Character-Based Fallback

## Status
Accepted

## Context
The Context Budget Efficiency dimension needs to count tokens to estimate how much of an AI's context window a repo would consume. Token counts vary by tokenizer — GPT-4's tokenizer (cl100k_base) gives different counts than Claude's.

## Decision
Use tiktoken (cl100k_base via `encoding_for_model('gpt-4o')`) as the primary tokenizer. Fall back to `chars / 4` if tiktoken fails to load or throws on specific content.

## Consequences
- Token counts are approximate but consistent across runs on the same machine.
- The character fallback means airspec works even in environments where tiktoken's native module can't compile (some CI runners, restricted environments).
- The per-file try/catch was added after discovering that tiktoken throws on files containing special tokens like `<|endoftext|>`. Rather than sanitizing input, we fall back per-file, so one bad file doesn't break the whole analysis.
- We chose cl100k_base (GPT-4's tokenizer) because it's widely available. The actual token count will differ slightly for Claude or other models, but the relative ranking between repos is what matters, not the absolute number.
