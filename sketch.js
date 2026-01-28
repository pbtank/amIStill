let stars = [];
const STAR_COUNT = 1000;
const STAR_SPEED = 50;

// --- DEVICE ORIENTATION ---
let yaw = 0;    // compass (alpha)
let pitch = 0;  // gravity tilt (beta)
let roll = 0;   // device roll (gamma)
let _y = 0, _p = 0, _r = 0;

function shortestAngle(a, b) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

// // Listen to device orientation
// window.addEventListener("deviceorientation", e => {
//   //if (e.alpha == null) return;
  
//   _y   = radians(e.alpha || 0); // Z axis (compass)
//   _p = radians(e.beta  || 0); // X axis (gravity)
//   _r  = radians(e.gamma || 0); // Y axis (roll)
// });

// // final smooth output (USE THESE)
// function updateOrientation() {
//   yaw   += SMOOTH * shortestAngle(yaw, _y);
//   pitch += SMOOTH * shortestAngle(pitch, _p);
//   roll  += SMOOTH * shortestAngle(roll, _r);

//   // Convert to rotation matrix (avoids gimbal lock)
//   // orientationMatrix = eulerToRotationMatrix(yaw, pitch, roll);
//   deviceQuat = eulerToQuaternion(yaw, pitch, roll);

//   // orientationMatrix = quaternionToMatrix(cQuat);
// }

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // Request permission for iOS 13+
  if (typeof DeviceMotionEvent !== 'undefined' && 
      typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          window.addEventListener('devicemotion', handleMotion, true);
        }
      })
      .catch(console.error);
  } else {
    window.addEventListener('devicemotion', handleMotion, true);
  }
  
  // Fallback: Use DeviceOrientation if Magnetometer API not available
  if (typeof DeviceOrientationEvent !== 'undefined' && 
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        }
      })
      .catch(console.error);
  } else {
    // window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation);
  }

  for (let i = 0; i < STAR_COUNT; i++) {
    stars[i] = new Star();
  }

  hud = createGraphics(500, 500);
  hud.pixelDensity(1);
  hud.textSize(16);
}

function draw() {
  background(0);

  // if (worldMatrix) {
  //   applyWorldTransform();
  // }
  if (gravity) {
    // Draw world-locked content
    drawWorldLockedArrow();
    drawReferenceGrid();
  }

  // update all stars
  for (let i = 0; i < STAR_COUNT; i++) {
    stars[i].update();
  }

  // ref sphere
  stroke(0);
  strokeWeight(1);
  sphere(30);

  // drawing points
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
  // drawing lines
  for (let d = 0; d < 4; d++) {
    strokeWeight(d);
    stroke(map(d, 0, 3, 0, 255));
    beginShape(LINES);
    for (let p of stars) {
      pz = map(abs(p.z), 0, width*2, 3, 0);
      if (d < pz && pz < d+1) {
        vertex(p.x, p.y, p.z);
        vertex(p.x, p.y, p.z-p.trailLen)
      }
    }
    endShape();
  }
  
  // hud text
  hud.clear();
  hud.fill(255, 0, 0);
  hud.text("Test 11g", 10, 30);
  if (gravity) {
    hud.text("g : " + gravity.x.toFixed(3) + ", " + gravity.y.toFixed(3) + ", " + gravity.z.toFixed(3), 50, 50);
  }
  if (worldMatrix){
    hud.text("q : ", 50, 70);
  }
  push();
  resetMatrix();
  image(hud, -width/2, -height/2);
  pop();
}

// ---------------- STAR ----------------
function Star() {
  this.x = random(-width*2, width*2);
  this.y = random(-height*2, height*2);
  this.z = random(-width * 2, width * 2);

  this.trailLen = 160;

  this.pz = this.z + this.trailLen

  this.update = function () {
    this.z += STAR_SPEED;
    this.pz += STAR_SPEED;
    
    if (this.z == 0) {
      this.z -= 1;
    }

    if (this.z > width * 2) {
      this.z = -width * 2;
      this.x = random(-width*2, width*2);
      this.y = random(-height*2, height*2);

      this.pz = this.z + this.trailLen
    }
  };

  this.show = function () {

    let w = map(this.z, 0, -width * 2, 5, 0);

    strokeWeight(w);
    stroke(255);
    point(this.x, this.y, this.z);
  };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function drawWorldLockedArrow() {
  push();
  
  // Arrow pointing gravity direction
  stroke(255, 100, 100);
  strokeWeight(5);
  
  // Direction in world space
  let len = 200;
  line(0, 0, 0, gravity.x*len, -gravity.y*len, gravity.z*len);
  
  translate(gravity.x*len, -gravity.y*len, gravity.z*len);
  fill(255, 100, 100);
  noStroke();
  rotateX(PI / 2);
  cone(10, 30);
  
  pop();
  if (worldMatrix) {
    push();
    applyMatrix(worldMatrix);
    // Arrow pointing magneto direction
    stroke(255, 100, 100);
    strokeWeight(5);
    
    // Direction in world space
    len = 200;
    // line(0, 0, 0, north.x*len, -north.y*len, north.z*len);
    line(0, 0, 0, 1*len, 0, 0);
    translate(1*len, 0, 0);
    fill(255, 100, 100);
    noStroke();
    rotateX(PI / 2);
    cone(10, 30);
    
    pop();
  }
}

function drawReferenceGrid() {
  push();
  stroke(255, 255, 255, 50);
  strokeWeight(1);
  
  // Horizontal grid on ground plane
  for (let i = -5; i <= 5; i++) {
    line(i * 50, 0, -250, i * 50, 0, 250);
    line(-250, 0, i * 50, 250, 0, i * 50);
  }
  pop();
}