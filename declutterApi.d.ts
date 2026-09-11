import type { IncomingMessage, ServerResponse } from 'http';

export declare const DEFAULT_INBOX: string;
export declare const DEFAULT_OUTBOX: string;

export declare function getResolvedPaths(): {
  inbox: string;
  outbox: string;
};

export declare function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean>;
