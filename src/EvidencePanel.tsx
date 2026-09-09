import data from './networkData.json';
export default function EvidencePanel() {
 return <section className="border-t border-line bg-white px-5 py-6 md:px-8">
  <h2 className="text-xl">What this model can establish</h2>
  <div className="mt-4 grid gap-8 lg:grid-cols-3">
   <div><h3 className="font-sans font-semibold">Verified plan geometry</h3><ul className="mt-2 list-disc space-y-1 pl-5"><li>785.81 m OD110; 69.22 m OD25; 33 villa services.</li><li>731.30 m gross channel route; buried exceptions remain.</li><li>EPSG:32640 plan coordinates from the Option 01 CAD file.</li><li>As-built background aligned against matching main vertices.</li></ul></div>
   <div><h3 className="font-sans font-semibold">Illustrative 3D only</h3><ul className="mt-2 list-disc space-y-1 pl-5"><li>No surveyed terrain or pipe elevations supplied.</li><li>Overview routes and symbols enlarged for visibility.</li><li>Detail pipe diameters and clear channel envelope use the requirements.</li><li>Wall, cover, support, fitting and bedding shapes are generic.</li></ul></div>
   <div><h3 className="font-sans font-semibold">Hydraulic validation unavailable</h3><p className="mt-2">No pressure, flow, fire duty, isolation reach or flood-capacity result is calculated. Before a calibrated <a className="underline" href="https://www.epa.gov/water-research/epanet" target="_blank" rel="noreferrer">EPANET model</a>, resolve:</p><ul className="mt-2 list-disc space-y-1 pl-5">{data.missing.slice(0,4).map(x=><li key={x}>{x}</li>)}</ul></div>
  </div>
  <details className="mt-6 border-t border-line pt-4"><summary className="font-semibold text-purple">Source records and unresolved coordination</summary><div className="mt-4 space-y-3">
   <p><strong>Option names here:</strong> Option One means the buried two-walkway-main package. Option Two means the same network in the covered channel. These are installation scenarios; they are not the Addendum’s single-main versus two-main numbering.</p>
   <p><strong>Requirements:</strong> MB-PW-REQ-001, 31 August 2026, pp. 2–5; MB-PW-REQ-002 Rev 0, 9 September 2026, pp. 2–7 and 11. Existing pump and compartment requirements are superseded by Rahim’s direction for this visual review only. Controlled project documents still require coordinated revision.</p>
   {data.sources.map(s=><p key={s.file} className="break-all"><strong>CAD source:</strong> {s.file}<br/><span>SHA-256: {s.sha256}</span></p>)}
   <p><strong>Model origin:</strong> E {data.origin[0]} m, N {data.origin[1]} m. 3D display uses local east, vertical and negative north. Z = 0 is a display reference, not a surveyed level. The CAD export retains source eastings/northings and uses Z = 0 for unresolved route levels.</p>
   <p><strong>Drainage:</strong> no pumps, chamber count, outfall location or invented gradient. A chamber alone does not establish disposal. Actual corner drainage needs a surveyed profile and an agreed discharge point.</p>
   <p><strong>Technical references:</strong> <a className="underline" target="_blank" rel="noreferrer" href="https://www.gfps.com/content/dam/gfps/com/manuals/en/MA_00149_02_Tapping_saddle_ELGEF_Plus_Update_Print.pdf">GF tapping guidance</a> · <a className="underline" target="_blank" rel="noreferrer" href="https://www.plasticpipe.org/Shared_Content/Shop/PE-Handbook.aspx">PPI PE Handbook</a>. Product selection and installation methods require project approval.</p>
  </div></details>
 </section>;
}
