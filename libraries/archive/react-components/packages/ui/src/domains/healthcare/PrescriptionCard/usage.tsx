import { PrescriptionCard, type Prescription } from './PrescriptionCard';
import sample from './sample.json';

export function PrescriptionCardUsage() {
  const prescription = sample.prescription as Prescription;

  return (
    <PrescriptionCard
      prescription={prescription}
      onDownload={() => {
        // Fetch the signed PDF from the server. Never generate a prescription
        // document client-side — the signature is the point.
      }}
      onOrderRefill={() => {
        /* open the pharmacy flow */
      }}
    />
  );
}
