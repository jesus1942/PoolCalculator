export interface ClientStoryProject {
  name: string;
  clientName: string;
  status?: string;
  createdAt?: string;
  totalCost?: number;
  materialCost?: number;
  laborCost?: number;
}

export interface ClientStoryEntry {
  id: string;
  type?: 'PROJECT_UPDATE';
  createdAt: string;
  title: string;
  description?: string | null;
  category?: string;
  images?: string[];
}

export interface ClientStoryComment {
  id: string;
  authorName: string;
  kind: 'COMMENT' | 'PRAISE' | 'SUGGESTION' | 'QUESTION';
  body: string;
  reply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
}

/** Data-only presentation: safe to reuse for a clearly labelled demonstration.
 * Supply only entries the project owner has published for this client.
 * demo disables message submission. onSendComment must reject on failure.
 */
export interface ClientStoryProps {
  project: ClientStoryProject;
  entries: ClientStoryEntry[];
  comments: ClientStoryComment[];
  onSendComment?: (input: { body: string; kind: ClientStoryComment['kind'] }) => Promise<void>;
  exportUrl?: string;
  demo?: boolean;
  backHref?: string;
}
