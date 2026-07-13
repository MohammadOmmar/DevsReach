require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const http = require('http');
const path = require('path');
const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const webpush = require('web-push');
const sgMail = require('@sendgrid/mail');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'hackathon-development-secret-change-me';
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const FRONTEND_DIST = path.join(__dirname, 'frontend', 'dist');
const MAX_SPEED_KMH = 40;
const LONG_STOP_MS = 7 * 60 * 1000;
const GPS_INACTIVE_MS = 5 * 60 * 1000;

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(self), notifications=(self)');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json({ limit: '128kb' }));

let db = loadDatabase();

function id(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function now() {
  return new Date().toISOString();
}

function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function createSeedDatabase() {
  return {
    users: [],
    schools: [],
    drivers: [],
    vehicles: [],
    routes: [],
    trips: [],
    alerts: [],
    complaints: [],
    subscriptions: [],
    pendingRegistrations: []
  };
}

function loadDatabase() {
  try {
    const existing = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const seed = createSeedDatabase();
    const merged = { ...seed, ...existing };
    Object.keys(seed).forEach((key) => {
      if (!Array.isArray(merged[key])) merged[key] = [];
    });
    return merged;
  } catch {
    const seed = createSeedDatabase();
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
    return seed;
  }
}

let saveInFlight = Promise.resolve();
function saveDatabase() {
  const snapshot = JSON.stringify(db, null, 2);
  saveInFlight = saveInFlight.then(() => fs.writeFileSync(DB_PATH, snapshot));
  return saveInFlight;
}

function publicUser(user) {
  return { id: user.id, role: user.role, name: user.name, email: user.email, schoolId: user.schoolId || null, driverId: user.driverId || null, vehicleIds: user.vehicleIds || [] };
}

function getVehicle(vehicleId) { return db.vehicles.find((vehicle) => vehicle.id === vehicleId); }
function getRoute(routeId) { return db.routes.find((route) => route.id === routeId); }
function getSchool(schoolId) { return db.schools.find((school) => school.id === schoolId); }
function getDriver(driverId) { return db.drivers.find((driver) => driver.id === driverId); }
function activeTrip(vehicleId) { return db.trips.find((trip) => trip.vehicleId === vehicleId && trip.status === 'active'); }
function openAlerts(predicate = () => true) { return db.alerts.filter((alert) => alert.status === 'open' && predicate(alert)); }
function compactVehicle(vehicle) {
  const driver = getDriver(vehicle.driverId);
  const trip = activeTrip(vehicle.id);
  return { ...vehicle, driver: driver ? { id: driver.id, name: driver.name, attendant: driver.attendant } : null, activeTrip: trip ? { id: trip.id, routeId: trip.routeId, startedAt: trip.startedAt, lastLocation: trip.lastLocation } : null };
}
function safeTrip(trip, includeLocations = false) {
  if (!trip) return null;
  const route = getRoute(trip.routeId);
  const vehicle = getVehicle(trip.vehicleId);
  return {
    id: trip.id, status: trip.status, vehicleId: trip.vehicleId, vehicleRegistration: vehicle?.registration,
    route: route ? { id: route.id, name: route.name, stops: route.stops, path: route.path, speedLimitKmh: route.speedLimitKmh } : null,
    startedAt: trip.startedAt, expectedArrivalAt: trip.expectedArrivalAt, endedAt: trip.endedAt,
    lastLocation: trip.lastLocation, ...(includeLocations ? { locations: trip.locations } : {})
  };
}

function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.users.find((candidate) => candidate.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'Session is no longer valid.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

function allow(...roles) {
  return (req, res, next) => roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ error: 'This role is not allowed to perform that action.' });
}

function vehicleVisibleToUser(user, vehicle) {
  if (!vehicle) return false;
  if (user.role === 'rto') return true;
  if (user.role === 'school') return vehicle.schoolId === user.schoolId;
  if (user.role === 'driver') return user.vehicleIds?.includes(vehicle.id);
  if (user.role === 'parent') return user.vehicleIds?.includes(vehicle.id);
  return false;
}

