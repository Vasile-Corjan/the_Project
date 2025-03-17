export async function Project() {
  
  const response = await fetch("/project.html");
  const html = await response.text();

  return {
    html,
    afterRender: function() {
      const urlParams = new URLSearchParams(window.location.search);
      const projectName = urlParams.get('name') || 'Default Project';


      setupHeaderNavigation(projectName);


      updateProjectDescription(projectName);


      setupDropdown();
      
    }
  }
}

/**
 * Sets up the navigation in the header bar with user and project information.
 * 
 * Creates a navigation list with:
 * - Username (linked to profile page)
 * - Separator (/)
 * - Project name
 * 
 * The navigation is appended to the left side of the application header.
 * 
 * @param {string} projectName - The name of the current project to display in the navigation
 * @returns {void} - Returns early if the header left element is not found
 */
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

function updateProjectDescription(projectName) {
  const descriptionBlock = document.querySelector('.description-block');
  if (descriptionBlock) {
    // Clear existing content to avoid duplicates
    const existingTitle = descriptionBlock.querySelector('h1');
    if (existingTitle) existingTitle.remove();
    
    // Add project name as title
    const blockName = document.createElement('h1');
    blockName.textContent = projectName;
    descriptionBlock.insertAdjacentElement('afterbegin', blockName);
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
export default Project;