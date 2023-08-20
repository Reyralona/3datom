import * as THREE from "three";
import * as CANNON from "cannon";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

var request = new XMLHttpRequest();
request.open("GET", "data.json", false);
request.send(null);
var data = JSON.parse(request.responseText);

function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function findElementByName(value) {
  return data.elements.filter(function (object) {
    return object["name"] === value;
  })[0];
}

function getProtons(elementobj) {
  return elementobj.number;
}
function getNeutrons(elementobj) {
  return Math.round(elementobj.atomic_mass) - elementobj.number;
}

function getElectrons(elementobj) {
  let conf = elementobj.electron_configuration.split(" ");
  let elec = [];
  // for (let i = 0; i < conf.length; i++) {
  //   elec.push(Number(conf[i].slice(2, 3)));
  // }
  // let sum = elec.reduce(function (a, b) {
  //   return a + b;
  // });

  return conf;
  // return sum;
}

function Atom(nProtons, nNeutrons, pos = new CANNON.Vec3(0, 0, 0)) {
  //variable to move the atom, which att the particles will pull towards
  let position = pos;

  // create our Atom
  let protons = Array(nProtons)
    .fill(0)
    .map(() => Proton());
  let neutrons = Array(nNeutrons)
    .fill(0)
    .map(() => Neutron());

  // Public Functions
  //=================
  // add to a three.js and CANNON scene/world
  function addToWorld(world, scene) {
    protons.forEach((proton) => {
      world.add(proton.body);
      scene.add(proton.mesh);
    });
    neutrons.forEach((neutron) => {
      world.add(neutron.body);
      scene.add(neutron.mesh);
    });
  }

  function simulate() {
    protons.forEach(pullParticle);
    neutrons.forEach(pullParticle);
    // give the particles some friction/wind resistance
    //electrons.forEach((electron) => resistance(electron, 0.95));
    neutrons.forEach((neutron) => resistance(neutron, 0));
    protons.forEach((proton) => resistance(proton, 0));
  }

  // Should be called after CANNON has simulated a frame and before THREE renders.
  function updateAtomMeshState() {
    protons.forEach(updateMeshState);
    neutrons.forEach(updateMeshState);
  }

  // Private Functions
  // =================

  // pull a particale towards the atom position (if it is more than distance away)
  function pullParticle(particle, distance = 0) {
    // if particle is close enough, dont pull more
    // if (particle.body.position.distanceTo(position) < distance) return false;

    //create vector pointing from particle to atom position
    let pullForce = position.vsub(particle.body.position);

    // same as: particle.body.force = particle.body.force.vadd(pullForce)
    particle.body.force.vadd(
      // add particle force
      pullForce, // to pullForce
      particle.body.force
    ); // and put it in particle force
  }

  // give a partile some friction
  function resistance(particle, val) {
    if (particle.body.velocity.length() > 0)
      particle.body.velocity.scale(val, particle.body.velocity);
  }

  // Call this on a particle if you want to limit its velocity
  function limitVelocity(particle, vel) {
    if (particle.body.velocity.length() > vel) particle.body.force.set(0, 0, 0);
  }

  // copy ratation and position from CANNON to THREE
  function updateMeshState(particle) {
    particle.mesh.position.copy(particle.body.position);
    particle.mesh.quaternion.copy(particle.body.quaternion);
  }

  // public API
  return {
    simulate: simulate,
    neutrons: neutrons,
    protons: protons,
    position: position,
    updateAtomMeshState: updateAtomMeshState,
    addToWorld: addToWorld,
  };
}

function Proton() {
  let radius = 1;

  return {
    // Cannon
    body: new CANNON.Body({
      mass: 0.5, // kg
      position: randomPosition(0.1, 0.2), // random pos from radius 0-6
      shape: new CANNON.Sphere(radius / 2),
    }),
    // THREE
    mesh: new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshPhongMaterial({
        color: 0xff0000,
        specular: 0xffffff,
        shininess: 13,
      })
    ),
  };
}

function Neutron() {
  let radius = 1;

  return {
    // Cannon
    body: new CANNON.Body({
      mass: 0.5, // kg
      position: randomPosition(0.1, 0.2), // random pos from radius 0-6
      shape: new CANNON.Sphere(radius / 2),
    }),
    // THREE
    mesh: new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshPhongMaterial({
        color: 0x0000ff,
        specular: 0xffffff,
        shininess: 13,
      })
    ),
  };
}

function randomPosition(innerRadius, outerRadius) {
  // get random direction
  let x = 2 * Math.random() - 1,
    y = 2 * Math.random() - 1,
    z = 2 * Math.random() - 1;

  // create vector
  let randVec = new CANNON.Vec3(x, y, z);

  // normalize
  randVec.normalize();
  // scale it to the right radius
  randVec = randVec.scale(
    Math.random() * (outerRadius - innerRadius) + innerRadius
  ); //from inner to outer
  return randVec;
}

