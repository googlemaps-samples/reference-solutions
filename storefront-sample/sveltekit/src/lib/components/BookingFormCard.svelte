<script lang="ts">
	import type { BookingRecord } from '$lib/types/storefront';

	interface Props {
		clinicName: string;
	}

	let { clinicName }: Props = $props();

	let patientName = $state('');
	let email = $state('');
	let phone = $state('');
	let specialty = $state('General & Preventive Dentistry');
	let visitType = $state<'in-clinic' | 'home-visit'>('in-clinic');
	let preferredDate = $state(getDefaultTomorrowIso());
	let preferredTimeSlot = $state('10:30 AM');
	let notes = $state('');
	let confirmation = $state<BookingRecord | null>(null);

	function getDefaultTomorrowIso(): string {
		const d = new Date();
		d.setDate(d.getDate() + 1);
		return d.toISOString().slice(0, 10);
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!patientName.trim() || !email.trim()) return;

		const code = `SF-${Math.floor(100000 + Math.random() * 900000)}`;
		confirmation = {
			confirmationCode: code,
			patientName: patientName.trim(),
			email: email.trim(),
			phone: phone.trim() || 'Not provided',
			specialty,
			visitType,
			preferredDate,
			preferredTimeSlot,
			notes: notes.trim(),
			createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		};
	}

	function resetForm() {
		confirmation = null;
	}
</script>

<section class="card">
	<div class="card-header">
		<div>
			<p class="eyebrow">Online Scheduling</p>
			<h2 class="card-title">Request an Appointment</h2>
		</div>
		<span class="pill-tag">Same-Week Slots</span>
	</div>

	{#if confirmation}
		<div class="confirmation-box" data-testid="booking-confirmation">
			<div class="confirmation-head">
				<span class="check-badge" aria-hidden="true">✓</span>
				<div>
					<h3>Appointment Request Received</h3>
					<p class="confirmation-code">Reference #{confirmation.confirmationCode}</p>
				</div>
			</div>
			<dl class="confirmation-details">
				<div>
					<dt>Patient</dt>
					<dd>{confirmation.patientName}</dd>
				</div>
				<div>
					<dt>Specialty</dt>
					<dd>{confirmation.specialty}</dd>
				</div>
				<div>
					<dt>Visit Type</dt>
					<dd>
						{confirmation.visitType === 'in-clinic'
							? `In-Clinic (${clinicName})`
							: 'Mobile Home Visit (3.5 km SF radius)'}
					</dd>
				</div>
				<div>
					<dt>Requested Slot</dt>
					<dd>{confirmation.preferredDate} at {confirmation.preferredTimeSlot}</dd>
				</div>
			</dl>
			<p class="confirmation-note">
				A scheduling coordinator will confirm your visit details via {confirmation.email}.
			</p>
			<button type="button" class="secondary-btn" onclick={resetForm}>
				Book Another Appointment
			</button>
		</div>
	{:else}
		<form class="booking-form" data-testid="booking-form" onsubmit={handleSubmit}>
			<div class="form-row">
				<div class="form-group">
					<label class="field-label" for="patient-name">Full Name</label>
					<input
						id="patient-name"
						type="text"
						required
						placeholder="Jordan Rivera"
						bind:value={patientName}
					/>
				</div>
				<div class="form-group">
					<label class="field-label" for="patient-email">Email</label>
					<input
						id="patient-email"
						type="email"
						required
						placeholder="jordan@example.com"
						bind:value={email}
					/>
				</div>
			</div>

			<div class="form-row">
				<div class="form-group">
					<label class="field-label" for="patient-phone">Phone (Optional)</label>
					<input
						id="patient-phone"
						type="tel"
						placeholder="(415) 555-0148"
						bind:value={phone}
					/>
				</div>
				<div class="form-group">
					<label class="field-label" for="dental-specialty">Specialty</label>
					<select id="dental-specialty" bind:value={specialty}>
						<option>General &amp; Preventive Dentistry</option>
						<option>Cosmetic &amp; Veneers</option>
						<option>Orthodontics &amp; Clear Aligners</option>
						<option>Endodontics &amp; Implants</option>
						<option>Periodontics &amp; Oral Surgery</option>
					</select>
				</div>
			</div>

			<fieldset class="visit-type-fieldset">
				<legend class="field-label">Visit Format</legend>
				<div class="radio-grid">
					<label class="radio-card" class:is-checked={visitType === 'in-clinic'}>
						<input
							type="radio"
							name="visitType"
							value="in-clinic"
							bind:group={visitType}
						/>
						<span>
							<strong>In-Clinic Visit</strong>
							<small>450 Sutter St, Union Square</small>
						</span>
					</label>
					<label class="radio-card" class:is-checked={visitType === 'home-visit'}>
						<input
							type="radio"
							name="visitType"
							value="home-visit"
							bind:group={visitType}
						/>
						<span>
							<strong>Home Visit</strong>
							<small>Within 3.5 km SF coverage</small>
						</span>
					</label>
				</div>
			</fieldset>

			<div class="form-row">
				<div class="form-group">
					<label class="field-label" for="preferred-date">Preferred Date</label>
					<input
						id="preferred-date"
						type="date"
						required
						bind:value={preferredDate}
					/>
				</div>
				<div class="form-group">
					<label class="field-label" for="preferred-slot">Time Slot</label>
					<select id="preferred-slot" bind:value={preferredTimeSlot}>
						<option>09:00 AM</option>
						<option>10:30 AM</option>
						<option>01:00 PM</option>
						<option>03:15 PM</option>
						<option>04:45 PM</option>
					</select>
				</div>
			</div>

			<div class="form-group">
				<label class="field-label" for="scheduling-notes">Scheduling Note (Non-Medical)</label>
				<textarea
					id="scheduling-notes"
					rows="2"
					placeholder="Preferred language, parking question, or callback window..."
					bind:value={notes}
				></textarea>
			</div>

			<p class="compliance-footnote">
				Scheduling metadata only — do not submit sensitive medical or HIPAA records.
			</p>

			<button type="submit" class="primary-btn">
				Confirm Appointment Request
			</button>
		</form>
	{/if}
</section>
