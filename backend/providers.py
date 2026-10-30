"""Provider adapters use backend-only keys and fixed provider endpoints."""
import json
import os
from collections.abc import AsyncIterator
from typing import Protocol
import httpx


class ProviderError(Exception):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


class Provider(Protocol):
    name: str
    model: str
    def ensure_configured(self) -> None: ...
    async def complete(self, messages: list[dict]) -> str: ...
    def stream(self, messages: list[dict]) -> AsyncIterator[str]: ...


def status_error(status: int) -> ProviderError:
    if status == 429:
        return ProviderError('The AI provider is busy or has reached its quota. Please retry later.', 429)
    if status in (401, 403):
        return ProviderError('The AI provider rejected its credentials. Check the backend key and permissions.', 503)
    if status == 400 or status == 404:
        return ProviderError('The AI provider could not accept this request. Check the configured model or try shorter code.', 502)
    return ProviderError('The AI provider is temporarily unavailable. Please retry.', 502)


class CompatibleProvider:
    def __init__(self, name: str, model: str, key: str, base_url: str, transport=None):
        self.name, self.model = name, model
        self._key, self._base_url = key, base_url
        self._transport = transport

    def ensure_configured(self):
        if not self._key:
            raise ProviderError(f'AI is not configured. Add {self.name.upper()}_API_KEY to backend/.env and restart the backend.', 503)

    def client(self):
        self.ensure_configured()
        return httpx.AsyncClient(base_url=self._base_url, headers={'Authorization': f'Bearer {self._key}'},
            timeout=httpx.Timeout(40, connect=10), transport=self._transport)

    async def complete(self, messages):
        try:
            async with self.client() as client:
                response = await client.post('/chat/completions', json={
                    'model': self.model, 'messages': messages, 'temperature': 0.2,
                    'max_tokens': 8000, 'response_format': {'type': 'json_object'}})
                if response.status_code != 200:
                    raise status_error(response.status_code)
                return response.json()['choices'][0]['message']['content']
        except httpx.TimeoutException:
            raise ProviderError('The AI provider timed out. Please retry.', 504) from None
        except httpx.HTTPError:
            raise ProviderError('Could not connect to the AI provider. Please retry.', 502) from None
        except (ValueError, KeyError, IndexError, TypeError):
            raise ProviderError('The AI provider returned an unreadable response. Please retry.', 502) from None

    async def stream(self, messages):
        try:
            async with self.client() as client:
                async with client.stream('POST', '/chat/completions', json={
                    'model': self.model, 'messages': messages, 'temperature': 0.2,
                    'max_tokens': 4000, 'stream': True}) as response:
                    if response.status_code != 200:
                        raise status_error(response.status_code)
                    async for line in response.aiter_lines():
                        if not line.startswith('data:'):
                            continue
                        raw = line[5:].strip()
                        if raw == '[DONE]':
                            return
                        chunk = json.loads(raw)
                        if chunk.get('error'):
                            raise ProviderError('The AI provider interrupted this reply. Please retry.')
                        choice = (chunk.get('choices') or [{}])[0]
                        if choice.get('finish_reason') in ('length', 'content_filter'):
                            raise ProviderError('This reply was cut short by the provider. Try a more focused question.')
                        text = choice.get('delta', {}).get('content')
                        if text:
                            yield text
        except httpx.TimeoutException:
            raise ProviderError('The AI provider timed out. Please retry.', 504) from None
        except httpx.HTTPError:
            raise ProviderError('The connection to the AI provider was interrupted. Please retry.') from None
        except (ValueError, KeyError, IndexError, TypeError):
            raise ProviderError('The AI provider returned an invalid stream. Please retry.') from None
        # A truncated HTTP stream must not be presented as a completed answer.
        raise ProviderError('The AI reply ended unexpectedly. Please retry.')


def get_provider() -> Provider:
    name = os.getenv('AI_PROVIDER', 'groq').lower()
    if name == 'groq':
        return CompatibleProvider(name, os.getenv('GROQ_MODEL', 'openai/gpt-oss-120b'),
            os.getenv('GROQ_API_KEY', ''), 'https://api.groq.com/openai/v1')
    if name == 'gemini':
        return CompatibleProvider(name, os.getenv('GEMINI_MODEL', 'gemini-3.8-flash'),
            os.getenv('GEMINI_API_KEY', ''), 'https://generativelanguage.googleapis.com/v1beta/openai')
    raise ProviderError('Choose groq or gemini for AI_PROVIDER in the backend environment.', 503)
