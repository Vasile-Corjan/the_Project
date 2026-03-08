// IFC.JS modules import
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as BUI from "@thatopen/ui";
//import * as CUI from "@thatopen/ui-obc";
import * as WEBIFC from "web-ifc";

// Import UI functions
import { 
  initializePanels, 
  updateDataPanel,
  getLoadedModels,
  computeTableRow,
  state,
  createSelectionInfoPanel,
  crumbleMenu,
  setupViewHelper
} from "./ui.js";

// Local functions upload
import { authenticatedFetch } from "../../api.js";
import { LineMaterial } from "three/examples/jsm/Addons.js";



//URLParameters
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('projectId');
const fileId = urlParams.get('fileId');
const fileName = urlParams.get('fileName');


//BUI.Manager.init();
const container = document.getElementById("container");

const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);

const world = worlds.create(OBC.SimpleWorld);

world.scene = new OBC.SimpleScene(components);
world.renderer = new OBCF.PostproductionRenderer(components,container);
world.camera = new OBC.OrthoPerspectiveCamera(components);

// Camera changes
world.camera.controls.camera.near = 0.1;
world.camera.controls.camera.far = 5000;
world.camera.controls.camera.fov = 45;
world.camera.controls.enableDamping = true;
world.camera.controls.smoothTime = 0.05;
world.camera.controls.rotateSpeed = 0.7;
world.camera.controls.minDistance = 1;
world.camera.controls.maxDistance = 1000
world.camera.controls.camera.updateProjectionMatrix();

// Renderer changes
world.renderer.three.shadowMap.enabled = true;
world.renderer.three.shadowMap.type = THREE.PCFShadowMap;
world.renderer.three.outputColorSpace = THREE.SRGBColorSpace;
world.renderer.three.toneMapping = THREE.ACESFilmicToneMapping;
world.renderer.three.toneMappingExposure = 0.8;
world.renderer.three.physicallyCorrectLights = true;
world.renderer.postproduction.enabled = true;
world.dynamicAnchor = false;

const { aoPass, outlinePass, edgesPass } = world.renderer.postproduction;

const aoParameters = {
  radius: 0.25,
  distanceExponent: 1,
  thickness: 1,
  scale: 1,
  samples: 16,
  distanceFallOff: 1,
  screenSpaceRadius: true,
};

const pdParameters = {
  lumaPhi: 10,
  depthPhi: 2,
  normalPhi: 3,
  radius: 4,
  radiusExponent: 1,
  rings: 2,
  samples: 16,
};

aoPass.updateGtaoMaterial(aoParameters);
aoPass.updatePdMaterial(pdParameters);


components.init();
world.camera.controls.setLookAt(10, 10, 10, 0, 0, 0);
world.scene.setup();

setupViewHelper(world)
container.addEventListener("resize", () => {
  rendererComponent.resize();
  cameraComponent.updateAspect();
});

const cameraProjection = new OBC.ProjectionManager(world.camera);
const perspectiveButton = document.getElementById("perspective-view");
const orthographicButton = document.getElementById("ortho-view");
const fitButton = document.getElementById("fit");


perspectiveButton.addEventListener("click", () => {
  const selected = "Perspective";
  world.camera.projection.set(selected);
});

orthographicButton.addEventListener("click", () => {
  const selected = "Orthographic";
  world.camera.projection.set(selected);
});

fitButton.addEventListener("click", () => {
  // Get all loaded models and fit camera to them
  const loadedModels = getLoadedModels().map(model => 
    fragments.groups.get(model.modelId)
  ).filter(Boolean);
  
  if (loadedModels.length > 0) {
    world.camera.fit(loadedModels, 0.5);
  }
});

// Changing the background color
const color = new THREE.Color(0x3f3f3f);
world.scene.three.background = color;

// ADDING GRIDS
const grids = components.get(OBC.Grids);
const grid = grids.create(world);


/* const { postproduction } = world.renderer;
postproduction.enabled = true; // Enables post-processing effects */

// HIGHLIGHTER & RAYCASTER

const casters = components.get(OBC.Raycasters);
const caster = casters.get(world);
caster.enabled = true

