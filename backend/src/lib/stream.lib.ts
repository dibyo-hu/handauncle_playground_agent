/**
 * SSE Streaming Utilities
 * Helpers for Server-Sent Events streaming
 */

import { Response } from 'express';
import { StreamEvent, StreamEventType } from '../interfaces/chat.interface';

/**
 * Initialize SSE response headers
 */
export function initSSEResponse(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

/**
 * Send an SSE event
 */
export function sendSSEEvent(res: Response, event: StreamEvent): void {
  const eventType = event.type;
  const data = JSON.stringify(event);
  res.write(`event: ${eventType}\ndata: ${data}\n\n`);
}

/**
 * Send a raw SSE event with custom event name
 */
export function sendRawSSE(res: Response, eventName: StreamEventType, data: unknown): void {
  res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * End SSE stream
 */
export function endSSEStream(res: Response): void {
  res.end();
}

/**
 * Create a keepalive interval for SSE
 */
export function createKeepalive(
  res: Response,
  messageId: string,
  getSequence: () => number,
  intervalMs: number = 15000
): NodeJS.Timeout {
  return setInterval(() => {
    const event: StreamEvent = {
      type: 'stream.keepalive',
      messageId,
      sequence: getSequence(),
      payload: {},
    };
    sendSSEEvent(res, event);
  }, intervalMs);
}

/**
 * Stream context manager for tracking sequence numbers
 */
export class StreamContextManager {
  private sequence: number = 0;
  private messageId: string;
  private blockId: string | null = null;

  constructor(messageId: string) {
    this.messageId = messageId;
  }

  getMessageId(): string {
    return this.messageId;
  }

  nextSequence(): number {
    return ++this.sequence;
  }

  getCurrentSequence(): number {
    return this.sequence;
  }

  setBlockId(blockId: string): void {
    this.blockId = blockId;
  }

  getBlockId(): string | null {
    return this.blockId;
  }

  clearBlockId(): void {
    this.blockId = null;
  }
}
