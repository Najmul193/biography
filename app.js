import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("#world-canvas");
const loadState = document.querySelector("#load-state");
const chapterKicker = document.querySelector("#chapter-kicker");
const chapterTitle = document.querySelector("#chapter-title");
const chapterCopy = document.querySelector("#chapter-copy");
const chapterLinks = [...document.querySelectorAll(".chapter-nav a")];
const chapterSections = [...document.querySelectorAll("[data-chapter]")];

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x101315, 0.012);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(48, 34, 58);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 0.05;
controls.maxDistance = 130;
controls.maxPolarAngle = Math.PI * 0.48;
controls.target.set(0, 5, 0);
controls.enabled = true;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.28;

const hemiLight = new THREE.HemisphereLight(0xfff4df, 0x222832, 1.6);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffd8a8, 4.2);
sunLight.position.set(-28, 48, 24);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 140;
sunLight.shadow.camera.left = -70;
sunLight.shadow.camera.right = 70;
sunLight.shadow.camera.top = 70;
sunLight.shadow.camera.bottom = -70;
scene.add(sunLight);

const fillLight = new THREE.PointLight(0x7fb8ff, 1.8, 70);
fillLight.position.set(26, 18, -34);
scene.add(fillLight);

const loader = new GLTFLoader();
const worldGroup = new THREE.Group();
scene.add(worldGroup);

const cameraRig = {
  targetPosition: new THREE.Vector3(48, 34, 58),
  targetLookAt: new THREE.Vector3(0, 5, 0),
  targetFov: 42,
};

let activeChapter = 0;
let storyTargets = [];
let outerWorld = null;

const chapters = [
  {
    title: "Khagrachari",
    copy: "The hill track land where I grew up — green hills, winding roads, and a world of memories.",
    overview: true,
    fov: 42,
  },
  {
    title: "Campfire",
    copy: "Evenings in the hills were made for fires, where stories and smoke rose together into the dark sky.",
    include: ["fireplace", "fire_"],
    exclude: ["grassfirepiece"],
    offset: new THREE.Vector3(0.9, 0.32, 0.78),
    closeDistance: 3.25,
    lookAtHeight: 1.45,
    fov: 48,
  },
  {
    title: "Motorcycle",
    copy: "The old bike carried us through muddy trails and steep slopes — the heart of hill track travel.",
    include: ["motorcycle"],
    offset: new THREE.Vector3(0.9, 0.3, 0.72),
    closeDistance: 2.05,
    lookAtHeight: 0.5,
    fov: 48,
  },
  {
    title: "Garage",
    copy: "Where broken bikes and tired engines found new life, and we learned to fix things with our own hands.",
    include: ["garage_wall", "garage_tools", "garage_stuff", "garage_chainsaw"],
    offset: new THREE.Vector3(1.0, 0.32, 0.72),
    closeDistance: 1.0,
    lookAtHeight: 0.45,
    fov: 48,
  },
  {
    title: "Home",
    copy: "Our house sat among the hills, a quiet shelter surrounded by the sounds of the forest.",
    include: ["house"],
    exclude: ["treehouse", "dog_house", "dog_housexfood"],
    offset: new THREE.Vector3(1.1, 0.34, 0.9),
    closeDistance: 9.45,
    lookAtHeight: 0.46,
    fov: 48,
  },
  {
    title: "Dog",
    copy: "The hills had no fences — but the dogs always knew where home was, guarding every path.",
    include: ["dog_dog_mat", "dog"],
    exclude: ["doghouse", "dog_house", "dog_food"],
    offset: new THREE.Vector3(-0.2, 0.5, 0.55),
    closeDistance: 9.35,
    lookAtHeight: -1.0,
    fov: 50,
  },
  {
    title: "Walkway",
    copy: "Footpaths twisted through the jungle, connecting one hill village to the next.",
    include: ["dock", "ladder"],
    offset: new THREE.Vector3(0.95, 0.28, -0.72),
    closeDistance: 2.15,
    lookAtHeight: 0.42,
    fov: 48,
  },
  {
    title: "River",
    copy: "The rivers of Khagrachari carved through the valleys — cool water, smooth stones, and endless summer afternoons.",
    include: ["water", "fishing_rod", "fishing_pole"],
    offset: new THREE.Vector3(-0.6, -0.28, -0.58),
    closeDistance: 2.25,
    lookAtHeight: 0.38,
    fov: 48,
  },
];