function assertVehicleAccess(req, res, vehicle) {
  if (!vehicleVisibleToUser(req.user, vehicle)) {
    res.status(403).json({ error: 'You do not have access to this vehicle.' });
    return false;
  }
  return true;
}

function distanceMeters(a, b) {
  const rad = Math.PI / 180;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const deltaLat = (b.lat - a.lat) * rad;
  const deltaLng = (b.lng - a.lng) * rad;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function distanceToPathMeters(point, pathPoints) {
  return Math.min(...pathPoints.map((candidate) => distanceMeters(point, candidate)));
}

function hasOpenAlert(type, vehicleId) {
  return db.alerts.some((alert) => alert.type === type && alert.vehicleId === vehicleId && alert.status === 'open');
}

async function sendPush(userIds, alert) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  const targets = db.subscriptions.filter((subscription) => userIds.includes(subscription.userId));
  await Promise.all(targets.map(async (target) => {
    try {
      await webpush.sendNotification(target.subscription, JSON.stringify({ title: alert.title, body: alert.message, tag: alert.id }));
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) db.subscriptions = db.subscriptions.filter((item) => item.id !== target.id);
    }
  }));
  await saveDatabase();
}

function recipientsForVehicle(vehicle) {
  return db.users.filter((user) => user.role === 'parent' && user.vehicleIds?.includes(vehicle.id)).map((user) => user.id);
}

async function createAlert({ type, severity, vehicleId, schoolId, title, message, tripId = null }) {
  if (hasOpenAlert(type, vehicleId)) return null;
  const alert = { id: id('alert'), type, severity, vehicleId, schoolId, tripId, status: 'open', title, message, createdAt: now() };
  db.alerts.unshift(alert);
  const vehicle = getVehicle(vehicleId);
  const parentIds = recipientsForVehicle(vehicle);
  io.to(`school:${schoolId}`).emit('alert:new', alert);
  io.to('role:rto').emit('alert:summary', { id: alert.id, type: alert.type, severity: alert.severity, title: alert.title, vehicleRegistration: vehicle?.registration, schoolId });
  parentIds.forEach((userId) => io.to(`user:${userId}`).emit('alert:new', alert));
  saveDatabase();
  sendPush([...parentIds, ...db.users.filter((user) => user.role === 'school' && user.schoolId === schoolId).map((user) => user.id)], alert).catch(() => {});
  return alert;
}

async function evaluateTripRules(trip, location) {
  const vehicle = getVehicle(trip.vehicleId);
  const route = getRoute(trip.routeId);
  if (!vehicle || !route) return;
  if (location.speedKmh > route.speedLimitKmh) {
    await createAlert({ type: 'overspeed', severity: 'high', vehicleId: vehicle.id, schoolId: vehicle.schoolId, tripId: trip.id, title: 'Overspeeding', message: `${vehicle.registration} exceeded the ${route.speedLimitKmh} km/h route speed limit.` });
  }
  const routeDistance = distanceToPathMeters(location, route.path);
  if (routeDistance > route.deviationThresholdM) {
    await createAlert({ type: 'route_deviation', severity: 'high', vehicleId: vehicle.id, schoolId: vehicle.schoolId, tripId: trip.id, title: 'Route deviation', message: `${vehicle.registration} is ${Math.round(routeDistance)} m outside its planned route corridor.` });
  }
  const closeToStop = route.stops.some((stop) => distanceMeters(location, stop) < 80);
  if (location.speedKmh < 2) {
    trip.stoppedSince ||= location.recordedAt;
    if (Date.now() - new Date(trip.stoppedSince).getTime() > LONG_STOP_MS && !closeToStop) {
      await createAlert({ type: 'long_stop', severity: 'medium', vehicleId: vehicle.id, schoolId: vehicle.schoolId, tripId: trip.id, title: 'Long / unexpected stop', message: `${vehicle.registration} has remained stopped away from a registered stop.` });
    }
  } else {
    trip.stoppedSince = null;
  }
  if (Date.now() > new Date(trip.expectedArrivalAt).getTime()) {
    await createAlert({ type: 'delay', severity: 'medium', vehicleId: vehicle.id, schoolId: vehicle.schoolId, tripId: trip.id, title: 'Delayed bus', message: `${vehicle.registration} is behind its planned route schedule.` });
  }
}

