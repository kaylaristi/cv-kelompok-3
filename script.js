// Multi-timezone digital clock
// - Add IANA time zones (e.g., "Asia/Jakarta")
// - Toggle 24/12 hour format
// - Live update every second
// - Remove clocks, reset defaults

const tzInput = document.getElementById('tz-input');
const tzList = document.getElementById('tz-list');
const addBtn = document.getElementById('add-btn');
const clocksContainer = document.getElementById('clocks');
const hourFormatCheckbox = document.getElementById('hour-format');
const resetBtn = document.getElementById('reset-btn');

// Default zones (tries to include local browser timezone)
const localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
const DEFAULT_ZONES = [
  localTZ,
  'UTC',
  'Asia/Jakarta',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'Australia/Sydney'
];

// A curated suggestion list for the datalist (not exhaustive)
const SUGGESTIONS = [
  "UTC","Europe/London","Europe/Paris","Europe/Berlin","Europe/Madrid",
  "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "Asia/Jakarta","Asia/Jayapura","Asia/Tokyo","Asia/Shanghai","Asia/Singapore",
  "Asia/Dubai","Asia/Kolkata","Australia/Sydney","Pacific/Auckland",
  "Africa/Johannesburg"
];

// state
let zones = [];
let use24Hour = false;
let tickInterval = null;

// populate datalist suggestions
function populateDatalist(){
  tzList.innerHTML = '';
  for (const s of SUGGESTIONS){
    const opt = document.createElement('option');
    opt.value = s;
    tzList.appendChild(opt);
  }
}

// utility: format time for given zone
function formatForZone(date, zone){
  const options = {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    weekday: 'short', month: 'short', day: '2-digit',
    timeZone: zone,
    hour12: !use24Hour,
    timeZoneName: 'short'
  };
  try {
    // time string (e.g., 14:05:02 GMT+7)
    const time = date.toLocaleTimeString([], options);
    // date string (e.g., Wed, Sep 02)
    const dateStr = date.toLocaleDateString([], { weekday:'short', month:'short', day:'2-digit', timeZone: zone });
    return { time, dateStr };
  } catch (e) {
    // invalid timezone
    return { time: '—', dateStr: 'Invalid time zone' };
  }
}

// create a clock card for zone
function createClockCard(zone){
  const card = document.createElement('article');
  card.className = 'clock';
  card.dataset.zone = zone;

  const header = document.createElement('div');
  header.className = 'tz';
  const h2 = document.createElement('h2');
  h2.textContent = zone;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = ''; // will set later with offset or abbreviation

  header.appendChild(h2);
  header.appendChild(meta);

  const timeEl = document.createElement('div');
  timeEl.className = 'time';
  timeEl.textContent = '—:—:—';

  const dateEl = document.createElement('div');
  dateEl.className = 'date';
  dateEl.textContent = '—';

  const actions = document.createElement('div');
  actions.className = 'actions';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'small-btn';
  removeBtn.textContent = 'Hapus';
  removeBtn.title = 'Hapus zona ini';
  removeBtn.addEventListener('click', () => {
    removeZone(zone);
  });

  actions.appendChild(removeBtn);

  card.appendChild(header);
  card.appendChild(timeEl);
  card.appendChild(dateEl);
  card.appendChild(actions);

  return card;
}

// render all clocks
function renderClocks(){
  clocksContainer.innerHTML = '';
  if (zones.length === 0){
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Tidak ada zona waktu. Tambahkan zona menggunakan kolom di atas.';
    clocksContainer.appendChild(empty);
    return;
  }

  for (const zone of zones){
    const card = createClockCard(zone);
    clocksContainer.appendChild(card);
  }
}

// update content of each clock (called every second)
function updateClocks(){
  const now = new Date();
  document.querySelectorAll('.clock').forEach(card => {
    const zone = card.dataset.zone;
    const { time, dateStr } = formatForZone(now, zone);

    const metaEl = card.querySelector('.meta');
    // attempt to show abbreviated zone name / offset by formatting and taking last part
    try {
      const tzNameFull = now.toLocaleTimeString('en-US', { timeZone: zone, timeZoneName: 'short' });
      // tzNameFull might be like "11:23:45 GMT+7" or include an abbreviation at end
      const tzParts = tzNameFull.split(' ');
      const tzName = tzParts.slice(-1)[0] || '';
      metaEl.textContent = tzName;
    } catch(err){
      metaEl.textContent = '';
    }

    const timeEl = card.querySelector('.time');
    const dateEl = card.querySelector('.date');

    timeEl.textContent = time;
    dateEl.textContent = dateStr;
  });
}

// add zone if valid and not already present
function addZone(zone){
  const normalized = zone.trim();
  if (!normalized) return;
  // prevent duplicates (case-sensitive IANA entries usually)
  if (zones.includes(normalized)) {
    alert('Zona waktu sudah ada di daftar.');
    return;
  }
  // test validity by trying to format a date with it
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: normalized }).format();
  } catch (e) {
    alert('Zona waktu tidak valid. Pastikan format IANA (mis. Asia/Jakarta).');
    return;
  }
  zones.push(normalized);
  saveState();
  renderClocks();
  updateClocks();
}

// remove zone
function removeZone(zone){
  zones = zones.filter(z => z !== zone);
  saveState();
  renderClocks();
  updateClocks();
}

// reset to defaults
function resetDefaults(){
  zones = [...DEFAULT_ZONES];
  saveState();
  renderClocks();
  updateClocks();
}

// save to localStorage
function saveState(){
  localStorage.setItem('multiClockZones', JSON.stringify(zones));
  localStorage.setItem('multiClock24', JSON.stringify(use24Hour));
}

// load from localStorage or defaults
function loadState(){
  const rawZones = localStorage.getItem('multiClockZones');
  const raw24 = localStorage.getItem('multiClock24');
  if (rawZones) {
    try {
      zones = JSON.parse(rawZones);
      if (!Array.isArray(zones) || zones.length === 0) throw new Error('bad');
    } catch {
      zones = [...DEFAULT_ZONES];
    }
  } else {
    zones = [...DEFAULT_ZONES];
  }

  try {
    use24Hour = JSON.parse(raw24) === true;
  } catch {
    use24Hour = false;
  }
  hourFormatCheckbox.checked = use24Hour;
}

// hook up events
addBtn.addEventListener('click', () => {
  const val = tzInput.value.trim();
  if (!val) return;
  addZone(val);
  tzInput.value = '';
});

tzInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addBtn.click();
  }
});

hourFormatCheckbox.addEventListener('change', (e) => {
  use24Hour = !!e.target.checked;
  saveState();
  updateClocks();
});

resetBtn.addEventListener('click', () => {
  if (confirm('Reset ke daftar zona default?')) {
    resetDefaults();
  }
});

// start ticking
function startTick(){
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(updateClocks, 1000);
  updateClocks();
}

// initialization
function init(){
  populateDatalist();
  loadState();
  renderClocks();
  startTick();
}

// run
init();