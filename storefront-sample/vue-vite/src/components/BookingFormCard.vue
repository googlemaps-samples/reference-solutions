<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type {
  AppointmentConfirmation,
  ClinicVenueData,
  ComputedRouteSummary,
  VisitType,
} from '../types/storefront';

const props = defineProps<{
  venue: ClinicVenueData | null;
  routeSummary: ComputedRouteSummary | null;
}>();

const specialties = [
  'General & Preventive Dentistry',
  'Cosmetic Dentistry & Whitening',
  'Endodontics & Root Canal',
  'Orthodontics & Clear Aligners',
  'Periodontics & Dental Implants',
  'Same-Day Dental Consultation',
];

const timeSlots = [
  '09:00 AM',
  '10:30 AM',
  '01:00 PM',
  '02:30 PM',
  '04:00 PM',
];

function getDefaultDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

const form = reactive({
  patientName: '',
  contactInfo: '',
  specialty: specialties[0],
  visitType: 'in-clinic' as VisitType,
  preferredDate: getDefaultDateString(),
  preferredTime: timeSlots[1],
});

const confirmation = ref<AppointmentConfirmation | null>(null);
const validationError = ref<string | null>(null);

const etaSummaryText = computed(() => {
  if (!props.routeSummary) return null;
  return `${props.routeSummary.durationText} (${props.routeSummary.distanceText}) via ${props.routeSummary.travelMode.toLowerCase()}`;
});

function handleSubmit() {
  validationError.value = null;

  if (!form.patientName.trim() || !form.contactInfo.trim()) {
    validationError.value = 'Please enter your name and email or phone number.';
    return;
  }

  const refCode = `SF-${Math.floor(100000 + Math.random() * 900000)}`;
  confirmation.value = {
    referenceCode: refCode,
    patientName: form.patientName.trim(),
    contactInfo: form.contactInfo.trim(),
    specialty: form.specialty,
    visitType: form.visitType,
    preferredDate: form.preferredDate,
    preferredTime: form.preferredTime,
    clinicName: props.venue?.displayName ?? '450 Sutter Dental Studio',
    clinicAddress:
      props.venue?.formattedAddress ?? '450 Sutter St, San Francisco, CA 94108',
    etaSummary: etaSummaryText.value,
  };
}

function resetBooking() {
  confirmation.value = null;
  validationError.value = null;
}
</script>

<template>
  <section class="panel-card">
    <div class="panel-header-row">
      <div>
        <span class="eyebrow">Appointment Scheduling</span>
        <h2 class="panel-title">Book Your Appointment</h2>
      </div>
    </div>

    <div
      v-if="confirmation"
      class="booking-confirmation"
      data-testid="booking-confirmation"
      role="status"
    >
      <div class="confirmation-badge">Confirmed Request · {{ confirmation.referenceCode }}</div>
      <h3>We've reserved your request, {{ confirmation.patientName }}</h3>
      <dl class="confirmation-grid">
        <div>
          <dt>Specialty</dt>
          <dd>{{ confirmation.specialty }}</dd>
        </div>
        <div>
          <dt>Visit Type</dt>
          <dd>
            {{
              confirmation.visitType === 'home-visit'
                ? 'Local Home Visit (SF 3.5 km)'
                : 'In-Clinic Visit'
            }}
          </dd>
        </div>
        <div>
          <dt>Date &amp; Time</dt>
          <dd>{{ confirmation.preferredDate }} at {{ confirmation.preferredTime }}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{{ confirmation.clinicName }} — {{ confirmation.clinicAddress }}</dd>
        </div>
        <div v-if="confirmation.etaSummary">
          <dt>Estimated Travel</dt>
          <dd>{{ confirmation.etaSummary }}</dd>
        </div>
      </dl>
      <button type="button" class="secondary-btn" @click="resetBooking">
        Schedule Another Appointment
      </button>
    </div>

    <form
      v-else
      class="booking-form"
      data-testid="booking-form"
      @submit.prevent="handleSubmit"
    >
      <div class="form-row">
        <label class="field-label" for="booking-patient-name">Full Name</label>
        <input
          id="booking-patient-name"
          v-model="form.patientName"
          type="text"
          class="text-input"
          placeholder="Jordan Lee"
          required
        />
      </div>

      <div class="form-row">
        <label class="field-label" for="booking-contact">Email or Phone</label>
        <input
          id="booking-contact"
          v-model="form.contactInfo"
          type="text"
          class="text-input"
          placeholder="jordan@example.com or (415) 555-0148"
          required
        />
      </div>

      <div class="form-row">
        <label class="field-label" for="booking-specialty">Dental Specialty</label>
        <select id="booking-specialty" v-model="form.specialty" class="text-input">
          <option v-for="item in specialties" :key="item" :value="item">
            {{ item }}
          </option>
        </select>
      </div>

      <div class="form-row">
        <span class="field-label">Visit Format</span>
        <div class="visit-radio-group">
          <label class="radio-card" :class="{ selected: form.visitType === 'in-clinic' }">
            <input v-model="form.visitType" type="radio" value="in-clinic" />
            <span>
              <strong>In-Clinic Visit</strong>
              <small>450 Sutter St Suite</small>
            </span>
          </label>

          <label class="radio-card" :class="{ selected: form.visitType === 'home-visit' }">
            <input v-model="form.visitType" type="radio" value="home-visit" />
            <span>
              <strong>Home Visit</strong>
              <small>Within 3.5 km SF radius</small>
            </span>
          </label>
        </div>
      </div>

      <div class="form-two-col">
        <div class="form-row">
          <label class="field-label" for="booking-date">Preferred Date</label>
          <input
            id="booking-date"
            v-model="form.preferredDate"
            type="date"
            class="text-input"
            required
          />
        </div>

        <div class="form-row">
          <label class="field-label" for="booking-time">Time Slot</label>
          <select id="booking-time" v-model="form.preferredTime" class="text-input">
            <option v-for="slot in timeSlots" :key="slot" :value="slot">
              {{ slot }}
            </option>
          </select>
        </div>
      </div>

      <p v-if="validationError" class="form-error" role="alert">
        {{ validationError }}
      </p>

      <button type="submit" class="primary-submit-btn">
        Request Appointment
      </button>

      <p class="privacy-footnote">
        Scheduling metadata only (name, contact, specialty, time). No medical records or PHI are transmitted to Google Maps Platform APIs.
      </p>
    </form>
  </section>
</template>
