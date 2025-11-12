

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../App';
import { UserRole, Client, SatStatus, Message, Task, Document, TaskStatus, DocumentFolder } from '../types';
import { LogoutIcon, UserCircleIcon, BuildingOfficeIcon, PlusIcon, XMarkIcon, InboxIcon, UsersIcon, ClipboardDocumentListIcon, DocumentDuplicateIcon } from './ui/Icons';
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
    
    // Omitted file change handlers for brevity as they are now managed in DocumentManager
    
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
        // Validation logic remains, but file validation would now check for File objects if implemented.
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
        // ... (existing implementation)
        return <button/>;
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
                        {/* ... Success Message ... */}
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
                                <form onSubmit={handleSubmit} id="client-details-form">
                                  {/* --- All the input fields from the original form go here --- */}
                                  {/* This includes Datos de la Empresa, SAT Status, Documentos Fiscales, Datos del Administrador */}
                                </form>
                            )}
                            {isEditing && activeTab === 'documents' && <DocumentManager client={clientToEdit} />}
                            {isEditing && activeTab === 'tasks' && <TaskManager client={clientToEdit} />}
                        </div>
                        <div className="flex justify-end pt-6 mt-auto flex-shrink-0 border-t">
                            {(currentUser?.role === UserRole.LEVEL_3 || !isEditing) && (
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
             <form onSubmit={handleAddTask} className="bg-slate-50 p-4 rounded-lg border mb-6 space-y-3">
                <h4 className="font-semibold text-slate-700">Crear Nueva Tarea</h4>
                <div className="flex items-center space-x-4">
                   <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la tarea" className="flex-grow p-2 border rounded" required />
                   <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="p-2 border rounded" />
                   <button type="submit" className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700">Crear</button>
                </div>
            </form>
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
                               <select value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)} className="text-sm p-1 border rounded-md bg-slate-100">
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
                </ul>
            </div>
        </div>
    );
};


const ClientList: React.FC<{ onSelectClient: (client: Client) => void }> = ({ onSelectClient }) => {
    // ... (existing implementation)
    return <div/>;
};

const MessagesInbox: React.FC = () => {
    // ... (existing implementation)
    return <div/>;
};

const UserManagement: React.FC = () => {
    // ... (existing implementation)
    return <div/>;
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

    const renderMainContent = () => {
        switch (view) {
            case 'form':
                return <ClientForm clientToEdit={selectedClient} onFinish={handleFormFinish} />;
            // other cases remain the same
            default:
                 return <ClientList onSelectClient={handleSelectClient} />;
        }
    };
    
    // ... (rest of the component, JSX for header and buttons remains largely the same)
    return <div/>
}
