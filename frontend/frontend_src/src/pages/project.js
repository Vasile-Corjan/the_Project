import {authenticatedFetch} from '../api.js'



export async function Project() {
  
  const response = await fetch("/project.html");
  const html = await response.text();

  return {
    html,
    afterRender: async function() {
      const urlParams = new URLSearchParams(window.location.search);
      const projectName = urlParams.get('name') || 'Unnamed Project';
      const projectId = urlParams.get('id');


      setupHeaderNavigation(projectName);
      settingsTab();
      setupDropdown();
      
      const projectData = await loadProjectData(projectId);
      updateProjectDescription(projectData.name, projectData.description);

    }
  }
}

async function loadProjectData(projectId) {
  const response = await authenticatedFetch(`http://localhost:8000/api/projects/${projectId}/`)

  if(!response.ok){
    throw new Error('Failed to load the project data');
  }
  return await response.json();
}


function updateProjectDescription(projectName, projectDescription) {
  const descriptionBlock = document.querySelector('.description-block');
  if (descriptionBlock) {
    // Clear existing content to avoid duplicates
    const existingTitle = descriptionBlock.querySelector('h1');
    if (existingTitle) existingTitle.remove();
    
    // Add project name as title
    const blockName = document.createElement('h1');
    blockName.textContent = projectName;
    descriptionBlock.insertAdjacentElement('afterbegin', blockName);

    // Add project description
    const descriptionArea = document.querySelector('.description-text');
    descriptionArea.textContent = projectDescription;

  }
}

function setupDropdown() {
  const userAvatar = document.querySelector('.appHeader-user img');
  const dropdown = document.querySelector('.dropdown-content');
      
  if (userAvatar && dropdown) {
    userAvatar.addEventListener('click', function(e) {
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
      e.stopPropagation();
    });
    
    document.addEventListener('click', function() {
      dropdown.style.display = 'none';
    });

    // Prevents closing the dropdown when the user clicks on it
    dropdown.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
}

function setupHeaderNavigation(projectName){
  const headerLeft = document.querySelector(".appHeader-bar-left");
  if (!headerLeft) return;


  const nav = document.createElement('ul');
  nav.classList.add('nav-list');

  const username = localStorage.getItem('username') || 'User';
  const userItem = document.createElement('li');
  const userLink = document.createElement('a');
  userLink.href = '/profile';
  userLink.textContent = username;
  userLink.classList.add('nav-username');
  userItem.appendChild(userLink);
  nav.appendChild(userItem);

  const separator = document.createElement('li');
  separator.classList.add('nav-separator');
  separator.textContent = '/';
  nav.appendChild(separator);
  
  // Add project name as second item
  const projectItem = document.createElement('li');
  const projectLink = document.createElement('a');
  projectLink.href = '#';
  projectLink.textContent = projectName;
  projectLink.classList.add('nav-project');
  projectItem.appendChild(projectLink);
  nav.appendChild(projectItem);
  
  headerLeft.appendChild(nav);
}

function settingsTab() {
  const settingsButton = document.getElementById('settings-tab');
  const settingsOverlay = document.querySelector('.settings-overlay');
  const settingsPanel = document.querySelector('.settings-panel');
  const closeButton = document.querySelector('.close-settings');
  
  if (!settingsButton || !settingsOverlay || !settingsPanel) {
    console.error('Settings elements not found');
    return;
  }
  
  // Get project data from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const projectName = urlParams.get('name') || 'Unnamed Project';
  
  // Show settings panel when button is clicked
  settingsButton.addEventListener('click', () => {
    // Show the overlay and panel
    settingsOverlay.classList.add('active');
    
    // Load project data into form
    loadProjectSettings(projectId, projectName);
  });
  
  // Close button functionality
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      settingsOverlay.classList.remove('active');
    });
  }
  
  // Close when clicking outside the panel
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) {
      settingsOverlay.classList.remove('active');
    }
  });
  
  // Setup form submission
  setupSettingsForm(projectId);
  
  // Setup delete button
  setupDeleteButton(projectId, projectName);
}

// Function to load project settings
async function loadProjectSettings(projectId, projectName) {
  try {
    // Set the name field immediately (for better UX while loading)
    document.getElementById('project-name').value = projectName;
    
    const response = await authenticatedFetch(`http://localhost:8000/api/projects/${projectId}/`);
    
    if (!response.ok) {
      throw new Error('Failed to load project settings');
    }
    
    const projectData = await response.json();
    
    // Update form fields with project data
    document.getElementById('project-name').value = projectData.name || '';
    document.getElementById('project-description').value = projectData.description || '';
    
    // Set visibility radio button
    const visibilityRadios = document.getElementsByName('visibility');
    for (const radio of visibilityRadios) {
      radio.checked = radio.value === projectData.visibility;
    }
  } catch (error) {
    console.error('Error loading project settings:', error);
  }
}

// Function to handle form submission
function setupSettingsForm(projectId) {
  const settingsForm = document.getElementById('project-settings-form');
  
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        const updatedName = document.getElementById('project-name').value;
        const updatedDescription = document.getElementById('project-description').value;
        const visibilityRadios = document.getElementsByName('visibility');
        let visibility = 'private';
        
        for (const radio of visibilityRadios) {
          if (radio.checked) {
            visibility = radio.value;
            break;
          }
        }
        
        // Make API call to update project
        const response = await authenticatedFetch(`http://localhost:8000/api/projects/${projectId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: updatedName,
            description: updatedDescription,
            visibility: visibility
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to update project settings');
        }
        
        // Update UI to reflect changes
        updateProjectDescription(updatedName, updatedDescription);
        const projectLink = document.querySelector('.nav-project');
        if (projectLink) {
          projectLink.textContent = updatedName;
        }
        
        // Update URL parameter
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('name', updatedName);
        window.history.pushState({}, '', newUrl);
        
        // Show success message and close panel
        alert('Project settings updated successfully!');
        document.querySelector('.settings-overlay').classList.remove('active');
      } catch (error) {
        console.error('Error updating project:', error);
        alert('Failed to update project settings. Please try again.');
      }
    });
  }
}

// Function to handle delete button
function setupDeleteButton(projectId, projectName) {
  const deleteButton = document.getElementById('delete-project');
  
  if (deleteButton) {
    deleteButton.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
        try {
          const response = await authenticatedFetch(`http://localhost:8000/api/projects/${projectId}/`, {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            throw new Error('Failed to delete project');
          }
          
          alert('Project deleted successfully!');
          // Redirect to profile page
          window.location.href = '/profile';
        } catch (error) {
          console.error('Error deleting project:', error);
          alert('Failed to delete project. Please try again.');
        }
      }
    });
  }
}

export default Project;


