let orientationMatrix = null;
let screenOrientation = 0;

// Direct sensor vector approach for world-locking
let gravity = null;      // Gravity vector (down in world)
let north = null;        // Magnetic north vector
let worldMatrix = null;  // Transform matrix from world to device
let magnetometer = null; // Raw magnetometer reading

let _gravity = null;
let _north;
let _magnetometer = null;

const SMOOTH = 0.1; // try 0.1–0.25

function handleMotion(event) {
  // Get gravity vector from accelerometer (including gravity)
  // This vector points DOWN in world coordinates
  if (event.accelerationIncludingGravity) {
    let g = event.accelerationIncludingGravity;
    if (!gravity) {
        gravity = {x:0, y:0, z:0};
        _gravity = {x:0, y:0, z:0};
    }
    _gravity = {
      x: g.x || 0,
      y: g.y || 0,
      z: g.z || 0
    };

    // Normalize gravity vector
    let mag = Math.sqrt(_gravity.x * _gravity.x + _gravity.y * _gravity.y + _gravity.z * _gravity.z);
    if (mag > 0.1) {
      _gravity.x /= mag;
      _gravity.y /= mag;
      _gravity.z /= mag;
    }

    gravity.x += SMOOTH * (_gravity.x-gravity.x);
    gravity.y += SMOOTH * (_gravity.y-gravity.y);
    gravity.z += SMOOTH * (_gravity.z-gravity.z);

    // updateWorldMatrix();
  }
}

function handleOrientation(event) {
  // Store raw magnetometer data if available
  // We'll compute north vector ourselves using gravity
  
  if (event.webkitCompassHeading !== undefined) {
    // iOS - store heading for now
    magnetometer = {
      heading: event.webkitCompassHeading,
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma
    };
  } else if (event.alpha !== null) {
    // Android - store Euler angles
    if (!magnetometer) {
      magnetometer = {alpha:0, beta:0, gamma:0};
      _magnetometer = {alpha:0, beta:0, gamma:0};
    }

    _magnetometer = {
      alpha: radians(event.alpha || 0),
      beta: radians(event.beta || 0),
      gamma: radians(event.gamma || 0)
    };
    
    // // Normalize gravity vector
    // let mag = Math.sqrt(_magnetometer.alpha * _magnetometer.alpha + _magnetometer.beta * _magnetometer.beta + _magnetometer.gamma * _magnetometer.gamma);
    // if (mag > 0.1) {
    //   _magnetometer.alpha /= mag;
    //   _magnetometer.beta /= mag;
    //   _magnetometer.gamma /= mag;
    // }

    magnetometer.alpha += SMOOTH * (_magnetometer.alpha - magnetometer.alpha);
    magnetometer.beta += SMOOTH * (_magnetometer.beta - magnetometer.beta);
    magnetometer.gamma += SMOOTH * (_magnetometer.gamma - magnetometer.gamma);

    let quat = eulerToQuaternion(magnetometer.alpha, magnetometer.beta, magnetometer.gamma);

    worldMatrix = quaternionToMatrix4(quat);
  }
  
  // updateWorldMatrix();
}

// Alternative: Use Magnetometer API directly (more accurate)
function initMagnetometer() {
  if ('Magnetometer' in window) {
    try {
      const sensor = new Magnetometer({frequency: 60});
      sensor.addEventListener('reading', () => {
        magnetometer = {
          x: sensor.x,
          y: sensor.y,
          z: sensor.z,
          raw: true
        };
        // updateWorldMatrix();
      });
      sensor.start();
    } catch (error) {
      console.log('Magnetometer not available:', error);
    }
  }
}

