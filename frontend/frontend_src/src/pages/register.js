export async function Register() {
  try {
      const response = await fetch("/register.html");
      const html = await response.text();

      setTimeout(() => {
          const form = document.getElementById('registerForm');
          if (form) {
              form.addEventListener('submit', async (e) => {
                  e.preventDefault();
                  
                  const formData = {
                      username: form.username.value,
                      email: form.email.value,
                      password: form.password.value,
                      password2: form.password.value
                  };

                  try {
                      const response = await fetch('http://localhost:8000/api/user/register/', {
                          method: 'POST',
                          headers: {
                              'Content-Type': 'application/json',
                          },
                          body: JSON.stringify(formData)
                      });

                      const data = await response.json();

                      if (response.ok) {
                          alert('Registration successful!');
                          window.location.href = '/viewer';
                      } else {
                          alert(`Registration failed: ${JSON.stringify(data)}`);
                      }
                  } catch (error) {
                      console.error('Error:', error);
                      alert('Registration failed. Please try again.');
                  }
              });
          }
      }, 100);

      return html;
  } catch (error) {
      console.error('Error loading register page:', error);
      return '<h1>Error loading register page</h1>';
  }
}

export default Register;