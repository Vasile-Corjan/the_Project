import { authenticatedFetch } from '../api.js';

function setupHeaderNavigation(userElement){
  const headerLeft = document.querySelector(".appHeader-bar-left");
  if (!headerLeft) return;

  const nav = document.createElement('ul');
  nav.classList.add('nav-list');

  const username = userElement || 'User';
  const userItem = document.createElement('li');
  const userLink = document.createElement('a');
  userLink.href = '/profile';
  userLink.textContent = username;
  userLink.classList.add('nav-username');
  userItem.appendChild(userLink);
  nav.appendChild(userItem);

  headerLeft.appendChild(nav);
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

async function loadUserProjects() {
  const response = await authenticatedFetch('http://localhost:8000/api/projects/');

  const projects = await response.json();
  const projectList = document.querySelector('.project-list');

  projectList.innerHTML = '';

  if(projects.length === 0){
    const noProjects = document.createElement('li');
    noProjects.className = 'no-projects';
    noProjects.textContent = 'No projects yet. Create your first project';
    projectList.appendChild(noProjects);
  }

  projects.forEach(project => {
    const projectListElement = document.createElement('li');
    const projectElement = document.createElement('a');
    projectElement.className = 'project-element';  
    projectElement.textContent = project.name;
    projectElement.href = `/project?id=${project.id}&name=${encodeURIComponent(project.name)}`;
    projectElement.dataset.projectId = project.id;

    projectListElement.appendChild(projectElement);
    projectList.appendChild(projectListElement);
  });
}

function createProject() {
  const projectForm = document.querySelector('.new-project-form');

  if(projectForm){
    projectForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const projectNameInput = document.getElementById('project-name');
      const projectName = projectNameInput.value.trim();
      
      if (projectName) {
        // Create new project element

        const response = await authenticatedFetch('http://localhost:8000/api/projects/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: projectName,
            //visibility: visibility
          })
        });

        if(!response.ok){
          throw new Error('Failed to create a project');
        }

        const projectData = await response.json();

        const projectList = document.querySelector('.project-list');

        const noProjectsMessage = document.querySelector('no-projects');
        if(noProjectsMessage){
          projectList.removeChild(noProjectsMessage);
        }

        const projectListElement = document.createElement('li');
        const projectElement = document.createElement('a');
        projectElement.className = 'project-element';
        projectElement.textContent = projectName;
        projectElement.href = `/project?id=${projectData.id}&name=${encodeURIComponent(projectName)}`;
        projectElement.dataset.projectId = projectData.id;

        projectListElement.appendChild(projectElement);
        projectList.appendChild(projectListElement);
        
        // Clear the input field
        projectNameInput.value = '';
      }
    });
  }
}


export async function Profile() {
  // Check if user is authenticated
  const token = localStorage.getItem('access_token');
  if (!token) {
    window.location.href = '/signin';
  }

  // Fetch the HTML template
  const response = await fetch("/profile.html");
  const html = await response.text();

  // After template is loaded, fetch user data

  return {
    html,
    afterRender: async function() {
      try {
        setupDropdown();
        createProject();
        const userResponse = await authenticatedFetch('http://localhost:8000/api/user/profile/');
        const userData = await userResponse.json();
        // Update profile page with user data
        const usernameElement = userData.username;
        const emailElement = document.getElementById('email');
        if (usernameElement) setupHeaderNavigation(usernameElement);
        if (emailElement) emailElement.textContent = userData.email;

        await loadUserProjects();
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    } 
  }
}

export default Profile;

