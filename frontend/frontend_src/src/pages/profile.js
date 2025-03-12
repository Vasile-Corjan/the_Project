import { authenticatedFetch } from '../api.js';

export async function Profile() {
  // Check if user is authenticated
  const token = localStorage.getItem('access_token');
  if (!token) {
    window.location.href = '/profile';
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
      // Set up dropdown functionality
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
  }
}
export default Profile;