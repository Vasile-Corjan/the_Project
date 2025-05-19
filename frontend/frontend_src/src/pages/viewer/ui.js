import * as OBC from "@thatopen/components";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import * as WEBIFC from "web-ifc";

// Shared variables for panels
let treePanel = null;
let dataPanel = null;
let eventListenerAddedTree = false;
let eventListenerAddedModels = false;
const loadedModels = [];

// Add a flag to track if we need to update multiple models
let treeModels = [];

export function initializePanels(components, fragments) {
  setupTreePanel(components, fragments);
  setupModelsPanel(components, fragments);
}

export async function setupTreePanel(components, fragments) {
  // Set up event listener for model loading
  fragments.onFragmentsLoaded.add(async (model) => {
    await handleTreeForModel(model, components, fragments);
  });
  
  // Add listener for model disposal
  fragments.onFragmentsDisposed.add((model) => {
    // Remove disposed model from our tracking array
    const index = treeModels.indexOf(model.uuid);
    if (index > -1) {
      treeModels.splice(index, 1);
    }
    
    // Update the panel if it's visible
    if (treePanel && treePanel.classList.contains('visible')) {
      updateTreePanelWithAllModels(components, fragments);
    }
  });
}

async function handleTreeForModel(model, components, fragments) {
  const indexer = components.get(OBC.IfcRelationsIndexer);
  await indexer.process(model);
  // const inverseAttributes = ["IsDecomposedBy", "ContainsElements"];
  
  // Store model reference for later updates
  if (!treeModels.includes(model.uuid)) {
    treeModels.push(model.uuid);
  }
  
  const treePanelbutton = document.querySelector('.tree-panel-button');
  if (!treePanelbutton) return;

  if (!treePanel) {
    const sideMenu = document.querySelector('.side-nav');
    treePanel = document.createElement('div');
    treePanel.className = 'tree-panel';
    treePanel.style.display = 'none';
    sideMenu.appendChild(treePanel);
  }
  
  if (!eventListenerAddedTree) {
    eventListenerAddedTree = true;
    treePanelbutton.addEventListener('click', async () => {    
      if (treePanel.classList.contains('visible')) {
        treePanel.classList.remove('visible');
        treePanel.style.display = 'none';
      } else {

        if (dataPanel && dataPanel.classList.contains('visible')) {
          dataPanel.classList.remove('visible');
          dataPanel.style.display = 'none';
        }

        await updateTreePanelWithAllModels(components, fragments);
        treePanel.style.display = 'block';
        treePanel.classList.add('visible');
      }
    });
  }
  
  // Only update the panel if it's currently visible
  if (treePanel.classList.contains('visible')) {
    await updateTreePanelWithAllModels(components, fragments);
  }
}

// New function to update tree panel with all loaded models
async function updateTreePanelWithAllModels(components, fragments) {
  if (!treePanel) return;
  
  // Clear existing content
  treePanel.innerHTML = '';
  
  // Add title
  const treePanelTitle = document.createElement('p');
  treePanelTitle.textContent = "Model Structure";
  treePanel.appendChild(treePanelTitle);
  
  const inverseAttributes = ["IsDecomposedBy", "ContainsElements"];
  
  // Get all models that are still valid
  const validModels = [];
  for (const modelId of treeModels) {
    const model = fragments.groups.get(modelId);
    if (model) {
      validModels.push(model);
    }
  }
  
  // Clean up the model list to remove any disposed models
  treeModels = validModels.map(model => model.uuid);

  // Get data for all models
  const data = await computeRowData(components, validModels, inverseAttributes);
  
  if (data && data.length > 0) {
    // Create tree nodes for all models
    data.forEach((modelData, index) => {
      // Add a separator between models except for the first one
      if (index > 0) {
        const separator = document.createElement('hr');
        //separator.style.margin = '10px 0';
        //separator.style.borderTop = '1px solid #ccc';
        treePanel.appendChild(separator);
      }
      
      // Create model container with some visual distinction
      const modelContainer = document.createElement('div');
      modelContainer.className = 'model-tree-container';
      modelContainer.style.marginBottom = '10px';
      treePanel.appendChild(modelContainer);
      
      // Create tree node for this model
      createTreeNode(modelContainer, modelData, 0);
    });
  } else {
    const noDataMsg = document.createElement('p');
    noDataMsg.textContent = "No structure data available";
    treePanel.appendChild(noDataMsg);
  }
}

