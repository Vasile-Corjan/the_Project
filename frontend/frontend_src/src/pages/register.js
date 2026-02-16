export async function Register() {
  try {
    const response = await fetch("/register.html");
    const html = await response.text();

    return {
      html,
      afterRender: function(){

        const form = document.getElementById('registerForm');
        if (form) {
          form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if(form.password.value !== form.confirm_password.value){
              alert("Password fields don't match.")
              return;
            }
                
            const formData = {
              first_name: form.first_name.value,
              last_name: form.last_name.value,
              username: form.username.value,
              email: form.email.value,
              password: form.password.value,
            };
            
            const noChar = [':','?','|','/','\\','*','"','<','>',' '];
            const contains = noChar.some(char => formData.username.includes(char));
            
            if(contains){
              alert(`Registration failed. Your username contains bad characters. Avoid these characters: ${noChar}`);
            }else{    
              try {
                const response = await fetch('http://localhost:8000/api/register/user/', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                  const loginResponse = await fetch('http://localhost:8000/api/signin/',{
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      username: formData.username,
                      password: formData.password
                    })
                  });
                      

                  const tokenData = await loginResponse.json();
                      
                  if(loginResponse.ok){
                    localStorage.setItem('access_token', tokenData.access);
                    localStorage.setItem('refresh_token', tokenData.refresh);
                    localStorage.setItem('username', formData.username);

                    alert('Registration successful!');
                    window.location.href = '/profile';
                  } else {
                    alert(`Registration failed: ${JSON.stringify(data)}`);
                    window.location.href = '/home';
                  }
                } 
              } catch (error) {
                  console.error('Error:', error);
                  alert('Registration failed. Please try again.');
              }
            }
          });            
        }
      }     
    };
  } catch (error) {
    console.error('Error loading register page:', error);
    return '<h1>Error loading register page</h1>';
  }
}
export default Register;