function prepareModel(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;

    if (child.material) {
      child.material.side = THREE.DoubleSide;
      child.material.needsUpdate = true;
    }
  });
}

function centerOnOrigin(root) {
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);
  return new THREE.Box3().setFromObject(root);
}

function fitOuterWorld(root) {
  const centeredBox = centerOnOrigin(root);
  const size = centeredBox.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const targetDimension = 86;

  root.scale.setScalar(targetDimension / maxDimension);
  return new THREE.Box3().setFromObject(root);
}

function placeInnerWorld(innerRoot, outerBox) {
  centerOnOrigin(innerRoot);

  const innerBox = new THREE.Box3().setFromObject(innerRoot);
  const innerSize = innerBox.getSize(new THREE.Vector3());
  const outerSize = outerBox.getSize(new THREE.Vector3());
  const targetFootprint = Math.min(outerSize.x, outerSize.z) * 0.22;
  const innerFootprint = Math.max(innerSize.x, innerSize.z);
  const scale = targetFootprint / innerFootprint;

  innerRoot.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(innerRoot);
  const floorPadding = outerSize.y * 0.018;
  innerRoot.position.set(0, outerBox.min.y - scaledBox.min.y + floorPadding, 0);

  return new THREE.Box3().setFromObject(innerRoot);
}