function schoolDashboard(schoolId) {
  const vehicles = db.vehicles.filter((vehicle) => vehicle.schoolId === schoolId);
  const vehicleIds = vehicles.map((vehicle) => vehicle.id);
  const alerts = openAlerts((alert) => alert.schoolId === schoolId);
  const complaints = db.complaints.filter((complaint) => complaint.schoolId === schoolId);
  return {
    stats: { registeredVehicles: vehicles.length, activeTrips: vehicles.filter((vehicle) => activeTrip(vehicle.id)).length, activeAlerts: alerts.length, unresolvedComplaints: complaints.filter((complaint) => complaint.status === 'open').length, checklistReminders: vehicles.filter((vehicle) => Object.values(vehicle.checklist || {}).some((value) => !value)).length },
    vehicles: vehicles.map(compactVehicle),
    routes: db.routes.filter((route) => route.schoolId === schoolId),
    alerts,
    complaints: complaints.filter((complaint) => complaint.status === 'open'),
    checklist: vehicles.map((vehicle) => ({ vehicleId: vehicle.id, registration: vehicle.registration, checklist: vehicle.checklist })),
    _vehicleIds: vehicleIds
  };
}

function rtoDashboard() {
  const open = openAlerts();
  const scored = db.vehicles.map((vehicle) => {
    const alerts = open.filter((alert) => alert.vehicleId === vehicle.id);
    const repeatSignals = [...new Set(alerts.filter((alert) => ['overspeed', 'route_deviation', 'repeated_complaint', 'gps_inactive'].includes(alert.type)).map((alert) => alert.type))];
    const priority = (100 - vehicle.complianceScore) + alerts.reduce((total, alert) => total + (alert.severity === 'high' ? 25 : 12), 0);
    return { ...compactVehicle(vehicle), school: getSchool(vehicle.schoolId)?.name, openAlerts: alerts, repeatSignals, priority };
  }).sort((a, b) => b.priority - a.priority);
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const complaints = db.complaints.filter((complaint) => new Date(complaint.createdAt).getTime() >= weekStart);
  return {
    stats: { registeredFleet: db.vehicles.length, pilotSchools: db.schools.length, averageCompliance: db.vehicles.length ? Math.round(db.vehicles.reduce((total, vehicle) => total + vehicle.complianceScore, 0) / db.vehicles.length) : 0, inspectionDue: scored.filter((vehicle) => vehicle.priority >= 45).length, pendingDocuments: db.vehicles.filter((vehicle) => vehicle.documentsStatus !== 'current').length },
    highRiskVehicles: scored.filter((vehicle) => vehicle.priority >= 35),
    vehicles: scored,
    complaintTrend: { received: complaints.length, resolved: complaints.filter((complaint) => complaint.status === 'resolved').length, open: db.complaints.filter((complaint) => complaint.status === 'open').length }
  };
}

// ---- API Routes ----

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'safe-school-bus-api', time: now() }));

