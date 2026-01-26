let orientationMatrix = null;

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
  // Adjust for screen orientation (portrait/landscape)
//   rotateZ(-screenOrientation);
  
  // Apply the inverted rotation matrix to lock world coordinates
  // We need to invert/transpose the matrix since we want to counter-rotate
  let m = orientationMatrix;
  
  // Transpose the rotation part (inversion for rotation matrices)
  applyMatrix(
    m[0], m[4], m[8], m[12],
    m[1], m[5], m[9], m[13],
    m[2], m[6], m[10], m[14],
    m[3], m[7], m[11], m[15]
  );
  
  // Additional coordinate system adjustment
  // Device coordinates: X=right, Y=down, Z=back
  // World coordinates: X=east, Y=up, Z=south
  rotateX(PI / 2); // Align Y-up
}

// Alternative: Use quaternion directly (even more robust)
function eulerToQuaternion(alpha, beta, gamma) {
  let cA = Math.cos(alpha / 2);
  let sA = Math.sin(alpha / 2);
  let cB = Math.cos(beta / 2);
  let sB = Math.sin(beta / 2);
  let cG = Math.cos(gamma / 2);
  let sG = Math.sin(gamma / 2);
  
  // ZXY order quaternion
  let w = cA * cB * cG + sA * sB * sG;
  let x = cA * sB * cG - sA * cB * sG;
  let y = cA * cB * sG + sA * sB * cG;
  let z = sA * cB * cG - cA * sB * sG;
  
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