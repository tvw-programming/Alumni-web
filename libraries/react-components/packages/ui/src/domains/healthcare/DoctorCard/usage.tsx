import { parseMoney } from '../../../foundation';

import { DoctorCard, type Doctor } from './DoctorCard';
import sample from './sample.json';

export function DoctorCardUsage() {
  const doctor: Doctor = {
    ...sample.doctor,
    consultationFee: parseMoney(sample.doctor.consultationFee),
  };

  return (
    <DoctorCard
      doctor={doctor}
      onPress={() => {
        /* open the profile */
      }}
      onBook={() => {
        /* open AppointmentSlotGrid */
      }}
    />
  );
}
