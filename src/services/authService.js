/* 
Interaccion con la API
*/

const API_URL = import.meta.env.VITE_APP_URL_BACKEND

export async function login (email, password){
    const response_http = await fetch(
        API_URL + '/api/auth/login',
        {
            method: 'POST',
            headers: {
                'Content-Type': "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        }
    )
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }

    /* 
    Guardamos el token de acceso que devuelve el backend
    El AuthMiddleware lo busca en esta clave para dejar entrar a las pantallas privadas
    */
    localStorage.setItem('auth_token', response_body.data.authentication_token)

    return response_body
}

/* 
JSON.stringify sirve para transformar un Objeto de JS en un JSON
*/


export async function  register(username, email, password) {
    const response_http = await fetch(
        API_URL + '/api/auth/register',
        {
            method: 'POST',
            headers: {
                'Content-Type': "application/json"
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password
            })
        }
    )
    //Leemos el cuerpo de la respuesta como un JSON
    const response_body = await response_http.json()
    
    if(!response_body.ok){
        throw new Error(response_body.message)
    }
    return response_body
}

/* 
Enviarmos la consulta junto al token que llega por querystring para verificar el email
*/
export async function verifyEmail(verification_token) {
    const response_http = await fetch(
        API_URL + '/api/auth/verify',
        {
            method: 'POST',
            headers: {
                'Content-Type': "application/json"
            },
            body: JSON.stringify({
                verification_token: verification_token
            })
        }
    )
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }

    return response_body
}

/* 
Pedimos al backend que envie un mail con un token para restablecer la contrasena
El backend se encarga de enviar el mail solo si el email corresponde a un usuario existente
*/
export async function requestPasswordReset(email) {
    const response_http = await fetch(
        API_URL + '/api/auth/forgot-password',
        {
            method: 'POST',
            headers: {
                'Content-Type': "application/json"
            },
            body: JSON.stringify({
                email: email
            })
        }
    )
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }

    return response_body
}

/* 
Enviamos tanto el token que llego por querystring como la nueva contrasena
El backend la acepta solo si el token es valido y no expiro
*/
export async function resetPassword(reset_token, password) {
    const response_http = await fetch(
        API_URL + '/api/auth/reset-password',
        {
            method: 'POST',
            headers: {
                'Content-Type': "application/json"
            },
            body: JSON.stringify({
                reset_token: reset_token,
                password: password
            })
        }
    )
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }

    return response_body
}

/* 
Pedimos al backend que reenvie el mail de verificacion para un email ya registrado
El email viaja en la URL porque la consulta es tipo GET (los GET no tienen body)
*/
export async function resendVerificationEmail(email) {
    const response_http = await fetch(
        API_URL + '/api/auth/verify-email/' + encodeURIComponent(email) + '/resend',
        {
            method: 'GET'
        }
    )
    const response_body = await response_http.json()

    if(!response_body.ok){
        throw new Error(response_body.message)
    }

    return response_body
}