import type { FleetVehicle, LogisticsHub } from '$lib/types/logistics';

export const DALLAS_CENTER = { lat: 32.7767, lng: -96.797 };

export const DALLAS_DEPOT: LogisticsHub = {
	id: 'dallas-central-depot',
	name: 'Dallas Central Dispatch Depot',
	address: 'Downtown Freight Staging Yard, Dallas, TX',
	location: { lat: 32.7767, lng: -96.797 },
	isDepot: true
};

export const DALLAS_FLEET_VEHICLES: FleetVehicle[] = [
	{
		id: 'TRK-104',
		callsign: 'TRK-104 · Northbound Express',
		driver: 'M. Alvarez',
		vehicleType: '53ft Reefer Semi',
		status: 'en-route',
		speedMph: 58,
		headingDeg: 322,
		corridor: 'I-35E Stemmons Corridor',
		nextStop: 'Irving / DFW Freight Hub',
		etaLabel: '14 min',
		delayMinutes: 0,
		position: { lat: 32.8035, lng: -96.827 },
		rawGpsTrace: [
			{ lat: 32.7834, lng: -96.8115 },
			{ lat: 32.7849, lng: -96.8139 },
			{ lat: 32.7875, lng: -96.8149 },
			{ lat: 32.7891, lng: -96.8172 },
			{ lat: 32.7919, lng: -96.8181 },
			{ lat: 32.7936, lng: -96.8205 },
			{ lat: 32.7965, lng: -96.8214 },
			{ lat: 32.7983, lng: -96.8239 },
			{ lat: 32.8014, lng: -96.8249 },
			{ lat: 32.8035, lng: -96.827 }
		]
	},
	{
		id: 'TRK-209',
		callsign: 'TRK-209 · East Corridor Shuttle',
		driver: 'K. Brooks',
		vehicleType: '26ft Box Truck',
		status: 'delayed',
		speedMph: 18,
		headingDeg: 72,
		corridor: 'I-30 East Mixmaster',
		nextStop: 'Mesquite Intermodal Hub',
		etaLabel: '31 min (+9m)',
		delayMinutes: 9,
		position: { lat: 32.7799, lng: -96.7732 },
		rawGpsTrace: [
			{ lat: 32.7715, lng: -96.7922 },
			{ lat: 32.7717, lng: -96.7893 },
			{ lat: 32.7735, lng: -96.7872 },
			{ lat: 32.7741, lng: -96.784 },
			{ lat: 32.7763, lng: -96.7817 },
			{ lat: 32.7769, lng: -96.7785 },
			{ lat: 32.779, lng: -96.7763 },
			{ lat: 32.7799, lng: -96.7732 }
		]
	},
	{
		id: 'SHU-312',
		callsign: 'SHU-312 · South Logistics Loop',
		driver: 'R. Patel',
		vehicleType: 'Sprinter Cargo Van',
		status: 'en-route',
		speedMph: 52,
		headingDeg: 142,
		corridor: 'I-45 South Logistics',
		nextStop: 'South Dallas Fulfillment Hub',
		etaLabel: '11 min',
		delayMinutes: 0,
		position: { lat: 32.7589, lng: -96.774 },
		rawGpsTrace: [
			{ lat: 32.7718, lng: -96.7848 },
			{ lat: 32.7692, lng: -96.7824 },
			{ lat: 32.7678, lng: -96.7814 },
			{ lat: 32.7651, lng: -96.7789 },
			{ lat: 32.7635, lng: -96.7779 },
			{ lat: 32.7607, lng: -96.7754 },
			{ lat: 32.7589, lng: -96.774 }
		]
	},
	{
		id: 'VAN-405',
		callsign: 'VAN-405 · West End Staging',
		driver: 'D. Nguyen',
		vehicleType: 'EV Step Van',
		status: 'idle',
		speedMph: 0,
		headingDeg: 0,
		corridor: 'Downtown Depot Bay 4',
		nextStop: 'Awaiting Dispatch',
		etaLabel: 'Standby',
		delayMinutes: 0,
		position: { lat: 32.776, lng: -96.8077 },
		rawGpsTrace: [
			{ lat: 32.7756, lng: -96.8078 },
			{ lat: 32.7762, lng: -96.8071 },
			{ lat: 32.7758, lng: -96.8074 },
			{ lat: 32.7763, lng: -96.8079 },
			{ lat: 32.776, lng: -96.8077 }
		]
	},
	{
		id: 'TRK-518',
		callsign: 'TRK-518 · US-75 Corridor',
		driver: 'T. Washington',
		vehicleType: '48ft Dry Van',
		status: 'delayed',
		speedMph: 22,
		headingDeg: 18,
		corridor: 'US-75 Central Expy',
		nextStop: 'North Dallas Cross-Dock',
		etaLabel: '27 min (+7m)',
		delayMinutes: 7,
		position: { lat: 32.807, lng: -96.7838 },
		rawGpsTrace: [
			{ lat: 32.7923, lng: -96.7894 },
			{ lat: 32.7951, lng: -96.7878 },
			{ lat: 32.797, lng: -96.7877 },
			{ lat: 32.7999, lng: -96.786 },
			{ lat: 32.8018, lng: -96.7859 },
			{ lat: 32.8048, lng: -96.7842 },
			{ lat: 32.807, lng: -96.7838 }
		]
	}
];
