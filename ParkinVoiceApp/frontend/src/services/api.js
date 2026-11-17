// frontend/src/services/api.js
import axios from 'axios';

// ============================================================
// CONFIGURATION
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
console.log(`🔌 API URL: ${API_URL}`);

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000,
});

// ============================================================
// INTERCEPTEURS
// ============================================================

api.interceptors.request.use(
    (config) => {
        const url = config.url || '';

        const isAdminUrl =
            url === '/admin' || url.startsWith('/admin/');
        const isPatientSelfUrl =
            url === '/patient' || url.startsWith('/patient/');
        const isDoctorPatientsUrl =
            url === '/patients' || url.startsWith('/patients/');

        const adminToken = localStorage.getItem('admin_token');
        const doctorToken = localStorage.getItem('token');
        const patientToken = localStorage.getItem('patient_token');

        if (isAdminUrl && adminToken) {
            config.headers.Authorization = `Bearer ${adminToken}`;
        } else if (isPatientSelfUrl && patientToken) {
            config.headers.Authorization = `Bearer ${patientToken}`;
        } else if (isDoctorPatientsUrl && doctorToken) {
            config.headers.Authorization = `Bearer ${doctorToken}`;
        } else if (doctorToken) {
            config.headers.Authorization = `Bearer ${doctorToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const requestUrl = error.config?.url || '';
            const currentPath = window.location.pathname;

            const isLoginAttempt =
                requestUrl.includes('/auth/login') ||
                requestUrl.includes('/patient/login') ||
                requestUrl.includes('/admin/login') ||
                currentPath === '/login' ||
                currentPath === '/register' ||
                currentPath === '/forgot-password' ||
                currentPath === '/reset-password' ||
                currentPath === '/patient/login' ||
                currentPath === '/admin/login';

            if (isLoginAttempt) {
                return Promise.reject(error);
            }

            const isAdminPath =
                requestUrl.startsWith('/admin') ||
                currentPath.startsWith('/admin');
            const isPatientPath =
                (requestUrl === '/patient' || requestUrl.startsWith('/patient/')) ||
                currentPath.startsWith('/patient/');

            if (isAdminPath) {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin');
                window.location.href = '/admin/login';
            } else if (isPatientPath) {
                localStorage.removeItem('patient_token');
                localStorage.removeItem('patient');
                window.location.href = '/patient/login';
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ============================================================
// AUTHENTIFICATION (MÉDECIN)
// ============================================================

export const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem(
            'user',
            JSON.stringify({
                ...(response.data.doctor || response.data.user),
                role: response.data.role || 'doctor',
            })
        );
    }
    return response.data;
};

export const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

export const getProfile = async () => {
    const response = await api.get('/doctor/profile');
    return response.data;
};

export const updateProfile = async (data) => {
    const response = await api.put('/doctor/profile', data);
    return response.data;
};

export const updatePassword = async (data) => {
    const response = await api.put('/doctor/password', data);
    return response.data;
};

export const uploadProfileImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/doctor/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const getProfileImageUrl = (filename) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}/uploads/profiles/${filename}`;
};

// ============================================================
// VÉRIFICATION EMAIL
// ============================================================

export const sendVerificationCode = async (email, purpose = 'registration') => {
    const response = await api.post('/verification/send-code', { email, purpose });
    return response.data;
};

export const verifyCode = async (email, code, purpose = 'registration') => {
    const response = await api.post('/verification/verify-code', { email, code, purpose });
    return response.data;
};

export const sendResetPasswordCode = async (email) => {
    const response = await api.post('/verification/send-code', {
        email,
        purpose: 'reset_password',
    });
    return response.data;
};

export const resetPassword = async (email, code, newPassword) => {
    const response = await api.post('/auth/reset-password', {
        email,
        code,
        new_password: newPassword,
    });
    return response.data;
};

// ============================================================
// PATIENTS (côté médecin, préfixe "/patients")
// ============================================================

export const getPatients = async () => {
    const response = await api.get('/patients');
    return response.data;
};

export const getPatient = async (id) => {
    const response = await api.get(`/patients/${id}`);
    return response.data;
};

export const createPatient = async (data) => {
    const response = await api.post('/patients', data);
    return response.data;
};

export const updatePatient = async (id, data) => {
    const response = await api.put(`/patients/${id}`, data);
    return response.data;
};

export const deletePatient = async (id) => {
    const response = await api.delete(`/patients/${id}`);
    return response.data;
};

export const getPatientAnalyses = async (patientId) => {
    const response = await api.get(`/patients/${patientId}/analyses`);
    return response.data;
};

// ============================================================
// PRÉDICTIONS
// ============================================================

export const predictAudio = async (
    audioFile,
    patientId = null,
    patientName = null,
    notes = null,
    { save = false, share = false } = {}
) => {
    const formData = new FormData();
    formData.append('file', audioFile);
    if (patientId) formData.append('patient_id', patientId);
    if (patientName) formData.append('patient_name', patientName);
    if (notes) formData.append('notes', notes);
    formData.append('save', save);
    formData.append('share', share);

    const response = await api.post('/prediction/analyze', formData, {
        headers: { 'Content-Type': undefined },
    });
    return response.data;
};

export const sharePrediction = async (predictionId) => {
    const response = await api.post(`/prediction/${predictionId}/share`);
    return response.data;
};

export const getHistory = async () => {
    const response = await api.get('/prediction/history');
    return response.data;
};

export const deletePrediction = async (id) => {
    const response = await api.delete(`/prediction/${id}`);
    return response.data;
};

// ============================================================
// ADMIN
// ============================================================

export const adminLogin = async (email, password) => {
    const response = await api.post('/admin/login', { email, password });
    if (response.data.access_token) {
        localStorage.setItem('admin_token', response.data.access_token);
        localStorage.setItem('admin', JSON.stringify(response.data.admin));
    }
    return response.data;
};

export const adminLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin');
};

// ============================================================
// AUTHENTIFICATION PATIENT (préfixe "/patient", singulier)
// ============================================================

export const patientLogin = async (email, password) => {
    const response = await api.post('/patient/login', { email, password });
    if (response.data.access_token) {
        localStorage.setItem('patient_token', response.data.access_token);
        localStorage.setItem('patient', JSON.stringify(response.data.patient));
    }
    return response.data;
};

export const patientRegister = async (data) => {
    const response = await api.post('/patient/register', data);
    return response.data;
};

export const patientLogout = () => {
    localStorage.removeItem('patient_token');
    localStorage.removeItem('patient');
};

export const getPatientProfile = async () => {
    const response = await api.get('/patient/me');
    if (response.data) {
        localStorage.setItem('patient', JSON.stringify(response.data));
    }
    return response.data;
};

export const updatePatientProfile = async (data) => {
    const response = await api.put('/patient/profile', data);
    if (response.data) {
        localStorage.setItem('patient', JSON.stringify(response.data));
    }
    return response.data;
};

export const uploadPatientProfileImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/patient/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const updatePatientPassword = async (data) => {
    const response = await api.put('/patient/password', data);
    return response.data;
};

export const getPatientPredictions = async () => {
    const response = await api.get('/patient/predictions');
    return response.data;
};

// ============================================================
// ADMIN (suite)
// ============================================================

export const getAdminDashboard = async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
};

export const getAllDoctors = async () => {
    const response = await api.get('/admin/doctors');
    return response.data;
};

export const getDoctorDetails = async (id) => {
    const response = await api.get(`/admin/doctors/${id}`);
    return response.data;
};

export const deleteDoctor = async (id) => {
    const response = await api.delete(`/admin/doctors/${id}`);
    return response.data;
};

export const getAllPredictions = async () => {
    const response = await api.get('/admin/predictions');
    return response.data;
};

// ============================================================
// GESTION DES ADMINS
// ============================================================

export const getAllAdmins = async () => {
    const response = await api.get('/admin/admins');
    return response.data;
};

export const createAdmin = async (adminData) => {
    const response = await api.post('/admin/register', adminData);
    return response.data;
};

export const getMyAdminProfile = async () => {
    const response = await api.get('/admin/me');
    return response.data;
};

export const changeMyAdminPassword = async (oldPassword, newPassword) => {
    const response = await api.put('/admin/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
    });
    return response.data;
};

export const getDoctorsStats = async () => {
    const response = await api.get('/admin/stats/doctors');
    return response.data;
};

// ============================================================
// EXPORT PAR DÉFAUT
// ============================================================

export default api;