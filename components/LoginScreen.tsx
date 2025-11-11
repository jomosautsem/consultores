import React, { useState } from 'react';
import { useAppContext } from '../App';
import { BuildingOfficeIcon } from './ui/Icons';

const PasswordRecoveryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log(`Password recovery requested for ${email}`);
        setSubmitted(true);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-slate-500 hover:text-slate-800">&times;</button>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Recuperación de Contraseña</h2>
                {submitted ? (
                    <div>
                        <p className="text-slate-600 mb-4">Si existe una cuenta con el correo electrónico proporcionado, se ha enviado un enlace para restablecer la contraseña.</p>
                        <button onClick={onClose} className="w-full bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition duration-300">Cerrar</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p className="text-slate-600 mb-6">Ingrese su correo electrónico para recibir instrucciones y restablecer su contraseña.</p>
                        <div className="mb-4">
                            <label htmlFor="recovery-email" className="block text-slate-700 text-sm font-bold mb-2">Correo Electrónico</label>
                            <input
                                id="recovery-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="sunombre@ejemplo.com"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition duration-300">Enviar Instrucciones</button>
                    </form>
                )}
            </div>
        </div>
    );
};


const LoginScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showRecovery, setShowRecovery] = useState(false);
    const [loginType, setLoginType] = useState<'admin' | 'client'>('admin');
    const { login, clientLogin } = useAppContext();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        let result = { success: false, reason: 'Error desconocido.' };
        if (loginType === 'admin') {
            result = login(email, password);
        } else {
            result = clientLogin(email, password);
        }

        if (!result.success) {
            setError(result.reason || 'Correo electrónico o contraseña inválidos.');
        }
    };

    const handleLoginTypeChange = (type: 'admin' | 'client') => {
        setLoginType(type);
        setError('');
        setEmail('');
        setPassword('');
    }

    const backgroundStyle = {
        backgroundImage: `linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(16, 185, 129, 0.8)), url('https://images.unsplash.com/photo-1554224155-1696413565d3?auto=format&fit=crop&q=80&w=2070')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    };

    return (
        <>
            <div 
                className="min-h-screen flex flex-col items-center justify-center p-4"
                style={backgroundStyle}
            >
                <div className="w-full max-w-md">
                    <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-8 md:p-12">
                        <div className="flex flex-col items-center mb-6">
                            <div className="bg-emerald-600 p-4 rounded-full mb-4 text-white">
                                <BuildingOfficeIcon className="w-10 h-10" />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-800">Grupo Kali</h1>
                            <p className="text-slate-500">Consultores Contables</p>
                        </div>

                        <div className="flex border-b border-slate-200 mb-6">
                            <button 
                                onClick={() => handleLoginTypeChange('admin')}
                                className={`flex-1 py-2 text-sm font-semibold transition-colors duration-300 ${loginType === 'admin' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Soy Administrador
                            </button>
                            <button 
                                onClick={() => handleLoginTypeChange('client')}
                                className={`flex-1 py-2 text-sm font-semibold transition-colors duration-300 ${loginType === 'client' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Soy Cliente
                            </button>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-600 mb-1">Correo Electrónico</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                    placeholder={loginType === 'admin' ? 'admin@gmail.com' : 'cliente@ejemplo.com'}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="password"  className="block text-sm font-medium text-slate-600 mb-1">Contraseña</label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            
                            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-300 ease-in-out">
                                Iniciar Sesión
                            </button>
                        </form>
                        <div className="text-center mt-6">
                            <button onClick={() => setShowRecovery(true)} className="text-sm text-emerald-600 hover:text-emerald-800 hover:underline">
                                ¿Olvidó su contraseña?
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {showRecovery && <PasswordRecoveryModal onClose={() => setShowRecovery(false)} />}
        </>
    );
};

export default LoginScreen;