export type BlockMode = "paragraph" | "heading" | "list" | "quote" | "code" | null;

const reBlank = /^\s*$/;
const reHeading = /^\s{0,3}#{1,6}\s+/; // # .. ###### + space
const reFenceOpen = /^\s{0,3}([`~]{3,})(.*)$/; // captures fence sequence and rest
const reBullet = /^\s{0,3}[-*+]\s+/;
const reOrdered = /^\s{0,3}\d+[.)]\s+/;
const reQuote = /^\s{0,3}>\s?/;
const reListContinuation = /^\s{2,}\S/; // indented continuation lines

function isBlank(line: string) {
  return reBlank.test(line.trimEnd());
}

function startsHeading(line: string) {
  return reHeading.test(line);
}

function startsFence(line: string): { char: "`" | "~" } | null {
  const m = line.match(reFenceOpen);
  if (!m) return null;
  const fenceSeq = m[1];
  const char = fenceSeq[0];
  if (char === "`" || char === "~") return { char };
  return null;
}

function closesFence(line: string, fenceChar: "`" | "~" | null): boolean {
  if (!fenceChar) return false;
  // allow any length >= 3 of the same char to close
  const re = new RegExp(`^\\s{0,3}[${fenceChar}]{3,}\\s*$`);
  return re.test(line.trimEnd());
}

function startsList(line: string) {
  return reBullet.test(line) || reOrdered.test(line);
}

function isListContinuation(line: string) {
  return reListContinuation.test(line);
}

function startsQuote(line: string) {
  return reQuote.test(line);
}

function isParagraphStart(line: string) {
  return !isBlank(line) && !startsHeading(line) && !startsFence(line) && !startsList(line) && !startsQuote(line);
}

export interface FeedResult {
  closed: string[]; // fully closed blocks (markdown)
  draft: string; // current draft text (not yet finalized)
  mode: BlockMode; // current parsing mode (null means idle)
}

export class BlockDetector {
  private mode: BlockMode = null;
  private fenceChar: "`" | "~" | null = null;
  private current = ""; // accumulated lines for current block
  private buffer = ""; // incomplete line accumulator

  feed(chunk: string): FeedResult {
    this.buffer += chunk;
    const closed: string[] = [];

    // Process complete lines only
    for (;;) {
      const idx = this.buffer.indexOf("\n");
      if (idx === -1) break;
      const lineWithNL = this.buffer.slice(0, idx + 1);
      // Advance buffer
      this.buffer = this.buffer.slice(idx + 1);

      const line = lineWithNL; // includes trailing \n
      let reprocess = false;
      do {
        reprocess = false;
        if (this.mode === "code") {
          this.current += line;
          if (closesFence(line, this.fenceChar)) {
            // finalize code block (do not include trailing extra blank after close)
            closed.push(this.current.replace(/\n+$/,"\n"));
            this.current = "";
            this.mode = null;
            this.fenceChar = null;
          }
        } else if (this.mode === null) {
          // determine block start
          const fenceOpen = startsFence(line);
          if (fenceOpen) {
            this.mode = "code";
            this.fenceChar = fenceOpen.char;
            this.current = line;
          } else if (startsHeading(line)) {
            this.current = line;
            closed.push(this.current.replace(/\n+$/,"\n"));
            this.current = "";
            this.mode = null;
          } else if (startsList(line)) {
            this.mode = "list";
            this.current = line;
          } else if (startsQuote(line)) {
            this.mode = "quote";
            this.current = line;
          } else if (isBlank(line)) {
            // ignore leading blank
          } else {
            this.mode = "paragraph";
            this.current = line;
          }
        } else if (this.mode === "paragraph") {
          if (isBlank(line)) {
            // paragraph closes on blank line (drop the blank from block)
            closed.push(this.current.replace(/\n+$/,"\n"));
            this.current = "";
            this.mode = null;
          } else if (startsFence(line) || startsHeading(line) || startsList(line) || startsQuote(line)) {
            // close paragraph and reprocess this line as new block
            closed.push(this.current.replace(/\n+$/,"\n"));
            this.current = "";
            this.mode = null;
            reprocess = true;
          } else {
            this.current += line;
          }
        } else if (this.mode === "list") {
          if (isBlank(line)) {
            closed.push(this.current.replace(/\n+$/,"\n"));
            this.current = "";
            this.mode = null;
          } else if (startsList(line) || isListContinuation(line)) {
            this.current += line;
          } else if (startsFence(line) || startsHeading(line) || startsQuote(line) || isParagraphStart(line)) {
            closed.push(this.current.replace(/\n+$/,"\n"));
            this.current = "";
            this.mode = null;
            reprocess = true;
          } else {
            // treat as continuation
            this.current += line;
          }
        } else if (this.mode === "quote") {
          if (isBlank(line)) {
            closed.push(this.current.replace(/\n+$/,"\n"));
            this.current = "";
            this.mode = null;
          } else if (startsQuote(line)) {
            this.current += line;
          } else if (startsFence(line) || startsHeading(line) || startsList(line) || isParagraphStart(line)) {
            closed.push(this.current.replace(/\n+$/,"\n"));
            this.current = "";
            this.mode = null;
            reprocess = true;
          } else {
            // continuation line inside quote
            this.current += line;
          }
        }
      } while (reprocess);
    }

    const draft = this.current + this.buffer;
    return { closed, draft, mode: this.mode };
  }

  flush(): string[] {
    const closed: string[] = [];
    const remaining = (this.current + this.buffer).trimEnd();
    if (remaining) {
      closed.push(remaining + (remaining.endsWith("\n") ? "" : "\n"));
    }
    this.current = "";
    this.buffer = "";
    this.mode = null;
    this.fenceChar = null;
    return closed;
  }
}