// Recursive function to create tree nodes
function createTreeNode(parentElement, nodeData, level) {
  const nodeContainer = document.createElement('div');
  nodeContainer.className = 'tree-node';
  nodeContainer.style.paddingLeft = `${level * 1.5}px`;
  
  const nodeHeader = document.createElement('div');
  nodeHeader.className = 'tree-node-header';
  
  // Create expand/collapse toggle if there are children
  if (nodeData.children && nodeData.children.length > 0) {
    const toggle = document.createElement('span');
    toggle.textContent = '▶';
    toggle.className = 'tree-toggle';
    toggle.style.cursor = 'pointer';
    toggle.style.marginRight = '5px';
    
    nodeHeader.appendChild(toggle);
    
    // Create children container
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';
    childrenContainer.style.display = 'none';
    
    // Add toggle functionality
    toggle.addEventListener('click', () => {
      if (childrenContainer.style.display === 'none') {
        childrenContainer.style.display = 'block';
        toggle.textContent = '▼';
        
        // Lazy load children if not already loaded
        if (childrenContainer.children.length === 0) {
          nodeData.children.forEach(child => {
            createTreeNode(childrenContainer, child, level + 1);
          });
        }
      } else {
        childrenContainer.style.display = 'none';
        toggle.textContent = '▶';
      }
    });
    
    nodeContainer.appendChild(nodeHeader);
    nodeContainer.appendChild(childrenContainer);
  } else {
    nodeContainer.appendChild(nodeHeader);
  }
  
  // Add node content
  const nodeLabel = document.createElement('span');
  nodeLabel.className = 'tree-node-label';
  
  // Format node text based on data available
  let labelText = nodeData.data.Entity || '';
  if (nodeData.data.Name) {
    labelText += ` - ${nodeData.data.Name}`;
  }
  nodeLabel.textContent = labelText;
  
  // Make nodes selectable/highlightable
  /* if (nodeData.data.modelID && nodeData.data.expressID) {
    nodeLabel.style.cursor = 'pointer';
    nodeLabel.addEventListener('click', () => {
      highlightElement(nodeData.data);
    });
  } */
  
  nodeHeader.appendChild(nodeLabel);
  parentElement.appendChild(nodeContainer);
}

// LOADED MODELS PANEL FUNCTIONALITY
export function setupModelsPanel(components, fragments) {
  fragments.onFragmentsLoaded.add((model) => {
    handleModelLoaded(model, components, fragments);
  });
}

function handleModelLoaded(model, components, fragments) {
  if (!model) return;
  
  loadedModels.push({
    name: model.name,
    modelId: model.uuid,
    schema: model.ifcMetadata.schema,
    viewDef: model.ifcMetadata.viewDefinition
  });

  const loadModelbutton = document.querySelector('.loaded-model');
  if (!loadModelbutton) return;
  
  if (!dataPanel) {
    const sideMenu = document.querySelector('.side-nav');
    dataPanel = document.createElement('div');
    dataPanel.className = 'data-panel';
    dataPanel.style.display = 'none';
    sideMenu.appendChild(dataPanel);
  }  
  
  if (!eventListenerAddedModels) {
    eventListenerAddedModels = true;
    loadModelbutton.addEventListener('click', () => {
      if (dataPanel.classList.contains('visible')) {
        dataPanel.classList.remove('visible');
        dataPanel.style.display = 'none';
      } else {

        if(treePanel && treePanel.classList.contains('visible')){
          treePanel.classList.remove('visible');
          treePanel.style.display = 'none';
        }


        updateDataPanel(dataPanel, components, fragments);
        dataPanel.style.display = 'block';
        dataPanel.classList.add('visible');
      }
    });
  }
  
  updateDataPanel(dataPanel, components, fragments);

  if (!dataPanel.classList.contains('visible')) {
    dataPanel.style.display = 'block';
    dataPanel.classList.add('visible');
  }
}

