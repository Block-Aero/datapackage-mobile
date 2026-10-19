/* Dummy data for the Data Package (receiver view) prototype.
   Everything is generated deterministically so the prototype looks the same on every load. */
(function () {
  let seed = 129;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[int(0, 15)]).join('');

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

  const PACKAGE = {
    id: 'TG-129',
    name: 'TG-129 Aircraft Part Sales',
    createdOn: '01 Oct 2025, 10:00 AM',
    validUntil: '30 Dec 2025, 11:59 PM UTC+07:00',
    sender: 'Thai Airways Technical',
    password: 'blockaero',
    documentsShared: true,
  };

  const DESCRIPTIONS = [
    'FAN BLADE',
    'FAC FLIGHT AUGMENTATION COMPUTER',
    'FAC FLIGHT AUGMENTATION COMPUTER Computers',
    'HYDRAULIC ENGINE DRIVEN PUMP',
    'MAIN LANDING GEAR ACTUATOR',
    'FUEL NOZZLE ASSEMBLY',
    'APU STARTER GENERATOR',
    'WHEEL BRAKE ASSEMBLY',
    'AIR CYCLE MACHINE',
    'ENGINE FUEL PUMP',
    'WEATHER RADAR TRANSCEIVER',
    'HIGH PRESSURE BLEED VALVE',
    'INTEGRATED DRIVE GENERATOR',
    'EGT THERMOCOUPLE PROBE',
    'PITOT STATIC PROBE',
    'ELEVATOR SERVO CONTROL',
    'FLIGHT CONTROL COMPUTER',
    'NOSE WHEEL STEERING ACTUATOR',
    'CABIN PRESSURE CONTROLLER',
    'THRUST REVERSER ACTUATOR',
  ];
  const PART_PREFIX = ['B397BAM', '3214552-', 'D23189000-', '740119', 'C20017-', '2118734-', '4302A', '822-1004-', 'S283A', '1152682-'];
  const ORGS = [
    { code: 'MTU', name: 'MTU Hannover' },
    { code: 'THA', name: 'Thai Airways' },
    { code: 'TSM', name: 'Thai Smile' },
    { code: 'BOE', name: 'BOEING' },
    { code: 'AIR', name: 'Airbus' },
    { code: 'LHT', name: 'Lufthansa Technik' },
  ];

  /* ---------- Assets ---------- */
  const assets = [];
  const fixed = [
    { partNo: 'B397BAM0625', serialNo: '5910', description: 'FAN BLADE', docs: 12, profile: 'full' },
    { partNo: 'B397BAM0625', serialNo: 'BAA-8EC3C73C-AAA3', description: 'FAN BLADE', docs: 9, profile: 'notIncluded' },
    { partNo: 'B397BAM0625', serialNo: 'BAA-91F2D04A-11C7', description: 'FAC FLIGHT AUGMENTATION COMPUTER', docs: 1, profile: 'noRecords' },
    { partNo: 'B397BAM0625', serialNo: '5911', description: 'FAC FLIGHT AUGMENTATION COMPUTER Computers', docs: 18, profile: 'full' },
    { partNo: 'B397BAM0625', serialNo: '5912', description: 'FAC FLIGHT AUGMENTATION COMPUTER', docs: 3, profile: 'full' },
    { partNo: 'B397BAM0625', serialNo: '5913', description: 'FAC FLIGHT AUGMENTATION COMPUTER', docs: 4, profile: 'full' },
  ];
  fixed.forEach((a) => assets.push(a));
  while (assets.length < 100) {
    const i = assets.length;
    let serialNo;
    if (i === 37) serialNo = 'ABC-4562330';
    else if (i === 64) serialNo = 'ABC-4562783';
    else serialNo = pick(['', 'SN', 'ABC-', 'BAA-']) + int(1000, 9999999);
    const prefix = pick(PART_PREFIX);
    const partNo = prefix + (prefix.endsWith('-') ? int(1, 9) : String(int(100, 9999)).padStart(4, '0'));
    assets.push({
      partNo,
      serialNo,
      description: pick(DESCRIPTIONS),
      docs: i === 64 ? 1 : int(4, 18),
      profile: 'full',
    });
  }
  // Balance document counts so the package holds exactly 1100 documents.
  let total = assets.reduce((s, a) => s + a.docs, 0);
  for (let i = 6; total !== 1100; i = i >= 99 ? 6 : i + 1) {
    if (i === 64) continue;
    if (total < 1100 && assets[i].docs < 24) { assets[i].docs++; total++; }
    else if (total > 1100 && assets[i].docs > 2) { assets[i].docs--; total--; }
  }

  assets.forEach((a, i) => {
    a.id = 'a' + i;
    a.title = `${a.partNo}  •  ${a.serialNo}`;
    const owner = pick(ORGS.slice(1, 3));
    a.batch = 'Org ' + int(1, 9);
    a.llp = rand() > 0.3 ? 'Yes' : 'No';
    a.dataPlate = rand() > 0.2 ? 'Yes' : 'No';
    a.cage = String(int(10000, 99999));
    a.country = pick(['United States of America', 'Germany', 'France', 'United Kingdom', 'Japan']);
    a.manufactured = fmtDate(new Date(2012 + int(0, 10), int(0, 11), int(1, 28)));
    a.weight = `${int(1, 40)} kg (Kilogram)`;
    a.condition = pick(['INSTALLED', 'SERVICEABLE', 'OVERHAULED', 'REPAIRED']);
    a.installedOn = 'MSN - ' + int(100, 999);
    a.acReg = 'A7-' + int(100, 999);
    a.position = (int(1, 4) * 1000).toLocaleString('en-US');
    a.ata = '0' + int(3000000, 9999999);
    a.exMsn = 'A7-' + int(100, 999);
    a.exMsnModel = pick(['A380', 'A350', 'B787-9', 'B777-300ER']);
    a.exEsn = 'A7-' + int(100, 999);
    a.exEsnModel = pick(['A380', 'Trent 900', 'GEnx-1B', 'PW1100G']);
    const tsn = int(1200, 9800);
    a.time = {
      tsn: tsn.toLocaleString('en-US'), csn: String(int(80, 900)),
      tsr: (tsn + int(100, 3000)).toLocaleString('en-US'), csr: String(int(80, 400)),
      tso: (tsn + int(100, 3000)).toLocaleString('en-US'), cso: String(int(200, 900)),
      tsInsp: String(int(5, 40)), csInsp: String(int(5, 40)),
    };
    a.availability = { sale: 'Yes', lease: rand() > 0.5 ? 'Yes' : 'No', exchange: 'Yes' };
    a.roles = {
      oem: pick([ORGS[0], ORGS[3], ORGS[4]]), dam: ORGS[1], owner, operator: pick([ORGS[1], ORGS[2]]),
      assetManager: ORGS[1], camo: pick([ORGS[0], ORGS[5]]),
    };
  });
  // Match the design for the first asset.
  Object.assign(assets[0], {
    batch: 'Org 1', llp: 'Yes', dataPlate: 'Yes', cage: '76301', country: 'United States of America',
    manufactured: '10 Jan 2020', weight: '10 kg (Kilogram)', condition: 'INSTALLED', installedOn: 'MSN - 253',
    acReg: 'A7-940', position: '3,000', ata: '03291835', exMsn: 'A7-291', exMsnModel: 'A380', exEsn: 'A7-291', exEsnModel: 'A380',
    time: { tsn: '5,392', csn: '137', tsr: '8,437', csr: '294', tso: '8,437', cso: '865', tsInsp: '11', csInsp: '32' },
    availability: { sale: 'Yes', lease: 'Yes', exchange: 'Yes' },
    roles: { oem: ORGS[3], dam: ORGS[1], owner: ORGS[1], operator: ORGS[2], assetManager: ORGS[1], camo: ORGS[0] },
  });
  assets[0].overviewRoles = { oem: 'MTU Hannover', dam: 'Thai Airways', owner: 'Thai Airways', operator: 'Thai Airways', assetManager: 'Thai Airways', camo: 'MTU Hannover' };
  assets.forEach((a) => {
    if (!a.overviewRoles) a.overviewRoles = {
      oem: a.roles.oem.name, dam: a.roles.dam.name, owner: a.roles.owner.name,
      operator: a.roles.operator.name, assetManager: a.roles.assetManager.name, camo: a.roles.camo.name,
    };
  });
  // Every shared value shows the date it was last updated (970:21171 / 506).
  assets.forEach((a) => { a.updatedOn = '31 Jan 2025'; });

  /* ---------- Documents ---------- */
  const DOC_TYPES = [
    { type: 'Transfer Document', prefix: 'TD', w: 5 },
    { type: 'Invoice', prefix: 'INV', w: 2 },
    { type: 'Authorized Release Certificate', prefix: 'ARC', w: 3 },
    { type: 'Certificate of Conformity', prefix: 'COC', w: 2 },
    { type: 'Shop Findings Report', prefix: 'SFR', w: 1 },
    { type: 'Teardown Report', prefix: 'TDR', w: 1 },
    { type: 'Bill of Lading', prefix: 'BOL', w: 1 },
  ];
  const weighted = DOC_TYPES.flatMap((t) => Array(t.w).fill(t));
  const docs = [];
  // Interleave documents across assets so the list mixes parts like the design does.
  const remaining = assets.map((a) => a.docs);
  let round = 0;
  while (docs.length < 1100) {
    assets.forEach((a, i) => {
      if (remaining[i] > 0) {
        remaining[i]--;
        const t = round === 0 && i === 0 ? DOC_TYPES[0] : pick(weighted);
        const uuid = `${hex(8)}-${hex(4)}-4${hex(3)}-${pick(['8', '9', 'a', 'b'])}${hex(3)}-${hex(12)}`;
        const hasMeta = rand() > 0.35;
        docs.push({
          id: 'd' + docs.length,
          docId: 'DOC-' + uuid,
          type: t.type,
          number: t.prefix + int(10000000, 99999999),
          assetId: a.id,
          docNo: hasMeta ? `${t.prefix}-${int(1000, 9999)}` : 'N/A',
          revision: hasMeta ? 'Rev ' + int(1, 6) : 'N/A',
          revisionDate: hasMeta ? fmtDate(new Date(2023 + int(0, 2), int(0, 11), int(1, 28))) : 'N/A',
          cage: hasMeta ? String(int(10000, 99999)) : 'N/A',
          issuer: hasMeta ? pick(ORGS).name : 'N/A',
          pages: t.type === 'Invoice' ? 1 : int(2, 3),
        });
      }
    });
    round++;
  }
  Object.assign(docs[0], { docId: 'DOC-a972273d-c695-49f7-bf8a-e22224b2b695', number: 'TD73427592', type: 'Transfer Document', pages: 2 });
  // The first asset's documents lead the list and match the Figma rows (105):
  // Transfer Document, Invoice, Transfer Document, Authorized Release Certificate, Transfer Document, Transfer Document.
  const a0Docs = docs.filter((d) => d.assetId === 'a0');
  const leadTypes = ['Transfer Document', 'Invoice', 'Transfer Document', 'Authorized Release Certificate', 'Transfer Document', 'Transfer Document'];
  const PREFIX = Object.fromEntries(DOC_TYPES.map((t) => [t.type, t.prefix]));
  a0Docs.forEach((d, i) => {
    if (i < leadTypes.length) { d.type = leadTypes[i]; d.number = PREFIX[d.type] + (73427592 + i); }
  });
  docs.splice(0, docs.length, ...a0Docs, ...docs.filter((d) => d.assetId !== 'a0'));
  docs.forEach((d, i) => { d.id = 'd' + i; });
  // The ARC row opens the "Document Details" design (no metadata shared).
  const arc = a0Docs[3];
  Object.assign(arc, { docId: 'DOC-a972273d-c695-49f7-bf8a-e22224b2b695', docNo: 'N/A', revision: 'N/A', revisionDate: 'N/A', cage: 'N/A', issuer: 'N/A', pages: 2 });
  a0Docs[0].docId = 'DOC-5be1c0f2-7d3a-4c1e-9b84-1f02d6e4a7c3';
  a0Docs[0].pages = 2;
  PACKAGE.detailsDocId = arc.id;

  /* ---------- Back-to-birth events & logistics ---------- */
  const EVENT_TYPES = [
    ['Manufacture', 'Manufactured'], ['Installation', 'Installed'], ['Operation', 'Repaired'], ['Removal', 'Removed'],
    ['Operation', 'Inspected'], ['Operation', 'Overhauled'], ['Transfer', 'Ownership transferred'],
  ];
  function eventsFor(asset) {
    const list = [];
    const start = new Date(2020, 0, 10);
    for (let i = 0; i < 15; i++) {
      const [type, desc] = i === 0 ? EVENT_TYPES[0] : pick(EVENT_TYPES.slice(1));
      const d = new Date(start.getTime() + i * 1000 * 60 * 60 * 24 * int(40, 110));
      list.push({ date: fmtDate(d), type, description: desc, ref: 'DOC-' + int(100000000, 999999999), by: pick(ORGS).name });
    }
    return list.reverse();
  }
  // Sensor readings from the storage location, newest first (one every 2 days up to the last update).
  function logisticsFor() {
    const list = [];
    const last = new Date(2022, 11, 28);
    for (let i = 0; i < 64; i++) {
      const d = new Date(last.getTime() - i * 2 * 24 * 60 * 60 * 1000);
      list.push({ date: fmtDate(d), humidity: int(58, 72) + '%', temperature: int(24, 32) + '°C' });
    }
    return list;
  }
  assets.forEach((a) => {
    if (a.profile === 'full') { a.events = eventsFor(a); a.logistics = logisticsFor(); }
    else { a.events = []; a.logistics = []; }
  });
  // First asset mirrors the Figma table content.
  assets[0].events = assets[0].events.map((e) => ({ ...e, date: '5 Jan 2025', type: 'Operation', description: 'Repaired', ref: 'DOC-349585612' }));
  assets.forEach((a) => { a.logisticsUpdated = '28 Dec 2022, 11:00 AM'; });

  window.DATA = { PACKAGE, assets, docs, ORGS };
})();
