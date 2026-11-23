'use client';

import { useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, Home, Building2 } from 'lucide-react';
import {
  APPOINTMENT_TIME_SLOTS,
  DENTAL_SPECIALTIES,
  HOME_VISIT_RADIUS_METERS,
} from '@/lib/constants';
import type {
  BookingConfirmation,
  LatLngLiteral,
  OriginLocation,
  VisitType,
} from '@/lib/types';

interface BookingFormCardProps {
  clinicLocation: LatLngLiteral;
  origin: OriginLocation;
}

function haversineMeters(a: LatLngLiteral, b: LatLngLiteral): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function defaultTomorrowDate(): string {
  const tomorrow = new Date(Date.now() + 86400000);
  return tomorrow.toISOString().slice(0, 10);
}

export function BookingFormCard({ clinicLocation, origin }: BookingFormCardProps) {
  const [visitType, setVisitType] = useState<VisitType>('in-clinic');
  const [specialty, setSpecialty] = useState<string>(DENTAL_SPECIALTIES[0]);
  const [date, setDate] = useState<string>(defaultTomorrowDate);
  const [timeSlot, setTimeSlot] = useState<string>(APPOINTMENT_TIME_SLOTS[1]);
  const [patientName, setPatientName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const originDistanceKm = useMemo(
    () => haversineMeters(origin.location, clinicLocation) / 1000,
    [origin.location, clinicLocation]
  );
  const withinHomeVisitZone =
    originDistanceKm * 1000 <= HOME_VISIT_RADIUS_METERS;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = patientName.trim() || 'Patient Guest';
    const randomCode = `SF-${Math.floor(100000 + Math.random() * 900000)}`;

    setConfirmation({
      confirmationCode: randomCode,
      patientName: trimmedName,
      specialty,
      visitType,
      date,
      timeSlot,
      originAddress: visitType === 'home-visit' ? origin.address : undefined,
    });
  };

  return (
    <section className="panel-card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Appointment Scheduling</div>
          <h2 className="card-title">Book a Dental Consultation</h2>
        </div>
        <CalendarCheck size={18} color="#0f766e" />
      </div>

      {confirmation ? (
        <div className="booking-confirmation" data-testid="booking-confirmation">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color="#166534" />
            <strong style={{ fontSize: 14, color: '#166534' }}>
              Appointment Request Received
            </strong>
          </div>
          <div className="confirmation-code">
            Confirmation #{confirmation.confirmationCode}
          </div>
          <p style={{ fontSize: 13, color: '#14532d', lineHeight: 1.45 }}>
            Thank you, <strong>{confirmation.patientName}</strong>. Your{' '}
            <strong>
              {confirmation.visitType === 'in-clinic'
                ? 'In-Clinic'
                : 'Local Home Visit'}
            </strong>{' '}
            request for <strong>{confirmation.specialty}</strong> on{' '}
            <strong>{confirmation.date}</strong> at{' '}
            <strong>{confirmation.timeSlot}</strong> has been logged.
          </p>
          <button
            type="button"
            className="hours-toggle-btn"
            onClick={() => setConfirmation(null)}
          >
            Schedule Another Visit
          </button>
        </div>
      ) : (
        <form
          className="booking-form"
          data-testid="booking-form"
          onSubmit={handleSubmit}
        >
          <div className="form-field">
            <span className="form-label">Visit Format</span>
            <div className="visit-type-group">
              <label
                className={`visit-type-option ${
                  visitType === 'in-clinic' ? 'selected' : ''
                }`}
              >
                <input
                  type="radio"
                  name="visitType"
                  value="in-clinic"
                  checked={visitType === 'in-clinic'}
                  onChange={() => setVisitType('in-clinic')}
                />
                <Building2 size={14} />
                <span>In-Clinic</span>
              </label>

              <label
                className={`visit-type-option ${
                  visitType === 'home-visit' ? 'selected' : ''
                }`}
              >
                <input
                  type="radio"
                  name="visitType"
                  value="home-visit"
                  checked={visitType === 'home-visit'}
                  onChange={() => setVisitType('home-visit')}
                />
                <Home size={14} />
                <span>Home Visit</span>
              </label>
            </div>
          </div>

          {visitType === 'home-visit' && (
            <div className={`coverage-hint ${withinHomeVisitZone ? '' : 'outside'}`}>
              {withinHomeVisitZone
                ? `Your selected address (${originDistanceKm.toFixed(
                    1
                  )} km away) is inside our 3.5 km San Francisco home-visit zone.`
                : `Your selected address is ${originDistanceKm.toFixed(
                    1
                  )} km away — outside the standard 3.5 km home-visit radius. In-clinic care is recommended.`}
            </div>
          )}

          <div className="form-field">
            <label className="form-label" htmlFor="booking-specialty">
              Dental Specialty
            </label>
            <select
              id="booking-specialty"
              className="form-select"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            >
              {DENTAL_SPECIALTIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row-2">
            <div className="form-field">
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

            <div className="form-field">
              <label className="form-label" htmlFor="booking-time">
                Time Slot
              </label>
              <select
                id="booking-time"
                className="form-select"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
              >
                {APPOINTMENT_TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="booking-name">
              Full Name
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

          <div className="form-row-2">
            <div className="form-field">
              <label className="form-label" htmlFor="booking-email">
                Email
              </label>
              <input
                id="booking-email"
                type="email"
                className="form-input"
                placeholder="alex@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="booking-phone">
                Phone
              </label>
              <input
                id="booking-phone"
                type="tel"
                className="form-input"
                placeholder="(415) 555-0148"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <p className="privacy-note">
            Scheduling metadata only — please do not enter medical records or
            protected health information (PHI).
          </p>

          <button type="submit" className="submit-btn">
            Request Appointment
          </button>
        </form>
      )}
    </section>
  );
}