// Email verification with Nodemailer
app.post('/api/auth/request-verification', async (req, res) => {
  const { email, name, role, password } = req.body || {};
  if (!email || !name || !role || !password) return res.status(400).json({ error: 'All fields are required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (db.users.find((u) => u.email === email)) return res.status(400).json({ error: 'Email already registered.' });
  
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const pending = { id: id('pending'), email, name, role, passwordHash: await bcrypt.hash(password, 10), verificationCode, createdAt: now() };
  db.pendingRegistrations.push(pending);
  await saveDatabase();
  
  try {
    await sgMail.send({
      to: email,
      from: {
        email: process.env.EMAIL_FROM || 'noreply@safeschoolbus.com',
        name: process.env.EMAIL_FROM_NAME || 'Safe School Bus Kashmir'
      },
      subject: 'Verify your Safe School Bus Kashmir account',
      text: `Hi ${name},\n\nYour verification code is: ${verificationCode}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, please ignore this email.`,
      html: `<h2>Hi ${name},</h2><p>Your verification code is: <strong style="font-size: 24px; color: #0d9488;">${verificationCode}</strong></p><p>This code expires in 15 minutes.</p><p>If you didn't request this, please ignore this email.</p>`
    });
    res.json({ message: 'Verification code sent to your email.', pendingId: pending.id });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  const { pendingId, code } = req.body || {};
  const pending = db.pendingRegistrations.find((p) => p.id === pendingId);
  if (!pending) return res.status(404).json({ error: 'Verification request not found.' });
  if (pending.verificationCode !== code) return res.status(400).json({ error: 'Invalid verification code.' });
  
  const userId = id('user');
  const user = {
    id: userId,
    role: pending.role,
    name: pending.name,
    email: pending.email,
    passwordHash: pending.passwordHash,
    schoolId: pending.role === 'school' || pending.role === 'rto' ? null : `school-${id('').slice(0, 8)}`,
    driverId: pending.role === 'driver' ? id('driver') : null,
    vehicleIds: pending.role === 'parent' ? [] : []
  };
  
  db.users.push(user);
  db.pendingRegistrations = db.pendingRegistrations.filter((p) => p.id !== pendingId);
  await saveDatabase();
  
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = db.users.find((candidate) => candidate.email.toLowerCase() === String(email || '').toLowerCase());
  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) return res.status(401).json({ error: 'Invalid email or password.' });
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: publicUser(user) });
});

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));
app.get('/api/config', (req, res) => res.json({ googleMapsBrowserKey: process.env.GOOGLE_MAPS_BROWSER_KEY || '', vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '' }));

app.get('/api/dashboard', authenticate, (req, res) => {
  if (req.user.role === 'parent') {
    const vehicle = req.user.vehicleIds?.[0] ? getVehicle(req.user.vehicleIds[0]) : null;
    const trip = vehicle ? activeTrip(vehicle.id) : null;
    return res.json({ role: 'parent', vehicle: vehicle ? compactVehicle(vehicle) : null, trip: safeTrip(trip), alerts: openAlerts((alert) => alert.vehicleId === vehicle?.id), complaintCount: db.complaints.filter((complaint) => complaint.vehicleId === vehicle?.id && complaint.status === 'open').length });
  }
  if (req.user.role === 'driver') {
    const vehicle = req.user.vehicleIds?.[0] ? getVehicle(req.user.vehicleIds[0]) : null;
    const trip = vehicle ? activeTrip(vehicle.id) : null;
    return res.json({ role: 'driver', vehicle: vehicle ? compactVehicle(vehicle) : null, trip: safeTrip(trip, true) });
  }
  if (req.user.role === 'school') {
    const dashboard = schoolDashboard(req.user.schoolId);
    delete dashboard._vehicleIds;
    return res.json({ role: 'school', ...dashboard });
  }
  return res.json({ role: 'rto', ...rtoDashboard() });
});

app.get('/api/vehicles', authenticate, (req, res) => res.json({ vehicles: db.vehicles.filter((vehicle) => vehicleVisibleToUser(req.user, vehicle)).map(compactVehicle) }));
app.post('/api/vehicles', authenticate, allow('school', 'rto'), async (req, res) => {
  const { registration, driverId = null, attendant = 'Pending', documentsStatus = 'pending', checklist = {} } = req.body || {};
  if (!registration || String(registration).trim().length < 5) return res.status(400).json({ error: 'A valid vehicle registration is required.' });
  const schoolId = req.user.role === 'school' ? req.user.schoolId : req.body.schoolId;
  if (!getSchool(schoolId)) return res.status(400).json({ error: 'A valid school is required.' });
  const vehicle = { id: id('vehicle'), schoolId, driverId, registration: String(registration).trim().toUpperCase(), attendant, documentsStatus, complianceScore: 100, checklist: { attendant: !!checklist.attendant, firstAid: !!checklist.firstAid, speedGovernor: !!checklist.speedGovernor, documents: !!checklist.documents } };
  db.vehicles.push(vehicle); await saveDatabase(); res.status(201).json({ vehicle: compactVehicle(vehicle) });
});
app.patch('/api/vehicles/:vehicleId', authenticate, allow('school', 'rto'), async (req, res) => {
  const vehicle = getVehicle(req.params.vehicleId);
  if (!vehicle || !assertVehicleAccess(req, res, vehicle)) return;
  const allowed = ['driverId', 'attendant', 'documentsStatus', 'checklist', 'complianceScore'];
  allowed.forEach((field) => { if (req.body?.[field] !== undefined) vehicle[field] = req.body[field]; });
  await saveDatabase(); res.json({ vehicle: compactVehicle(vehicle) });
});

