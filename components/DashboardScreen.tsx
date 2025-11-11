
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../App';
import { UserRole, Client, SatStatus, Message } from '../types';
import { LogoutIcon, UserCircleIcon, BuildingOfficeIcon, PlusIcon, XMarkIcon, InboxIcon, UsersIcon } from './ui/Icons';

const Header: React.FC = () => {
    const { currentUser, logout } = useAppContext();

    return (
        <header className="bg-white shadow-md sticky top-0 z-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-3">
                        <div className="bg-emerald-600 p-2 rounded-md text-white">
                            <BuildingOfficeIcon className="h-6 w-6" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-800">Grupo Kali Consultores</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-slate-600 hidden sm:block">{currentUser?.email}</span>
                        <button onClick={logout} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition">
                           <LogoutIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

const emptyClient: Omit<Client, 'id' | 'satStatus' | 'isActive'> = {
    companyName: '',
    legalName: '',
    location: '',
    email: '',
    phone: '',
    rfc: '',
    eFirma: '',
    csf: '',
    password: '',
    admin: {
        firstName: '',
        paternalLastName: '',
        maternalLastName: '',
        phone: '',
        eFirma: '',
        csf: '',
    }
};

const ClientForm: React.FC<{ clientToEdit: Client | null, onFinish: () => void }> = ({ clientToEdit, onFinish }) => {
    const { addClient, updateClient, currentUser } = useAppContext();
    const isEditing = clientToEdit !== null;
    const [clientData, setClientData] = useState(isEditing ? clientToEdit : { ...emptyClient, satStatus: SatStatus.PENDIENTE, isActive: true });
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState('');

    const canEdit = currentUser?.role === UserRole.LEVEL_3;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, section?: keyof Pick<Client, 'admin'>) => {
        const { name, value } = e.target;
        if (section === 'admin') {
            setClientData(prev => ({
                ...prev,
                admin: { ...prev.admin, [name]: value }
            }));
        } else {
            setClientData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files && files.length > 0) {
            setClientData(prev => ({ ...prev, [name]: files[0].name }));
        }
    };

    const handleAdminFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files && files.length > 0) {
            setClientData(prev => ({
                ...prev,
                admin: { ...prev.admin, [name]: files[0].name }
            }));
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        // Manual validation
        const { companyName, legalName, location, email, phone, rfc, eFirma, csf, password, admin } = clientData;
        const requiredFields = { companyName, legalName, location, email, phone, rfc, adminFirstName: admin.firstName, adminPaternalLastName: admin.paternalLastName, adminMaternalLastName: admin.maternalLastName, adminPhone: admin.phone };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value || !String(value).trim()) {
                setError('Por favor, complete todos los campos obligatorios.');
                return;
            }
        }

        if (!isEditing) {
            if (!password || !password.trim()) {
                setError('Por favor, cree una contraseña para el cliente.');
                return;
            }
            if (!eFirma) {
                setError('Por favor, adjunte la Firma Electrónica (.zip) de la empresa.');
                return;
            }
            if (!csf) {
                setError('Por favor, adjunte la Constancia de Situación Fiscal (.pdf) de la empresa.');
                return;
            }
            if (!admin.eFirma) {
                setError('Por favor, adjunte la Firma Electrónica (.zip) del administrador.');
                return;
            }
            if (!admin.csf) {
                setError('Por favor, adjunte la Constancia de Situación Fiscal (.pdf) del administrador.');
                return;
            }
        }
        
        let result: { success: boolean; reason?: string };

        if (isEditing && clientToEdit) {
            result = await updateClient(clientData as Client);
        } else {
            result = await addClient(clientData);
        }
        
        if (result.success) {
            setShowSuccess(true);
            setTimeout(() => {
              onFinish();
            }, 2000);
        } else {
            setError(result.reason || 'Ocurrió un error inesperado.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-20">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Detalles del Cliente' : 'Registrar Nuevo Cliente'}</h2>
                    <button onClick={onFinish} className="text-slate-500 hover:text-slate-800"><XMarkIcon /></button>
                </div>
                {showSuccess ? (
                     <div className="text-center p-8">
                        <div className="mx-auto bg-emerald-100 rounded-full h-16 w-16 flex items-center justify-center">
                            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mt-4">¡Éxito!</h3>
                        <p className="text-slate-600 mt-2">{isEditing ? 'Cliente actualizado' : 'Cliente registrado'} correctamente. {isEditing ? '': 'Se ha enviado un correo de confirmación.'}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-6 p-4 border border-slate-200 rounded-md">
                            <h3 className="text-lg font-semibold text-emerald-700 mb-4">Datos de la Empresa</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input name="companyName" value={clientData.companyName} onChange={handleChange} placeholder="Nombre de la Empresa" className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                <input name="legalName" value={clientData.legalName} onChange={handleChange} placeholder="Razón Social" className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                <input name="location" value={clientData.location} onChange={handleChange} placeholder="Ubicación" className="p-2 border rounded col-span-1 md:col-span-2" disabled={isEditing && !canEdit} />
                                <input name="email" type="email" value={clientData.email} onChange={handleChange} placeholder="Correo Electrónico" className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                <input name="phone" type="tel" value={clientData.phone} onChange={handleChange} placeholder="Número Telefónico" className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                {!isEditing && (
                                     <input name="password" type="password" value={clientData.password || ''} onChange={handleChange} placeholder="Crear Contraseña para Cliente" className="p-2 border rounded" />
                                )}
                                {isEditing && canEdit && (
                                     <div className="col-span-1 md:col-span-2">
                                        <label htmlFor="satStatus" className="block text-sm font-medium text-slate-600 mb-1">Estado con el SAT</label>
                                        <select id="satStatus" name="satStatus" value={clientData.satStatus} onChange={handleChange} className="p-2 border rounded w-full" disabled={!canEdit}>
                                            {Object.values(SatStatus).map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-6 p-4 border border-slate-200 rounded-md">
                            <h3 className="text-lg font-semibold text-emerald-700 mb-4">Documentos Fiscales de la Empresa</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input name="rfc" value={clientData.rfc} onChange={handleChange} placeholder="RFC Razón Social" className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                
                                <div className="space-y-1">
                                    <label htmlFor="eFirma" className="block text-sm font-medium text-slate-600">Firma Electrónica (.zip)</label>
                                    {(!isEditing || canEdit) && (
                                        <input id="eFirma" name="eFirma" type="file" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" accept=".zip" />
                                    )}
                                    {isEditing && clientData.eFirma && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            Archivo actual: {clientData.eFirma}
                                            {!canEdit && <span className="text-slate-400"> (solo vista)</span>}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1 col-span-1 md:col-span-2">
                                    <label htmlFor="csf" className="block text-sm font-medium text-slate-600">Constancia de Situación Fiscal (.pdf)</label>
                                    {(!isEditing || canEdit) && (
                                        <input id="csf" name="csf" type="file" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" accept=".pdf" />
                                    )}
                                    {isEditing && clientData.csf && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            Archivo actual: {clientData.csf}
                                            {!canEdit && <span className="text-slate-400"> (solo vista)</span>}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="mb-6 p-4 border border-slate-200 rounded-md">
                             <h3 className="text-lg font-semibold text-emerald-700 mb-4">Datos del Administrador</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-4">
                                <input name="firstName" value={clientData.admin.firstName} onChange={e => handleChange(e, 'admin')} placeholder="Nombre(s)" className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                <input name="paternalLastName" value={clientData.admin.paternalLastName} onChange={e => handleChange(e, 'admin')} placeholder="Apellido Paterno" className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                <input name="maternalLastName" value={clientData.admin.maternalLastName} onChange={e => handleChange(e, 'admin')} placeholder="Apellido Materno" className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                <input name="phone" type="tel" value={clientData.admin.phone} onChange={e => handleChange(e, 'admin')} placeholder="Número Telefónico" className="p-2 border rounded col-span-1 md:col-span-3" disabled={isEditing && !canEdit} />

                                <div className="space-y-1 col-span-1 md:col-span-3">
                                    <label htmlFor="adminEFirma" className="block text-sm font-medium text-slate-600">Firma Electrónica del Administrador (.zip)</label>
                                    {(!isEditing || canEdit) && (
                                        <input id="adminEFirma" name="eFirma" type="file" onChange={handleAdminFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" accept=".zip" />
                                    )}
                                    {isEditing && clientData.admin.eFirma && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            Archivo actual: {clientData.admin.eFirma}
                                            {!canEdit && <span className="text-slate-400"> (solo vista)</span>}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1 col-span-1 md:col-span-3">
                                    <label htmlFor="adminCsf" className="block text-sm font-medium text-slate-600">Constancia de Situación Fiscal del Administrador (.pdf)</label>
                                    {(!isEditing || canEdit) && (
                                        <input id="adminCsf" name="csf" type="file" onChange={handleAdminFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" accept=".pdf" />
                                    )}
                                    {isEditing && clientData.admin.csf && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            Archivo actual: {clientData.admin.csf}
                                            {!canEdit && <span className="text-slate-400"> (solo vista)</span>}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

                        {(currentUser?.role === UserRole.LEVEL_3 || !isEditing) && (
                          <div className="flex justify-end">
                              <button type="submit" className="bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-emerald-700 transition duration-300">
                                  {isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}
                              </button>
                          </div>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
};

const ClientList: React.FC<{ onSelectClient: (client: Client) => void }> = ({ onSelectClient }) => {
    const { clients, currentUser } = useAppContext();
    const role = currentUser?.role;

    if (!clients.length) {
        return <div className="text-center p-10 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold text-slate-700">No hay clientes registrados</h3>
            <p className="text-slate-500 mt-2">Haga clic en "Registrar Cliente" para empezar.</p>
        </div>
    }

    if (role === UserRole.LEVEL_1) {
        return (
            <ul className="space-y-3">
                {clients.map(client => (
                    <li key={client.id} className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="font-semibold text-slate-800">{client.companyName}</p>
                    </li>
                ))}
            </ul>
        );
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map(client => (
                <div key={client.id} className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 duration-300 flex flex-col">
                    <div className="p-6 flex-grow">
                        <h3 className="font-bold text-xl text-slate-800 mb-2">{client.companyName}</h3>
                        <p className="text-slate-500 text-sm mb-4">{client.legalName}</p>
                        <div className="border-t border-slate-200 pt-4 space-y-3">
                            <p className="text-slate-600 flex items-center text-sm"><UserCircleIcon className="w-4 h-4 mr-2 text-emerald-600" /> {`${client.admin.firstName} ${client.admin.paternalLastName}`}</p>
                            <p className="text-slate-600 flex items-center text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                {client.email}
                            </p>
                        </div>
                    </div>
                     <div className="bg-slate-50 px-6 py-3 mt-auto">
                        <button onClick={() => onSelectClient(client)} className="w-full text-center text-emerald-600 font-semibold hover:text-emerald-800 transition">
                            {role === UserRole.LEVEL_2 ? 'Ver Detalles' : 'Ver y Editar'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

const MessagesInbox: React.FC = () => {
    const { messages, clients } = useAppContext();

    const messagesByClient = useMemo(() => {
        const grouped: Record<string, { client: Client | undefined, messages: Message[] }> = {};
        messages.forEach(msg => {
            if (!grouped[msg.clientId]) {
                grouped[msg.clientId] = {
                    client: clients.find(c => c.id === msg.clientId),
                    messages: []
                };
            }
            grouped[msg.clientId].messages.push(msg);
        });
        return Object.values(grouped).filter(g => g.client);
    }, [messages, clients]);

    if (messagesByClient.length === 0) {
        return (
            <div className="text-center p-10 bg-white rounded-lg shadow">
                 <h3 className="text-xl font-semibold text-slate-700">Buzón de Mensajes Vacío</h3>
                 <p className="text-slate-500 mt-2">Aún no ha recibido mensajes de los clientes.</p>
            </div>
        )
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center"><InboxIcon className="w-6 h-6 mr-3 text-emerald-600" /> Buzón de Mensajes</h3>
            <div className="space-y-6">
                {messagesByClient.map(({ client, messages }) => (
                    <div key={client!.id} className="p-4 border rounded-md">
                        <h4 className="font-bold text-lg text-slate-700">{client!.companyName}</h4>
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-2">
                           {messages.map(msg => (
                                <div key={msg.id} className={`p-2 rounded-md text-sm ${msg.sender === 'client' ? 'bg-slate-100' : 'bg-emerald-50 text-right'}`}>
                                    <p>{msg.content}</p>
                                    <p className="text-xs text-slate-400 mt-1">{new Date(msg.timestamp).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void, disabled?: boolean }> = ({ checked, onChange, disabled }) => {
  return (
    <button
      type="button"
      className={`${
        checked ? 'bg-emerald-600' : 'bg-gray-200'
      } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      onClick={onChange}
      disabled={disabled}
      aria-checked={checked}
    >
      <span
        className={`${
          checked ? 'translate-x-6' : 'translate-x-1'
        } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
      />
    </button>
  );
};


const AddAdminForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { addAdminUser } = useAppContext();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.LEVEL_1);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email) {
            setError('El correo electrónico es obligatorio.');
            return;
        }

        // The password is intentionally omitted as it's now handled by Supabase Auth
        const result = await addAdminUser(email, role, '');

        if (result.success) {
            setShowSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } else {
            setError(result.reason || 'No se pudo agregar el perfil del administrador.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-30">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Nuevo Perfil de Administrador</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><XMarkIcon /></button>
                </div>
                {showSuccess ? (
                    <div className="text-center p-4">
                        <div className="mx-auto bg-emerald-100 rounded-full h-16 w-16 flex items-center justify-center">
                            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mt-4">¡Perfil Creado!</h3>
                        <p className="text-slate-600 mt-2">El perfil del administrador ha sido agregado.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 text-sm" role="alert">
                            <p className="font-bold">Proceso de 2 Pasos</p>
                            <p>1. Cree el perfil aquí con su rol. <br/> 2. Luego, cree el usuario con el mismo email y una contraseña en el panel de <strong>Supabase Auth</strong>.</p>
                        </div>
                        <div>
                            <label htmlFor="admin-email" className="block text-sm font-medium text-slate-700">Correo Electrónico</label>
                            <input
                                id="admin-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="nuevo.admin@gmail.com"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="admin-role" className="block text-sm font-medium text-slate-700">Rol de Administrador</label>
                            <select
                                id="admin-role"
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md"
                            >
                                <option value={UserRole.LEVEL_1}>Nivel 1 (Solo alta y vista de nombres)</option>
                                <option value={UserRole.LEVEL_2}>Nivel 2 (Alta y vista de documentos)</option>
                            </select>
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <div className="flex justify-end pt-2">
                             <button type="submit" className="bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-emerald-700 transition duration-300">
                                Crear Perfil
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};


const UserManagement: React.FC = () => {
    const { adminUsers, clients, toggleAdminStatus, toggleClientStatus, currentUser } = useAppContext();
    const [showAddAdminForm, setShowAddAdminForm] = useState(false);

    const getRoleName = (role: UserRole) => {
        if (role === UserRole.LEVEL_1) return 'Nivel 1';
        if (role === UserRole.LEVEL_2) return 'Nivel 2';
        if (role === UserRole.LEVEL_3) return 'Nivel 3';
        return '';
    }

    return (
        <>
            {showAddAdminForm && <AddAdminForm onClose={() => setShowAddAdminForm(false)} />}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-bold text-slate-800">Administradores</h3>
                         <button onClick={() => setShowAddAdminForm(true)} className="flex items-center bg-emerald-100 text-emerald-800 font-semibold py-1 px-3 rounded-lg hover:bg-emerald-200 transition duration-300 text-sm">
                            <PlusIcon className="w-4 h-4 mr-1"/>
                            Agregar
                        </button>
                    </div>
                    <ul className="divide-y divide-slate-200">
                        {Object.keys(adminUsers).map((email) => {
                            const user = adminUsers[email];
                            return (
                                <li key={email} className="py-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-800">{email}</p>
                                        <p className="text-sm text-slate-500">Rol: {getRoleName(user.role)}</p>
                                    </div>
                                    <ToggleSwitch
                                        checked={user.isActive}
                                        onChange={() => toggleAdminStatus(email)}
                                        disabled={email === currentUser?.email || email === 'admintres@gmail.com'}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-2xl font-bold text-slate-800 mb-4">Clientes</h3>
                    <ul className="divide-y divide-slate-200">
                        {clients.map(client => (
                             <li key={client.id} className="py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-slate-800">{client.companyName}</p>
                                    <p className="text-sm text-slate-500">{client.email}</p>
                                </div>
                                <ToggleSwitch 
                                    checked={client.isActive} 
                                    onChange={() => toggleClientStatus(client.id)}
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    );
};

export default function DashboardScreen() {
    const { currentUser } = useAppContext();
    const [view, setView] = useState<'list' | 'form' | 'messages' | 'management'>('list');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const handleSelectClient = (client: Client) => {
        setSelectedClient(client);
        setView('form');
    };

    const handleAddNew = () => {
        setSelectedClient(null);
        setView('form');
    };

    const handleFormFinish = () => {
        setView('list');
        setSelectedClient(null);
    };

    const handleViewChange = (newView: 'list' | 'messages' | 'management') => {
        setView(currentView => currentView === newView ? 'list' : newView);
    };

    const welcomeMessage = useMemo(() => {
        switch (currentUser?.role) {
            case UserRole.LEVEL_1: return "Bienvenido, Administrador Nivel 1.";
            case UserRole.LEVEL_2: return "Bienvenido, Administrador Nivel 2.";
            case UserRole.LEVEL_3: return "Bienvenido, Administrador Nivel 3.";
            default: return "Bienvenido.";
        }
    }, [currentUser]);

    const renderMainContent = () => {
        switch (view) {
            case 'list':
                return <ClientList onSelectClient={handleSelectClient} />;
            case 'messages':
                return currentUser?.role === UserRole.LEVEL_3 ? <MessagesInbox /> : <ClientList onSelectClient={handleSelectClient} />;
            case 'management':
                return currentUser?.role === UserRole.LEVEL_3 ? <UserManagement /> : <ClientList onSelectClient={handleSelectClient} />;
            case 'form':
                return <ClientForm clientToEdit={selectedClient} onFinish={handleFormFinish} />;
            default:
                return <ClientList onSelectClient={handleSelectClient} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100">
            <Header />
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">{welcomeMessage}</h2>
                        <p className="text-slate-500 mt-1">
                            {view === 'list' && 'Lista de Clientes'}
                            {view === 'messages' && 'Buzón de Mensajes'}
                            {view === 'management' && 'Gestión de Accesos'}
                            {view === 'form' && (selectedClient ? 'Detalles del Cliente' : 'Nuevo Cliente')}
                        </p>
                    </div>
                     <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                        {currentUser?.role === UserRole.LEVEL_3 && (
                            <>
                                <button onClick={() => handleViewChange('messages')} className={`flex items-center font-bold py-2 px-4 rounded-lg transition duration-300 border ${view === 'messages' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-600 hover:bg-slate-50 border-emerald-600'}`}>
                                    <InboxIcon className="w-5 h-5 mr-2"/>
                                    Mensajes
                                </button>
                                <button onClick={() => handleViewChange('management')} className={`flex items-center font-bold py-2 px-4 rounded-lg transition duration-300 border ${view === 'management' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-600 hover:bg-slate-50 border-emerald-600'}`}>
                                    <UsersIcon className="w-5 h-5 mr-2"/>
                                    Gestionar Accesos
                                </button>
                            </>
                        )}
                        <button onClick={handleAddNew} className="flex items-center bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition duration-300 shadow-lg">
                            <PlusIcon className="w-5 h-5 mr-2"/>
                            Registrar Cliente
                        </button>
                    </div>
                </div>
                
                {renderMainContent()}
            </main>
        </div>
    );
}