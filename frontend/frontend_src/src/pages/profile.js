import { authenticatedFetch } from '../api.js';

export async function Profile() {
  try {
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

    return html;
  } catch (error) {
    console.error("Error loading profile page:", error);
    return "<h1>Error loading profile page</h1>";
  }
}

export default Profile;