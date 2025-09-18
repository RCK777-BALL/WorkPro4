export interface Attachment {
  id: string;
  tenantId: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: string;
}

export interface CreateAttachmentRequest {
  kind: 'base64' | 'url';
  filename: string;
  contentType: string;
  data?: string; // base64 data
  url?: string; // external URL
}