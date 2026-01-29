/**
 * Shared utility for user dropdown functionality across all pages
 */

/**
 * Initialize the dropdown menu functionality
 * Handles click events to show/hide the dropdown
 */
export function setupDropdown() {
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

/**
 * Populate user information in the dropdown from localStorage
 * Works with the GitHub-style dropdown structure
 */
export function populateUserInfo() {
  const username = localStorage.getItem('username') || 'User';
  const name = localStorage.getItem('name') || username;

  // Populate dropdown user info (GitHub-style)
  const userFullname = document.querySelector('.user-fullname');
  const userUsername = document.querySelector('.user-username');
  
  if (userFullname) userFullname.textContent = name;
  if (userUsername) userUsername.textContent = username;
}

/**
 * Initialize both dropdown functionality and populate user info
 * Call this function in the afterRender of any page with a user dropdown
 */
export function initializeUserDropdown() {
  setupDropdown();
  populateUserInfo();
}
