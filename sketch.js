let stars = [];
const STAR_COUNT = 1000;
const STAR_SPEED = 50;

// --- DEVICE ORIENTATION ---
let yaw = 0;    // compass (alpha)
let pitch = 0;  // gravity tilt (beta)
let roll = 0;   // device roll (gamma)
let _y = 0, _p = 0, _r = 0;
let lastT = null;

const GYRO_WEIGHT = 0.995; // drift correction strength
const YAW_SMOOTH = 0.08;     // visual smoothing

function shortestAngle(a, b) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

function ema(prev, next, a) {
  return prev + a * (next - prev);
}

// Fixed world direction for star motion (North = -Z axis)
const MOTION_DIR = { x: 0, y: 0, z: -1 };

function touchStarted() {
  if (typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission();
  }
}

// gyroscope integration (fast)
window.addEventListener("devicemotion", e => {
  if (!e.rotationRate) return;

  if (!lastT) {
    lastT = e.timeStamp;
    return;
  }

  const dt = (e.timeStamp - lastT) / 1000;
  lastT = e.timeStamp;

  _r += rad(e.rotationRate.beta  || 0) * dt;
  _p += rad(e.rotationRate.gamma || 0) * dt;
  _y += rad(e.rotationRate.alpha || 0) * dt;
});

// Listen to device orientation
window.addEventListener("deviceorientation", e => {
  //if (e.alpha == null) return;
  
  const ay   = radians(e.alpha || 0); // Z axis (compass)
  const ap = radians(e.beta  || 0); // X axis (gravity)
  const ar  = radians(e.gamma || 0); // Y axis (roll)

  _y += (1 - GYRO_WEIGHT) * shortestAngle(_y, ay);
  _p += (1 - GYRO_WEIGHT) * shortestAngle(_p, ap);
  _r += (1 - GYRO_WEIGHT) * shortestAngle(_r, ar);
});

// final smooth output (USE THESE)
function updateOrientation() {
  yaw   = ema(yaw, _y, YAW_SMOOTH);
  pitch = _p;
  roll  = _r;
}

function setup() {
  createCanvas(windowWidth, windowHeight, P2D);
  for (let i = 0; i < STAR_COUNT; i++) {
    stars[i] = new Star();
  }
}

function draw() {
  background(0);
  translate(width * 0.5, height * 0.5);
  text("Test 8b " + degrees(yaw).toFixed(3) + "\n" + degrees(pitch).toFixed(3) + "\n" + degrees(roll).toFixed(3), 0, 0);
  
  updateOrientation();
  
  yaw = map(mouseX, 0, width, 0, radians(180));
  for (let i = 0; i < STAR_COUNT; i++) {
    stars[i].update();
    stars[i].show(yaw, pitch, roll);
  }
}

// ---------------- STAR ----------------

function Star() {
  // WORLD SPACE position (East, Up, North)
  this.x = random(-width, width);
  this.y = random(-height, height);
  this.z = random(-width * 2, width * 2);

  this.trailLen = 80;

  // World-locked motion (stars flow in MOTION_DIR)
  this.update = function () {
    this.x += MOTION_DIR.x * STAR_SPEED;
    this.y += MOTION_DIR.y * STAR_SPEED;
    this.z += MOTION_DIR.z * STAR_SPEED;
    
    if (this.z < -width * 2) {
      this.z = width * 2;
      this.x = random(-width, width);
      this.y = random(-height, height);
    }
  };

  this.show = function (yaw, pitch, roll) {

    // ---- WORLD → CAMERA (inverse device rotation with roll) ----
    let cy = cos(-yaw), sy = sin(-yaw);
    let cp = cos(-pitch), sp = sin(-pitch);
    let cr = cos(-roll), sr = sin(-roll);

    // current position
    // Yaw rotation (around Y-axis)
    let x1 =  cy * this.x + sy * this.z;
    let z1 = -sy * this.x + cy * this.z;
    
    // Pitch rotation (around X-axis)
    let y2 =  cp * this.y - sp * z1;
    let z2 =  sp * this.y + cp * z1;
    
    // Roll rotation (around Z-axis)
    let x3 =  cr * x1 - sr * y2;
    let y3 =  sr * x1 + cr * y2;

    // previous position (for trails)
    let px = this.x - MOTION_DIR.x * this.trailLen;
    let py = this.y - MOTION_DIR.y * this.trailLen;
    let pz = this.z - MOTION_DIR.z * this.trailLen;
    
    // Yaw rotation
    let px1 =  cy * px + sy * pz;
    let pz1 = -sy * px + cy * pz;
    
    // Pitch rotation
    let py2 =  cp * py - sp * pz1;
    let pz2 =  sp * py + cp * pz1;
    
    // Roll rotation
    let px3 =  cr * px1 - sr * py2;
    let py3 =  sr * px1 + cr * py2;

    if (z2 < 1 || pz2 < 1) return;

    // ---- PROJECTION ----
    let sxx = (x3 / z2) * width;
    let syy = (y3 / z2) * height;

    let pxx = (px3 / pz2) * width;
    let pyy = (py3 / pz2) * height;

    let w = map(z2, 0, width * 2, 3, 0);
    let c1 = map(pz2, width * 0.5, width*2, 255, 50);
    let c2 = map(z2,  width * 0.5, width*2, 255, 50);

    noStroke();
    fill(255);
    ellipse(sxx, syy, w, w);

    stLine(pxx, pyy, sxx, syy, c1, c2);
  };
}

// ------------- TRAIL LINE -------------

function stLine(x1, y1, x2, y2, c1, c2) {
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    let t1 = i / segs;
    let t2 = (i + 1) / segs;

    let sx1 = lerp(x1, x2, t1);
    let sy1 = lerp(y1, y2, t1);
    let sx2 = lerp(x1, x2, t2);
    let sy2 = lerp(y1, y2, t2);

    stroke(lerp(c1, c2, t1));
    line(sx1, sy1, sx2, sy2);
  }
}