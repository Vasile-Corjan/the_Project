import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc"
import * as WEBIFC from "web-ifc";
//import Stats from "stats.js"

BUI.Manager.init();

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
world.renderer.three.c

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
ao.aoRadius = 10.0; // Radius of AO effect (default: 5.0)
ao.intensity = 1.5; // Strength of the AO effect (default: 1.0)
ao.denoiseSamples = 16; // Number of samples for denoising (default: 8)
ao.denoiseRadius = 12; // Radius for denoising (default: 12)
ao.screenSpaceRadius = true;


// Gamma correction settings
postproduction.setPasses({gamma: true,
  custom: true,
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

//ifcLoader.settings.excludedCategories.add(WEBIFC.IFCSPACE); // or you can add a list of categories to exclude

// THIS LOADS THE IFC HURRAYYYYYYYYY

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

const indexer = components.get(OBC.IfcRelationsIndexer);
//const inverseAttributes = ["IsDecomposedBy", "Decomposes", "AssociatedTo", "HasAssociations", "ClassificationForObjects", "IsGroupedBy", "HasAssignments", "IsDefinedBy", "DefinesOcurrence", "IsTypedBy", "Types", "Defines", "ContainedInStructure", "ContainsElements", "HasControlElements", "AssignedToFlowElement", "ConnectedTo", "ConnectedFrom", "ReferencedBy", "Declares", "HasContext", "Controls", "IsNestedBy", "Nests", "DocumentRefForObjects"]; 



fragments.onFragmentsLoaded.add(async (model) => {
  const inverseAttributes = ["IsDecomposedBy", "ContainsElements"]
  const getdecompositionTree = async (components, model, expressID, inverseAttributes) => {
    const rows = [];
    const indexer = components.get(OBC.IfcRelationsIndexer);
    const entityAttrs = await model.getProperties(expressID);
    if (!entityAttrs) return rows;

    const {type} = entityAttrs;
    const entityRow = {
      data: {
        Entity: OBC.IfcCategoryMap[type],
        Name: entityAttrs.Name?.value,
        modelID: model.uuid,
        expressID
      },
      children: []
    };

    for (const attrName of inverseAttributes) {
      const relations = indexer.getEntityRelations(model, expressID, attrName);
      if (!relations) continue;
      if (!entityRow.children) entityRow.children = [];
      entityRow.data.relations = JSON.stringify(relations);

      const entityGroups = {};
      for (const id of relations) {
        const decompositionRow = await getdecompositionTree(components, model, id, inverseAttributes);

        for (const row of decompositionRow) {
          if (row.data.relations) {
            entityRow.children.push(row);
          } else {
            const data = model.data.get(id);
            if (!data) {
              entityRow.children.push(row);
              continue;
            }
            const type = data[1][1];
            const entity = OBC.IfcCategoryMap[type];
            if(!(entity in entityGroups)) {
              entityGroups[entity] = [];
            }
            row.data.Entity = row.data.Name;
            delete row.data.Name;
            entityGroups[entity].push(row)
          }
        }
      }

      for (const entity in entityGroups){
        const children = entityGroups[entity];
        const relations = children.map((child) => child.data.expressID);
        const row = {
          data: {
            Entity: entity,
            modelID: model.uuid,
            relations: JSON.stringify(relations),
          },
          children
        };
        entityRow.children.push(row);
      }
    }
    rows.push(entityRow);
    return rows;
  };

  const computeRowData = async (components, models, inverseAttributes, expressID) => {
    const indexer = components.get(OBC.IfcRelationsIndexer);
    const rows = [];
    for (const model of models) {
      let modelData
      if (expressID) {
        modelData = {
          data: {
            Entity: model.name !== "" ? model.name : model.uuid,
          },
          children: await getdecompositionTree(
            components,
            model,
            expressID,
            inverseAttributes,
          ),
        };
      } else {
        const modelRelations = indexer.relationMaps[model.uuid];
        const projectAttrs = await model.getAllPropertiesOfType(
          WEBIFC.IFCPROJECT,
        );
        if (!(modelRelations && projectAttrs)) continue;
        const { expressID } = Object.values(projectAttrs)[0];
        modelData = {
          data: {
            Entity: model.name !== "" ? model.name : model.uuid,
          },
          children: await getdecompositionTree(
            components,
            model,
            expressID,
            inverseAttributes,
          ),
        };
      }
      rows.push(modelData);
    }
    return rows;
  };

  // Create button and add click handler
  const treeButton = document.createElement('button');
  treeButton.textContent = 'Update Tree';
  treeButton.style.position = 'absolute';
  treeButton.style.top = '10px';
  treeButton.style.right = '10px';
  document.body.appendChild(treeButton);

  treeButton.addEventListener('click', async () => {
    const test = computeRowData(components,[model],inverseAttributes)
    console.log(test)
  });


  const getRowFragmentIdMap = (components, rowData) => {
    const fragments = components.get(OBC.FragmentsManager);
    const { modelID, expressID, relations } = rowData;
    if (!modelID) return null;
    const model = fragments.groups.get(modelID);
    if (!model) return null;
    const fragmentIDMap = model.getFragmentMap([
      expressID,
      ...JSON.parse(relations ?? "[]"),
    ]);
    console.log('Fragment ID Map:', fragmentIDMap);  // Added console.log
    return fragmentIDMap;
  };
});

fragments.onFragmentsLoaded.add((model) => {
  // Get the test div
  const testDiv = document.querySelector('.test');
  if (!testDiv) return;
  
  if (!model) return;
  
  const row = {
    data: {
      Name: model.name || model.uuid,
      modelID: model.uuid,
      schema: model.ifcMetadata?.schema || "",
      viewDefinition: model.ifcMetadata?.viewDefinition || "",
    }
  };
  
  // Create and append only the new model to the test div
  const modelDiv = document.createElement('div');
  modelDiv.className = 'model-entry';
  //modelDiv.dataset.modelId = row.data.modelID; // Add data attribute for identification
  
  const nameEl = document.createElement('p');
  nameEl.textContent = row.data.Name;
  
  const schemaEl = document.createElement('label');
  schemaEl.textContent = row.data.schema;

  modelDiv.appendChild(nameEl);
  modelDiv.appendChild(schemaEl);
  testDiv.appendChild(modelDiv);
});




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


// STATS
/*const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom)
stats.dom.style.position = "fixed";
stats.dom.style.left = "10px";
stats.dom.style.top = "0px";
stats.dom.style.zIndex = "1000";
stats.dom.style.width = "100px";
stats.dom.style.height = "100px";
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());*/



