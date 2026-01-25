let stars = [];
const STAR_COUNT = 1000;
const STAR_SPEED = 50;

// --- DEVICE ORIENTATION ---
let yaw = 0;    // compass (alpha)
let pitch = 0;  // gravity tilt (beta)
let roll = 0;   // device roll (gamma)
let _y = 0, _p = 0, _r = 0;

const SMOOTH = 0.15; // try 0.1–0.25

function shortestAngle(a, b) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

// Fixed world direction for star motion (North = -Z axis)
// const MOTION_DIR = { x: 0, y: 0, z: -1 };

function touchStarted() {
  if (typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission();
  }
}

// Listen to device orientation
window.addEventListener("deviceorientation", e => {
  //if (e.alpha == null) return;
  
  _y   = radians(e.alpha || 0); // Z axis (compass)
  _p = radians(e.beta  || 0); // X axis (gravity)
  _r  = radians(e.gamma || 0); // Y axis (roll)
});

// final smooth output (USE THESE)
function updateOrientation() {
  yaw   += SMOOTH * shortestAngle(yaw, _y);
  pitch += SMOOTH * shortestAngle(pitch, _p);
  roll  += SMOOTH * shortestAngle(roll, _r);
}

function rotatePoint(x, y, z, yaw, pitch, roll) {

  // --- inverse yaw (Z) ---
  let cy = Math.cos(-yaw), sy = Math.sin(-yaw);
  let x1 = cy*x - sy*y;
  let y1 = sy*x + cy*y;
  let z1 = z;

  // --- inverse pitch (X) ---
  let cp = Math.cos(-pitch), sp = Math.sin(-pitch);
  let x2 = x1;
  let y2 = cp*y1 - sp*z1;
  let z2 = sp*y1 + cp*z1;

  // --- inverse roll (Y) ---
  let cr = Math.cos(-roll), sr = Math.sin(-roll);
  let x3 = cr*x2 + sr*z2;
  let y3 = y2;
  let z3 = -sr*x2 + cr*z2;

  return [x3, y3, z3];
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  for (let i = 0; i < STAR_COUNT; i++) {
    stars[i] = new Star();
  }

  hud = createGraphics(500, 500);
  hud.pixelDensity(1);
  hud.textSize(16);
}

// function mouseDragged() {
//   yaw = map(mouseX, 0, width, 0, radians(180));
// }

function draw() {
  background(0);
  //translate(width * 0.5, height * 0.5);
  //text("Test 8e " + degrees(yaw).toFixed(3) + "\n" + degrees(pitch).toFixed(3) + "\n" + degrees(roll).toFixed(3), 0, 0);
  updateOrientation();

  // apply REAL-WORLD rotation
  // (inverse rotation = camera transform)
  cameraZ = (height/2)/tan(PI/6);
  // translate(0, 0, -cameraZ);
  rotateZ(-yaw);
  rotateY(-pitch);
  rotateY(-roll);
  // translate(0, 0, cameraZ);
  stroke(0);
  strokeWeight(1);
  sphere(30);
  for (let i = 0; i < STAR_COUNT; i++) {
    stars[i].update();
  }

  for (let d = 0; d < 5; d++) {
    strokeWeight(d);
    stroke(map(d, 0, 4, 0, 255));
    beginShape(POINTS);
    for (let p of stars) {
      pz = map(abs(p.z), 0, width*2, 5, 0);
      if (d < pz && pz < d+1) {
        vertex(p.x, p.y, p.z);
      }
    }
    endShape();
  }
  for (let d = 0; d < 4; d++) {
    strokeWeight(d);
    stroke(map(d, 0, 3, 0, 255));
    beginShape(LINES);
    for (let p of stars) {
      pz = map(abs(p.z), 0, width*2, 3, 0);
      if (d < pz && pz < d+1) {
        vertex(p.x, p.y, p.z);
        vertex(p.x, p.y, p.z-80)
      }
    }
    endShape();
  }
  
  hud.clear();
  hud.fill(255, 0, 0);
  hud.text("Test 9 \nYaw: " + degrees(yaw).toFixed(3) + "\nPitch:" + degrees(pitch).toFixed(3) + "\nRoll:" + degrees(roll).toFixed(3), 50, 50);
  // hud.rect(0, 0, 100, 100);
  push();
  resetMatrix();
  image(hud, -width/2, -height/2);
  pop();
}

// ---------------- STAR ----------------

function Star() {
  this.x = random(-width, width);
  this.y = random(-height, height);
  this.z = random(-width * 2, width * 2);

  this.trailLen = 80;

  this.pz = this.z + this.trailLen

  this.update = function () {
    this.z += STAR_SPEED;
    this.pz += STAR_SPEED;
    
    if (this.z == 0) {
      this.z -= 1;
    }

    if (this.z > width * 2) {
      this.z = -width * 2;
      this.x = random(-width, width);
      this.y = random(-height, height);

      this.pz = this.z + this.trailLen
    }
  };

  this.show = function () {

    // let sx = map(this.x / this.z, 0, 1, 0, width);
    // let sy = map(this.y / this.z, 0, 1, 0, height);

    // let px = map(this.x / this.pz, 0, 1, 0, width);
    // let py = map(this.y / this.pz, 0, 1, 0, height);

    let w = map(this.z, 0, -width * 2, 5, 0);
    // let c1 = map(this.pz, width * 0.5, width*2, 255, 50);
    // let c2 = map(this.z,  width * 0.5, width*2, 255, 50);

    strokeWeight(w);
    stroke(255);
    point(this.x, this.y, this.z);

    //stLine(px, py, sxx, syy, c1, c2);
  };
}

// ------------- TRAIL LINE -------------

function stLine(x1, y1, x2, y2, c1, c2) {
  const segs = 3;
  for (let i = 0; i < segs; i++) {
    let t1 = i / segs;
    let t2 = (i + 1) / segs;

    let sx1 = lerp(x1, x2, t1);
    let sy1 = lerp(y1, y2, t1);
    let sx2 = lerp(x1, x2, t2);
    let sy2 = lerp(y1, y2, t2);

    //stroke(lerp(c1, c2, t1));
    stroke(255);
    line(sx1, sy1, sx2, sy2);
  }
}