const highlighter = components.get(OBCF.Highlighter);
highlighter.setup({world, 
  //hoverColor:new THREE.Color("#F5DB69"),
  //selectEnabled:true, 
  selectMaterialDefinition:{
    color: new THREE.Color("#F59716"),
    opacity: 1,
    transparent: true,
    renderedFaces: 0,
  }
}); // change the hover color and edit other settings
highlighter.multiple = "ctrlKey";
highlighter.zoomFactor = 1;
highlighter.zoomToSelection = true;
world.camera.controls.smoothTime = 0.3;

// IFC Loader
const ifcLoader = components.get(OBC.IfcLoader);

await ifcLoader.setup({
  autoSetWasm: false,
  wasm:{
    path: '/wasm/',
    absolute: false
  }
});

let path = './worker.mjs';
const workerUrl = new URL(path, import.meta.url).href;
const fragments = components.get(OBC.FragmentsManager);
fragments.init(workerUrl);
//ifcLoader.fragments = fragments

world.camera.controls.addEventListener("rest", () =>
  fragments.core.update(false),
);

// Funciton to load IFC file from the DB
async function loadIfcFromDatabase(projectId, fileId) {
  const file = await authenticatedFetch(`http://localhost:8000/api/projects/${projectId}/files/${fileId}/`);
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  const model = await ifcLoader.load(data, true, fileName);
  
  //model.name = fileName;
  //world.scene.three.add(model);
}

// Function to load IFC file from array buffer
const handleFileUpload = async () => {
  const fileOpener = document.createElement('input');
  fileOpener.type = 'file';
  fileOpener.accept = '.ifc';
  fileOpener.onchange = async () => {
    if(fileOpener.files === null || fileOpener.files.length === 0) return;
    const file = fileOpener.files[0];
    const fileName = file.name.replace('.ifc','');
    fileOpener.remove();
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const model = await ifcLoader.load(data, true, fileName);
    model.name = fileName;
    //model.setLodMode(FRAGS.LodMode.ALL_GEOMETRY);
  };
  fileOpener.click();
}

document.getElementById("uploadlink").addEventListener('click', handleFileUpload);

fragments.list.onItemSet.add(({value: model}) => {
  model.graphicsQuality = 1;
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  
  fragments.core.update(true);
});

// Load the model from the database if we have a project ID and file ID
if (projectId && fileId) {
  loadIfcFromDatabase(projectId, fileId).catch(error => {
    console.error("Failed to load model from database:", error);
  });
}

// Initialize UI panels
initializePanels(components, fragments);

// Setup breadcrumb navigation
crumbleMenu().catch(error => {
  console.error("Error creating breadcrumb menu:", error);
});


// CREATING BOUNDINGBOX
const fragmentBox = components.get(OBC.BoundingBoxer);

const getLoadedModelsBoundings = (model) => {
  // As a good practice, always clean up the boxer list first
  // so no previous boxes added are taken into account
  fragmentBox.list.clear();
  
  fragmentBox.addFromModels(model.modelId);
  // This computes the merged box of the list.
  const box = fragmentBox.get();
  // As a good practice, always clean up the boxer list after the calculation
  fragmentBox.list.clear();
  return box;
};

const getBaseElevation = async (model) => {
  const storeys = await model.getItemsOfCategories([/BUILDINGSTOREY/]);  
  const localIds = Object.values(storeys).flat();
  const data = await model.getItemsData(localIds);
  
  // Find the first storey with elevation 0
  const baseStorey = data.find(d => d.Elevation?.value === 0);
  
  // If found, return its elevation, otherwise return null or default value
  return baseStorey ? baseStorey.Elevation.value : null;
};


/* const loadedModels = getLoadedModels().map(model =>
    fragments.groups.get(model.modelId)
  ).filter(Boolean);

if(loadedModels.length > 0){
  loadedModels.forEach(model => {
    fragmentBox.add(model)
    const bbox = fragmentBox.get();
    console.log(bbox)
    if (!initialGridPositionSet) {
      initialGridPositionY = bbox.min.y;
      grid.three.position.y = initialGridPositionY;
      initialGridPositionSet = true;
    } else {
      grid.three.position.y = initialGridPositionY;
    }
    fragmentBox.reset();
  })
} */

// CLIPPER
const clipper = components.get(OBC.Clipper);
const clipperColor = new THREE.Color("#FBF0C3");


// CliperStyle
const clipStyler = components.get(OBCF.ClipStyler)
clipStyler.world = world
// Creating a clipper style
clipStyler.styles.set("Black", {
  linesMaterial: new LineMaterial({color: "black", linewidth: 2}),
});