function updateWorldMatrix() {
  if (!gravity || !magnetometer) return;
  
  // Build orthonormal coordinate system from gravity and magnetometer
  // World coordinate system: X=East, Y=Up, Z=South
  
  // Step 1: Up vector is opposite of gravity (normalized)
  let up = normalize({
    x: gravity.x,
    y: gravity.y,
    z: gravity.z
  });
  
  // Step 2: Get magnetic field vector in device coordinates
  let magVec;
  
  if (magnetometer.raw) {
    // Raw magnetometer data (best!)
    magVec = {
      x: magnetometer.x,
      y: magnetometer.y,
      z: magnetometer.z
    };
  } else {
    // Derive from orientation angles (less accurate when vertical)
    // This is a fallback - compute magnetic north in device frame
    let alpha = magnetometer.alpha;
    let beta = magnetometer.beta;
    let gamma = magnetometer.gamma;
    
    // Approximate magnetic vector assuming device orientation
    // This becomes unreliable when device is vertical
    magVec = {
      x: -Math.cos(beta) * Math.sin(alpha),
      y: -Math.sin(beta),
      z: -Math.cos(beta) * Math.cos(alpha)
    };
  }
  
  // Step 3: Project magnetic vector onto horizontal plane (perpendicular to gravity)
  // This removes the vertical component to get true north direction
  let dotMG = magVec.x * up.x + magVec.y * up.y + magVec.z * up.z;
  let northWorld = {
    x: magVec.x - dotMG * up.x,
    y: magVec.y - dotMG * up.y,
    z: magVec.z - dotMG * up.z
  };
  
  // Normalize to get north direction
  northWorld = normalize(northWorld);
  
  // Check if we got a valid north vector
  if (northWorld.x === 0 && northWorld.y === 0 && northWorld.z === 0) {
    // Magnetic field parallel to gravity (rare) - use fallback
    // Create arbitrary north perpendicular to up
    if (Math.abs(up.x) < 0.9) {
      northWorld = normalize(cross({x: 1, y: 0, z: 0}, up));
    } else {
      northWorld = normalize(cross({x: 0, y: 1, z: 0}, up));
    }
  }
  
  // Step 4: East is perpendicular to both North and Up
  // East = North × Up
  let east = normalize(cross(northWorld, up));
  
  // Step 5: Recalculate North to ensure perfect orthogonality
  // North = Up × East
  let northFinal = normalize(cross(up, east));
  
  // Step 6: Build rotation matrix
  // Columns are the basis vectors: [East, Up, South]
  // South is opposite of North (toward magnetic south)
  // worldMatrix = [
  //   east.x,        up.x,        -northFinal.x,  0,
  //   east.y,        up.y,        -northFinal.y,  0,
  //   east.z,        up.z,        -northFinal.z,  0,
  //   0,             0,            0,              1
  // ];
  
  // Store computed north for debugging
  north = {
    x: northFinal.x,
    y: northFinal.y,
    z: northFinal.z,
    heading: Math.atan2(east.x, -northFinal.z) * 180 / Math.PI
  };
}

// Cross product helper
function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

// Normalize vector helper
function normalize(v) {
  let mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (mag > 0.0001) {
    return {x: v.x / mag, y: v.y / mag, z: v.z / mag};
  }
  return {x: 0, y: 0, z: 0};
}

function applyWorldTransform() {
  // Apply the world-to-device transformation matrix
  // This locks the coordinate system to world (gravity + north)
  let m = worldMatrix;
  
  applyMatrix(
    m[0], m[1], m[2], m[3],
    m[4], m[5], m[6], m[7],
    m[8], m[9], m[10], m[11],
    m[12], m[13], m[14], m[15]
  );
}

function updateScreenOrientation() {
  // Use modern Screen Orientation API
  if (screen.orientation) {
    // orientation.angle: 0, 90, 180, 270
    // orientation.type: 'portrait-primary', 'landscape-primary', etc.
    screenOrientation = screen.orientation.angle || 0;
  } else if (window.orientation !== undefined) {
    // Fallback for older browsers (iOS Safari)
    // window.orientation: 0, 90, -90, 180
    screenOrientation = window.orientation;
  } else {
    // No orientation API, assume portrait
    screenOrientation = 0;
  }
}

// Multiply two quaternions
function multiplyQuaternions(q1, q2) {
  return {
    w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
    x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
    y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
    z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w
  };
}

// Conjugate (inverse for unit quaternions)
function conjugateQuaternion(q) {
  return {w: q.w, x: -q.x, y: -q.y, z: -q.z};
}

// Convert Euler angles to rotation matrix (ZXY intrinsic rotation)
function eulerToRotationMatrix(alpha, beta, gamma) {
  // Pre-calculate trig values
  let cA = Math.cos(alpha);
  let sA = Math.sin(alpha);
  let cB = Math.cos(beta);
  let sB = Math.sin(beta);
  let cG = Math.cos(gamma);
  let sG = Math.sin(gamma);
  
  // Rotation matrix for ZXY order (standard for device orientation)
  // This is more stable than sequential rotations
  let m = [];
  
  m[0] = cA * cG - sA * sB * sG;
  m[1] = -cB * sA;
  m[2] = cA * sG + cG * sA * sB;
  m[3] = 0;
  
  m[4] = cG * sA + cA * sB * sG;
  m[5] = cA * cB;
  m[6] = sA * sG - cA * cG * sB;
  m[7] = 0;
  
  m[8] = -cB * sG;
  m[9] = sB;
  m[10] = cB * cG;
  m[11] = 0;
  
  m[12] = 0;
  m[13] = 0;
  m[14] = 0;
  m[15] = 1;
  
  return m;
}

