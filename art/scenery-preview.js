import * as THREE from "three";
import { createWorld } from "../src/three/world.js";
import { trackPoint, TRACK } from "../shared/track.js";
const world = createWorld("day"),
  renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
document.body.append(renderer.domElement);
const camera = new THREE.PerspectiveCamera(
  55,
  innerWidth / innerHeight,
  0.1,
  6000,
);
let selected = "cafe",
  night = false;
function view() {
  const d =
    selected === "cafe" ? TRACK.length : selected === "traffic" ? 540 : 890;
  const pos = trackPoint(d + (selected === "cafe" ? 6 : -8), -36),
    target = trackPoint(d + (selected === "cafe" ? 38 : 8));
  camera.position.set(pos.x, pos.y + (selected === "cafe" ? 11 : 17), pos.z);
  camera.lookAt(target.x, target.y + 4.5, target.z);
}
view();
document.querySelector("select").onchange = (e) => {
  selected = e.target.value;
  view();
};
document.querySelector("button").onclick = () => {
  night = !night;
  world.setTheme(night ? "night" : "day");
};
window.onresize = () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
};
function frame(t) {
  const elapsed = 5 + ((t / 1000) % 4);
  world.update(t / 1000, {
    now: elapsed,
    elapsed,
    players:
      selected === "police"
        ? [
            {
              id: "preview",
              racing: true,
              distance: 895,
              lane: 0,
              policeUntil: elapsed + 3,
              policeChaseUntil: elapsed + 0.7,
            },
          ]
        : [],
  });
  renderer.render(world.scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
