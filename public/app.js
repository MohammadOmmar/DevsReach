const state = {
  tripActive: true,
  position: 56,
  openAlerts: 7,
  openComplaints: 4,
};

const views = document.querySelectorAll('.view');
const navButtons = document.querySelectorAll('[data-view-target]');
const viewTitle = document.getElementById('view-title');
const toast = document.getElementById('toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3600);
}

function openView(target) {
  const selected = document.getElementById(target);
  if (!selected) return;
  views.forEach((view) => view.classList.toggle('is-visible', view === selected));
  document.querySelectorAll('.nav-link').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.viewTarget === target);
  });
  viewTitle.textContent = selected.dataset.viewTitle;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navButtons.forEach((button) => {
  button.addEventListener('click', () => openView(button.dataset.viewTarget));
});

document.querySelectorAll('[data-scroll-target]').forEach((button) => {
  button.addEventListener('click', () => document.getElementById(button.dataset.scrollTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
});

document.getElementById('complaint-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const type = document.getElementById('complaint-type').value;
  const result = document.getElementById('complaint-result');
  result.textContent = `Report submitted privately to the school transport team: ${type}.`;
  event.currentTarget.reset();
  state.openComplaints += 1;
  document.getElementById('school-complaints').textContent = state.openComplaints;
  showToast('Your transport concern has been submitted to the school.');
});

document.querySelectorAll('.resolve-complaint').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.resolved) return;
    button.dataset.resolved = 'true';
    button.textContent = 'Resolved';
    button.style.color = '#197c70';
    state.openComplaints = Math.max(0, state.openComplaints - 1);
    document.getElementById('school-complaints').textContent = state.openComplaints;
    showToast('Complaint marked resolved in the school transport queue.');
  });
});

document.querySelectorAll('.resolve-alert').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.reviewed) return;
    button.dataset.reviewed = 'true';
    button.textContent = 'Under review';
    button.style.color = '#197c70';
    button.closest('li').style.opacity = '.62';
    state.openAlerts = Math.max(0, state.openAlerts - 1);
    document.querySelector('.alert-count').textContent = `${state.openAlerts} open`;
    showToast('Safety signal assigned for school review.');
  });
});

const marker = document.getElementById('bus-marker');
const parentSpeed = document.getElementById('parent-speed');
const lastLocation = document.getElementById('last-location');
const routeMap = document.getElementById('route-map');
const parentJourneyTitle = document.getElementById('parent-journey-title');
const parentArrivalTime = document.getElementById('parent-arrival-time');
const parentRouteStatus = document.getElementById('parent-route-status');
const parentGpsStatus = document.getElementById('parent-gps-status');
function updateTripSimulation() {
  if (!state.tripActive) return;
  state.position = state.position >= 82 ? 48 : state.position + 4;
  const vertical = state.position < 62 ? 53 : 40 + (state.position - 62) * .54;
  marker.style.left = `${state.position}%`;
  marker.style.top = `${vertical}%`;
  parentSpeed.textContent = `${27 + Math.floor(Math.random() * 10)} km/h`;
  lastLocation.textContent = 'Updated just now';
}
setInterval(updateTripSimulation, 5500);

const startTrip = document.getElementById('start-trip');
const endTrip = document.getElementById('end-trip');
const driverStatus = document.getElementById('driver-status');
const driverStateTitle = document.getElementById('driver-state-title');
const driverStateText = document.getElementById('driver-state-text');
const driverResult = document.getElementById('driver-result');
const globalTripStatus = document.getElementById('global-trip-status');

function setTripState(active) {
  state.tripActive = active;
  startTrip.disabled = active;
  endTrip.disabled = !active;
  routeMap.classList.toggle('trip-ended', !active);
  if (active) {
    driverStatus.textContent = 'Official trip active';
    driverStateTitle.textContent = 'Official school trip is active';
    driverStateText.textContent = 'Location and bus status are shared only for this official trip.';
    driverResult.textContent = 'Trip started. Keep the phone mounted and do not interact while driving.';
    globalTripStatus.innerHTML = '<i></i><span>Official trip active</span>';
    parentJourneyTitle.textContent = 'Arriving at school';
    parentArrivalTime.innerHTML = '09:05 <span>estimated</span>';
    parentSpeed.textContent = '31 km/h';
    parentRouteStatus.textContent = 'On planned route';
    parentGpsStatus.textContent = 'Location active';
    parentRouteStatus.className = 'safe-text';
    parentGpsStatus.className = 'safe-text';
    lastLocation.textContent = 'Updated just now';
    showToast('Official trip started. Assigned parents can now see bus status.');
  } else {
    driverStatus.textContent = 'Trip completed';
    driverStateTitle.textContent = 'Official trip completed';
    driverStateText.textContent = 'Location sharing is now off. Start the next trip before movement.';
    driverResult.textContent = 'Trip ended. Active-trip tracking is off.';
    globalTripStatus.innerHTML = '<i style="background:#8aa0ad"></i><span style="color:#657984">No official trip active</span>';
    parentJourneyTitle.textContent = 'No active official trip';
    parentArrivalTime.innerHTML = '— <span>location sharing off</span>';
    parentSpeed.textContent = '—';
    parentRouteStatus.textContent = 'Not shared';
    parentGpsStatus.textContent = 'Inactive';
    parentRouteStatus.className = '';
    parentGpsStatus.className = '';
    lastLocation.textContent = 'Location sharing off';
    showToast('Trip ended. Parent live visibility and location sharing are off.');
  }
}

startTrip.addEventListener('click', () => {
  const unchecked = document.querySelectorAll('.pretrip-check:not(:checked)').length;
  if (unchecked) {
    driverResult.textContent = `Complete the ${unchecked} remaining vehicle safety check${unchecked === 1 ? '' : 's'} before starting.`;
    return;
  }
  setTripState(true);
});
endTrip.addEventListener('click', () => setTripState(false));

document.querySelectorAll('.pretrip-check').forEach((check) => {
  check.addEventListener('change', () => {
    const unchecked = document.querySelectorAll('.pretrip-check:not(:checked)').length;
    document.getElementById('checklist-state').textContent = unchecked ? `${unchecked} pending` : 'Ready';
  });
});

document.getElementById('sos-button').addEventListener('click', () => {
  const message = state.tripActive
    ? 'SOS emergency alert sent to the school transport team for JK01 AB 2411.'
    : 'SOS emergency alert sent to the school transport team.';
  driverResult.textContent = message;
  showToast(message);
});
