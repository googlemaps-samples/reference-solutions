'use client';

import React, { useMemo, useState } from 'react';
import { Receipt, MapPin, AlertCircle } from 'lucide-react';
import {
  BasketItem,
  KITCHEN_HUB,
  LatLngLiteral,
} from '@/lib/delivery';

interface OrderReceiptCardProps {
  items: BasketItem[];
  customerAddress: string;
  customerLocation: LatLngLiteral | null;
  encodedPolyline: string;
  deliveryFeeUsd: number | null;
  isDeliverable: boolean;
  orderNumber: string;
  orderStatus: 'checkout' | 'preparing' | 'en_route' | 'delivered';
  distanceKm: number | null;
  etaText: string | null;
}

export function OrderReceiptCard({
  items,
  customerAddress,
  customerLocation,
  encodedPolyline,
  deliveryFeeUsd,
  isDeliverable,
  orderNumber,
  orderStatus,
  distanceKm,
  etaText,
}: OrderReceiptCardProps) {
  const [imgError, setImgError] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items]
  );
  const tax = Number((subtotal * 0.1025).toFixed(2));
  const deliveryFee = isDeliverable && deliveryFeeUsd !== null ? deliveryFeeUsd : 0;
  const total = subtotal + tax + deliveryFee;

  const staticMapUrl = useMemo(() => {
    if (!customerLocation) return '';
    const params = new URLSearchParams({
      originLat: String(KITCHEN_HUB.location.lat),
      originLng: String(KITCHEN_HUB.location.lng),
      destLat: String(customerLocation.lat),
      destLng: String(customerLocation.lng),
    });
    if (encodedPolyline) {
      params.set('polyline', encodedPolyline);
    }
    return `/api/maps/static-receipt?${params.toString()}`;
  }, [customerLocation, encodedPolyline]);

  return (
    <section
      id="order-receipt-card"
      data-testid="order-receipt-card"
      className="panel-card receipt-card"
    >
      <div className="card-header">
        <div className="card-title-group">
          <Receipt size={18} className="card-icon" />
          <div>
            <h2 className="card-title">Order Receipt &amp; Route Summary</h2>
            <p className="card-subtitle">
              Order #{orderNumber} · {orderStatus.replace('_', ' ').toUpperCase()}
            </p>
          </div>
        </div>
        <span className="pill-neutral">Maps Static API</span>
      </div>

      {/* Static Route Summary Map Preview via Next.js Server Proxy */}
      <div className="static-map-frame">
        {staticMapUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={staticMapUrl}
            id="static-receipt-map-img"
            data-testid="static-receipt-map-img"
            src={staticMapUrl}
            alt={`Static route map from ${KITCHEN_HUB.name} to ${customerAddress}`}
            className="static-receipt-img"
            width={600}
            height={260}
            onError={() => setImgError(true)}
            onLoad={() => setImgError(false)}
          />
        ) : (
          <div
            id="static-receipt-map-img"
            data-testid="static-receipt-map-img"
            className="static-map-fallback"
          >
            <AlertCircle size={18} />
            <span>
              {staticMapUrl
                ? 'Static route preview unavailable (verify Maps Static API is enabled on your key).'
                : 'Validate a Chicago address to render the Maps Static API route receipt.'}
            </span>
          </div>
        )}
        <div className="static-map-caption">
          <MapPin size={13} />
          <span className="truncate">{customerAddress || 'Pending address'}</span>
          {distanceKm !== null && etaText && (
            <span className="caption-metrics">
              {distanceKm.toFixed(1)} km · {etaText}
            </span>
          )}
        </div>
      </div>

      {/* Itemized Kitchen & Grocery Basket */}
      <ul className="receipt-items">
        {items.map((item) => (
          <li key={item.id} className="receipt-item-row">
            <div>
              <span className="item-name">
                {item.quantity}× {item.name}
              </span>
              <span className="item-cat">{item.category}</span>
            </div>
            <span className="item-price">
              ${(item.unitPrice * item.quantity).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      <div className="receipt-totals">
        <div className="total-row">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="total-row">
          <span>Chicago Tax (10.25%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="total-row">
          <span>Tiered Delivery Fee</span>
          <span>
            {isDeliverable && deliveryFeeUsd !== null
              ? `$${deliveryFeeUsd.toFixed(2)}`
              : 'Out of Zone'}
          </span>
        </div>
        <div className="total-row grand-total">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </section>
  );
}
