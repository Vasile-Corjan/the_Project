import * as OBC from "@thatopen/components";
import * as WEBIFC from "web-ifc";
import { authenticatedFetch } from "../../api.js";

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

// LOADED MODELS PANEL FUNCTIONALITY
export function setupModelsPanel(components, fragments) {
  fragments.core.onModelLoaded.add(async (model) =>{
    await handleModelLoaded(model, components, fragments)
  })
}

async function handleModelLoaded(model, components, fragments) {
  if (!model) return;
  const metadata = await model.getMetadata();
  const schemaValue = metadata.schema || '';
  const viewDefinition = metadata.descriptions[0];
  loadedModels.push({
    name: model.name,
    modelId: model.modelId,
    schema: schemaValue,
    viewDef: viewDefinition,
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

export function updateDataPanel(dataPanel, components, fragments) {
  if (!dataPanel) return;
  dataPanel.innerHTML = '';
  const dataPaneltitle = document.createElement('p');
  dataPaneltitle.textContent = "Loaded Models";
  dataPanel.appendChild(dataPaneltitle);

  const removeiconSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="m18 9l-.84 8.398c-.127 1.273-.19 1.909-.48 2.39a2.5 2.5 0 0 1-1.075.973C15.098 21 14.46 21 13.18 21h-2.36c-1.279 0-1.918 0-2.425-.24a2.5 2.5 0 0 1-1.076-.973c-.288-.48-.352-1.116-.48-2.389L6 9m7.5 6.5v-5m-3 5v-5m-6-4h4.615m0 0l.386-2.672c.112-.486.516-.828.98-.828h3.038c.464 0 .867.342.98.828l.386 2.672m-5.77 0h5.77m0 0H19.5"/></svg>';
  const visibilityOnSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M2.062 12.348a1 1 0 0 1 0-.696a10.75 10.75 0 0 1 19.876 0a1 1 0 0 1 0 .696a10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></g></svg>';
  const visibilityOffSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575a1 1 0 0 1 0 .696a10.8 10.8 0 0 1-1.444 2.49m-6.41-.679a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151a1 1 0 0 1 0-.696a10.75 10.75 0 0 1 4.446-5.143M2 2l20 20"/></g></svg>';
  
  loadedModels.forEach( async (loadedModel, index) => {
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

    const modelInstance = fragments.list.get(loadedModel.modelId); 

    visibilityBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      const isVisible = visibilityBtn.dataset.visible === 'true';
      const hider = components.get(OBC.Hider);
      
      const modelIdMap = {};
      const items = await modelInstance.getLocalIds();
      const localIds = Object.values(items).flat();
      modelIdMap[modelInstance.modelId] = new Set(localIds);
    
      if (isVisible) {
        // Hide the model
        await hider.set(false, modelIdMap);
        
        visibilityBtn.innerHTML = visibilityOffSVG;
        visibilityBtn.className = 'model-visibilityOff-icon';
        visibilityBtn.dataset.visible = 'false';
        
      } else {
        // Show the model
        await hider.set(true, modelIdMap);
        visibilityBtn.innerHTML = visibilityOnSVG;
        visibilityBtn.className = 'model-visibilityOn-icon';
        visibilityBtn.dataset.visible = 'true';
      }
    });

    removeBtn.onclick = () => {
      fragments.core.disposeModel(loadedModel.modelId);
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

// Export the models array to allow access from other files if needed
export const getLoadedModels = () => [...loadedModels];


// Integrated getModelTree function
const getModelTree = async(model, structure) => {
  const {localId, category, children} = structure;
  if (category && children){
    const row = {
      data:{
        Name: category,
        modelId: model.modelId,
        children: JSON.stringify(children.map((item) => item.localId)),
      },
    };
    for (const child of children){
      const childRow = await getModelTree(model, child);
      if(!childRow) continue;
      if(!row.children) row.children = [];
      row.children.push(childRow);
    }
    return row;
  }
  if (localId !== null) {
    const item = model.getItem(localId);
    const attrs = await item.getAttributes();
    if (!attrs) return null;
    const row = {
      data: {
        Name: String(attrs.getValue("Name")),
        modelId: model.modelId,
        localId,
      },
    };
    for (const child of children ?? []) {
      const childRow = await getModelTree(model, child);
      if (!childRow) continue;
      if (!row.children) row.children = [];
      row.children.push(childRow);
    }
    return row;
  }
  return null;
};

// Integrated computeRowData function
const computeRowData = async (models) => {
  const rows = [];
  for (const model of models) {
    try {
      const structure = await model.getSpatialStructure();
      const tree = await getModelTree(model, structure);
      if (!tree) continue;
      const modelData = {
        data: {
          Name: model.name || model.modelId,
          modelId: model.modelId,
        },
        children: [tree],
      };
      rows.push(modelData);
    } catch (error) {
    }
  }
  return rows;
};

export function setupTreePanel(components, fragments) {
  fragments.core.onModelLoaded.add(async (model) => {
    await handleTreeForModel(model, components, fragments);
  });
}

async function handleTreeForModel(model, components, fragments) {
  // Add model to tracking array if not already there
  if (!treeModels.includes(model.modelId)) {
    treeModels.push(model.modelId);
  }
  
  // Set up the tree panel UI if not already done
  const treePanelButton = document.querySelector('.tree-panel-button');
  if (!treePanelButton) return;
  
  if (!treePanel) {
    const sideMenu = document.querySelector('.side-nav');
    treePanel = document.createElement('div');
    treePanel.className = 'tree-panel';
    treePanel.style.display = 'none';
    sideMenu.appendChild(treePanel);
  }
  
  if (!eventListenerAddedTree) {
    eventListenerAddedTree = true;
    treePanelButton.addEventListener('click', async () => {
      if (treePanel.classList.contains('visible')) {
        treePanel.classList.remove('visible');
        treePanel.style.display = 'none';
      } else {
        // Hide data panel if visible
        if (dataPanel && dataPanel.classList.contains('visible')) {
          dataPanel.classList.remove('visible');
          dataPanel.style.display = 'none';
        }
        
        // Update tree content and show it
        await renderTreePanel(components, fragments);
        treePanel.style.display = 'block';
        treePanel.classList.add('visible');
      }
    });
  }
  
  // Update the tree panel if it's already visible
  if (treePanel.classList.contains('visible')) {
    await renderTreePanel(components, fragments);
  }
}

async function renderTreePanel(components, fragments) {
  if (!treePanel) return;
  
  // Show loading state
  treePanel.innerHTML = '<p>Loading model structure...</p>';
  
  try {
    // Get models for the tree
    const modelsList = [];
    for (const modelId of treeModels) {
      const model = fragments.list.get(modelId);
      if (model) modelsList.push(model);
    }
    
    if (modelsList.length === 0) {
      treePanel.innerHTML = '<p>No models loaded</p>';
      return;
    }
    
    // Get tree data using your existing functions
    const treeData = await computeRowData(modelsList);
    
    // Reset panel content
    treePanel.innerHTML = '';
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = 'Model Structure';
    title.style.margin = '8px 0';
    title.style.fontSize = '16px';
    treePanel.appendChild(title);
    
    // Render tree for each model
    treeData.forEach((modelData, index) => {
      // Add separator between models
      if (index > 0) {
        const separator = document.createElement('hr');
        separator.style.margin = '12px 0';
        treePanel.appendChild(separator);
      }
      
          
      // Create container for this model's tree
      const modelTreeContainer = document.createElement('div');
      modelTreeContainer.className = 'model-tree';
      modelTreeContainer.style.paddingLeft = '8px';
      treePanel.appendChild(modelTreeContainer);
      
      // Render children
      if (modelData.children && modelData.children.length > 0) {
        renderTreeNodes(modelTreeContainer, modelData.children, 0, components, fragments);
      }
    });
  } catch (error) {
    treePanel.innerHTML = '<p>Error loading model structure</p>';
  }
}

function renderTreeNodes(container, nodes, level, components, fragments) {
  nodes.forEach(node => {
    const nodeContainer = document.createElement('div');
    nodeContainer.className = 'tree-node';
    nodeContainer.style.paddingLeft = `${level * 1.5}px`;
    
    // Node header with expand/collapse functionality
    const nodeHeader = document.createElement('div');
    nodeHeader.className = 'node-header';
    nodeHeader.style.display = 'flex';
    nodeHeader.style.alignItems = 'center';
    
    // Toggle button for expand/collapse if node has children
    const hasChildren = node.children && node.children.length > 0;
    if (hasChildren) {
      const toggleBtn = document.createElement('span');
      toggleBtn.textContent = '▶';
      toggleBtn.style.cursor = 'pointer';
      toggleBtn.style.marginRight = '5px';
      toggleBtn.style.width = '16px';
      toggleBtn.style.display = 'inline-block';
      nodeHeader.appendChild(toggleBtn);
      
      // Children container
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'node-children';
      childrenContainer.style.display = 'none';
      
      // Toggle functionality
      toggleBtn.addEventListener('click', () => {
        if (childrenContainer.style.display === 'none') {
          childrenContainer.style.display = 'block';
          toggleBtn.textContent = '▼';
          
          // Lazy load children if not already loaded
          if (childrenContainer.children.length === 0) {
            renderTreeNodes(childrenContainer, node.children, level + 1, components, fragments);
          }
        } else {
          childrenContainer.style.display = 'none';
          toggleBtn.textContent = '▶';
          toggleBtn.style.transform = 'rotate(0deg)';
        }
      });
      
      nodeContainer.appendChild(nodeHeader);
      nodeContainer.appendChild(childrenContainer);
    } else {
      // No children, just add a spacer
      const spacer = document.createElement('span');
      spacer.style.width = '10px';
      spacer.style.display = 'inline-block';
      nodeHeader.appendChild(spacer);
      nodeContainer.appendChild(nodeHeader);
    }
    
    // Node label
    const nodeLabel = document.createElement('span');
    nodeLabel.className = 'node-label';
    nodeLabel.textContent = node.data.Name || 'Unnamed';
    
    // Make items with localId interactive for highlighting
    /* if (node.data.localId) {
      nodeLabel.style.cursor = 'pointer';
      nodeLabel.style.color = '#1976d2';
      
      // Add click handler for selection/highlighting
      nodeLabel.addEventListener('click', async () => {
        try {
          const modelId = node.data.modelId;
          const localId = node.data.localId;
          
          // Prepare data for highlighting
          const highlighter = components.get(OBC.Highlighter);
          const modelIdMap = {};
          
          // Include all children if any
          let idsToHighlight = [localId];
          if (node.data.children) {
            try {
              const childrenIds = JSON.parse(node.data.children);
              idsToHighlight = idsToHighlight.concat(childrenIds);
            } catch (e) {
            }
          }
          
          modelIdMap[modelId] = new Set(idsToHighlight);
          
          // Highlight the elements
          highlighter.clear();
          highlighter.highlightElements(modelIdMap);
          
          // Fit camera to selection
          const camera = components.get(OBC.Camera);
          if (camera) {
            camera.fitToSelection();
          }
        } catch (error) {
        }
      });
    } */
    
    nodeHeader.appendChild(nodeLabel);
    container.appendChild(nodeContainer);
  });
}

export const state = {
  emptySelectionWarning: true,
  defaultItemNameKey: "Name",
  itemsDataConfig: {
    attributesDefault: true,
    relationsDefault: { attributes: false, relations: false },
    relations: {
      IsDefinedBy: { attributes: true, relations: true },
      DefinesOcurrence: { attributes: false, relations: false },
      ContainedInStructure: { attributes: true, relations: true },
      ContainsElements: { attributes: false, relations: false },
      Decomposes: { attributes: false, relations: false },
    },
  },
}

let itemsRowsCache = {};

const attrMappings = {
  _category: "Category",
  _localId: "LocalId",
  _guid: "Guid",
}

const addDataRow = (row, key, value) => {
  const dataRow = {
    data: {
      Name: key in attrMappings ? attrMappings[key] : key,
      Value: value,
    },
  };
  if (!row.children) row.children = [];
  row.children.push(dataRow)
};

const getItemRow = (modelId, propertyData, state) => {
  if(!(modelId in itemsRowsCache)) itemsRowsCache[modelId] = new Map();
  const modelProcessings = itemsRowsCache[modelId];
  
  const localId = (propertyData._localId).value;
  
  if (modelProcessings.has(localId)) {
    return modelProcessings.get(localId);
  }
  
  const name = (propertyData[state.defaultItemNameKey]) ?.value;
  const category = (propertyData._category).value;
  
  const row = {
    data: {
      Name:
        name?.toString().length > 0
        ? name.toString()
        : category ?? String(localId),
    },
  };
  
  modelProcessings.set(localId, row);
  
  for(const key in propertyData) {
    const data = propertyData[key];
    if(!Array.isArray(data)) {
      addDataRow(row, key, data.value);
    } else {
      const relRow = {
        data: {
          Name: key
        },
      };
    if (!row.children) row.children = [];
    row.children.push(relRow);
    
    for (const item of data){
      const relItemRow = getItemRow(modelId, item, state);
      if(!relRow.children) relRow.children = [];
      relRow.children.push(relItemRow);
    }
    }
  }
  return row;
};

export async function computeTableRow (components, modelIdMap, state){
  const fragments = components.get(OBC.FragmentsManager);
  if(Object.keys(modelIdMap).length === 0) itemsRowsCache = {};
  
  const rows = [];
  
  for (const modelId in modelIdMap){
    const model = fragments.list.get(modelId);
    if(!model) continue;
    if(!(modelId in itemsRowsCache)) itemsRowsCache[modelId] = new Map();
    const modelProcessings = itemsRowsCache[modelId];
    const localIds = modelIdMap[modelId];
    for (const localId of localIds){
      let elementRow = modelProcessings.get(localId);
      if(elementRow) {
        rows.push(elementRow);
        continue;
      }
      
      const [elementAttrs] = await model.getItemsData(
      [localId],
      state.itemsDataConfig
      );
      
      elementRow = getItemRow(modelId, elementAttrs, state);
      rows.push(elementRow);
      
    }
  }
  return rows;
};

// Create the UI panel 
export function createSelectionInfoPanel(state, propertiesRows) {
  const theContainer = document.querySelector(".selection-nav");
  theContainer.innerHTML = '';
  
  if (!state) {
    theContainer.style.display = 'none';
    return;
  }
  
  theContainer.style.display = 'block';
  const selectionPanel = createPanelElement();
  theContainer.appendChild(selectionPanel);
  
  if (!propertiesRows || propertiesRows.length === 0) return;
  
  const element = propertiesRows[0];
  if (!element.children || element.children.length === 0) return;
  
  // First render standard attributes
  renderStandardAttributes(element.children, selectionPanel);
  
  // Then render property and quantity sets
  renderPropertyAndQuantitySets(element.children, selectionPanel);
}

function createPanelElement() {
  const selectionPanel = document.createElement('nav');
  selectionPanel.className = 'selection-panel';
  
  // Create the header
  const header = document.createElement('div');
  header.className = 'selection-panel-header';
  
  const headerTitle = document.createElement('h3');
  headerTitle.textContent = 'Selection info';

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times';
  closeBtn.onclick = () => document.querySelector(".selection-nav").style.display = 'none';

  header.appendChild(headerTitle);
  header.appendChild(closeBtn);
  selectionPanel.appendChild(header);
  
  return selectionPanel;
};

function createPropertyRow(name, value) {
  const propRow = document.createElement('div');
  propRow.className = 'property-row';
  
  const propName = document.createElement('span');
  propName.className = 'property-name';
  propName.textContent = name;
  
  const propValue = document.createElement('span');
  propValue.className = 'property-value';
  propValue.textContent = value;
  
  propRow.appendChild(propName);
  propRow.appendChild(propValue);
  
  return propRow;
};


function createCollapsibleHeader(title) {
  const header = document.createElement('div');
  header.className = 'attribute-type';
  header.innerHTML = `▶ ${title}`;
  header.style.cursor = 'pointer';
  
  return header;
};

function toggleCollapsible(header, content, title) {
  if (content.style.display === 'none') {
    content.style.display = 'block';
    header.innerHTML = `▼ ${title}`;
  } else {
    content.style.display = 'none';
    header.innerHTML = `▶ ${title}`;
  }
};

function renderStandardAttributes(attributesRows, parentElement) {
  // Create section header
  const elementContainerName = document.createElement('div');
  elementContainerName.className = 'attribute-type';
  elementContainerName.innerHTML = `<span>Attributes</span>`;
  elementContainerName.style.fontWeight = 'bold';
  parentElement.appendChild(elementContainerName);
  
  attributesRows.forEach(attributesRow => {
    if (!attributesRow.data || 
        attributesRow.data.Name === "ContainedInStructure" || 
        attributesRow.data.Name === "IsDefinedBy") {
      return;
    }
    // Create properties container if children exist
    if (attributesRow.data) {
      const propsContainer = document.createElement('div');
      propsContainer.className = 'properties-container';
      propsContainer.appendChild(createPropertyRow(attributesRow.data.Name, attributesRow.data.Value));
    
      // Only append if we added any properties
      if (propsContainer.children.length > 0) {
        parentElement.appendChild(propsContainer);
      }
    }
  });
}

function renderPropertyAndQuantitySets(attributesRows, parentElement) {
  // Find relevant property/quantity sets
  const relevantRows = attributesRows.filter(row => 
    row.data && 
    (row.data.Name === "ContainedInStructure" || row.data.Name === "IsDefinedBy") &&
    row.children && 
    row.children.length > 0
  );
  
  // If none found, exit early
  if (relevantRows.length === 0) return;
  
  // Process each relevant attribute row
  relevantRows.forEach(attributesRow => {
    // Create section header and container once per attribute row
    const setsHeader = createCollapsibleHeader(attributesRow.data.Name);
    const setsContainer = document.createElement('div');
    setsContainer.className = 'sets-container';
    setsContainer.style.display = 'none';
    
    // Add to parent
    parentElement.appendChild(setsHeader);
    parentElement.appendChild(setsContainer);
    
    // Add toggle behavior
    setsHeader.addEventListener('click', () => {
      toggleCollapsible(setsHeader, setsContainer, attributesRow.data.Name);
    });
    
    // Common set processing function to reduce code duplication
    const processSet = (set) => {
      if (!set.data?.Name || !set.children?.length) return;
      
      // Create set section with header
      const setSection = document.createElement('div');
      setSection.className = 'property-set';
      
      const setHeader = createCollapsibleHeader(set.data.Name);
      setHeader.className = 'set-header';
      
      const setContent = document.createElement('div');
      setContent.className = 'set-content';
      setContent.style.display = 'none';
      
      // Add toggle behavior
      setHeader.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleCollapsible(setHeader, setContent, set.data.Name);
      });
      
      // Add elements
      setSection.appendChild(setHeader);
      setSection.appendChild(setContent);
      setsContainer.appendChild(setSection);
      
      return { setSection, setContent };
    };
    
    // Process all child sets based on type
    attributesRow.children.forEach(set => {
      const result = processSet(set);
      if (!result) return;
      const { setContent } = result;
      
      // Different processing for different attribute types
      if (attributesRow.data.Name === "ContainedInStructure") {
        // Direct property handling
        set.children.forEach(prop => {
          if (prop.data?.Name) {
            setContent.appendChild(createPropertyRow(prop.data.Name, prop.data.Value));
          }
        });
      } else {
        // IsDefinedBy handling with nested values
        set.children.forEach(prop => {
          if (prop.children) {
            prop.children.forEach(p => {
              if (p.children && p.children[4].data) {
                const valueChild = p.children[4];
                setContent.appendChild(createPropertyRow(p.data.Name, valueChild.data.Value));
              }
            });
          }
        });
      }
    });
  });
};

async function fetchProjectName(projectId) {
  try {
    const response = await authenticatedFetch(`http://localhost:8000/api/projects/${projectId}/`);
    if (response.ok) {
      const project = await response.json();
      return project.name || `Project ${projectId}`;
    }
  } catch (error) {
    console.error("Error fetching project details:", error);
  }
  return `Project ${projectId}`;
}

export async function crumbleMenu() {
  const headerMenu = document.querySelector('.appHeader-menu');
  if (!headerMenu) return;
  
  headerMenu.innerHTML = ''; // Clear existing content
  
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');
  const fileId = urlParams.get('fileId');
  const fileName = urlParams.get('fileName');
  
  // Create breadcrumb container
  const breadcrumb = document.createElement('div');
  breadcrumb.className = 'breadcrumb';

  // Projects link
  const projectsLink = document.createElement('a');
  projectsLink.href = '/profile';
  projectsLink.className = 'breadcrumb-item';
  projectsLink.textContent = 'Projects';
  breadcrumb.appendChild(projectsLink);
  
  // If we have a project ID, add project link
  if (projectId) {
    addSeparator(breadcrumb);
    const projecName = await fetchProjectName(projectId);
    const projectLink = document.createElement('a');
    projectLink.href = `/project?id=${projectId}&name=${encodeURIComponent(projecName)}`;
    projectLink.className = 'breadcrumb-item';
    
    
    projectLink.textContent = projecName;
    breadcrumb.appendChild(projectLink);
  }
  
  // If we have a file name, add it as the current item
  if (fileName) {
    addSeparator(breadcrumb);
    
    const fileItem = document.createElement('span'); // Not a link since it's current
    fileItem.className = 'breadcrumb-item current';
    fileItem.textContent = decodeURIComponent(fileName);
    breadcrumb.appendChild(fileItem);
  }
  
  // Add the breadcrumb to the header menu
  headerMenu.appendChild(breadcrumb);
  
  // Helper function to add separator
  function addSeparator(parent) {
    const separator = document.createElement('span');
    separator.className = 'breadcrumb-separator';
    separator.innerHTML = '&rsaquo;'; // Right single angle quote
    parent.appendChild(separator);
  }
}