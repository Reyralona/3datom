import * as THREE from "three";
import * as CANNON from "cannon";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

var request = new XMLHttpRequest();
request.open("GET", "data.json", false);
request.send(null);
var data = JSON.parse(request.responseText);

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

function getElectrons(elementobj){
  let conf = elementobj.electron_configuration.split(' ')
  let elec = []
  for(let i = 0; i < conf.length; i++){
    elec.push(Number(conf[i].slice(2, 3)))
  }

  let sum = elec.reduce(function(a, b){
    return a + b;
  });

  return sum
}

function Atom(nProtons, nNeutrons, nElectrons, pos = new CANNON.Vec3(0, 0, 0)) {
  //variable to move the atom, which att the particles will pull towards
  let position = pos;

  // create our Atom
  let protons = Array(nProtons)
    .fill(0)
    .map(() => Proton());
  let neutrons = Array(nNeutrons)
    .fill(0)
    .map(() => Neutron());
  let electrons = Array(nElectrons)
    .fill(0)
    .map(() => Electron());

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
    electrons.forEach((electron) => {
      world.add(electron.body);
      scene.add(electron.mesh);
    });
  }

  function simulate() {
    protons.forEach(pullParticle);
    neutrons.forEach(pullParticle);

    //pull electrons if they are further than 5 away
    electrons.forEach((electron) => {
      pullParticle(electron, 10);
    });
    //push electrons if they are closer than 6 away
    electrons.forEach((electron) => {
      pushParticle(electron, 10);
    });

    // give the particles some friction/wind resistance
    //electrons.forEach((electron) => resistance(electron, 0.95));
    neutrons.forEach((neutron) => resistance(neutron, 0.95));
    protons.forEach((proton) => resistance(proton, 0.95));
  }

  function electronStartingVelocity(vel) {
    electrons.forEach((electron) => {
      let centerDir = electron.body.position.vsub(position);
      centerDir.normalize();
      let impulse = centerDir.cross(new CANNON.Vec3(0, 0, 1));
      impulse.scale(vel, impulse);
      electron.body.applyLocalImpulse(impulse, new CANNON.Vec3(0, 0, 0));
    });
  }

  // Should be called after CANNON has simulated a frame and before THREE renders.
  function updateAtomMeshState() {
    protons.forEach(updateMeshState);
    neutrons.forEach(updateMeshState);
    electrons.forEach(updateMeshState);
  }

  // Private Functions
  // =================

  // pull a particale towards the atom position (if it is more than distance away)
  function pullParticle(particle, distance = 0) {
    // if particle is close enough, dont pull more
    if (particle.body.position.distanceTo(position) < distance) return false;

    //create vector pointing from particle to atom position
    let pullForce = position.vsub(particle.body.position);

    // same as: particle.body.force = particle.body.force.vadd(pullForce)
    particle.body.force.vadd(
      // add particle force
      pullForce, // to pullForce
      particle.body.force
    ); // and put it in particle force
  }

  // Push a particle from the atom position (if it is less than distance away)
  function pushParticle(particle, distance = 0) {
    // if particle is far enough, dont push more
    if (particle.body.position.distanceTo(position) > distance) return false;

    //create vector pointing from particle to atom position
    let pushForce = particle.body.position.vsub(position);

    particle.body.force.vadd(
      // add particle force
      pushForce, // to pushForce
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
    electrons: electrons,
    neutrons: neutrons,
    protons: protons,
    position: position,
    updateAtomMeshState: updateAtomMeshState,
    electronStartingVelocity: electronStartingVelocity,
    addToWorld: addToWorld,
  };
}

function Proton() {
  let radius = 1;

  return {
    // Cannon
    body: new CANNON.Body({
      mass: 1, // kg
      position: randomPosition(0,6), // random pos from radius 0-6
      shape: new CANNON.Sphere(radius / 3),
    }),
    // THREE
    mesh: new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshPhongMaterial({
        color: 0xff0000,
        specular: 0x999999,
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
      mass: 1, // kg
      position: randomPosition(0,6), // random pos from radius 0-6
      shape: new CANNON.Sphere(radius / 3),
    }),
    // THREE
    mesh: new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshPhongMaterial({
        color: 0x0000ff,
        specular: 0x999999,
        shininess: 13,
      })
    ),
  };
}

function Electron() {
  let radius = 0.5;

  return {
    // Cannon
    body: new CANNON.Body({
      mass: 0.1, // kg
      position: randomPosition(5, 10), // random pos from radius 3-8
      shape: new CANNON.Sphere(radius),
    }),
    // THREE
    mesh: new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        specular: 0x999999,
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

// controle de órbita
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// to load 3d models
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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

const renderScene = new RenderPass(scene, camera)
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.4,
  0.85
)
bloomPass.threshold = 0;
bloomPass.strength = 1;
bloomPass.radius = 0;
const bloomComposer = new EffectComposer(renderer);
bloomComposer.setSize(window.innerWidth, window.innerHeight)
bloomComposer.renderToScreen = true;
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass)

const controls = new OrbitControls(camera, renderer.domElement);
const loader = new GLTFLoader();
const gridHelper = new THREE.GridHelper();
// scene.add(gridHelper);

let elemname = 'Helium'
document.querySelector(".infobox").innerText = elemname
let chemelement = findElementByName(elemname)
let chemprotons = getProtons(chemelement)
let chemneutrons = getNeutrons(chemelement)
let chemelectrons = getElectrons(chemelement)

let atom = Atom(chemprotons, chemneutrons, chemelectrons, new CANNON.Vec3(0, 0, 0));
atom.addToWorld(world, scene);
const timeStep = 1 / 60;
atom.electronStartingVelocity(1);

const atomcentergeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
const atomcentermat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const atomcenter = new THREE.Mesh(atomcentergeo, atomcentermat);
scene.add(atomcenter);
atomcenter.add(camera)

const ab = new THREE.AmbientLight(0xffffff, 0.06);
scene.add(ab);
const al = new THREE.PointLight(0xffffff, 200, 100);
al.position.y = 20;
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
  bloomComposer.setSize(window.innerWidth, window.innerHeight)
}


// renderizar a cena
// desenha a cena a cada ~60 segundos. (FPS)
function animate() {
  requestAnimationFrame(animate);

  atom.simulate();
	
  atomcenter.rotation.y += 0.01;
  // Step the physics world
  world.step(timeStep);

  //update the THREE mesh
  atom.updateAtomMeshState();

  // cube.rotation.x += 0.1
  // cube.rotation.y += 0.01;

  renderer.render(scene, camera);
  bloomComposer.render()
}

animate();

