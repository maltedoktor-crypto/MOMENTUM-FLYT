/**
 * Momentum Pricing Engine (MVP)
 *
 * Configurable pricing engine for moving companies.
 * Returns a transparent breakdown for customer-facing quotes.
 */

const DEFAULTS = {
  pricing_mode: 'both',

  // Vehicle + mapping
  vehicle_capacity_m3: 25,
  vehicle_capacity_m2_reference: 90,
  standard_volume_m3: 25,

  // Base times for standard volume (minutes)
  base_load_time_minutes_for_standard_volume: 150,
  base_unload_time_minutes_for_standard_volume: 120,

  // Crew estimation
  base_min_employees: 2,
  max_m3_per_employee: 12,
  crew_factor_table: {
    2: 1.0,
    3: 1.25,
    4: 1.45,
    5: 1.6,
  },

  // Floors + elevator
  minutes_per_floor_per_m3: 0.8,
  elevator_multiplier: 0.5,
  floor_threshold_for_extra_employee: 4,

  // Transport pricing
  transport_pricing_mode: 'charge_time_from_departure', // charge_time_from_departure | charge_time_from_arrival | price_per_km_roundtrip
  price_per_km: 6,
  hourly_rate_total: 650,
  hourly_rate_per_employee: null,

  // Buffer
  buffer_minutes: 30,
  buffer_percent: null,

  // Heavy items
  heavy_80_enabled: true,
  heavy_80_weight_threshold_kg: 80,
  heavy_80_fee_per_item: 250,
  heavy_80_extra_minutes_per_item: 10,

  heavy_150_enabled: true,
  heavy_150_weight_threshold_kg: 150,
  heavy_150_fee_per_item: 650,
  heavy_150_extra_minutes_per_item: 20,
  heavy_150_min_employees_override: 3,
  heavy_150_enforce_min_employees: true,

  // Add-on fees list
  fees: [], // [{ fee_name, enabled, fee_type: 'fixed_amount'|'percent', fee_value, auto_apply? }]

  vat_rate: 0.25,
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const roundMoney = (n) => Math.round(Number(n) || 0);
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

export function normalizePricingConfig(cfg = {}) {
  const merged = {
    ...DEFAULTS,
    ...cfg,
  };
  merged.crew_factor_table = {
    ...DEFAULTS.crew_factor_table,
    ...(cfg.crew_factor_table || {}),
  };
  merged.fees = Array.isArray(cfg.fees)
    ? cfg.fees
    : (Array.isArray(cfg.add_on_fees) ? cfg.add_on_fees : DEFAULTS.fees);
  return merged;
}

/**
 * Calculate quote pricing and return a transparent breakdown.
 */
export function calculateQuotePricing(input) {
  const cfg = normalizePricingConfig(input?.pricingConfig || {});

  const volume_m3 = Math.max(0, Number(input?.volume_m3 || 0));
  const from_floor = Number(input?.from_floor || 0);
  const to_floor = Number(input?.to_floor || 0);
  const floor_sum = Math.max(0, from_floor) + Math.max(0, to_floor);

  const elevator_from = !!input?.elevator_from;
  const elevator_to = !!input?.elevator_to;
  const anyElevator = elevator_from || elevator_to;
  const elevator_effect = anyElevator ? Number(cfg.elevator_multiplier ?? 0.5) : 1.0;

  const transport_minutes = Math.max(0, Number(input?.transport_minutes || 0));
  const km_roundtrip = Math.max(0, Number(input?.km_roundtrip || 0));

  const heavy_80_count = Math.max(0, parseInt(input?.heavy_80_count || 0, 10));
  const heavy_150_count = Math.max(0, parseInt(input?.heavy_150_count || 0, 10));

  // Minutes per m3 derived from standard volume settings
  const stdVol = Math.max(1, Number(cfg.standard_volume_m3 || cfg.vehicle_capacity_m3 || 25));
  const minutes_per_m3_load = Number(cfg.base_load_time_minutes_for_standard_volume || 150) / stdVol;
  const minutes_per_m3_unload = Number(cfg.base_unload_time_minutes_for_standard_volume || 120) / stdVol;

  // Crew estimation
  const baseMin = Math.max(1, parseInt(cfg.base_min_employees || 2, 10));
  const maxM3Per = Math.max(1, Number(cfg.max_m3_per_employee || 12));
  const crew_by_volume = Math.ceil(volume_m3 / maxM3Per);
  let crew = Math.max(baseMin, crew_by_volume || baseMin);

  const floorThreshold = Number(cfg.floor_threshold_for_extra_employee || 4);
  if (floor_sum * elevator_effect >= floorThreshold) crew += 1;

  if (cfg.heavy_150_enabled && heavy_150_count > 0 && cfg.heavy_150_enforce_min_employees) {
    crew = Math.max(crew, parseInt(cfg.heavy_150_min_employees_override || 3, 10));
  }

  crew = clamp(crew, 1, 8);

  // Base minutes
  const load_minutes = volume_m3 * minutes_per_m3_load;
  const unload_minutes = volume_m3 * minutes_per_m3_unload;
  const floor_minutes = volume_m3 * Number(cfg.minutes_per_floor_per_m3 || 0.8) * floor_sum * elevator_effect;
  const heavy_minutes =
    (cfg.heavy_80_enabled ? heavy_80_count * Number(cfg.heavy_80_extra_minutes_per_item || 0) : 0) +
    (cfg.heavy_150_enabled ? heavy_150_count * Number(cfg.heavy_150_extra_minutes_per_item || 0) : 0);

  const base_minutes_total = load_minutes + unload_minutes + floor_minutes + heavy_minutes;

  // Crew speed factor
  const crewFactorTable = cfg.crew_factor_table || {};
  const factor = Number(crewFactorTable[String(crew)] ?? crewFactorTable[crew] ?? crewFactorTable['5'] ?? 1);
  const crew_factor = Math.max(0.5, factor);
  let effective_minutes = base_minutes_total / crew_factor;

  // Transport inclusion (time-based)
  let minutes_with_transport = effective_minutes;
  const transportMode = cfg.transport_pricing_mode;
  if (transportMode === 'charge_time_from_departure' || transportMode === 'charge_time_from_arrival') {
    minutes_with_transport += transport_minutes;
  }

  // Buffer
  let bufferApplied = { type: null, value: 0 };
  let final_minutes = minutes_with_transport;
  if (cfg.buffer_percent != null && cfg.buffer_percent !== '' && !isNaN(Number(cfg.buffer_percent))) {
    const pct = Number(cfg.buffer_percent);
    bufferApplied = { type: 'percent', value: pct };
    final_minutes = minutes_with_transport * (1 + pct / 100);
  } else {
    const bm = Math.max(0, Number(cfg.buffer_minutes || 0));
    bufferApplied = { type: 'minutes', value: bm };
    final_minutes = minutes_with_transport + bm;
  }

  const labor_hours = final_minutes / 60;

  // Labor price
  let labor_price = 0;
  if (cfg.hourly_rate_per_employee != null && cfg.hourly_rate_per_employee !== '' && !isNaN(Number(cfg.hourly_rate_per_employee))) {
    labor_price = labor_hours * Number(cfg.hourly_rate_per_employee) * crew;
  } else {
    labor_price = labor_hours * Number(cfg.hourly_rate_total || 0);
  }

  // Transport price (km-based)
  let transport_price = 0;
  if (transportMode === 'price_per_km_roundtrip') {
    transport_price = km_roundtrip * Number(cfg.price_per_km || 0);
  }

  // Heavy fees
  const heavy_fee =
    (cfg.heavy_80_enabled ? heavy_80_count * Number(cfg.heavy_80_fee_per_item || 0) : 0) +
    (cfg.heavy_150_enabled ? heavy_150_count * Number(cfg.heavy_150_fee_per_item || 0) : 0);

  // Add-on fees
  const selectedMap = new Map();
  (input?.selectedFees || []).forEach((f) => selectedMap.set(f.fee_name, !!f.selected));

  const feeLines = [];
  const baseForPercent = labor_price + transport_price + heavy_fee;
  let add_on_fees_total = 0;

  (cfg.fees || []).forEach((fee) => {
    if (!fee) return;
    if (fee.enabled === false) return;

    const shouldApply = selectedMap.size > 0
      ? selectedMap.get(fee.fee_name) === true
      : (fee.auto_apply === true || fee.default_selected === true || fee.required === true);
    if (!shouldApply) return;

    const type = fee.fee_type || 'fixed_amount';
    const val = Number(fee.fee_value || 0);
    let amount = 0;
    if (type === 'percent') amount = baseForPercent * (val / 100);
    else amount = val;
    amount = roundMoney(amount);

    add_on_fees_total += amount;
    feeLines.push({ name: fee.fee_name, type, value: val, amount });
  });

  const subtotal = roundMoney(labor_price + transport_price + heavy_fee + add_on_fees_total);
  const vat_amount = roundMoney(subtotal * Number(cfg.vat_rate || 0.25));
  const total_price = subtotal + vat_amount;

  return {
    volume_m3: round1(volume_m3),
    crew,
    time: {
      base_minutes_total: round1(base_minutes_total),
      transport_minutes: round1(transport_minutes),
      buffer: bufferApplied,
      final_minutes: round1(final_minutes),
      labor_hours: round1(labor_hours),
      components: {
        load_minutes: round1(load_minutes),
        unload_minutes: round1(unload_minutes),
        floor_minutes: round1(floor_minutes),
        heavy_minutes: round1(heavy_minutes),
        crew_factor: round1(crew_factor),
      },
    },
    prices: {
      labor_price: roundMoney(labor_price),
      transport_price: roundMoney(transport_price),
      heavy_fee: roundMoney(heavy_fee),
      add_on_fees_total: roundMoney(add_on_fees_total),
      subtotal,
      vat_amount,
      total_price,
    },
    heavy: { heavy_80_count, heavy_150_count },
    fees: feeLines,
    meta: { transport_mode: transportMode, pricing_mode: cfg.pricing_mode },
  };
}
