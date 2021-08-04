varying vec3 vUv;

void main() {
  vUv = position;

  vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);

  // gl_Position is the output of the vertex shader, 
  // a vec4 position on the mesh for the fragment shader to color
  gl_Position = projectionMatrix * modelViewPosition; 
}