function sum(array) {
  let sum = 0;
  array.forEach((item) => {
    sum += item;
  });

  return sum;
}

function createPoint() {
  let g = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  let m = new THREE.MeshBasicMaterial({ color: 0xffffff });
  return new THREE.Mesh(g, m);
}

function createElectron() {
  let eg = new THREE.SphereGeometry(0.5, 32, 32);
  let em = new THREE.MeshPhongMaterial({ color: 0xffff00 });
  let el = new THREE.Mesh(eg, em);
  return el;
}

function createElectronLayers(electron_configuration) {
  let lay1 = [];
  let lay2 = [];
  let lay3 = [];
  let lay4 = [];
  let lay5 = [];
  let lay6 = [];
  let lay7 = [];

  let getlayers = electron_configuration.forEach(function (element) {
    let layer = element.slice(0, 1);
    let elec = element.slice(2, 3);
    eval(`lay${layer}.push(Number(elec))`);
  });

  let layers = [
    sum(lay1),
    sum(lay2),
    sum(lay3),
    sum(lay4),
    sum(lay5),
    sum(lay6),
    sum(lay7),
  ];

  layers.forEach(function (element, index) {
    if (element !== 0) {
      const n = element;
      const rad = index * 2 + 8;
      const layerg = new THREE.TorusGeometry(rad, 0.05, 12);
      const layerm = new THREE.MeshBasicMaterial({ color: 0x5f5f5f });
      const layer = new THREE.Mesh(layerg, layerm);
      atomcenter.add(layer);
      layer.rotateX(Math.PI / 2);

      console.log(element);
      for (let i = 0; i < n; i++) {
        let elec = createElectron();

        let angle = i * ((2 * Math.PI) / n);

        let x = rad * Math.cos(angle);
        let y = rad * Math.sin(angle);
        elec.position.x = x;
        elec.position.y = y;
        layer.add(elec);
      }
    }
  });
}

// 1. cena
const scene = new THREE.Scene();
let world = new CANNON.World();
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 5;

// 2. camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// 3. renderizador
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("#bg"),
});
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.4,
  0.85
);
bloomPass.threshold = 0;
bloomPass.strength = 2;
bloomPass.radius = 0;
const bloomComposer = new EffectComposer(renderer);
bloomComposer.setSize(window.innerWidth, window.innerHeight);
bloomComposer.renderToScreen = true;
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const controls = new OrbitControls(camera, renderer.domElement);
const loader = new GLTFLoader();
const gridHelper = new THREE.GridHelper();

let chemelemname = "Uranium";
document.querySelector(".infobox").innerText = chemelemname;
let chemelement = findElementByName(chemelemname);
let chemprotons = getProtons(chemelement);
let chemneutrons = getNeutrons(chemelement);
let chemelectrons = getElectrons(chemelement);

let atom = Atom(chemprotons, chemneutrons, new CANNON.Vec3(0, 0, 0));

atom.addToWorld(world, scene);
const timeStep = 1 / 60;

const atomcentergeo = new THREE.BoxGeometry(0, 0, 0);
const atomcentermat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const atomcenter = new THREE.Mesh(atomcentergeo, atomcentermat);
scene.add(atomcenter);
atomcenter.add(camera);

createElectronLayers(chemelectrons);

const ab = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ab);
const al = new THREE.PointLight(0xffffff, 50, 100);
al.position.y = 10;
al.position.z = 10;
scene.add(al);

camera.position.y = 30;
camera.position.z = 30;
camera.lookAt(0, 0, 0);

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  bloomComposer.setSize(window.innerWidth, window.innerHeight);
}

const layers = atomcenter.children;

// renderizar a cena
// desenha a cena a cada ~60 segundos. (FPS)
function animate() {
  requestAnimationFrame(animate);
  atom.simulate();
  atomcenter.rotation.y += 0.01;
  // camera.lookAt(0, 0, 0);

  try {
    layers[1].rotation.y += 0.07 / 5;
    layers[1].rotation.z += 0.07 / 5;
    layers[2].rotation.y += 0.06 / 5;
    layers[2].rotation.z += 0.06 / 5;
    layers[3].rotation.y += 0.05 / 5;
    layers[3].rotation.z += 0.05 / 5;
    layers[4].rotation.y += 0.04 / 5;
    layers[4].rotation.z += 0.04 / 5;
    layers[5].rotation.y += 0.03 / 5;
    layers[5].rotation.z += 0.03 / 5;
    layers[6].rotation.y += 0.02 / 5;
    layers[6].rotation.z += 0.02 / 5;
    layers[7].rotation.y += 0.01 / 5;
    layers[7].rotation.z += 0.01 / 5;
  } catch {}

  // Step the physics world
  world.step(timeStep);

  //update the THREE mesh
  atom.updateAtomMeshState();

  renderer.render(scene, camera);
  // bloomComposer.render()
}

animate();
