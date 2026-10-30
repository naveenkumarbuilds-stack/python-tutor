import {apiUrl} from '../lib/api';
import { useEffect, useRef, useState } from 'react';

export function useAnalysis(code) {
  const [state, setState] = useState({ data: null, error: '', loading: false });
  const active = useRef(null);
  useEffect(() => {
    active.current?.abort();
    active.current = null;
    setState({ data: null, error: '', loading: false });
    return () => { active.current?.abort(); active.current = null; };
  }, [code]);
  async function analyze() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setState({ data: null, error: '', loading: true });
    const timeout = setTimeout(() => controller.abort('timeout'), 12000);
    try {
      const response = await fetch(apiUrl('/api/analyze'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }), signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'The code could not be analyzed.');
      if (typeof result.syntax_valid !== 'boolean') throw new Error('Unexpected analysis response. Please try again.');
      if (active.current === controller) {setState({ data: result, error: '', loading: false });return result;}
    } catch (error) {
      if (active.current !== controller) return;
      setState({ data: null, error: controller.signal.reason === 'timeout'
        ? 'Analysis timed out. Try a smaller program and retry.'
        : error instanceof TypeError || error instanceof SyntaxError
          ? 'The analysis service is unavailable. Start the Python backend, then retry.'
          : error.message, loading: false });
    } finally { clearTimeout(timeout); }
  }
  return { ...state, analyze };
}
