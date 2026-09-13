/**
 * Weighted scorecard. Scores are 1 (worst) to 5 (best) per option; weights are whatever management
 * agrees in the room. The preset scores are the engineering view and the reason is shown beside each.
 */
export interface Criterion { id: string; label: string; weight: number; buried: number; channel: number; why: string; }

export const criteria: Criterion[] = [
 { id: 'leak', label: 'Speed of leak discovery', weight: 5, buried: 2, channel: 4, why: 'A buried leak waits for the monthly water balance; a channel leak is seen on inspection. The channel does not prevent or detect leaks by itself (MB-PW-REQ-001 p.4).' },
 { id: 'repair', label: 'Repair access', weight: 4, buried: 2, channel: 3, why: 'Channel avoids excavation only if fittings, cutters and fusion tools fit the 600 × 450 clear space — a full-size trial is required before procurement (DET-Z5-003 sheet 8).' },
 { id: 'maintenance', label: 'Routine maintenance burden', weight: 4, buried: 5, channel: 2, why: 'Buried: nothing to maintain between chambers. Channel: 1,469 supports, 14 end walls, covers, frames, silt traps and drains to keep clear.' },
 { id: 'drainage', label: 'Rainfall and drainage risk', weight: 4, buried: 5, channel: 2, why: 'Buried is indifferent to rain. The channel needs a surveyed fall and an accepted discharge point; neither exists yet and no pumps are allowed.' },
 { id: 'thermal', label: 'Thermal and structural behaviour', weight: 3, buried: 5, channel: 2, why: 'Soil restrains a buried PE main and holds it near ground temperature. In an air-filled channel the pipe moves, derates with heat, and needs anchors for thrust.' },
 { id: 'hygiene', label: 'Contamination and hygiene', weight: 3, buried: 4, channel: 3, why: 'A channel collecting surface water sits against the potable main and its tappings; the SOW names contamination as a reason for exclusion.' },
 { id: 'cost', label: 'Capital cost certainty', weight: 4, buried: 4, channel: 1, why: 'Five bids priced Option 1. None priced Option 2; drainage, bulkheads and supports are provisional (DET-Z5-003 sheet 7).' },
 { id: 'programme', label: 'Programme and approval risk', weight: 3, buried: 4, channel: 2, why: 'Option 2 adds structural design, cover load-class approval, a maintenance trial and a drainage design before bulk procurement.' },
 { id: 'compliance', label: 'Alignment with issued SOW', weight: 2, buried: 5, channel: 1, why: 'SOW Rev 8 §4 excludes the continuous channel; REQ-001 keeps it as a priced scenario for management choice.' },
];

export function score(list: Criterion[]) {
 const totalWeight = list.reduce((s, c) => s + c.weight, 0) || 1;
 const buried = list.reduce((s, c) => s + c.weight * c.buried, 0) / totalWeight;
 const channel = list.reduce((s, c) => s + c.weight * c.channel, 0) / totalWeight;
 return { buried, channel, totalWeight };
}
