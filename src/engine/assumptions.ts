/**
 * Every number the analysis relies on, with where it came from. Nothing else in the app is allowed
 * to hold a magic number: if a value is here it can be edited live and its provenance is on screen.
 *
 * status  verified — read from a controlled project document (source cited)
 *         assumed  — an engineering default used so the model runs; needs confirmation
 *         missing  — the project has not yet produced this; the default is a placeholder only
 */
export type Status = 'verified' | 'assumed' | 'missing';
export interface Assumption { key: keyof Inputs; label: string; unit: string; status: Status; source: string; min: number; max: number; step: number; }

export interface Inputs {
 inletBar: number; hazenC: number; minorLossFactor: number; residualBar: number;
 domesticLps: number; hydrantLps: number;
 materialIndex: number; closureSeconds: number; rundownSeconds: number;
 rainMmPerHour: number; catchmentWidthM: number; runoffCoefficient: number; channelSlopePct: number;
 buriedDeltaT: number; channelDeltaT: number; channelPipeTempC: number;
 leakHoleMm: number; buriedDetectDays: number; channelDetectDays: number;
}

export const defaults: Inputs = {
 inletBar: 3.0, hazenC: 150, minorLossFactor: 1.25, residualBar: 1.5,
 domesticLps: 5.0, hydrantLps: 18.75,
 materialIndex: 0, closureSeconds: 10, rundownSeconds: 3,
 rainMmPerHour: 30, catchmentWidthM: 1.0, runoffCoefficient: 0.9, channelSlopePct: 0.5,
 buriedDeltaT: 5, channelDeltaT: 25, channelPipeTempC: 40,
 leakHoleMm: 2, buriedDetectDays: 30, channelDetectDays: 7,
};

const SOW = 'MB-PW-Z5-SOW Rev 8, 25 Aug 2026';
const REQ1 = 'MB-PW-REQ-001, 31 Aug 2026';
const DET3 = 'MB-PW-DET-Z5-003 Rev 1, 13 Sep 2026';

export const register: Assumption[] = [
 { key: 'inletBar', label: 'Inlet pressure at WM-01', unit: 'bar', status: 'assumed', source: `${SOW} §6: 3.0 bar screening basis, 3.5 bar sensitivity. Not a warranted pressure; witnessed test is a hold point.`, min: 2, max: 4.5, step: 0.1 },
 { key: 'hazenC', label: 'Hazen–Williams C (new PE)', unit: '', status: 'verified', source: `${SOW} §6`, min: 100, max: 155, step: 5 },
 { key: 'minorLossFactor', label: 'Minor-loss allowance on friction', unit: '×', status: 'verified', source: `${SOW} §6: 25 % of available head reserved for minor losses`, min: 1, max: 1.6, step: 0.05 },
 { key: 'residualBar', label: 'Target residual pressure', unit: 'bar', status: 'verified', source: `${REQ1} p.2 and ${SOW} §6`, min: 1, max: 2.5, step: 0.1 },
 { key: 'domesticLps', label: 'Zone maximum-day domestic demand', unit: 'L/s', status: 'assumed', source: `${SOW} §6 sensitivity: 5.0 L/s pending the formal maximum-day criterion`, min: 1, max: 12, step: 0.5 },
 { key: 'hydrantLps', label: 'Fire hydrant duty', unit: 'L/s', status: 'verified', source: `${SOW} §6 (18.75 L/s at 1.5 bar; fire duty to be confirmed with the Engineer)`, min: 10, max: 30, step: 0.25 },
 { key: 'materialIndex', label: 'Main pipe specification', unit: '', status: 'verified', source: `${SOW} §4: OD110 HDPE PE100-RC PN16 SDR11 throughout. Other materials shown for comparison only.`, min: 0, max: 3, step: 1 },
 { key: 'closureSeconds', label: 'Valve closure time', unit: 's', status: 'assumed', source: 'Presentation scenario. A hand-wheel hydrant or gate valve takes 10 s or more to close; drag the slider below the critical time (about 2.4 s to FH-07) to show what a slammed quarter-turn valve does.', min: 0.2, max: 20, step: 0.2 },
 { key: 'rundownSeconds', label: 'Pump run-down time', unit: 's', status: 'assumed', source: 'Presentation scenario only. Zone 5 is fed from the Diam trunk through WM-01; no zone pump is proposed.', min: 0.5, max: 20, step: 0.5 },
 { key: 'rainMmPerHour', label: 'Design rainfall intensity', unit: 'mm/h', status: 'missing', source: `${DET3} sheet 6: "accepted rainfall inputs" listed as design information required. Verify against Muscat Municipality IDF data.`, min: 5, max: 120, step: 5 },
 { key: 'catchmentWidthM', label: 'Paved width draining to the channel', unit: 'm', status: 'missing', source: `${DET3} sheet 6: "keep paving runoff away from the channel" — the ingress area is unverified. 0 m = runoff fully excluded; the 0.6 m cover width always counts.`, min: 0, max: 4, step: 0.25 },
 { key: 'runoffCoefficient', label: 'Runoff coefficient (paved)', unit: '', status: 'assumed', source: 'Rational method, impervious paving 0.85–0.95', min: 0.5, max: 1, step: 0.05 },
 { key: 'channelSlopePct', label: 'Channel floor fall', unit: '%', status: 'assumed', source: `${DET3} sheet 6: 0.5 % minimum finished fall is a review criterion; surveyed levels do not yet exist.`, min: 0.1, max: 2, step: 0.1 },
 { key: 'buriedDeltaT', label: 'Buried pipe temperature swing', unit: '°C', status: 'assumed', source: 'Ground at 1.0 m cover is thermally damped; seasonal swing a few degrees. No site soil-temperature record.', min: 0, max: 15, step: 1 },
 { key: 'channelDeltaT', label: 'Channel pipe temperature swing', unit: '°C', status: 'assumed', source: 'Air-filled concrete channel under Omani sun: diurnal/seasonal pipe-wall swing 20–30 °C is plausible; no measurement exists.', min: 0, max: 40, step: 1 },
 { key: 'channelPipeTempC', label: 'Channel pipe-wall design temperature', unit: '°C', status: 'assumed', source: `${DET3} sheet 3 requires the design pipe-wall temperature to be set; PE100 derating tables begin at 20 °C.`, min: 20, max: 50, step: 1 },
 { key: 'leakHoleMm', label: 'Illustrative leak — equivalent hole', unit: 'mm', status: 'assumed', source: 'A crack in aged HDPE (SoW Pilot Rev 8 §1) has no single size; 2 mm equivalent is a small, quiet leak.', min: 0.5, max: 6, step: 0.5 },
 { key: 'buriedDetectDays', label: 'Buried: days to find a quiet leak', unit: 'days', status: 'assumed', source: 'Monthly bulk-versus-villa reconciliation (MB-PW-REQ-001 p.5) then locate. Could be far longer if the water drains away unseen.', min: 1, max: 365, step: 1 },
 { key: 'channelDetectDays', label: 'Channel: days to find a quiet leak', unit: 'days', status: 'assumed', source: 'Visible in the channel or at its drain on the next routine inspection walk.', min: 0.5, max: 60, step: 0.5 },
];

export const statusLabel: Record<Status, string> = { verified: 'Verified', assumed: 'Assumed', missing: 'Missing data' };