app.get('/api/routes', authenticate, (req, res) => {
  const routes = db.routes.filter((route) => req.user.role === 'rto' || route.schoolId === req.user.schoolId || (req.user.role === 'parent' && req.user.vehicleIds?.some((vehicleId) => activeTrip(vehicleId)?.routeId === route.id)) || (req.user.role === 'driver' && req.user.vehicleIds?.some((vehicleId) => activeTrip(vehicleId)?.routeId === route.id)));
  res.json({ routes });
});
app.post('/api/routes', authenticate, allow('school', 'rto'), async (req, res) => {
  const { name, stops, path: routePath, speedLimitKmh = MAX_SPEED_KMH, deviationThresholdM = 120, plannedDurationMin = 30 } = req.body || {};
  const schoolId = req.user.role === 'school' ? req.user.schoolId : req.body.schoolId;
  if (!name || !Array.isArray(stops) || stops.length < 2 || !Array.isArray(routePath) || routePath.length < 2) return res.status(400).json({ error: 'Route name, at least two stops, and a route path are required.' });
  const route = { id: id('route'), schoolId, name, stops, path: routePath, speedLimitKmh: Number(speedLimitKmh), deviationThresholdM: Number(deviationThresholdM), plannedDurationMin: Number(plannedDurationMin) };
  db.routes.push(route); await saveDatabase(); res.status(201).json({ route });
});
app.patch('/api/routes/:routeId', authenticate, allow('school', 'rto'), async (req, res) => {
  const route = getRoute(req.params.routeId);
  if (!route || (req.user.role === 'school' && route.schoolId !== req.user.schoolId)) return res.status(404).json({ error: 'Route not found.' });
  ['name', 'stops', 'path', 'speedLimitKmh', 'deviationThresholdM', 'plannedDurationMin'].forEach((field) => { if (req.body?.[field] !== undefined) route[field] = req.body[field]; });
  await saveDatabase(); res.json({ route });
});
app.post('/api/routes/:routeId/refresh-path', authenticate, allow('school', 'rto'), async (req, res) => {
  const route = getRoute(req.params.routeId);
  if (!route || (req.user.role === 'school' && route.schoolId !== req.user.schoolId)) return res.status(404).json({ error: 'Route not found.' });
  if (!process.env.GOOGLE_ROUTES_API_KEY) return res.status(503).json({ error: 'Google Routes API is not configured. Add GOOGLE_ROUTES_API_KEY to .env.' });
  const [origin, ...middle] = route.stops;
  const destination = middle.pop();
  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': process.env.GOOGLE_ROUTES_API_KEY, 'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline' },
    body: JSON.stringify({ origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } }, destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } }, intermediates: middle.map((stop) => ({ location: { latLng: { latitude: stop.lat, longitude: stop.lng } } })), travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE' })
  });
  if (!response.ok) return res.status(502).json({ error: 'Google Routes API did not return a route.', detail: await response.text() });
  const routeData = (await response.json()).routes?.[0];
  route.googlePolyline = routeData?.polyline?.encodedPolyline || null;
  route.googleDistanceMeters = routeData?.distanceMeters || null;
  route.googleDuration = routeData?.duration || null;
  await saveDatabase(); res.json({ route });
});

