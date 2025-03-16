export async function Project() {
  
  
  
  const response = await fetch("/project.html");
  const html = await response.text();

  return {
    html,
    afterRender: function() {
      const userAvatar = document.querySelector('.appHeader-user img');
      const dropdown = document.querySelector('.dropdown-content');

      const urlParams = new URLSearchParams(window.location.search);
      const projectName = urlParams.get('name') || 'Default Project';


      // Inserting an a tag with the name of the project beside the logo
      const headerLeft = document.querySelector(".appHeader-bar-left");
      if (headerLeft) {
        const projectLink = document.createElement('a');
        projectLink.href = '#';
        projectLink.textContent = projectName;
        projectLink.classList.add('project-title-link');
        headerLeft.appendChild(projectLink)
      }
      
      if (userAvatar && dropdown) {
        userAvatar.addEventListener('click', function(e){
          dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
          e.stopPropagation();
        });

        document.addEventListener('click', function() {
          dropdown.style.display = 'none';
        });

        dropdown.addEventListener('click', function(e){
          e.stopPropagation();
        });
      }
    }
  }
}
export default Project;