// Update data panel with loaded models
export function updateDataPanel(dataPanel, components, fragments) {
  if (!dataPanel) return;

  dataPanel.innerHTML = '';
  const dataPaneltitle = document.createElement('p');
  dataPaneltitle.textContent = "Loaded Models";
  dataPanel.appendChild(dataPaneltitle);

  const removeiconSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="m18 9l-.84 8.398c-.127 1.273-.19 1.909-.48 2.39a2.5 2.5 0 0 1-1.075.973C15.098 21 14.46 21 13.18 21h-2.36c-1.279 0-1.918 0-2.425-.24a2.5 2.5 0 0 1-1.076-.973c-.288-.48-.352-1.116-.48-2.389L6 9m7.5 6.5v-5m-3 5v-5m-6-4h4.615m0 0l.386-2.672c.112-.486.516-.828.98-.828h3.038c.464 0 .867.342.98.828l.386 2.672m-5.77 0h5.77m0 0H19.5"/></svg>';
  const visibilityOnSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M2.062 12.348a1 1 0 0 1 0-.696a10.75 10.75 0 0 1 19.876 0a1 1 0 0 1 0 .696a10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></g></svg>';
  const visibilityOffSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575a1 1 0 0 1 0 .696a10.8 10.8 0 0 1-1.444 2.49m-6.41-.679a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151a1 1 0 0 1 0-.696a10.75 10.75 0 0 1 4.446-5.143M2 2l20 20"/></g></svg>';

  loadedModels.forEach((loadedModel, index) => {
    const modelIconContainer = document.createElement('div');
    modelIconContainer.classList = 'model-icons-name';

    const modelName = document.createElement('p');
    modelName.textContent = loadedModel.name || loadedModel.modelId;

    const iconContainer = document.createElement('div');
    iconContainer.className = 'icon-container';

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = removeiconSVG;
    removeBtn.className = 'model-remove-icon';

    const visibilityBtn = document.createElement('button');
    visibilityBtn.innerHTML = visibilityOnSVG;
    visibilityBtn.className = 'model-visibilityOn-icon';
    visibilityBtn.dataset.visible = 'true';

    const modelInstance = fragments.groups.get(loadedModel.modelId);
    const modelIdMap = modelInstance.getFragmentMap();
    
    visibilityBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const isVisible = visibilityBtn.dataset.visible === 'true';
      const hider = components.get(OBC.Hider);
    
      if (isVisible) {
        // Hide the model
        hider.set(false, modelIdMap);
        visibilityBtn.innerHTML = visibilityOffSVG;
        visibilityBtn.className = 'model-visibilityOff-icon';
        visibilityBtn.dataset.visible = 'false';
      } else {
        // Show the model
        hider.set(true, modelIdMap);
        visibilityBtn.innerHTML = visibilityOnSVG;
        visibilityBtn.className = 'model-visibilityOn-icon';
        visibilityBtn.dataset.visible = 'true';
      }
    });

    removeBtn.onclick = () => {
      fragments.disposeGroup(modelInstance);
      loadedModels.splice(index, 1);
      updateDataPanel(dataPanel, components, fragments);
    };
    
    iconContainer.appendChild(visibilityBtn);
    iconContainer.appendChild(removeBtn);
    modelIconContainer.appendChild(modelName);
    modelIconContainer.appendChild(iconContainer);

    const modelSchema = document.createElement('span');
    modelSchema.textContent = loadedModel.schema || "";
    
    const modelViewdef = document.createElement('span');
    modelViewdef.textContent = loadedModel.viewDef || "";

    const modelDiv = document.createElement('div');
    modelDiv.className = 'modelDiv';

    modelDiv.appendChild(modelIconContainer);
    modelDiv.appendChild(modelSchema);
    modelDiv.appendChild(modelViewdef);
    
    dataPanel.appendChild(modelDiv);
  });
}