app.post('/api/trips/start', authenticate, allow('driver'), async (req, res) => {
  const vehicle = getVehicle(req.user.vehicleIds?.[0]);
  const { routeId, checklist } = req.body || {};
  if (!vehicle) return res.status(400).json({ error: 'No driver vehicle is linked to this account.' });
  const current = activeTrip(vehicle.id); if (current) return res.json({ trip: safeTrip(current), alreadyActive: true });
  const route = getRoute(routeId); if (!route || route.schoolId !== vehicle.schoolId) return res.status(400).json({ error: 'Select a registered route for this vehicle.' });
  const complete = checklist && ['attendant', 'firstAid', 'speedGovernor', 'documents'].every((item) => checklist[item] === true);
  if (!complete) return res.status(400).json({ error: 'Complete all vehicle safety checks before starting the trip.' });
  const trip = { id: id('trip'), vehicleId: vehicle.id, routeId: route.id, schoolId: vehicle.schoolId, driverId: req.user.driverId, status: 'active', startedAt: now(), expectedArrivalAt: minutesFromNow(route.plannedDurationMin), endedAt: null, stoppedSince: null, lastLocation: null, locations: [], checklist };
  db.trips.push(trip); await saveDatabase(); io.to(`school:${vehicle.schoolId}`).emit('trip:started', safeTrip(trip)); res.status(201).json({ trip: safeTrip(trip) });
});
app.post('/api/trips/:tripId/end', authenticate, allow('driver'), async (req, res) => {
  const trip = db.trips.find((candidate) => candidate.id === req.params.tripId && candidate.status === 'active');
  if (!trip || trip.driverId !== req.user.driverId) return res.status(404).json({ error: 'Active driver trip not found.' });
  trip.status = 'completed'; trip.endedAt = now(); await saveDatabase();
  const vehicle = getVehicle(trip.vehicleId); recipientsForVehicle(vehicle).forEach((userId) => io.to(`user:${userId}`).emit('trip:ended', { tripId: trip.id, vehicleId: trip.vehicleId }));
  io.to(`school:${trip.schoolId}`).emit('trip:ended', { tripId: trip.id, vehicleId: trip.vehicleId });
  res.json({ trip: safeTrip(trip) });
});
app.post('/api/trips/:tripId/locations', authenticate, allow('driver'), async (req, res) => {
  const trip = db.trips.find((candidate) => candidate.id === req.params.tripId && candidate.status === 'active');
  if (!trip || trip.driverId !== req.user.driverId) return res.status(404).json({ error: 'Active driver trip not found.' });
  const { lat, lng, speedKmh = 0, accuracy = null, recordedAt = now() } = req.body || {};
  if (![lat, lng, speedKmh].every(Number.isFinite) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || speedKmh < 0 || speedKmh > 180) return res.status(400).json({ error: 'Location must include valid latitude, longitude, and speed in km/h.' });
  const location = { lat, lng, speedKmh: Number(speedKmh), accuracy: Number.isFinite(accuracy) ? accuracy : null, recordedAt };
  trip.lastLocation = location; trip.locations.push(location); if (trip.locations.length > 200) trip.locations.shift();
  const vehicle = getVehicle(trip.vehicleId); const update = { tripId: trip.id, vehicleId: trip.vehicleId, location, recordedAt };
  recipientsForVehicle(vehicle).forEach((userId) => io.to(`user:${userId}`).emit('location:update', update));
  io.to(`school:${trip.schoolId}`).emit('location:update', update);
  await evaluateTripRules(trip, location); await saveDatabase(); res.status(202).json({ accepted: true, trip: safeTrip(trip) });
});
app.post('/api/trips/:tripId/sos', authenticate, allow('driver'), async (req, res) => {
  const trip = db.trips.find((candidate) => candidate.id === req.params.tripId && candidate.driverId === req.user.driverId && candidate.status === 'active');
  if (!trip) return res.status(404).json({ error: 'Active driver trip not found.' });
  const vehicle = getVehicle(trip.vehicleId);
  const alert = await createAlert({ type: 'sos', severity: 'high', vehicleId: vehicle.id, schoolId: vehicle.schoolId, tripId: trip.id, title: 'SOS / emergency', message: `SOS received from ${vehicle.registration}. School transport team must review immediately.` });
  res.status(201).json({ alert: alert || { duplicate: true } });
});