// Adding the clipper style to the clipped items
clipper.list.onItemSet.add(({key}) => {
  clipStyler.createFromClipping(key, {
    items: {All: {style: "Black"}}
  });
});

document.getElementById('clip').addEventListener('click', () => {
  clipper.enabled = true;  
});

container.ondblclick = () =>{
  if(clipper.enabled){
    clipper.create(world);
    clipper.visible = true;
    clipper.config.size = 10;
    clipper.config.color = clipperColor;
    
    if (clipper.list.size >= 0 && !document.getElementById("deleting-clip-plane")) {
      const deleteClipButton = document.createElement("button"); 
      deleteClipButton.id = "deleting-clip-plane";
      deleteClipButton.textContent = "Delete Clipping Plane";
      document.getElementById("container").appendChild(deleteClipButton);

      deleteClipButton.addEventListener("click", () => {
        if(clipper.list.size >= 0){
          for(const [planeId] of clipper.list.entries()){
            clipper.delete(world, planeId);
          };
        }
        if (clipper.list.size === 0) {
          clipper.enabled = false;
        }
        document.getElementById("container").removeChild(deleteClipButton)
      });
    };
  };
};
// MEASURING DISTANCE
const dimensions = components.get(OBCF.LengthMeasurement);
dimensions.world = world;
//dimensions.enabled = false;
dimensions.units = "mm";
dimensions.rounding = 0;
dimensions.snappings = [FRAGS.SnappingClass.POINT]


document.getElementById("dim").addEventListener('click', () =>{
  dimensions.enabled = true;
  highlighter.clear()
  if (dimensions.enabled){
    highlighter.enabled = false;
    container.onclick = () => {
      const result = caster.castRay(fragments.meshes)
      if (!world.camera.controls.active && result !== null) {
        dimensions.create();
        dimensions.snapDistance = 0.5;
        
        dimensions.linesEndpointElement.color = 'green'
        const dimColor = new THREE.Color("green");
        dimensions.color = dimColor;
        
        // Handle keyboard actions while creating dimensions
        const handleKeyDown = (event) => {
          if (event.code === "Escape") {
            dimensions.endCreation();
            dimensions.enabled = false;
            window.removeEventListener("keydown", handleKeyDown);
            highlighter.enabled = true;
          } else if (event.code === "Delete") {
            dimensions.delete();
          }
        };
        window.addEventListener("keydown", handleKeyDown);
      
        // Delete all created dimesions by clicking the button "Delete All Dimensions"
        if (dimensions.list.size > 0 && !document.getElementById("deleting-dimensions")) {
          const deleteDimension = document.createElement("button");
          deleteDimension.id = "deleting-dimensions";
          deleteDimension.textContent = "Delete All Dimensions";
          document.getElementById("container").appendChild(deleteDimension);
          
          deleteDimension.addEventListener("click", () => {
            dimensions.list.clear(); 
            if (dimensions.list.size === 0) {
              dimensions.enabled = false;
              window.removeEventListener("keydown", handleKeyDown);
            }
            document.getElementById("container").removeChild(deleteDimension);
            highlighter.enabled = true;
          });
        };
      }
    };
  }
});

highlighter.events.select.onHighlight.add(async (modelIdMap) => {
  if(modelIdMap && !clipper.enabled){
    const test = true;
    const properties = await computeTableRow(components, modelIdMap, state);
    createSelectionInfoPanel(test, properties)
  } 
}); 

// Clear the selection
highlighter.events.select.onClear.add((modelIdMap) => {
  createSelectionInfoPanel(false)
  computeTableRow(components, modelIdMap, state)
})


// END DIMENSIONS CREATION
window.onkeydown = (event) => {
  if (event.code === "Escape") {
    dimensions.cancelCreation();
  };
};

// RESET CAMERA

function resetCamerPosition() {

  const loadedModels = getLoadedModels().map(model =>
    fragments.groups.get(model.modelId)
  ).filter(Boolean);

  if(loadedModels.length > 0){
    world.camera.fit(loadedModels, true)
  } else {
    world.camera.controls.setLookAt(10, 10, 10, 0, 0, 0, true)
  }
}

const homeButton = document.querySelector('.home');
if(homeButton){
  homeButton.addEventListener('click', resetCamerPosition)
}
