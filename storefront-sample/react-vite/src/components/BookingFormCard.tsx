import React, { useState } from 'react';
import type {
  BookingSubmission,
  ClinicVenueData,
  OriginLocation,
} from '../types';
import { COVERAGE_RADIUS_METERS, formatDistanceMeters } from '../utils/geo';

interface BookingFormCardProps {
  clinic: ClinicVenueData | null;
  origin: OriginLocation | null;
  distanceFromOriginMeters: number | null;
}

const SPECIALTIES = [
  'General & Preventive Dentistry',
  'Cosmetic Dentistry & Veneers',
  'Orthodontics & Invisalign',
  'Implants & Oral Surgery',
  'Endodontics & Root Canal Care',
  'Pediatric & Family Dentistry',
];

const TIME_SLOTS = [
  '09:00 AM',
  '10:30 AM',
  '01:00 PM',
  '02:30 PM',
  '04:15 PM',
];

function getTomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export const BookingFormCard: React.FC<BookingFormCardProps> = ({
  clinic,
  origin,
  distanceFromOriginMeters,
}) => {
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [visitType, setVisitType] = useState<'in-clinic' | 'home-visit'>(
    'in-clinic'
  );
  const [patientName, setPatientName] = useState('');
  const [contact, setContact] = useState('');
  const [date, setDate] = useState(getTomorrowIsoDate);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[1]);
  const [confirmation, setConfirmation] = useState<BookingSubmission | null>(
    null
  );

  const withinCoverage =
    distanceFromOriginMeters != null &&
    distanceFromOriginMeters <= COVERAGE_RADIUS_METERS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    setConfirmation({
      referenceId: `SFD-${randomCode}`,
      patientName: patientName.trim() || 'Guest Patient',
      contact: contact.trim() || 'Not provided',
      specialty,
      visitType,
      date,
      timeSlot,
      originAddress: origin?.address ?? 'San Francisco, CA',
      clinicName: clinic?.name ?? 'San Francisco Dental Clinic',
    });
  };

  return (
    <section className="card" aria-label="Book Dental Appointment">
      <div className="card-header">
        <h2 className="card-title">Book Appointment</h2>
        <span className="card-badge">Instant Request</span>
      </div>

      <form
        id="booking-form"
        data-testid="booking-form"
        className="booking-form"
        onSubmit={handleSubmit}
      >
        <div className="form-group">
          <label className="form-label" htmlFor="booking-specialty">
            Dental Specialty
          </label>
          <select
            id="booking-specialty"
            className="form-select"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          >
            {SPECIALTIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <span className="form-label">Visit Type</span>
          <div className="visit-type-radio-group">
            <label
              className={`visit-radio-label ${visitType === 'in-clinic' ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="visitType"
                value="in-clinic"
                checked={visitType === 'in-clinic'}
                onChange={() => setVisitType('in-clinic')}
              />
              <span>In-Clinic Visit</span>
            </label>

            <label
              className={`visit-radio-label ${visitType === 'home-visit' ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="visitType"
                value="home-visit"
                checked={visitType === 'home-visit'}
                onChange={() => setVisitType('home-visit')}
              />
              <span>Home Visit (5 km)</span>
            </label>
          </div>
        </div>

        {visitType === 'home-visit' && distanceFromOriginMeters != null && (
          <div
            className={`eligibility-banner ${withinCoverage ? 'eligible' : 'outside'}`}
          >
            {withinCoverage
              ? `Eligible: ${origin?.name ?? 'Your location'} is ${formatDistanceMeters(distanceFromOriginMeters)} from the clinic (within the 5,000 m home-visit zone).`
              : `Outside zone: ${origin?.name ?? 'Your location'} is ${formatDistanceMeters(distanceFromOriginMeters)} away, beyond our 5 km mobile coverage radius. Consider switching to In-Clinic Visit.`}
          </div>
        )}

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="booking-date">
              Preferred Date
            </label>
            <input
              id="booking-date"
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="booking-time">
              Time Slot
            </label>
            <select
              id="booking-time"
              className="form-select"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="booking-name">
            Patient Name
          </label>
          <input
            id="booking-name"
            type="text"
            className="form-input"
            placeholder="Alex Rivera"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="booking-contact">
            Email or Phone
          </label>
          <input
            id="booking-contact"
            type="text"
            className="form-input"
            placeholder="alex@example.com or (415) 555-0192"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
          />
        </div>

        <button
          id="booking-submit-btn"
          data-testid="booking-submit-btn"
          type="submit"
          className="submit-btn"
        >
          Confirm Appointment Request
        </button>
      </form>

      {confirmation && (
        <div
          id="booking-confirmation"
          data-testid="booking-confirmation"
          className="booking-confirmation"
          role="status"
          aria-live="polite"
        >
          <strong>
            Appointment Confirmed ({confirmation.referenceId})
          </strong>
          <div>
            {confirmation.patientName} — {confirmation.specialty} (
            {confirmation.visitType === 'home-visit'
              ? 'Mobile Home Visit'
              : 'In-Clinic Visit'}
            )
          </div>
          <div>
            {confirmation.date} at {confirmation.timeSlot} •{' '}
            {confirmation.clinicName}
          </div>
        </div>
      )}
    </section>
  );
};
