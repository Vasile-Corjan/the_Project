import {authenticatedFetch} from '../api.js'
import {initializeUserDropdown} from '../utils/userDropdown.js'

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
      initializeUserDropdown();
      uploadFile();
      
      const projectData = await loadProjectData(projectId);
      updateProjectDescription(projectData.name, projectData.description);

      await refreshFilesList(projectId)

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
    visibilityRadios.forEach(radio => {
      if(radio.value === projectData.visibility){
        radio.checked = true;
      }
    })
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
        
        let visibility = 'public';
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

function uploadFile(){
  const uploadButton = document.querySelector('.uploadButton');
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  if (uploadButton){
    uploadButton.addEventListener('click', async () => {

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);

      fileInput.click();

      fileInput.addEventListener('change', async (e) => {
        if(!fileInput.files || fileInput.files.length === 0){
          document.body.removeChild(fileInput);
          return;
        }

        const file = fileInput.files[0];

        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);
      
        const response = await authenticatedFetch(`http://localhost:8000/api/projects/${projectId}/files/`, {
        method: 'POST',
        body: formData
      });

      if(!response.ok){
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json()
      console.log("The uploaded file:", result)
      alert(`File "${file.name}" uploaded successfully!`)

      refreshFilesList(projectId);

      document.body.removeChild(fileInput);
      
      }) 
        
    })
  }
}

async function deleteFile(projectId, fileId){
  const response = await authenticatedFetch(`http://localhost:8000/api/projects/${projectId}/files/${fileId}/`,
    {method: 'DELETE'}
  );

  if(!response.ok){
    throw new Error(`Failed to delete file: ${response.status}`);
  };

  await refreshFilesList(projectId);
}

async function  refreshFilesList(projectId){
  const response = await authenticatedFetch(`http://localhost:8000/api/projects/${projectId}/files/`);

  if(!response.ok){
    throw new Error(`Failed to fetch files: ${response.status}`);
  }

  const files = await response.json();
  const filesTable = document.querySelector('.files-table tbody');
  if(filesTable){
    filesTable.innerHTML = '';

    if(!files || files.length === 0){
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = '<td colspan="3" class="empty-files"> No files uploaded yet </td>'
      filesTable.appendChild(emptyRow);
    } else{
      files.forEach(file => {
        const row = document.createElement('tr');
        row.className = 'file-row';

        const uploadDate = new Date(file.uploaded_at);
        const formattedDate = uploadDate.toLocaleDateString();

        const fileName = file.name;

        row.innerHTML = `
        <td class="file-name">
          <a href="#" class="ifc-file-link" data-file-id="${file.id}" data-project-id="${projectId}">${file.name}</a>
        </td>
        <td class="change-time">'N/A'</td>
        <td class="update-time">${formattedDate}</td>
        `;

        const ifcLink = row.querySelector('.ifc-file-link');

        ifcLink.addEventListener('click', () =>{
          window.location.href = `/viewer?projectId=${projectId}&fileId=${file.id}&fileName=${encodeURIComponent(fileName)}`;
        })
        
        // Delete button
        const deleteCell = document.createElement('td');
        deleteCell.className = 'delete-action';
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        let deleteIcon = `<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16" height="16" viewBox="0 0 48 48">
<path d="M 24 4 C 20.491685 4 17.570396 6.6214322 17.080078 10 L 10.238281 10 A 1.50015 1.50015 0 0 0 9.9804688 9.9785156 A 1.50015 1.50015 0 0 0 9.7578125 10 L 6.5 10 A 1.50015 1.50015 0 1 0 6.5 13 L 8.6386719 13 L 11.15625 39.029297 C 11.427329 41.835926 13.811782 44 16.630859 44 L 31.367188 44 C 34.186411 44 36.570826 41.836168 36.841797 39.029297 L 39.361328 13 L 41.5 13 A 1.50015 1.50015 0 1 0 41.5 10 L 38.244141 10 A 1.50015 1.50015 0 0 0 37.763672 10 L 30.919922 10 C 30.429604 6.6214322 27.508315 4 24 4 z M 24 7 C 25.879156 7 27.420767 8.2681608 27.861328 10 L 20.138672 10 C 20.579233 8.2681608 22.120844 7 24 7 z M 11.650391 13 L 36.347656 13 L 33.855469 38.740234 C 33.730439 40.035363 32.667963 41 31.367188 41 L 16.630859 41 C 15.331937 41 14.267499 40.033606 14.142578 38.740234 L 11.650391 13 z M 20.476562 17.978516 A 1.50015 1.50015 0 0 0 19 19.5 L 19 34.5 A 1.50015 1.50015 0 1 0 22 34.5 L 22 19.5 A 1.50015 1.50015 0 0 0 20.476562 17.978516 z M 27.476562 17.978516 A 1.50015 1.50015 0 0 0 26 19.5 L 26 34.5 A 1.50015 1.50015 0 1 0 29 34.5 L 29 19.5 A 1.50015 1.50015 0 0 0 27.476562 17.978516 z"></path>
</svg>`
        deleteButton.innerHTML = deleteIcon;
        deleteCell.appendChild(deleteButton);
        row.appendChild(deleteCell)

        deleteButton.addEventListener('click', () => {
          if (confirm(`Are you sure you want to remove the file ${fileName}`)){
            deleteFile(projectId, file.id);
          }
        })
        
        filesTable.append(row);
      })
    }
  }
}

export default Project;


