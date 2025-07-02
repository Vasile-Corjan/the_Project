// IFC.JS modules import
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments"
import * as BUI from "@thatopen/ui";
//import * as CUI from "@thatopen/ui-obc";
import * as WEBIFC from "web-ifc";

// Import UI functions
import { 
  initializePanels, 
  updateDataPanel,
  getLoadedModels,
  showPropertiesTable,
  createSelectionInfoPanel,
} from "./ui.js";
// Local functions upload
import { authenticatedFetch } from "../../api.js";


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
world.renderer.three.toneMappingExposure = 1.0;
world.renderer.three.physicallyCorrectLights = true;

components.init();
world.camera.controls.setLookAt(10, 10, 10, 0, 0, 0);
world.scene.setup();

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

const { postproduction } = world.renderer;
postproduction.enabled = true; // Enables post-processing effects
postproduction.customEffects.excludedMeshes.push(grid.three) // Excludes the grid from post-processing

// Ambient Occlusion settings
const ao = postproduction.n8ao.configuration;
ao.aoRadius = 8.0; // Radius of AO effect (default: 5.0)
ao.intensity = 1.5; // Strength of the AO effect (default: 1.0)
ao.denoiseSamples = 8; // Number of samples for denoising (default: 8)
ao.denoiseRadius = 6; // Radius for denoising (default: 12)
ao.screenSpaceRadius = false;
// Gamma correction settings
postproduction.setPasses({gamma: true,
  custom: true,
  ao: false
})

// HIGHLIGHTER
const highlighter = components.get(OBCF.Highlighter);
highlighter.setup({world,
  hoverEnabled:false, 
  hoverColor:new THREE.Color("#F5DB69"),
  selectEnabled:true, 
  selectionColor: new THREE.Color("#F59716")}); // change the hover color and edit other settings
highlighter.multiple = "ctrlKey";

// IFC LOADER
const fragments = components.get(OBC.FragmentsManager);
const ifcLoader = components.get(OBC.IfcLoader);
await ifcLoader.setup();

ifcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;
ifcLoader.settings.webIfc.OPTIMIZE_PROFILES = true;

// Initialize UI panels
initializePanels(components, fragments);

fragments.onFragmentsLoaded.add( async (model) => {
  if (!model.isStreamed) {
    for (const fragment of model.items){
      world.meshes.add(fragment.mesh);
    }
  }
  world.scene.three.add(model);
})

// Function to load IFC from database
async function loadIfcFromDatabase(projectId, fileId) {
  const file = await authenticatedFetch(`http://localhost:8000/api/projects/${projectId}/files/${fileId}/`);
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  const model = await ifcLoader.load(data, true);
  model.name = fileName;
  //world.scene.three.add(model);
}

// Function to handle file upload
const handleFileUpload = async () => {
  const fileOpener = document.createElement("input");
  fileOpener.type = "file";
  fileOpener.accept = ".ifc";
  fileOpener.onchange = async () => {
    if (fileOpener.files === null || fileOpener.files.length === 0) return;
    const file = fileOpener.files[0];
    const fileName = file.name.replace(".ifc", "");
    fileOpener.remove();
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const model = await ifcLoader.load(data, true);
    model.name = fileName;
  };
  fileOpener.click();
};

// Add event listener for upload button
document.getElementById("uploadlink").addEventListener('click', handleFileUpload);

if (projectId && fileId) {
  await loadIfcFromDatabase(projectId, fileId);
}





// CULLERS
const cullers = components.get(OBC.Cullers);
const culler = cullers.create(world);

// CREATING BOUNDINGBOX
const fragmentBox = components.get(OBC.BoundingBoxer);
let initialGridPositionSet = false;
let initialGridPositionY = 0;


fragments.onFragmentsLoaded.add((model) => {
  fragmentBox.add(model);
  const bbox = fragmentBox.get();
  
  if (!initialGridPositionSet) {
    initialGridPositionY = bbox.min.y;
    grid.three.position.y = initialGridPositionY; //Sets the grid at the min y of the model's bounding box
    initialGridPositionSet = true;
  } else {
    grid.three.position.y = initialGridPositionY;
  }
  fragmentBox.reset();
});
 
// RAYCASTER & CLIPPER
const casters = components.get(OBC.Raycasters);
const caster = casters.get(world);
caster.enabled = true

const clipper = components.get(OBC.Clipper);

clipper.Type = OBCF.EdgesPlane;
const edges = components.get(OBCF.ClipEdges);
const blackLine = new THREE.LineBasicMaterial({color: "black"});
const clipperColor = new THREE.Color("#FBF0C3");
edges.styles.create("Outline", world.meshes, world,blackLine);


document.getElementById('clip').addEventListener('click', () => {
  clipper.enabled = true;
});

container.ondblclick = () =>{
  if(clipper.enabled){
    clipper.create(world);
    clipper.visible = true;
    clipper.size = 18;
    clipper.material.color = clipperColor;

    if (clipper.list.length > 0 && !document.getElementById("deleting-clip-plane")) {
      const deleteClipButton = document.createElement("button"); 
      deleteClipButton.id = "deleting-clip-plane";
      deleteClipButton.textContent = "Delete Clipping Plane";
      document.getElementById("container").appendChild(deleteClipButton);

      deleteClipButton.addEventListener("click", () => {
        clipper.deleteAll();
        if (clipper.list.length === 0) {
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
dimensions.enabled = false;

const dimensionLine = OBCF.SimpleDimensionLine
dimensionLine.units = "mm"
dimensionLine.scale = 0.001

document.getElementById("dim").addEventListener('click', () =>{
  dimensions.enabled = true;
  if (dimensions.enabled){
    highlighter.enabled = false
    container.onclick = () => {
      const result = caster.castRay(fragments.meshes)
      if (!world.camera.controls.active && result !== null) {
        dimensions.create();
        dimensions.snapDistance = 0.1;
        const dimColor = new THREE.Color("red");
        dimensions.color = dimColor;
        dimensions.endCreation();
    
        if (dimensions.list.length > 0 && !document.getElementById("deleting-dimensions")) {
          const deleteDimension = document.createElement("button");
          deleteDimension.id = "deleting-dimensions";
          deleteDimension.textContent = "Delete All Dimensions";
          document.getElementById("container").appendChild(deleteDimension);
          
          deleteDimension.addEventListener("click", () => {
            dimensions.deleteAll(); 
            if (dimensions.list.length === 0) {
              dimensions.enabled = false;
            }
            document.getElementById("container").removeChild(deleteDimension);
            highlighter.enabled = true;
          });
        };
      }
    };
  }
});


highlighter.events.select.onHighlight.add(async (fragmentIdMap) => {
  if(fragmentIdMap && !clipper.enabled){
    const state = true;
    const properties = await showPropertiesTable(components, fragments, fragmentIdMap);
    createSelectionInfoPanel(state, properties)
  } 
});

// Clear the selection
highlighter.events.select.onClear.add(() => {
  createSelectionInfoPanel(false)
  showPropertiesTable(components, fragments, {fragmentIdMap: {}})
})


// END DIMENSIONS CREATION
window.onkeydown = (event) => {
  if (event.code === "Escape") {
    dimensions.cancelCreation();
  };
};