// Tree data processing functions
export async function computeRowData(components, models, inverseAttributes, expressID) {
  const indexer = components.get(OBC.IfcRelationsIndexer);
  const rows = [];
  for (const model of models) {
    let modelData;
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
}

export async function getdecompositionTree(components, model, expressID, inverseAttributes) {
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
          entityGroups[entity].push(row);
        }
      }
    }
    for (const entity in entityGroups) {
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
}

export function getRowFragmentIdMap(components, rowData) {
  const fragments = components.get(OBC.FragmentsManager);
  const { modelID, expressID, relations } = rowData;
  if (!modelID) return null;
  const model = fragments.groups.get(modelID);
  if (!model) return null;
  const fragmentIDMap = model.getFragmentMap([
    expressID,
    ...JSON.parse(relations ?? "[]"),
  ]);
  return fragmentIDMap;
}

// Export the models array to allow access from other files if needed
export const getLoadedModels = () => [...loadedModels];


async function createRows(attrs){
  const attrsToIgnore = ["OwnerHistory", "ObjectPlacement", "CompositionType"];
  const attrRows = {};
  if (!attrRows.children) attrRows.children = [];

  attrRows.children.push({
    data: {
      Name: "Class",
      Value: OBC.IfcCategoryMap[attrs.type],
    },
  });

  for (const attrName in attrs) {
    if(attrsToIgnore.includes(attrName)) continue;
    const attrValue = attrs[attrName];
    if (!attrValue) continue;
    if (typeof attrValue === "object" && !Array.isArray(attrValue)) {
      if (attrValue.type === WEBIFC.REF) continue;
      const valueRow = {
        data: {Name: attrName, Value: attrValue.value}
      }
      attrRows.children.push(valueRow);
    };
  };
  return attrRows;
}

export async function showPropertiesTable(components, fragments, fragmentIdMap) {
  const indexer = components.get(OBC.IfcRelationsIndexer);
  let processedElements = {};
  const modelIdMap = fragments.getModelIdMap(fragmentIdMap);//This outputs the modelId from the selected fragmentId
  
  if (Object.keys(fragmentIdMap).length === 0) processedElements = {};
  const rows = []
  for (const modelID in modelIdMap) {
    const model = fragments.groups.get(modelID);
    if (!model) continue;
    const modelRelations = indexer.relationMaps[model.uuid];
    if (!modelRelations) continue;
    if (!(modelID in processedElements)) processedElements[modelID] = new Map();
    const modelProcessings = processedElements[modelID];
    const expressIDs = modelIdMap[modelID];
    for (const expressID of expressIDs) {
      let elementRow = modelProcessings.get(expressID);
      
      if (elementRow) {
        rows.push(elementRow);
        continue;
      }

      const elementAttrs = await model.getProperties(expressID);
      if (!elementAttrs) continue;

      elementRow = {
        data: {
          Name: elementAttrs.Name?.value,
        },
      };

      rows.push(elementRow);
      modelProcessings.set(expressID, elementRow);

      const attributesRow = await createRows(elementAttrs);
      if (!elementRow.children) elementRow.children = [];
      elementRow.children.push(attributesRow);
    }
  }
  return rows;
}

export function createSelectionInfoPanel(state) {
  const theContainer = document.querySelector(".selection-nav");
  const selectionPanel = document.createElement('nav');
  selectionPanel.className = 'selection-panel';
  theContainer.innerHTML = '';
  if(!state){
    theContainer.style.display = 'none';
    return;
  }
  theContainer.style.display = 'block';
  theContainer.appendChild(selectionPanel);
}