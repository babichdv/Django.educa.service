import axios from 'axios';
 
export const BASE_PATH = window.location.origin;
export const API_PATH = BASE_PATH+'/api';
 
export const axiosApi = axios.create({baseURL: API_PATH,
    xsrfHeaderName: 'X-CSRFToken',
    xsrfCookieName: 'XSRF-TOKEN',
    headers: {'X-CSRFToken': csrftoken}
});