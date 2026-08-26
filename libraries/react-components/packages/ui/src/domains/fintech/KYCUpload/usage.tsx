import { KYCUpload, type KycDocument } from './KYCUpload';
import sample from './sample.json';

export function KYCUploadUsage() {
  const document = sample.document as KycDocument;

  return (
    <KYCUpload
      document={document}
      onUpload={async (file) => {
        // Multipart, not base64 in JSON: a 5 MB photo becomes 6.7 MB when
        // base64-encoded, and identity documents are large.
        const body = new FormData();
        body.append('document', file);
        body.append('documentType', document.id);

        const response = await fetch('/api/kyc/documents', { method: 'POST', body });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
