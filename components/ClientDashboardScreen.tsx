import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../App';
import { Client, SatStatus, Document, Task, DocumentFolder, TaskStatus } from '../types';
import { LogoutIcon, BuildingOfficeIcon, UserCircleIcon, PaperAirplaneIcon, DocumentDuplicateIcon, ClipboardDocumentListIcon } from './ui/Icons';
import { supabase } from '../supabaseClient';


const ClientHeader: React.FC<{ client: Client }> = ({ client }) => {
    // ... (existing implementation)
    return <header />;
};

const SatStatusCard: React.FC<{ status: SatStatus }> = ({ status }) => {
    // ... (existing implementation)
    return <div />;
};

const MessagingWidget: React.FC<{ client: Client }> = ({ client }) => {
    // ... (existing implementation)
    return <div />;
};

const InfoCard: React.FC<{ title: string, data: Record<string, string | undefined>}> = ({ title, data }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">{title}</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(data).map(([key, value]) => (
                <React.Fragment key={key}>
                    <dt className="text-sm font-medium text-slate-500">{key}</dt>
                    <dd className="text-sm text-slate-800 sm:col-span-1">{value || '-'}</dd>
                </React.Fragment>
            ))}
        </dl>
    </div>
);

// --- New Components for Client Portal ---

const ClientDocumentManager: React.FC<{ client: Client }> = ({ client }) => {
    const { documents, uploadDocument, deleteDocument } = useAppContext();
    const [file, setFile] = useState<File | null>(null);
    const [folder, setFolder] = useState<DocumentFolder>(DocumentFolder.GENERAL);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    const clientDocuments = documents.filter(d => d.clientId === client.id);

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setError('');
        const result = await uploadDocument(client.id, file, folder, 'client');
        if (result.success) {
            setFile(null);
        } else {
            setError(result.reason || 'Error al subir.');
        }
        setIsUploading(false);
    };

    const handleDelete = async (doc: Document) => {
        if (doc.uploadedBy !== 'client') {
            alert("No puede eliminar un archivo subido por un administrador.");
            return;
        }
        if (window.confirm(`¿Está seguro que desea eliminar "${doc.fileName}"?`)) {
            await deleteDocument(doc);
        }
    };

    const handleDownload = async (doc: Document) => {
        const { data, error } = await supabase.storage.from('client-files').download(doc.filePath);
        if (error) {
            console.error("Error downloading file:", error);
            alert("No se pudo descargar el archivo.");
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
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><DocumentDuplicateIcon className="w-6 h-6 mr-3 text-emerald-600"/> Expediente Digital</h3>
            <div className="bg-slate-50 p-4 rounded-lg border mb-6">
                 <h4 className="font-semibold mb-2 text-slate-700">Subir Nuevo Documento</h4>
                <div className="flex items-center space-x-4">
                    <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="flex-grow block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"/>
                    <button onClick={handleUpload} disabled={!file || isUploading} className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:bg-slate-400">
                        {isUploading ? 'Subiendo...' : 'Subir'}
                    </button>
                </div>
            </div>
             <div className="space-y-2">
                {clientDocuments.length > 0 ? clientDocuments.map(doc => (
                    <div key={doc.id} className="p-3 bg-white rounded-md border flex justify-between items-center">
                        <div>
                            <p className="font-medium text-slate-800">{doc.fileName}</p>
                            <p className="text-xs text-slate-500">Subido por: {doc.uploadedBy} el {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                             <button onClick={() => handleDownload(doc)} className="text-emerald-600 hover:text-emerald-800 text-sm font-semibold">Descargar</button>
                             {doc.uploadedBy === 'client' && (
                                <button onClick={() => handleDelete(doc)} className="text-red-500 hover:text-red-700 text-sm font-semibold">Borrar</button>
                             )}
                        </div>
                    </div>
                )) : <p className="text-slate-500 text-center text-sm py-4">No hay documentos en su expediente.</p>}
            </div>
        </div>
    );
};

const ClientTaskManager: React.FC<{ client: Client }> = ({ client }) => {
    const { tasks } = useAppContext();
    const clientTasks = tasks.filter(t => t.clientId === client.id);

    const statusStyles: Record<TaskStatus, string> = {
        [TaskStatus.PENDIENTE]: 'bg-slate-200 text-slate-800',
        [TaskStatus.EN_PROCESO]: 'bg-blue-200 text-blue-800',
        [TaskStatus.COMPLETADA]: 'bg-green-200 text-green-800',
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><ClipboardDocumentListIcon className="w-6 h-6 mr-3 text-emerald-600"/> Tareas y Obligaciones</h3>
            <div className="space-y-3">
                 {clientTasks.length > 0 ? clientTasks.map(task => (
                    <div key={task.id} className="p-4 bg-slate-50 rounded-lg border">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-slate-800">{task.title}</p>
                                <p className="text-sm text-slate-500 mt-1">Vence: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric'}) : 'Sin fecha'}</p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusStyles[task.status]}`}>{task.status}</span>
                        </div>
                    </div>
                 )) : <p className="text-slate-500 text-center text-sm py-4">No tiene tareas asignadas actualmente.</p>}
            </div>
        </div>
    );
};


export default function ClientDashboardScreen() {
    const { currentClient } = useAppContext();
    
    if (!currentClient) {
        return <div>Cargando...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <ClientHeader client={currentClient} />
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <SatStatusCard status={currentClient.satStatus} />
                        <ClientTaskManager client={currentClient} />
                        <ClientDocumentManager client={currentClient} />
                    </div>
                    <div className="lg:col-span-1">
                        <MessagingWidget client={currentClient} />
                    </div>
                </div>
            </main>
        </div>
    );
}
