function SignIn() {
  return fetch("/signin.html")
    .then(response => response.text())
    .then(html => html)
    .catch(error => console.error('Error fetching the signin page:', error));
}

export default SignIn;