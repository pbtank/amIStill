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

// Fixed world direction for star motion (North = -Z axis)
// const MOTION_DIR = { x: 0, y: 0, z: -1 };

// function touchStarted() {
//   if (typeof DeviceOrientationEvent !== "undefined" &&
//       typeof DeviceOrientationEvent.requestPermission === "function") {
//     DeviceOrientationEvent.requestPermission();
//   }
// }

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

  // // Try to use raw Magnetometer API (best option)
  // initMagnetometer();
  
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
    window.addEventListener('deviceorientation', handleOrientation, true);
  }

  for (let i = 0; i < STAR_COUNT; i++) {
    stars[i] = new Star();
  }

  hud = createGraphics(500, 500);
  hud.pixelDensity(1);
  hud.textSize(16);

  // Track screen orientation using modern API
  if (screen.orientation) {
    screen.orientation.addEventListener('change', updateScreenOrientation);
  }
  updateScreenOrientation();
}

// function mouseDragged() {
//   yaw = map(mouseX, 0, width, 0, radians(180));
// }

function draw() {
  background(0);
  // getSensors();
  //translate(width * 0.5, height * 0.5);

  // updateOrientation();

  // if (worldMatrix) {
  //   applyWorldTransform();
  // }
  if (gravity) {
    // Draw world-locked content
    drawWorldLockedArrow();
    drawReferenceGrid();
  }

  // // apply REAL-WORLD rotation
  // // (inverse rotation = camera transform)
  // cameraZ = (height/2)/tan(PI/6);
  // // translate(0, 0, -cameraZ);
  // rotateZ(-yaw);
  // rotateX(-pitch);
  // rotateY(-roll);
  // // translate(0, 0, cameraZ);

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
  hud.text("Test 11a", 10, 30);
  if (gravity) {
    hud.text("g : " + gravity.x.toFixed(3) + ", " + gravity.y.toFixed(3) + ", " + gravity.z.toFixed(3), 50, 50);
  }
  if (north){
    hud.text("N : " + north.x.toFixed(3) + ", " + north.y.toFixed(3) + ", " + north.z.toFixed(3), 50, 70);
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
    line(0, 0, 0, north.x*len, -north.y*len, north.z*len);
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
  
  // // Compass directions
  // fill(100, 200, 100);
  // noStroke();
  // textAlign(CENTER, CENTER);
  // textSize(20);
  
  // push();
  // translate(0, -10, -200);
  // rotateX(PI / 2);
  // text('N', 0, 0);
  // pop();
  
  pop();
}