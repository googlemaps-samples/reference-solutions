import { CommonModule } from '@angular/common';
import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookingSubmission, VisitType } from '../../models/storefront.models';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card" aria-label="Appointment Booking">
      <div class="section-head">
        <span class="eyebrow">Appointment Request</span>
        <h2 class="card-title">Schedule Dental Visit</h2>
      </div>

      @if (confirmation(); as confirmed) {
        <div class="confirmation-box" data-testid="booking-confirmation">
          <div class="conf-badge">Booking Request Confirmed</div>
          <h3>Reference #{{ confirmed.confirmationCode }}</h3>
          <p class="conf-summary">
            Thank you, <strong>{{ confirmed.patientName }}</strong>. Your
            <strong>{{ confirmed.visitType === 'home-visit' ? 'Home Visit (SF 3.5 km)' : 'In-Clinic (450 Sutter St)' }}</strong>
            request for <strong>{{ confirmed.specialty }}</strong> on
            <strong>{{ confirmed.preferredDate }}</strong> at
            <strong>{{ confirmed.preferredTime }}</strong> has been logged.
          </p>
          <p class="conf-contact">
            Confirmation details sent to {{ confirmed.patientEmail }} &bull; {{ confirmed.patientPhone }}
          </p>
          <button type="button" class="secondary-btn" (click)="resetForm()">
            Book Another Appointment
          </button>
        </div>
      } @else {
        <form class="booking-form" data-testid="booking-form" (ngSubmit)="submitBooking()" #formRef="ngForm">
          <div class="form-row">
            <label for="specialty-select">Dental Specialty</label>
            <select
              id="specialty-select"
              name="specialty"
              [(ngModel)]="specialty"
              required
            >
              @for (item of specialties; track item) {
                <option [value]="item">{{ item }}</option>
              }
            </select>
          </div>

          <fieldset class="visit-type-group">
            <legend>Visit Setting</legend>
            <div class="radio-grid">
              <label class="radio-card" [class.selected]="visitType === 'in-clinic'">
                <input
                  type="radio"
                  name="visitType"
                  value="in-clinic"
                  [(ngModel)]="visitType"
                  (ngModelChange)="onVisitTypeSelected($event)"
                />
                <span>
                  <strong>In-Clinic</strong>
                  <small>450 Sutter St, SF</small>
                </span>
              </label>
              <label class="radio-card" [class.selected]="visitType === 'home-visit'">
                <input
                  type="radio"
                  name="visitType"
                  value="home-visit"
                  [(ngModel)]="visitType"
                  (ngModelChange)="onVisitTypeSelected($event)"
                />
                <span>
                  <strong>Home Visit</strong>
                  <small>Within 3.5 km SF radius</small>
                </span>
              </label>
            </div>
          </fieldset>

          <div class="two-col">
            <div class="form-row">
              <label for="visit-date">Preferred Date</label>
              <input
                id="visit-date"
                type="date"
                name="preferredDate"
                [(ngModel)]="preferredDate"
                required
              />
            </div>
            <div class="form-row">
              <label for="visit-time">Time Slot</label>
              <select
                id="visit-time"
                name="preferredTime"
                [(ngModel)]="preferredTime"
                required
              >
                @for (slot of timeSlots; track slot) {
                  <option [value]="slot">{{ slot }}</option>
                }
              </select>
            </div>
          </div>

          <div class="form-row">
            <label for="patient-name">Full Name</label>
            <input
              id="patient-name"
              type="text"
              name="patientName"
              [(ngModel)]="patientName"
              placeholder="Alex Rivera"
              required
            />
          </div>

          <div class="two-col">
            <div class="form-row">
              <label for="patient-email">Email</label>
              <input
                id="patient-email"
                type="email"
                name="patientEmail"
                [(ngModel)]="patientEmail"
                placeholder="alex@example.com"
                required
              />
            </div>
            <div class="form-row">
              <label for="patient-phone">Phone</label>
              <input
                id="patient-phone"
                type="tel"
                name="patientPhone"
                [(ngModel)]="patientPhone"
                placeholder="(415) 555-0192"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <label for="scheduling-notes">Scheduling Preferences (Optional)</label>
            <input
              id="scheduling-notes"
              type="text"
              name="notes"
              [(ngModel)]="notes"
              placeholder="Morning slot preferred; parking info needed"
            />
          </div>

          <p class="privacy-note">
            Scheduling metadata only. Please do not enter medical history or protected health information (PHI).
          </p>

          @if (validationError()) {
            <p class="validation-error">{{ validationError() }}</p>
          }

          <button type="submit" class="submit-btn">
            Request Appointment
          </button>
        </form>
      }
    </section>
  `,
  styles: [
    `
      .card {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        padding: 18px;
        box-shadow: var(--shadow-sm);
      }

      .section-head {
        margin-bottom: 12px;
      }

      .eyebrow {
        display: block;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--brand-primary);
        margin-bottom: 4px;
      }

      .card-title {
        font-size: 1.08rem;
        font-weight: 700;
      }

      .booking-form {
        display: grid;
        gap: 11px;
      }

      .form-row {
        display: grid;
        gap: 5px;
      }

      .form-row label,
      .visit-type-group legend {
        font-size: 0.79rem;
        font-weight: 600;
        color: var(--text-secondary);
      }

      .form-row input,
      .form-row select {
        width: 100%;
        padding: 9px 11px;
        border-radius: 9px;
        border: 1px solid var(--border-subtle);
        background: #ffffff;
        color: var(--text-primary);
        font-size: 0.88rem;
      }

      .form-row input:focus,
      .form-row select:focus {
        outline: 2px solid rgba(11, 110, 120, 0.2);
        border-color: var(--brand-primary);
      }

      .visit-type-group {
        border: none;
        padding: 0;
        margin: 0;
      }

      .visit-type-group legend {
        margin-bottom: 6px;
      }

      .radio-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .radio-card {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 9px 10px;
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        cursor: pointer;
        background: #ffffff;
        transition: all 0.15s ease;
      }

      .radio-card.selected {
        background: var(--brand-soft);
        border-color: var(--brand-primary);
      }

      .radio-card input {
        margin-top: 3px;
      }

      .radio-card strong {
        display: block;
        font-size: 0.84rem;
        color: var(--text-primary);
      }

      .radio-card small {
        display: block;
        font-size: 0.73rem;
        color: var(--text-secondary);
      }

      .two-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .privacy-note {
        margin: 0;
        font-size: 0.74rem;
        color: var(--text-muted);
        line-height: 1.4;
      }

      .validation-error {
        margin: 0;
        font-size: 0.8rem;
        color: var(--closed-text);
      }

      .submit-btn {
        width: 100%;
        padding: 11px 16px;
        border: none;
        border-radius: 10px;
        background: var(--brand-primary);
        color: #ffffff;
        font-size: 0.92rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .submit-btn:hover {
        background: var(--brand-primary-hover);
      }

      .confirmation-box {
        padding: 14px;
        border-radius: 12px;
        background: var(--success-bg);
        border: 1px solid #a7e3bf;
        color: var(--success-text);
      }

      .conf-badge {
        display: inline-block;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 6px;
      }

      .confirmation-box h3 {
        font-size: 1rem;
        margin-bottom: 6px;
      }

      .conf-summary,
      .conf-contact {
        font-size: 0.84rem;
        line-height: 1.45;
        margin: 0 0 8px;
      }

      .secondary-btn {
        padding: 8px 14px;
        border-radius: 8px;
        border: 1px solid var(--success-text);
        background: #ffffff;
        color: var(--success-text);
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
      }
    `,
  ],
})
export class BookingFormComponent {
  readonly visitTypeChange = output<VisitType>();

  readonly specialties = [
    'General & Preventive Dentistry',
    'Cosmetic & Whitening',
    'Orthodontics & Clear Aligners',
    'Periodontics & Dental Implants',
    'Same-Day Urgent Dental Care',
  ];

  readonly timeSlots = ['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '04:00 PM'];

  specialty = this.specialties[0];
  visitType: VisitType = 'in-clinic';
  preferredDate = this.defaultDate();
  preferredTime = this.timeSlots[1];
  patientName = '';
  patientEmail = '';
  patientPhone = '';
  notes = '';

  readonly validationError = signal<string | null>(null);
  readonly confirmation = signal<BookingSubmission | null>(null);

  onVisitTypeSelected(value: VisitType): void {
    this.visitTypeChange.emit(value);
  }

  submitBooking(): void {
    const name = this.patientName.trim();
    const email = this.patientEmail.trim();
    const phone = this.patientPhone.trim();

    if (!name || !email || !phone || !this.preferredDate) {
      this.validationError.set('Please complete your name, email, phone, and preferred date.');
      return;
    }

    this.validationError.set(null);
    const code = `SF-${Math.floor(100000 + Math.random() * 900000)}`;
    this.confirmation.set({
      confirmationCode: code,
      patientName: name,
      patientEmail: email,
      patientPhone: phone,
      specialty: this.specialty,
      visitType: this.visitType,
      preferredDate: this.preferredDate,
      preferredTime: this.preferredTime,
      notes: this.notes.trim(),
    });
  }

  resetForm(): void {
    this.confirmation.set(null);
    this.validationError.set(null);
  }

  private defaultDate(): string {
    const tomorrow = new Date(Date.now() + 86_400_000);
    return tomorrow.toISOString().slice(0, 10);
  }
}