function applyDeviceOrientation() {
  // CRITICAL: Transform device coordinates to world coordinates
  // Device: X=right, Y=down, Z=out of back
  // World (desired): X=east, Y=up, Z=south (OpenGL convention)
  
  // Step 1: Get the device orientation quaternion
  let q = deviceQuat;
  
  // Step 2: Account for screen orientation (portrait/landscape)
  let screenRotQuat = createScreenOrientationQuaternion();
  q = multiplyQuaternions(q, screenRotQuat);
  
  // Step 3: Transform from device space to world space
  // Rotate 90° around X to make Y point up instead of down
  let deviceToWorld = {w: Math.cos(-Math.PI/4), x: Math.sin(-Math.PI/4), y: 0, z: 0};
  q = multiplyQuaternions(deviceToWorld, q);
  
  // Step 4: Invert to get world-to-camera (we want inverse transform)
  q = conjugateQuaternion(q);
  
  // Step 5: Apply the rotation matrix
  let m = quaternionToMatrix(q);
  applyMatrix(
    m[0], m[1], m[2], m[3],
    m[4], m[5], m[6], m[7],
    m[8], m[9], m[10], m[11],
    m[12], m[13], m[14], m[15]
  );
}

// // Alternative: Use quaternion directly (even more robust)
// function eulerToQuaternion(alpha, beta, gamma) {
//   // Device orientation uses ZXY intrinsic rotation order
//   let cA = Math.cos(alpha / 2);
//   let sA = Math.sin(alpha / 2);
//   let cB = Math.cos(beta / 2);
//   let sB = Math.sin(beta / 2);
//   let cG = Math.cos(gamma / 2);
//   let sG = Math.sin(gamma / 2);
  
//   // ZXY order
//   let w = cA * cB * cG - sA * sB * sG;
//   let x = cA * sB * cG - sA * cB * sG;
//   let y = cA * cB * sG + sA * sB * cG;
//   let z = sA * cB * cG + cA * sB * sG;
  
//   return {w, x, y, z};
// }

// get quaternion from device orientation represented in euler angles
// as alpha beta and gamma in radians
function eulerToQuaternion(alpha, beta, gamma) {
  let _x = beta * 0.5;
  let _y = gamma * 0.5;
  let _z = alpha * 0.5;

  let cX = cos(_x);
  let cY = cos(_y);
  let cZ = cos(_z);

  let sX = sin(_x);
  let sZ = sin(_z);
  let sY = sin(_y);

  // taking order ZXY
  let w = cX * cY * cZ - sX * sY * sZ;
  let x = sX * cY * cZ - cX * sY * sZ;
  let y = cX * sY * cZ + sX * cY * sZ;
  let z = cX * cY * sZ + sX * sY * cZ;

  return {w: w, x: x, y: y, z: z};
}

// Convert quaternion to rotation matrix
function quaternionToMatrix(q) {
  let w = q.w, x = q.x, y = q.y, z = q.z;
  
  return [
    1 - 2*y*y - 2*z*z, 2*x*y - 2*w*z, 2*x*z + 2*w*y, 0,
    2*x*y + 2*w*z, 1 - 2*x*x - 2*z*z, 2*y*z - 2*w*x, 0,
    2*x*z - 2*w*y, 2*y*z + 2*w*x, 1 - 2*x*x - 2*y*y, 0,
    0, 0, 0, 1
  ];
}

function createScreenOrientationQuaternion() {
  // Rotate around Z-axis based on screen orientation
  let angle = -screenOrientation * Math.PI / 180;
  return {
    w: Math.cos(angle / 2),
    x: 0,
    y: 0,
    z: Math.sin(angle / 2)
  };
}

function quaternionToMatrix3(q) {
  let w = q.w;
  let x = q.x;
  let y = q.y;
  let z = q.z;

  let n = w * w + x * x + y * y + z * z;
  let s = n === 0 ? 0 : 2 / n;
  let wx = s * w * x, wy = s * w * y, wz = s * w * z;
  let xx = s * x * x, xy = s * x * y, xz = s * x * z;
  let yy = s * y * y, yz = s * y * z, zz = s * z * z;

  return [1 - (yy + zz), xy - wz, xz + wy,
          xy + wz, 1 - (xx + zz), yz - wx,
          xz - wy, yz + wx, 1 - (xx + yy)];
}

function quaternionToMatrix4(q) {
  let w = q.w;
  let x = q.x;
  let y = q.y;
  let z = q.z;

  let n = w * w + x * x + y * y + z * z;
  let s = n === 0 ? 0 : 2 / n;
  let wx = s * w * x, wy = s * w * y, wz = s * w * z;
  let xx = s * x * x, xy = s * x * y, xz = s * x * z;
  let yy = s * y * y, yz = s * y * z, zz = s * z * z;

  return [1 - (yy + zz), xy - wz, xz + wy, 0,
          xy + wz, 1 - (xx + zz), yz - wx, 0,
          xz - wy, yz + wx, 1 - (xx + yy), 0,
          0, 0, 0, 1];
}