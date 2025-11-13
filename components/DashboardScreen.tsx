import React, { useState, useMemo } from 'react';
import { useAppContext } from '../App';
import { UserRole, Client, SatStatus, Message, Task, Document, TaskStatus, DocumentFolder } from '../types';
// Fix: Imported PaperAirplaneIcon.
import { LogoutIcon, UserCircleIcon, BuildingOfficeIcon, PlusIcon, XMarkIcon, InboxIcon, UsersIcon, ClipboardDocumentListIcon, DocumentDuplicateIcon, PaperAirplaneIcon, TrashIcon } from './ui/Icons';
import { supabase } from '../supabaseClient';


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
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [statusUpdateMsg, setStatusUpdateMsg] = useState('');
    const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'tasks'>('details');

    const canEdit = currentUser?.role === UserRole.LEVEL_3;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, section?: keyof Pick<Client, 'admin'>) => {
        const { name, value } = e.target;
        if (section === 'admin') {
            setClientData(prev => ({ ...prev, admin: { ...prev.admin, [name]: value } }));
        } else {
            setClientData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSatStatusChange = async (newStatus: SatStatus) => {
        if (!clientToEdit || isUpdatingStatus || !canEdit) return;
        setIsUpdatingStatus(true);
        setStatusUpdateMsg('');
        const updatedClient: Client = { ...clientToEdit, satStatus: newStatus };
        const result = await updateClient(updatedClient);
        if (result.success) {
            setClientData(prevData => ({ ...prevData, satStatus: newStatus }));
            setStatusUpdateMsg('¡Estado actualizado!');
            setTimeout(() => setStatusUpdateMsg(''), 2000);
        } else {
            setStatusUpdateMsg(result.reason || 'Error al actualizar.');
        }
        setIsUpdatingStatus(false);
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        let result: { success: boolean; reason?: string };
        if (isEditing && clientToEdit) {
            result = await updateClient(clientData as Client);
        } else {
            result = await addClient(clientData);
        }
        if (result.success) {
            setShowSuccess(true);
            setTimeout(() => onFinish(), 2000);
        } else {
            setError(result.reason || 'Ocurrió un error inesperado.');
        }
    };

    const StatusPill: React.FC<{ status: SatStatus, interactive?: boolean, onClick?: (status: SatStatus) => void, current?: SatStatus, disabled?: boolean }> = ({ status, interactive, onClick, current, disabled }) => {
        const baseClasses = "px-3 py-1 text-xs font-bold rounded-full transition-all duration-200";
        const statusColors: Record<SatStatus, string> = {
            [SatStatus.AL_CORRIENTE]: 'bg-emerald-100 text-emerald-800',
            [SatStatus.CON_ADEUDOS]: 'bg-red-100 text-red-800',
            [SatStatus.EN_REVISION]: 'bg-yellow-100 text-yellow-800',
            [SatStatus.PENDIENTE]: 'bg-slate-200 text-slate-800',
        };
        
        if (interactive && onClick) {
            const isSelected = status === current;
            return (
                <button
                    type="button"
                    onClick={() => onClick(status)}
                    disabled={disabled}
                    className={`${baseClasses} ${statusColors[status]} ${isSelected ? 'ring-2 ring-offset-1 ring-emerald-500' : 'opacity-60 hover:opacity-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {status}
                </button>
            );
        }
        
        return <span className={`${baseClasses} ${statusColors[status]}`}>{status}</span>;
    };
    
    const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void, icon: React.ReactNode }> = ({ label, isActive, onClick, icon }) => (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
                isActive
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-20">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Detalles del Cliente' : 'Registrar Nuevo Cliente'}</h2>
                    <button onClick={onFinish} className="text-slate-500 hover:text-slate-800"><XMarkIcon /></button>
                </div>
                {showSuccess ? (
                     <div className="text-center p-8 flex-grow flex flex-col justify-center">
                        <svg className="w-16 h-16 text-emerald-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <h3 className="text-2xl font-bold text-slate-800">¡Éxito!</h3>
                        <p className="text-slate-600 mt-2">Los datos del cliente se han {isEditing ? 'actualizado' : 'registrado'} correctamente.</p>
                    </div>
                ) : (
                    <>
                        {isEditing && (
                            <div className="border-b border-slate-200 mb-6 flex-shrink-0">
                                <nav className="-mb-px flex space-x-4">
                                    <TabButton label="Datos Generales" isActive={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={<UserCircleIcon className="w-5 h-5"/>} />
                                    <TabButton label="Documentos" isActive={activeTab === 'documents'} onClick={() => setActiveTab('documents')} icon={<DocumentDuplicateIcon className="w-5 h-5"/>} />
                                    <TabButton label="Tareas" isActive={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<ClipboardDocumentListIcon className="w-5 h-5"/>} />
                                </nav>
                            </div>
                        )}
                        <div className="overflow-y-auto pr-4 flex-grow">
                            {(!isEditing || activeTab === 'details') && (
                                <form onSubmit={handleSubmit} id="client-details-form" className="space-y-6">
                                    <div className="p-4 border rounded-lg">
                                        <h4 className="font-semibold text-slate-700 mb-3">Datos de la Empresa</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input name="companyName" value={clientData.companyName} onChange={handleChange} placeholder="Nombre Comercial" required className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                            <input name="legalName" value={clientData.legalName} onChange={handleChange} placeholder="Razón Social" required className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                            <input name="rfc" value={clientData.rfc} onChange={handleChange} placeholder="RFC" required className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                            <input name="location" value={clientData.location} onChange={handleChange} placeholder="Ubicación (Ciudad, Estado)" required className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                            <input name="email" type="email" value={clientData.email} onChange={handleChange} placeholder="Correo Electrónico" required className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                            <input name="phone" value={clientData.phone} onChange={handleChange} placeholder="Teléfono" required className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                            {!isEditing && <input name="password" type="password" value={clientData.password || ''} onChange={handleChange} placeholder="Contraseña para portal" required className="p-2 border rounded" />}
                                        </div>
                                    </div>
                                    <div className="p-4 border rounded-lg">
                                        <h4 className="font-semibold text-slate-700 mb-3">Datos del Administrador/Contacto</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input name="firstName" value={clientData.admin.firstName} onChange={e => handleChange(e, 'admin')} placeholder="Nombres" required className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                            <input name="paternalLastName" value={clientData.admin.paternalLastName} onChange={e => handleChange(e, 'admin')} placeholder="Apellido Paterno" required className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                            <input name="maternalLastName" value={clientData.admin.maternalLastName} onChange={e => handleChange(e, 'admin')} placeholder="Apellido Materno" required className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                            <input name="phone" value={clientData.admin.phone} onChange={e => handleChange(e, 'admin')} placeholder="Teléfono del contacto" required className="p-2 border rounded" disabled={isEditing && !canEdit} />
                                        </div>
                                    </div>
                                    {isEditing && (
                                        <div className="p-4 border rounded-lg">
                                            <h4 className="font-semibold text-slate-700 mb-3">Estado de Obligaciones (SAT)</h4>
                                            <div className="flex items-center space-x-2">
                                                {Object.values(SatStatus).map(status => (
                                                    <StatusPill key={status} status={status} interactive onClick={handleSatStatusChange} current={clientData.satStatus} disabled={!canEdit || isUpdatingStatus} />
                                                ))}
                                            </div>
                                            {statusUpdateMsg && <p className="text-sm text-emerald-600 mt-2">{statusUpdateMsg}</p>}
                                        </div>
                                    )}
                                    {error && <p className="text-red-500 text-sm">{error}</p>}
                                </form>
                            )}
                            {isEditing && activeTab === 'documents' && <DocumentManager client={clientToEdit} />}
                            {isEditing && activeTab === 'tasks' && <TaskManager client={clientToEdit} />}
                        </div>
                        <div className="flex justify-end pt-6 mt-auto flex-shrink-0 border-t">
                            {(!isEditing || activeTab === 'details') && (currentUser?.role === UserRole.LEVEL_3 || !isEditing) && (
                              <button type="submit" form="client-details-form" className="bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-emerald-700 transition duration-300">
                                  {isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}
                              </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// --- New Components for Documents and Tasks ---

const DocumentManager: React.FC<{ client: Client }> = ({ client }) => {
    const { documents, uploadDocument, deleteDocument, currentUser } = useAppContext();
    const [file, setFile] = useState<File | null>(null);
    const [folder, setFolder] = useState<DocumentFolder>(DocumentFolder.GENERAL);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    const clientDocuments = documents.filter(d => d.clientId === client.id);

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setError('');
        const result = await uploadDocument(client.id, file, folder, 'admin');
        if (result.success) {
            setFile(null);
            // Consider clearing the file input visually
        } else {
            setError(result.reason || 'Error al subir.');
        }
        setIsUploading(false);
    };

    const handleDelete = async (doc: Document) => {
        if (window.confirm(`¿Está seguro que desea eliminar "${doc.fileName}"?`)) {
            await deleteDocument(doc);
        }
    };

    const handleDownload = async (doc: Document) => {
        const { data, error } = await supabase.storage.from('client-files').download(doc.filePath);
        if (error) {
            console.error("Error downloading file:", error);
            return;
        }
        const blob = new Blob([data]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-slate-800 mb-4">Expediente Digital</h3>
            {currentUser?.role === UserRole.LEVEL_3 && (
                <div className="bg-slate-50 p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2 text-slate-700">Subir Nuevo Documento</h4>
                    <div className="flex items-center space-x-4">
                        <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="flex-grow block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"/>
                        <select value={folder} onChange={(e) => setFolder(e.target.value as DocumentFolder)} className="p-2 border rounded-md">
                            {Object.values(DocumentFolder).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <button onClick={handleUpload} disabled={!file || isUploading} className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:bg-slate-400">
                            {isUploading ? 'Subiendo...' : 'Subir'}
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
            )}

            <div className="mt-6">
                <h4 className="font-semibold mb-2 text-slate-700">Documentos Existentes</h4>
                <ul className="space-y-2">
                    {clientDocuments.map(doc => (
                        <li key={doc.id} className="p-3 bg-white rounded-md border flex justify-between items-center">
                            <div>
                                <p className="font-medium text-slate-800">{doc.fileName}</p>
                                <p className="text-xs text-slate-500">Subido por: {doc.uploadedBy} el {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleDownload(doc)} className="text-emerald-600 hover:text-emerald-800 text-sm font-semibold">Descargar</button>
                                {currentUser?.role === UserRole.LEVEL_3 && (
                                    <button onClick={() => handleDelete(doc)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Borrar</button>
                                )}
                            </div>
                        </li>
                    ))}
                     {clientDocuments.length === 0 && <p className="text-slate-500 text-sm p-4 text-center">No hay documentos.</p>}
                </ul>
            </div>
        </div>
    );
};

const TaskManager: React.FC<{ client: Client }> = ({ client }) => {
    const { tasks, addTask, updateTask, deleteTask, currentUser } = useAppContext();
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');

    const clientTasks = tasks.filter(t => t.clientId === client.id);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        await addTask({ clientId: client.id, title, dueDate: dueDate || undefined });
        setTitle('');
        setDueDate('');
    };

    const handleStatusChange = async (taskId: string, status: TaskStatus) => {
        await updateTask(taskId, { status });
    };

    const handleDelete = async (taskId: string) => {
        if (window.confirm('¿Está seguro que desea eliminar esta tarea?')) {
            await deleteTask(taskId);
        }
    };
    
    return (
        <div>
            <h3 className="text-xl font-bold text-slate-800 mb-4">Gestión de Tareas</h3>
            {currentUser?.role === UserRole.LEVEL_3 && (
                <form onSubmit={handleAddTask} className="bg-slate-50 p-4 rounded-lg border mb-6 space-y-3">
                    <h4 className="font-semibold text-slate-700">Crear Nueva Tarea</h4>
                    <div className="flex items-center space-x-4">
                        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la tarea" className="flex-grow p-2 border rounded" required />
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="p-2 border rounded" />
                        <button type="submit" className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700">Crear</button>
                    </div>
                </form>
            )}
             <div className="mt-6">
                <h4 className="font-semibold mb-2 text-slate-700">Tareas Activas</h4>
                <ul className="space-y-2">
                    {clientTasks.map(task => (
                        <li key={task.id} className="p-3 bg-white rounded-md border flex justify-between items-center">
                            <div>
                                <p className="font-medium text-slate-800">{task.title}</p>
                                <p className="text-xs text-slate-500">Vence: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</p>
                            </div>
                             <div className="flex items-center space-x-3">
                               <select value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)} className="text-sm p-1 border rounded-md bg-slate-100" disabled={currentUser?.role !== UserRole.LEVEL_3}>
                                   {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                               </select>
                               {currentUser?.role === UserRole.LEVEL_3 && (
                                    <button onClick={() => handleDelete(task.id)} className="text-red-500 hover:text-red-700">
                                        <XMarkIcon className="w-5 h-5"/>
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                     {clientTasks.length === 0 && <p className="text-slate-500 text-sm p-4 text-center">No hay tareas asignadas.</p>}
                </ul>
            </div>
        </div>
    );
};


const ClientList: React.FC<{ onSelectClient: (client: Client) => void }> = ({ onSelectClient }) => {
    const { clients, loading, currentUser, deleteClient } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredClients = useMemo(() => {
        return clients.filter(client =>
            client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.rfc.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [clients, searchTerm]);

    const handleDelete = async (clientId: string, companyName: string) => {
        if (window.confirm(`¿Está seguro que desea eliminar al cliente "${companyName}"? Esta acción no se puede deshacer y eliminará todos sus datos.`)) {
            const result = await deleteClient(clientId);
            if (!result.success) {
                alert(result.reason || "Ocurrió un error al eliminar el cliente.");
            }
        }
    };

    if (loading) return <div className="text-center p-8">Cargando clientes...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar cliente por nombre o RFC..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b">
                            <th className="p-3 font-semibold text-slate-600">Empresa</th>
                            {currentUser?.role !== UserRole.LEVEL_1 && <th className="p-3 font-semibold text-slate-600">RFC</th>}
                            <th className="p-3 font-semibold text-slate-600">Estado SAT</th>
                            {currentUser?.role !== UserRole.LEVEL_1 && <th className="p-3 font-semibold text-slate-600">Estado</th>}
                            {currentUser?.role !== UserRole.LEVEL_1 && <th className="p-3 font-semibold text-slate-600">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClients.map(client => (
                            <tr key={client.id} className="border-b hover:bg-slate-50">
                                <td className="p-3 font-medium text-slate-800">{client.companyName}</td>
                                {currentUser?.role !== UserRole.LEVEL_1 && <td className="p-3 text-slate-600">{client.rfc}</td>}
                                <td className="p-3 text-slate-600">{client.satStatus}</td>
                                {currentUser?.role !== UserRole.LEVEL_1 && <td className="p-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${client.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{client.isActive ? 'Activo' : 'Inactivo'}</span></td>}
                                {currentUser?.role !== UserRole.LEVEL_1 && (
                                    <td className="p-3">
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => onSelectClient(client)} className="text-emerald-600 hover:underline font-semibold">Ver Detalles</button>
                                            {currentUser?.role === UserRole.LEVEL_3 && (
                                                <button onClick={() => handleDelete(client.id, client.companyName)} className="text-red-600 hover:underline font-semibold">Eliminar</button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredClients.length === 0 && <p className="text-center text-slate-500 py-8">No se encontraron clientes.</p>}
            </div>
        </div>
    );
};

const MessagesInbox: React.FC = () => {
    const { messages, clients, sendMessage } = useAppContext();
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    const messagesByClient = useMemo(() => {
        return messages.reduce((acc, msg) => {
            (acc[msg.clientId] = acc[msg.clientId] || []).push(msg);
            return acc;
        }, {} as Record<string, Message[]>);
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedClientId && newMessage.trim()) {
            await sendMessage(selectedClientId, newMessage);
            setNewMessage('');
        }
    };

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, selectedClientId]);

    const selectedClient = clients.find(c => c.id === selectedClientId);
    const selectedMessages = selectedClientId ? messagesByClient[selectedClientId] || [] : [];

    return (
        <div className="bg-white rounded-lg shadow-lg flex h-[75vh]">
            <div className="w-full md:w-1/3 border-r border-slate-200 flex flex-col">
                <h3 className="text-lg font-bold p-4 border-b border-slate-200">Conversaciones</h3>
                <ul className="overflow-y-auto flex-grow">
                    {clients.map(client => (
                        <li key={client.id} onClick={() => setSelectedClientId(client.id)}
                            className={`p-3 cursor-pointer border-l-4 ${selectedClientId === client.id ? 'bg-emerald-50 border-emerald-500' : 'border-transparent hover:bg-slate-50'}`}>
                            {client.companyName}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="w-full md:w-2/3 flex flex-col">
                {selectedClient ? (
                    <>
                        <h3 className="text-lg font-bold p-4 border-b border-slate-200">{selectedClient.companyName}</h3>
                        <div className="flex-grow overflow-y-auto mb-4 p-4 space-y-4 bg-slate-50">
                            {selectedMessages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-lg max-w-sm shadow-sm ${msg.sender === 'admin' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-800'}`}>
                                        <p>{msg.content}</p>
                                        <p className="text-xs opacity-75 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))}
                             <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleSendMessage} className="flex space-x-2 p-4 border-t border-slate-200">
                            <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Escribe un mensaje..." />
                            <button type="submit" className="bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 flex-shrink-0"><PaperAirplaneIcon className="w-5 h-5"/></button>
                        </form>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                        <p>Selecciona una conversación para ver los mensajes.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const UserManagement: React.FC = () => {
    const { adminUsers, addAdminUser, toggleAdminStatus, currentUser, updateAdminUser, deleteAdminUser } = useAppContext();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.LEVEL_1);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!email.trim() || !password.trim()) {
            setError('Correo y contraseña son requeridos.');
            return;
        }
        const result = await addAdminUser(email, role, password);
        if (result.success) {
            setSuccess('Usuario administrador añadido con éxito.');
            setEmail('');
            setPassword('');
            setRole(UserRole.LEVEL_1);
        } else {
            setError(result.reason || 'No se pudo añadir el usuario.');
        }
    };

    const handleRoleChange = async (email: string, newRole: UserRole) => {
        await updateAdminUser(email, newRole);
    };

    const handleDelete = async (email: string) => {
        if (window.confirm(`¿Está seguro que desea eliminar al administrador "${email}"? Perderá acceso al sistema.`)) {
            const result = await deleteAdminUser(email);
            if (!result.success) {
                alert(result.reason || "Ocurrió un error al eliminar al administrador.");
            }
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-6 border-b pb-3">Gestionar Administradores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-50 p-6 rounded-lg">
                    <h4 className="font-semibold mb-4 text-slate-700">Añadir Nuevo Administrador</h4>
                    <form onSubmit={handleAddUser} className="space-y-4">
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" className="w-full p-2 border rounded" required />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" className="w-full p-2 border rounded" required />
                        <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full p-2 border rounded">
                            <option value={UserRole.LEVEL_1}>Nivel 1 (Ver)</option>
                            <option value={UserRole.LEVEL_2}>Nivel 2 (Ver/Editar)</option>
                            <option value={UserRole.LEVEL_3}>Nivel 3 (Total)</option>
                        </select>
                        <button type="submit" className="w-full bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 font-bold">Añadir Usuario</button>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        {success && <p className="text-green-500 text-sm">{success}</p>}
                    </form>
                </div>
                <div>
                    <h4 className="font-semibold mb-4 text-slate-700">Administradores Actuales</h4>
                    <ul className="space-y-2 max-h-96 overflow-y-auto">
                        {Object.keys(adminUsers).map((email) => {
                            const user = adminUsers[email];
                            const canEdit = currentUser?.role === UserRole.LEVEL_3 && currentUser.email !== email;
                            return (
                                <li key={email} className="p-3 bg-white border rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-slate-800">{email}</p>
                                        {canEdit ? (
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(email, e.target.value as UserRole)}
                                                className="text-sm text-slate-500 mt-1 p-1 border rounded bg-slate-50"
                                            >
                                                <option value={UserRole.LEVEL_1}>Nivel 1 (Ver)</option>
                                                <option value={UserRole.LEVEL_2}>Nivel 2 (Ver/Editar)</option>
                                                <option value={UserRole.LEVEL_3}>Nivel 3 (Total)</option>
                                            </select>
                                        ) : (
                                            <p className="text-sm text-slate-500">Rol: {user.role.replace('_', ' ')}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => toggleAdminStatus(email)}
                                            disabled={!canEdit}
                                            className={`px-3 py-1 text-xs font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed ${user.isActive ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                            {user.isActive ? 'Activo' : 'Inactivo'}
                                        </button>
                                        {canEdit && (
                                            <button onClick={() => handleDelete(email)} className="p-1 text-red-500 hover:text-red-700" title="Eliminar administrador">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
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
        setView(newView);
    };

    const NavButton: React.FC<{label: string; isActive: boolean; onClick: () => void; icon: React.ReactNode;}> = ({ label, isActive, onClick, icon }) => (
        <button onClick={onClick} className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${isActive ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>
            {icon}
            <span>{label}</span>
        </button>
    );

    const renderMainContent = () => {
        switch (view) {
            case 'messages':
                return <MessagesInbox />;
            case 'management':
                return currentUser?.role === UserRole.LEVEL_3 ? <UserManagement /> : <ClientList onSelectClient={handleSelectClient} />;
            case 'list':
            case 'form':
            default:
                 return <ClientList onSelectClient={handleSelectClient} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100">
            <Header />
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                    <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm">
                        <NavButton label="Clientes" isActive={view === 'list' || view === 'form'} onClick={() => handleViewChange('list')} icon={<UsersIcon className="w-5 h-5" />} />
                        {currentUser?.role === UserRole.LEVEL_3 && (
                            <NavButton label="Mensajes" isActive={view === 'messages'} onClick={() => handleViewChange('messages')} icon={<InboxIcon className="w-5 h-5" />} />
                        )}
                        {currentUser?.role === UserRole.LEVEL_3 && (
                            <NavButton label="Usuarios" isActive={view === 'management'} onClick={() => handleViewChange('management')} icon={<UserCircleIcon className="w-5 h-5" />} />
                        )}
                    </div>
                    {(currentUser?.role === UserRole.LEVEL_3 || currentUser?.role === UserRole.LEVEL_2) && (
                         <button onClick={handleAddNew} className="w-full sm:w-auto flex items-center justify-center bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition duration-300 shadow">
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Registrar Cliente
                        </button>
                    )}
                </div>
                {renderMainContent()}
            </main>
            {view === 'form' && <ClientForm clientToEdit={selectedClient} onFinish={handleFormFinish} />}
        </div>
    );
}