const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Read current database
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// Demo account details
const demoPassword = 'demo123'; // Simple password for demo
const passwordHash = bcrypt.hashSync(demoPassword, 10);

// Create demo parent account for M Omar
const demoUser = {
  id: 'user-' + Date.now(),
  role: 'parent',
  name: 'M Omar',
  email: 'omarmohd742@gmail.com',
  passwordHash: passwordHash,
  schoolId: 'school-demo-001',
  driverId: null,
  vehicleIds: ['vehicle-demo-001'],
  address: 'Bemina, Srinagar, Kashmir',
  phone: '+91-7000000000'
};

// Create demo school
const demoSchool = {
  id: 'school-demo-001',
  name: 'Demo Public School',
  address: 'Bemina, Srinagar',
  contactEmail: 'school@demo.com',
  contactPhone: '+91-7000000001',
  createdAt: new Date().toISOString()
};

// Create demo driver
const demoDriver = {
  id: 'driver-demo-001',
  name: 'Demo Driver',
  licenseNumber: 'DL-DEMO-001',
  phone: '+91-7000000002',
  createdAt: new Date().toISOString()
};

// Create demo vehicle
const demoVehicle = {
  id: 'vehicle-demo-001',
  schoolId: 'school-demo-001',
  driverId: 'driver-demo-001',
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

// Create demo route
const demoRoute = {
  id: 'route-demo-001',
  schoolId: 'school-demo-001',
  name: 'Bemina Route',
  stops: [
    { name: 'Bemina Main', lat: 34.0836, lng: 74.7973 },
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

// Create demo trip
const demoTrip = {
  id: 'trip-demo-001',
  vehicleId: 'vehicle-demo-001',
  routeId: 'route-demo-001',
  schoolId: 'school-demo-001',
  driverId: 'driver-demo-001',
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

// Add to database
db.users.push(demoUser);
db.schools.push(demoSchool);
db.drivers.push(demoDriver);
db.vehicles.push(demoVehicle);
db.routes.push(demoRoute);
db.trips.push(demoTrip);

// Clear pending registrations
db.pendingRegistrations = [];

// Save database
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

console.log('✅ Demo account created successfully!');
console.log('');
console.log('📋 Demo Account Details:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Name:      M Omar');
console.log('Email:     omarmohd742@gmail.com');
console.log('Password:  demo123');
console.log('Role:      Parent');
console.log('Address:   Bemina, Srinagar, Kashmir');
console.log('Phone:     +91-7000000000');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('🚀 You can now login with these credentials!');
console.log('   The app should be running at http://localhost:3000');