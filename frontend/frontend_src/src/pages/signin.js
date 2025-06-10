export async function SignIn() {
  try {
    const response = await fetch('/signin.html');
    const html = await response.text();

    document.body.innerHTML = html
    
      const form = document.getElementById('signinForm');

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();

          const dataForm = {
            username: form.username.value,
            password: form.password.value
          };

          try {
            const response = await fetch('http://localhost:8000/api/token/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(dataForm)
            });

            const data = await response.json();

            if (response.ok) {
              localStorage.setItem('access_token', data.access);
              localStorage.setItem('refresh_token', data.refresh);
              localStorage.setItem('username', dataForm.username);
              window.location.href = '/profile';
            } else {
              alert('Sign In failed. wrong credentials');
            }
          } catch (error) {
            console.error('Error', error);
            alert('Sign in failed. Please try again');
          }
        });
      }
    

    return html;
  } catch (error) {
    console.error('Error loading Sign-in page', error);
    return '<h1>Error loading Sign-in page</h1>';
  }
}
export default SignIn;
