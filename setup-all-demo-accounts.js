const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Read current database
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// Demo account details
const demoPassword = 'demo123';
const passwordHash = bcrypt.hashSync(demoPassword, 10);

// Clear existing data
db.users = [];
db.schools = [];
db.drivers = [];
db.vehicles = [];
db.routes = [];
db.trips = [];
db.alerts = [];
db.complaints = [];
db.pendingRegistrations = [];

// Common IDs
const schoolId = 'school-demo-001';
const driverId = 'driver-demo-001';
const vehicleId = 'vehicle-demo-001';
const routeId = 'route-demo-001';
const tripId = 'trip-demo-001';

// 1. Create Parent Demo Account
const parentUser = {
  id: 'user-parent-' + Date.now(),
  role: 'parent',
  name: 'M Omar (Parent)',
  email: 'parent@demo.com',
  passwordHash: passwordHash,
  schoolId: schoolId,
  driverId: null,
  vehicleIds: [vehicleId],
  address: 'Bemina, Srinagar, Kashmir',
  phone: '+91-7000000000'
};

// 2. Create School Demo Account
const schoolUser = {
  id: 'user-school-' + Date.now(),
  role: 'school',
  name: 'M Omar (School Admin)',
  email: 'school@demo.com',
  passwordHash: passwordHash,
  schoolId: schoolId,
  driverId: null,
  vehicleIds: []
};

// 3. Create Driver Demo Account
const driverUser = {
  id: 'user-driver-' + Date.now(),
  role: 'driver',
  name: 'M Omar (Driver)',
  email: 'driver@demo.com',
  passwordHash: passwordHash,
  schoolId: schoolId,
  driverId: driverId,
  vehicleIds: [vehicleId]
};

// 4. Create RTO Demo Account
const rtoUser = {
  id: 'user-rto-' + Date.now(),
  role: 'rto',
  name: 'M Omar (RTO Admin)',
  email: 'rto@demo.com',
  passwordHash: passwordHash,
  schoolId: null,
  driverId: null,
  vehicleIds: []
};

// Create School
const school = {
  id: schoolId,
  name: 'Demo Public School',
  address: 'Bemina, Srinagar, Kashmir',
  contactEmail: 'school@demo.com',
  contactPhone: '+91-7000000000',
  createdAt: new Date().toISOString()
};

// Create Driver
const driver = {
  id: driverId,
  name: 'M Omar (Driver)',
  licenseNumber: 'DL-DEMO-001',
  phone: '+91-7000000000',
  userId: driverUser.id,
  createdAt: new Date().toISOString()
};

// Create Vehicle
const vehicle = {
  id: vehicleId,
  schoolId: schoolId,
  driverId: driverId,
  registration: 'JK01-DEMO-1234',
  attendant: 'Demo Attendant',
  documentsStatus: 'current',
  complianceScore: 100,
  checklist: {
    attendant: true,
    firstAid: true,
    speedGovernor: true,
    documents: true
  },
  createdAt: new Date().toISOString()
};

// Create Route
const route = {
  id: routeId,
  schoolId: schoolId,
  name: 'Bemina to School Route',
  stops: [
    { name: 'Bemina Main Market', lat: 34.0836, lng: 74.7973 },
    { name: 'Bemina Post Office', lat: 34.0843, lng: 74.7981 },
    { name: 'School Gate', lat: 34.0850, lng: 74.7990 }
  ],
  path: [
    { lat: 34.0836, lng: 74.7973 },
    { lat: 34.0843, lng: 74.7981 },
    { lat: 34.0850, lng: 74.7990 }
  ],
  speedLimitKmh: 40,
  deviationThresholdM: 120,
  plannedDurationMin: 30,
  createdAt: new Date().toISOString()
};

// Create Active Trip
const trip = {
  id: tripId,
  vehicleId: vehicleId,
  routeId: routeId,
  schoolId: schoolId,
  driverId: driverId,
  status: 'active',
  startedAt: new Date().toISOString(),
  expectedArrivalAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  endedAt: null,
  stoppedSince: null,
  lastLocation: {
    lat: 34.0843,
    lng: 74.7981,
    speedKmh: 25,
    accuracy: 10,
    recordedAt: new Date().toISOString()
  },
  locations: [
    {
      lat: 34.0843,
      lng: 74.7981,
      speedKmh: 25,
      accuracy: 10,
      recordedAt: new Date().toISOString()
    }
  ],
  checklist: {
    attendant: true,
    firstAid: true,
    speedGovernor: true,
    documents: true
  }
};

// Add all demo accounts
db.users.push(parentUser, schoolUser, driverUser, rtoUser);
db.schools.push(school);
db.drivers.push(driver);
db.vehicles.push(vehicle);
db.routes.push(route);
db.trips.push(trip);

// Save database
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

console.log('✅ All demo accounts created successfully!');
console.log('');
console.log('📋 Demo Account Credentials:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Password (same for all): demo123');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('👥 Available Demo Accounts:');
console.log('  1. Parent  - Email: parent@demo.com');
console.log('              Name: M Omar (Parent)');
console.log('              View: Child\'s bus location & safety');
console.log('');
console.log('  2. School  - Email: school@demo.com');
console.log('              Name: M Omar (School Admin)');
console.log('              View: Fleet management & alerts');
console.log('');
console.log('  3. Driver  - Email: driver@demo.com');
console.log('              Name: M Omar (Driver)');
console.log('              View: Trip console & GPS');
console.log('');
console.log('  4. RTO     - Email: rto@demo.com');
console.log('              Name: M Omar (RTO Admin)');
console.log('              View: Fleet compliance & risk');
console.log('');
console.log('💡 Each role has a unique email for proper testing!');