import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc"
import * as WEBIFC from "web-ifc";
//import Stats from "stats.js"
import { authenticatedFetch } from "../../api";



BUI.Manager.init();

const container = document.getElementById("container");

const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);

const world = worlds.create(OBC.SimpleWorld);

world.scene = new OBC.SimpleScene(components);
world.renderer = new OBCF.PostproductionRenderer(components,container);
world.camera = new OBC.OrthoPerspectiveCamera(components);



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
  world.camera.fit([loadedModel], 0.5);
});


// HERE change the projection as a string from perspective to orthographic. Add a button that changes the projections and
// change the "HOUSE" button to fit the geometry.

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
ao.aoRadius = 5.0; // Radius of AO effect (default: 5.0)
ao.intensity = 2.0; // Strength of the AO effect (default: 1.0)
ao.denoiseSamples = 8; // Number of samples for denoising (default: 8)
ao.denoiseRadius = 12; // Radius for denoising (default: 12)

// Gamma correction settings
postproduction.setPasses({gamma: false,
  custom: false,
  ao: true
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

// EXCLUDING THE IFCSPACE

ifcLoader.settings.excludedCategories.add(WEBIFC.IFCSPACE); // or you can add a list of categories to exclude

// THIS LOADS THE IFC HURRAYYYYYYYYY

export let uuid = "";

const onBtnClick = () => {
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
    const model = await ifcLoader.load(data, true, fileName)
    uuid = model.uuid;
  };
  fileOpener.click();
};

document.getElementById("uploadlink").addEventListener('click', onBtnClick)

fragments.onFragmentsLoaded.add( async (model) => {
  if (!model.isStreamed) {
    for (const fragment of model.items){
      world.meshes.add(fragment.mesh);
    }
  }
  world.scene.three.add(model);
})

// CULLERS
const cullers = components.get(OBC.Cullers);
const culler = cullers.create(world);


// Model list
function addRowGroup(model) {
  const rowGroups = [];
  if (!model) return;

  // Create a new rowGroup
  const rowGroup = {
    data: {
      Name: model.name || model.uuid,
      modelID: model.uuid,
      schema: model.ifcMetadata.schema, // Add schema here if needed
    },
  };
  // Add the rowGroup to the array
  rowGroups.push(rowGroup);

  // Update the HTML by creating the necessary <p> elements
  const panel = document.getElementsByClassName("model-list")[0];
  const createParagraph = (text) => {
    const p = document.createElement("p");
    p.textContent = text;
    return p;
  };

  const div = document.createElement("div");
  div.setAttribute("class", "uploaded-model");
  div.append(
    createParagraph(rowGroup.data.Name.split(".")[0]),
    createParagraph(rowGroup.data.schema)
  );

  panel.appendChild(div);
}
//addRowGroup();

const indexer = components.get(OBC.IfcRelationsIndexer);
fragments.onFragmentsLoaded.add(async (model) => {
  if (model.hasProperties) await indexer.process(model);
});

// ELEMENT PROPERTIES
const [propertiesTable, updatePropertiesTable] = CUI.tables.elementProperties({
  components,
  fragmentIdMap: {},
});

propertiesTable.preserveStructureOnFilter = true;
propertiesTable.indentationInText = false;

highlighter.events.select.onHighlight.add((fragmentIdMap) => {
  updatePropertiesTable({ fragmentIdMap });
});

highlighter.events.select.onClear.add(() =>
  updatePropertiesTable({ fragmentIdMap: {} }),
);

const propertiesPanel = BUI.Component.create(() => {
  const onTextInput = (e) => {
    const input = e.target;
    propertiesTable.queryString = input.value !== "" ? input.value : null;
  };

  const expandTable = (e) => {
    const button = e.target;
    propertiesTable.expanded = !propertiesTable.expanded;
    button.label = propertiesTable.expanded ? "Collapse" : "Expand";
  };

  const copyAsTSV = async () => {
    await navigator.clipboard.writeText(propertiesTable.tsv);
  };

  return BUI.html`
    <bim-panel label="Properties">
      <bim-panel-section label="Element Data">
        <div style="display: flex; gap: 0.5rem;">
          <bim-button @click=${expandTable} label=${propertiesTable.expanded ? "Collapse" : "Expand"}></bim-button> 
          <bim-button @click=${copyAsTSV} label="Copy as TSV"></bim-button> 
        </div> 
        <bim-text-input @input=${onTextInput} placeholder="Search Property" debounce="250"></bim-text-input>
        ${propertiesTable}
      </bim-panel-section>
    </bim-panel>
  `;
});

// RELATIONS TREE
const [relationsTree] = CUI.tables.relationsTree({
  components,
  models: [],
});

const [modelList] = CUI.tables.modelsList({
  components,
  tags: {schema: true, viewDefinition: false },
  actions: {download: false, visibility: true, dispose: true},
});

relationsTree.preserveStructureOnFilter = false;

const panel = BUI.Component.create(() => {

  return BUI.html`
   <bim-panel label="Relations Tree">
   <bim-panel-section icon= "mage:box-3d-fill" label="Loaded Models">
    ${modelList}
    </bim-panel-section>
    <bim-panel-section label="Model Tree">
      ${relationsTree}
    </bim-panel-section>
   </bim-panel> 
  `;
});

const app = document.createElement("bim-grid");
app.layouts = {
  main: {
    template: `
    "propertiesPanel"
    "panel"
    `,
    elements: {propertiesPanel, panel},
  },
};
app.style.width = "25rem";
app.style.position = "absolute";
app.layout = "main";
document.body.append(app);


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
edges.styles.create("Outline",world.meshes,world,blackLine);

document.getElementById("clip").addEventListener('click', () => {
  clipper.enabled = true;
});

container.ondblclick = () =>{
  if(clipper.enabled){
    clipper.create(world);
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
          });
        };
      }
    };
  }
});







// END DIMENSIONS CREATION
window.onkeydown = (event) => {
  if (event.code === "Escape") {
    dimensions.cancelCreation();
  };
};


// THIS DELETES THE MODEL FROM THE MEMORY 
// Dispose

fragments.onFragmentsLoaded.add(() => {
  const list_Models = []
  list_Models.push(fragments)
})

function disposeFragments() {
  for (const loadedModel of fragments.groups){
    let group = fragments.groups.get(loadedModel[0])
    fragments.disposeGroup(group)
  }
}
document.getElementById('delete-model').addEventListener('click', () => {
  disposeFragments();
})


// RESET
const bboxMesh = fragmentBox.getMesh();
function resetCamera() {
  world.camera.controls.fitToSphere(bboxMesh,true);
}


/* // STATS
const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom)
stats.dom.style.position = "fixed";
stats.dom.style.left = "10px";
stats.dom.style.zIndex = "unset";
stats.dom.style.width = "100px";
stats.dom.style.height = "100px";
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end()); */