app.post('/api/complaints', authenticate, allow('parent'), async (req, res) => {
  const { vehicleId, type, description } = req.body || {};
  const vehicle = getVehicle(vehicleId);
  if (!vehicle || !req.user.vehicleIds?.includes(vehicle.id)) return res.status(403).json({ error: 'Parents may report concerns only for an assigned vehicle.' });
  if (!type || !description || String(description).trim().length < 5) return res.status(400).json({ error: 'A concern type and a short description are required.' });
  const complaint = { id: id('complaint'), vehicleId: vehicle.id, schoolId: vehicle.schoolId, parentId: req.user.id, type: String(type).slice(0, 80), description: String(description).trim().slice(0, 240), status: 'open', createdAt: now() };
  db.complaints.unshift(complaint); await saveDatabase(); io.to(`school:${vehicle.schoolId}`).emit('complaint:new', complaint);
  const unresolved = db.complaints.filter((item) => item.vehicleId === vehicle.id && item.status === 'open').length;
  if (unresolved >= 3) await createAlert({ type: 'repeated_complaint', severity: 'high', vehicleId: vehicle.id, schoolId: vehicle.schoolId, title: 'Repeated complaint flag', message: `${vehicle.registration} has ${unresolved} unresolved parent reports.` });
  res.status(201).json({ complaint });
});
app.patch('/api/complaints/:complaintId', authenticate, allow('school'), async (req, res) => {
  const complaint = db.complaints.find((item) => item.id === req.params.complaintId && item.schoolId === req.user.schoolId);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
  complaint.status = req.body?.status === 'resolved' ? 'resolved' : complaint.status; complaint.resolvedAt = complaint.status === 'resolved' ? now() : null; await saveDatabase(); res.json({ complaint });
});
app.patch('/api/alerts/:alertId', authenticate, allow('school'), async (req, res) => {
  const alert = db.alerts.find((item) => item.id === req.params.alertId && item.schoolId === req.user.schoolId);
  if (!alert) return res.status(404).json({ error: 'Alert not found.' });
  alert.status = req.body?.status === 'resolved' ? 'resolved' : 'under_review'; alert.reviewedAt = now(); await saveDatabase(); res.json({ alert });
});

app.post('/api/push/subscribe', authenticate, async (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) return res.status(503).json({ error: 'Web Push is not configured on this server.' });
  const subscription = req.body?.subscription;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return res.status(400).json({ error: 'A valid push subscription is required.' });
  db.subscriptions = db.subscriptions.filter((item) => item.subscription.endpoint !== subscription.endpoint);
  db.subscriptions.push({ id: id('subscription'), userId: req.user.id, subscription, createdAt: now() }); await saveDatabase(); res.status(201).json({ subscribed: true });
});

// ---- Socket.IO Authentication ----
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.users.find((candidate) => candidate.id === payload.sub);
    if (!user) return next(new Error('Unauthorized'));
    socket.user = user; next();
  } catch { next(new Error('Unauthorized')); }
});
io.on('connection', (socket) => {
  socket.join(`user:${socket.user.id}`); socket.join(`role:${socket.user.role}`);
  if (socket.user.schoolId) socket.join(`school:${socket.user.schoolId}`);
});

// GPS inactivity checker
setInterval(() => {
  const inactiveTrips = db.trips.filter((trip) => trip.status === 'active' && (!trip.lastLocation || Date.now() - new Date(trip.lastLocation.recordedAt).getTime() > GPS_INACTIVE_MS));
  inactiveTrips.forEach((trip) => {
    const vehicle = getVehicle(trip.vehicleId);
    createAlert({ type: 'gps_inactive', severity: 'medium', vehicleId: vehicle.id, schoolId: vehicle.schoolId, tripId: trip.id, title: 'App inactive / GPS off', message: `${vehicle.registration} has no current driver app location signal.` }).catch(() => {});
  });
}, 60 * 1000).unref();

// ---- Serve built frontend ----
app.use(express.static(FRONTEND_DIST));
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));
// SPA fallback - serve index.html for all non-API, non-static routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'), (err) => {
    if (err) next();
  });
});
app.use((error, req, res, next) => {
  console.error(error); res.status(500).json({ error: 'Unexpected server error.' });
});

server.listen(PORT, () => {
  console.log(`Safe School Bus API and app are running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to use the app.`);
});