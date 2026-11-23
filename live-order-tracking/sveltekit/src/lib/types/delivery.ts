export interface LatLngPoint {
	lat: number;
	lng: number;
}

export interface OrderItem {
	id: string;
	name: string;
	category: 'Restaurant' | 'Grocery';
	quantity: number;
	unitPrice: number;
}

export interface ValidationVerdict {
	validationGranularity: string;
	geocodeGranularity: string;
	inputGranularity: string;
	addressComplete: boolean;
	hasUnconfirmedComponents: boolean;
	hasInferredComponents: boolean;
	hasReplacedComponents: boolean;
}

export interface ValidationMetadata {
	business: boolean;
	residential: boolean;
	poBox: boolean;
}

export interface ValidationUspsSummary {
	dpvConfirmation: string;
	carrierRoute: string;
	county: string;
	cassProcessed: boolean;
	standardizedFirstLine: string;
	standardizedCityStateZip: string;
}

export interface AddressValidationResult {
	inputAddress: string;
	formattedAddress: string;
	placeId: string;
	plusCode: string;
	location: LatLngPoint;
	verdict: ValidationVerdict;
	metadata: ValidationMetadata | null;
	uspsData: ValidationUspsSummary | null;
	deliverable: boolean;
	deliverabilityReason: string;
	source: 'js-sdk' | 'bff';
}

export interface RouteStepSummary {
	instruction: string;
	distanceMeters: number;
	durationSeconds: number;
}

export interface RouteComputationResult {
	distanceMeters: number;
	durationSeconds: number;
	staticDurationSeconds: number;
	encodedPolyline: string;
	path: LatLngPoint[];
	steps: RouteStepSummary[];
	source: 'js-sdk' | 'bff';
}

export interface DeliveryFeeTier {
	eligible: boolean;
	insidePolygon: boolean;
	withinDistanceLimit: boolean;
	tierLabel: string;
	fee: number | null;
	reason: string;
}

export type CourierStage = 'idle' | 'preparing' | 'en_route' | 'arriving' | 'delivered';

export interface CourierProgress {
	stage: CourierStage;
	progressPercent: number;
	currentPosition: LatLngPoint;
	headingDegrees: number;
	remainingDistanceMeters: number;
	remainingEtaSeconds: number;
	currentInstruction: string;
	running: boolean;
}

export interface PlacedOrder {
	orderId: string;
	placedAt: string;
	customerAddress: string;
	items: OrderItem[];
	subtotal: number;
	deliveryFee: number;
	tax: number;
	total: number;
	distanceMeters: number;
	etaSeconds: number;
	staticMapUrl: string;
}
