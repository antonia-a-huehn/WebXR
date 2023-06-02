import * as THREE from "three";
import { OrbitControls } from "../../node_modules/three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "../../node_modules/three/examples/jsm/libs/lil-gui.module.min.js";
import { VRButton } from "../../node_modules/three/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "../../node_modules/three/examples/jsm/webxr/XRControllerModelFactory.js";
import { GLTFLoader } from "../../node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { BoxLineGeometry } from "../../node_modules/three/examples/jsm/geometries/BoxLineGeometry.js";
import { Stats } from "../../node_modules/three/examples/jsm/libs/stats.module.js";


class App {
  camera;
  scene;
  renderer;
  container;
  cube;
  orbitControls;

  raycaster;
  workingMatrix;
  workingVector;
  constructor() {
    this.container = document.createElement("div");
    document.body.appendChild(this.container);

    //CREATE CAMERA
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 8);

    //CREATE SCENE
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x444444);

    // CREATE LIGHT
    const myLight1 = new THREE.AmbientLight(0x404040, 3);
    this.scene.add(myLight1);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.scene.add(directionalLight);
    const hemilight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
    this.scene.add(hemilight);

    directionalLight.castShadow = true;
    directionalLight.position.set(5, 10, 0);
    directionalLight.target.position.set(4, 3, -7.5);

    directionalLight.shadow.mapSize.width = 512; // default
    directionalLight.shadow.mapSize.height = 512; // default
    directionalLight.shadow.camera.near = 0.5; // default
    directionalLight.shadow.camera.far = 500; // default

    const dirLightHelper = new THREE.DirectionalLightHelper(
      directionalLight,
      5
    );
    this.scene.add(dirLightHelper);

    //Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    this.container.appendChild(this.renderer.domElement);

    //Orbit Controlls

    this.orbitControls = new OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.orbitControls.target.set(0, 1.6, 0);
    this.orbitControls.update();

    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);

    //Raycaster
    this.raycaster = new THREE.Raycaster();
    this.workingMatrix = new THREE.Matrix4();
    this.workingVector = new THREE.Vector3();

    this.initScene();
    this.dieDatenLaden();
    this.setupXR();
    this.myGui();

    window.addEventListener("resize", this.onWindowResize);

    window.addEventListener("resize", this.onWindowResize.bind(this));

    this.renderer.setAnimationLoop(this.render.bind(this));
  }

  initScene() {
    //Boden Texture
    const myBodenTextureLoader = new THREE.TextureLoader();
    const BodenBaseColor = myBodenTextureLoader.load(
      "textures/boden/Metal_ArtDeco_Tiles_001_basecolor.jpg"
    );
    BodenBaseColor.wrapS = THREE.RepeatWrapping;
    BodenBaseColor.wrapT = THREE.RepeatWrapping;
    BodenBaseColor.repeat.set(2, 25);

    const BodenNormalMap = myBodenTextureLoader.load(
      "textures/boden/Metal_ArtDeco_Tiles_001_normal.jpg"
    );
    BodenNormalMap.wrapS = THREE.RepeatWrapping;
    BodenNormalMap.wrapT = THREE.RepeatWrapping;
    BodenNormalMap.repeat.set(2, 25);

    const BodenHeightMap = myBodenTextureLoader.load(
      "textures/boden/Metal_ArtDeco_Tiles_001_height.png"
    );
    BodenHeightMap.wrapS = THREE.RepeatWrapping;
    BodenHeightMap.wrapT = THREE.RepeatWrapping;
    BodenHeightMap.repeat.set(2, 25);

    const BodenRoughnessMap = myBodenTextureLoader.load(
      "textures/boden/Metal_ArtDeco_Tiles_001_roughness.jpg"
    );
    BodenRoughnessMap.wrapS = THREE.RepeatWrapping;
    BodenRoughnessMap.wrapT = THREE.RepeatWrapping;
    BodenRoughnessMap.repeat.set(2, 25);

    const BodenAmbientOcclusionMap = myBodenTextureLoader.load(
      "textures/boden/Metal_ArtDeco_Tiles_001_ambientOcclusion.jpg"
    );
    BodenAmbientOcclusionMap.wrapS = THREE.RepeatWrapping;
    BodenAmbientOcclusionMap.wrapT = THREE.RepeatWrapping;
    BodenAmbientOcclusionMap.repeat.set(2, 25);

    const BodenMetalic = myBodenTextureLoader.load(
      "textures/boden/Metal_ArtDeco_Tiles_001_metallic.jpg"
    );
    BodenMetalic.wrapS = THREE.RepeatWrapping;
    BodenMetalic.wrapT = THREE.RepeatWrapping;
    BodenMetalic.repeat.set(2, 25);

    //irgendwas mit metall
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      encoding: THREE.SRGBColorSpace,
    });

    const cubeCamera = new THREE.CubeCamera(1, 10000, cubeRenderTarget);
    //CREATE PLANE

    //Der Boden ist keine Lava
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 100, 400, 400),
      new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        map: BodenBaseColor,
        normalMap: BodenNormalMap,
        displacementMap: BodenHeightMap,
        displacementScale: 0.7,
        roughnessMap: BodenRoughnessMap,
        roughness: 1,
        aoMap: BodenAmbientOcclusionMap,
        metalnessMap: BodenMetalic,
        metalness: 1,
        envMap: cubeRenderTarget.texture,
      })
    );
    plane.position.x = 0;
    plane.position.y = -1;
    plane.position.z = -50;
    plane.rotation.set(Math.PI / 2, 0, 0);
    plane.receiveShadow = true;

    //CREATE CUBE

    const cubegeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubematerial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    this.cube = new THREE.Mesh(cubegeometry, cubematerial);
    this.scene.add(this.cube);
    plane.add(cubeCamera);
    this.scene.add(plane);
    this.cube.castShadow = true;

    //Wand Texture
    const myTextureLoader = new THREE.TextureLoader();
    const tilesBaseColor = myTextureLoader.load(
      "textures/Stone_Floor_006_basecolor.jpg"
    );
    tilesBaseColor.wrapS = THREE.RepeatWrapping;
    tilesBaseColor.wrapT = THREE.RepeatWrapping;
    tilesBaseColor.repeat.set(25, 1);

    const tilesNormalMap = myTextureLoader.load(
      "textures/Stone_Floor_006_normal.jpg"
    );
    tilesNormalMap.wrapS = THREE.RepeatWrapping;
    tilesNormalMap.wrapT = THREE.RepeatWrapping;
    tilesNormalMap.repeat.set(25, 1);

    const tilesHeightMap = myTextureLoader.load(
      "textures/Stone_Floor_006_height.png"
    );
    tilesHeightMap.wrapS = THREE.RepeatWrapping;
    tilesHeightMap.wrapT = THREE.RepeatWrapping;
    tilesHeightMap.repeat.set(25, 1);

    const tilesRoughnessMap = myTextureLoader.load(
      "textures/Stone_Floor_006_roughness.jpg"
    );
    tilesRoughnessMap.wrapS = THREE.RepeatWrapping;
    tilesRoughnessMap.wrapT = THREE.RepeatWrapping;
    tilesRoughnessMap.repeat.set(25, 1);

    const tilesAmbientOcclusionMap = myTextureLoader.load(
      "textures/Stone_Floor_006_ambientOcclusion.jpg"
    );
    tilesAmbientOcclusionMap.wrapS = THREE.RepeatWrapping;
    tilesAmbientOcclusionMap.wrapT = THREE.RepeatWrapping;
    tilesAmbientOcclusionMap.repeat.set(25, 1);

    //Wand
    const wand2 = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 5, 400, 400),
      new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        map: tilesBaseColor,
        normalMap: tilesNormalMap,
        displacementMap: tilesHeightMap,
        displacementScale: 0.7,
        roughnessMap: tilesRoughnessMap,
        roughness: 1,
        aoMap: tilesAmbientOcclusionMap,
      })
    );
    wand2.geometry.attributes.uv2 = wand2.geometry.attributes.uv;
    wand2.position.x = 5.5;
    wand2.position.z = -50;
    wand2.position.y = 1;
    wand2.rotation.set(Math.PI / 1, 4.72, 0.005);
    this.scene.add(wand2);
    wand2.castShadow = true;
    wand2.receiveShadow = true;

    
  }
  myGui(){
    //GUI
    const gui = new GUI();
    const cubeFolder = gui.addFolder("Cube");
    const cameraFolder = gui.addFolder("Camera");
    const colorFolder = gui.addFolder("Color");

    cubeFolder.add(this.cube.position, "x", -10, 10);
    cubeFolder.add(this.cube.position, "y", -10, 10);
    cubeFolder.add(this.cube.position, "z", -10, 10);
    cubeFolder.add(this.cube.rotation, "x", 0, Math.PI * 2);
    cubeFolder.add(this.cube.rotation, "y", 0, Math.PI * 2);
    cubeFolder.add(this.cube.rotation, "z", 0, Math.PI * 2);
    cubeFolder.open();

    cameraFolder.add(this.camera.position, "z", 0, 10);
    cameraFolder.open();

    const options = {
      cubeColor: "#ffea00",
    };
    colorFolder.addColor(options, "cubeColor").onChange(function (e) {
      this.cube.material.color.set(e);
    });
    colorFolder.open();
}
  dieDatenLaden() {
    var myModels = ["./textures/wand-door.glb", "./textures/Fackel.glb"];

    let me = this;
    const myWandloader = new GLTFLoader();

    // const fs = require('fs')

    // const meinpfad = './textures/';

    for (let i = 0; i <= myModels.length - 1; i++) {
      /*  dateipfad = meinpfad.myModels[i];
            try{
                if(fs.existsSync(dateipfad)){
                    myWandloader.load(
         
                        dateipfad,                       
                         function ( gltf ) {
                             me.scene.add( gltf.scene );
             
                         gltf.scene; // THREE.Group
                         gltf.cameras; // Array<THREE.Camera>
                         gltf.asset; // Object
                                             
                     },
                     function ( xhr ) {
                         console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
             
                     },
                     function ( error ) {
             
                         console.log( 'An error happened' );
                          }
                     );
                }} catch(err){
                console.log('nope');
            }


            console.log(dateipfad);
*/
      myWandloader.load(
        myModels[i],

        function (gltf) {
          me.scene.add(gltf.scene);

          gltf.scene; // THREE.Group
          gltf.cameras; // Array<THREE.Camera>
          gltf.asset; // Object
        },
        function (xhr) {
          console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
        },
        function (error) {
          console.log("An error happened");
        }
      );
    }
  }

  setupXR() {
    this.renderer.xr.enabled = true;
    document.body.appendChild(VRButton.createButton(this.renderer));
  }

  buildControllers() {}

  handleController() {}

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.stats.update();

    this.renderer.render(this.scene, this.camera);
  }
}

export { App };