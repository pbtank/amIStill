let stars = [];
const STAR_COUNT = 1000;
const STAR_SPEED = 50;

// --- DEVICE ORIENTATION ---
let yaw = 0;    // compass (alpha)
let pitch = 0;  // gravity tilt (beta)

// Fixed world direction for star motion (North = -Z axis)
const MOTION_DIR = { x: 0, y: 0, z: -1 };

// iOS permission helper
function touchStarted() {
  if (typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission();
  }
}

// Listen to device orientation
window.addEventListener("deviceorientationabsolute", e => {
  yaw   = radians(e.alpha || 0); // Z axis (compass)
  pitch = radians(e.beta  || 0); // X axis (gravity)
});

function setup() {
  createCanvas(windowWidth, windowHeight, P2D);
  for (let i = 0; i < STAR_COUNT; i++) {
    stars[i] = new Star();
  }
}

function draw() {
  background(0);
  translate(width * 0.5, height * 0.5);
  text("Test 1", 0, 0);
  yaw = map(mouseX, 0, width, 0, radians(180));
  for (let i = 0; i < STAR_COUNT; i++) {
    stars[i].update();
    stars[i].show(yaw, pitch);
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

  this.show = function (yaw, pitch) {

    // ---- WORLD → CAMERA (inverse device rotation) ----
    let cy = cos(-yaw), sy = sin(-yaw);
    let cp = cos(-pitch), sp = sin(-pitch);

    // current position
    let x1 =  cy * this.x + sy * this.z;
    let z1 = -sy * this.x + cy * this.z;
    let y1 =  cp * this.y - sp * z1;
    let z2 =  sp * this.y + cp * z1;

    // previous position (for trails)
    let px = this.x - MOTION_DIR.x * this.trailLen;
    let py = this.y - MOTION_DIR.y * this.trailLen;
    let pz = this.z - MOTION_DIR.z * this.trailLen;
    
    let px1 =  cy * px + sy * pz;
    let pz1 = -sy * px + cy * pz;
    let py1 =  cp * py - sp * pz1;
    let pz2 =  sp * py + cp * pz1;

    if (z2 < 1 || pz2 < 1) return;

    // ---- PROJECTION ----
    let sxx = (x1 / z2) * width;
    let syy = (y1 / z2) * height;

    let pxx = (px1 / pz2) * width;
    let pyy = (py1 / pz2) * height;

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