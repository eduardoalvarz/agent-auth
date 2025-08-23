'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { StreamMarkdown } from '@/components/StreamMarkdown';
import { Button } from '@/components/ui/button';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Build a demo markdown string with headings, paragraphs, lists, quotes and code
const demoText = `# Demo: Streaming Markdown\n\n` +
  `Este es un párrafo inicial que llega poco a poco para probar el cierre por doble salto de línea. ` +
  `Incluye texto suficiente para simular streaming realista.\n\n` +
  `## Lista de items\n` +
  `- Item uno\n` +
  `- Item dos con más contenido para ver wrapping\n` +
  `- Item tres\n\n` +
  `> Una cita en streaming que debe cerrarse con línea vacía o cambio de bloque.\n\n` +
  `Párrafo final antes de un bloque de código.\n\n` +
  `\`\`\`ts\n` +
  `function add(a: number, b: number) {\n` +
  `  return a + b;\n` +
  `}\n` +
  `console.log(add(2, 3));\n` +
  `\`\`\`\n` +
  `\n` +
  `### Fin\n`;

async function* makeStreamFromString(text: string, delay = 40): AsyncIterable<string> {
  const words = text.split(/(\s+)/); // keep whitespace tokens
  for (const w of words) {
    yield w;
    await sleep(delay);
  }
}

export default function Page() {
  const [runId, setRunId] = useState(0);
  const [speed, setSpeed] = useState(40);

  const source = useMemo(() => {
    const myId = runId; // capture
    return async function* () {
      // Each runId produces a new stream
      for await (const chunk of makeStreamFromString(demoText, speed)) {
        // If user clicked reset/start again, stop this generator
        if (myId !== runId) return;
        yield chunk;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, speed]);

  const restart = useCallback(() => setRunId((v) => v + 1), []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button onClick={restart}>Restart</Button>
        <label className="text-sm text-muted-foreground">Speed (ms per token)</label>
        <input
          className="w-24 rounded border px-2 py-1"
          type="number"
          min={0}
          step={5}
          value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value || '0', 10))}
        />
      </div>
      <StreamMarkdown source={source} />
    </div>
  );
}