function addCenterGlow(innerBox) {
  const size = innerBox.getSize(new THREE.Vector3());
  const center = innerBox.getCenter(new THREE.Vector3());
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(size.x * 0.52, size.x * 0.57, 96),
    new THREE.MeshBasicMaterial({
      color: 0xeeb86d,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );

  ring.rotation.x = -Math.PI / 2;
  ring.position.set(center.x, innerBox.min.y + 0.08, center.z);
  scene.add(ring);
}

function objectNamePath(object) {
  const names = [];
  let current = object;

  while (current) {
    if (current.name) names.push(current.name.toLowerCase());
    current = current.parent;
  }

  return names.join(" ");
}

function findMatchedBox(root, include, exclude = []) {
  const box = new THREE.Box3();
  const nodeBox = new THREE.Box3();
  let hasMatch = false;

  root.updateWorldMatrix(true, true);
  root.traverse((child) => {
    if (!child.isMesh) return;

    const namePath = objectNamePath(child);
    const isIncluded = include.some((term) => namePath.includes(term));
    const isExcluded = exclude.some((term) => namePath.includes(term));

    if (!isIncluded || isExcluded) return;

    nodeBox.setFromObject(child);
    box.union(nodeBox);
    hasMatch = true;
  });

  return hasMatch ? box : null;
}

function makeFallbackBox(innerBox, index) {
  const center = innerBox.getCenter(new THREE.Vector3());
  const size = innerBox.getSize(new THREE.Vector3());
  const angle = (index / chapters.length) * Math.PI * 2;
  const point = center.clone().add(
    new THREE.Vector3(
      Math.cos(angle) * size.x * 0.28,
      0,
      Math.sin(angle) * size.z * 0.28,
    ),
  );

  return new THREE.Box3().setFromCenterAndSize(
    point,
    new THREE.Vector3(size.x * 0.08, size.y * 0.08, size.z * 0.08),
  );
}

function makeOverviewTarget(outerBox, innerBox) {
  const innerSize = innerBox.getSize(new THREE.Vector3());
  const innerCenter = innerBox.getCenter(new THREE.Vector3());
  const lookAt = new THREE.Vector3(
    innerCenter.x,
    innerBox.min.y + innerSize.y * 0.54,
    innerCenter.z,
  );

  return {
    ...chapters[0],
    lookAt,
    position: new THREE.Vector3(
      innerCenter.x + innerSize.x * 1.18,
      innerBox.min.y + innerSize.y * 0.92,
      innerCenter.z + innerSize.z * 1.08,
    ),
  };
}

function buildStoryTargets(innerRoot, innerBox, outerBox) {
  storyTargets = chapters.map((chapter, index) => {
    if (chapter.overview) {
      return makeOverviewTarget(outerBox, innerBox);
    }

    const box =
      findMatchedBox(innerRoot, chapter.include, chapter.exclude) ??
      makeFallbackBox(innerBox, index);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const lookAt = center.clone();
    lookAt.y = box.min.y + size.y * chapter.lookAtHeight;

    const cameraPosition = lookAt
      .clone()
      .add(chapter.offset.clone().normalize().multiplyScalar(chapter.closeDistance));

    cameraPosition.y = Math.max(
      cameraPosition.y,
      lookAt.y + chapter.closeDistance * 0.18,
    );

    return {
      ...chapter,
      lookAt,
      position: cameraPosition,
    };
  });
}

function setActiveChapter(index) {
  const nextIndex = THREE.MathUtils.clamp(index, 0, chapters.length - 1);
  const chapter = storyTargets[nextIndex] ?? storyTargets[0];

  if (!chapter) return;

  activeChapter = nextIndex;
  cameraRig.targetPosition.copy(chapter.position);
  cameraRig.targetLookAt.copy(chapter.lookAt);
  cameraRig.targetFov = chapter.fov;

  if (nextIndex === 0) {
    camera.position.copy(chapter.position);
    controls.target.copy(chapter.lookAt);
  }

  chapterKicker.textContent =
    nextIndex === 0 ? "Opening View" : `Chapter ${String(nextIndex).padStart(2, "0")}`;
  chapterTitle.textContent = chapter.title;
  chapterCopy.textContent = chapter.copy;

  chapterLinks.forEach((link, linkIndex) => {
    link.classList.toggle("active", linkIndex === nextIndex);
  });
}

async function loadWorlds() {
  const [outerGltf, innerGltf] = await Promise.all([
    loader.loadAsync("./outerworld/scene.gltf"),
    loader.loadAsync("./3dworld/scene.gltf"),
  ]);

  const outer = outerGltf.scene;
  const inner = innerGltf.scene;
  outerWorld = outer;

  prepareModel(outer);
  prepareModel(inner);

  worldGroup.add(outer);
  const outerBox = fitOuterWorld(outer);
  outerWorld.visible = true;

  worldGroup.add(inner);
  const innerBox = placeInnerWorld(inner, outerBox);
  addCenterGlow(innerBox);
  buildStoryTargets(inner, innerBox, outerBox);

  setActiveChapter(activeChapter);
  camera.position.copy(cameraRig.targetPosition);
  controls.target.copy(cameraRig.targetLookAt);
  camera.lookAt(cameraRig.targetLookAt);

  loadState.classList.add("hidden");
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  controls.autoRotate = true;

  if (activeChapter === 0) {
    controls.target.lerp(cameraRig.targetLookAt, 0.065);
    camera.fov = THREE.MathUtils.lerp(camera.fov, cameraRig.targetFov, 0.06);
  } else {
    camera.position.lerp(cameraRig.targetPosition, 0.045);
    controls.target.lerp(cameraRig.targetLookAt, 0.065);
    camera.fov = THREE.MathUtils.lerp(camera.fov, cameraRig.targetFov, 0.06);
  }

  camera.updateProjectionMatrix();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

loadWorlds().catch((error) => {
  console.error(error);
  loadState.textContent = "Could not load the 3D world";
});

window.addEventListener("resize", resize);
window.addEventListener("scroll", () => {
  const chapterHeight = Math.max(window.innerHeight, 1);
  const index = Math.round(window.scrollY / chapterHeight);

  if (index !== activeChapter) setActiveChapter(index);
});

chapterLinks.forEach((link, index) => {
  link.addEventListener("click", () => setActiveChapter(index));
});

const observer = new IntersectionObserver(
  (entries) => {
    const activeEntry = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (activeEntry) {
      setActiveChapter(Number(activeEntry.target.dataset.chapter));
    }
  },
  { threshold: [0.52] },
);

chapterSections.forEach((section) => observer.observe(section));

canvas.addEventListener("pointerdown", () => {
  const chapter = storyTargets[activeChapter];
  if (!chapter) return;
  camera.position.copy(chapter.position);
  controls.target.copy(chapter.lookAt);
});

controls.enableZoom = false;

animate();
