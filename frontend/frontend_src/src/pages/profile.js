import { authenticatedFetch } from '../api.js';

/**
 * Renders the user profile page.
 * 
 * This function handles:
 * 1. Authentication verification - redirects if no token exists
 * 2. Loading the profile HTML template
 * 3. Fetching and displaying user data (username and email)
 * 4. Setting up UI components after render
 * 
 * @async
 * @function Profile
 * @returns {Object} An object containing:
 *   - {string} html - The profile page HTML content
 *   - {Function} afterRender - Callback function to execute after rendering
 * @throws {Error} When user data fetching fails
 */
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
  setTimeout(async () => {
    try {
      const userResponse = await authenticatedFetch('http://localhost:8000/api/user/profile/');
      const userData = await userResponse.json();
      
      // Update profile page with user data
      const usernameElement = document.getElementById('username');
      const emailElement = document.getElementById('email');
      
      if (usernameElement) usernameElement.textContent = userData.username;
      if (emailElement) emailElement.textContent = userData.email;
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, 100);

  return {
    html,
    afterRender: function() {
      // Add username to header navigation
      setupDropdown();

      setupHeaderNavigation();
      
    } 
  }
}
function setupHeaderNavigation(){
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
export default Profile;