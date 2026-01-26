let orientationMatrix = null;
let screenOrientation = 0;

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

// Alternative: Use quaternion directly (even more robust)
function eulerToQuaternion(alpha, beta, gamma) {
  // Device orientation uses ZXY intrinsic rotation order
  let cA = Math.cos(alpha / 2);
  let sA = Math.sin(alpha / 2);
  let cB = Math.cos(beta / 2);
  let sB = Math.sin(beta / 2);
  let cG = Math.cos(gamma / 2);
  let sG = Math.sin(gamma / 2);
  
  // ZXY order
  let w = cA * cB * cG - sA * sB * sG;
  let x = cA * sB * cG - sA * cB * sG;
  let y = cA * cB * sG + sA * sB * cG;
  let z = sA * cB * cG + cA * sB * sG;
  
  return {w, x, y, z};
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