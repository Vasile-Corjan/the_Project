export async function authenticatedFetch(url, options = {}) {
  const token = localStorage.getItem('access_token');

  if (!token) {
    window.location.href = '/signin';
    return;
  }

  const headers ={
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        return authenticatedFetch(url, options);
      } else {
        window.location.href = '/signin';
        return;
      }
    }
    return response;
  } catch (error) {
    console.error('Request failed', error);
    throw error;
  }
}

export async function logout(){
  const refresh_token = localStorage.getItem('refresh_token');

  if (refresh_token){
    try{
      await fetch('http://localhost:8000/api/token/refresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({refresh: refresh_token})
    });
  } catch (error) {
      console.error('Logout error', error)
    }
}
  localStorage.removeItem('access-token');
  localStorage.removeItem('refresh-token');
  localStorage.removeItem('username');

  window.location.href = '/signin';
}

async function refreshToken() {
  const refresh_token = localStorage.getItem('refresh_token');


  if (!refresh_token){
    return false;
  }

  try {
    const response = await fetch('http://localhost:8000/api/token/refresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({refresh: refresh_token})
    });

    if (response.ok) {
      const data =  await response.json();
      localStorage.setItem('access_token', data.access);
      return true;
    }
  } catch (error){
    console.error('Token refresh failed', error);
  }
  return false;
}
