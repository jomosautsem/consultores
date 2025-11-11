import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../App';
import { Client, SatStatus } from '../types';
import { LogoutIcon, BuildingOfficeIcon, UserCircleIcon, PaperAirplaneIcon } from './ui/Icons';

const ClientHeader: React.FC<{ client: Client }> = ({ client }) => {
    const { logout } = useAppContext();

    return (
        <header className="bg-white shadow-md sticky top-0 z-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-3">
                        <div className="bg-emerald-600 p-2 rounded-md text-white">
                            <BuildingOfficeIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">{client.companyName}</h1>
                            <p className="text-sm text-slate-500">Portal del Cliente</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-slate-600 hidden sm:block">{client.email}</span>
                        <button onClick={logout} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition">
                           <LogoutIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

const SatStatusCard: React.FC<{ status: SatStatus }> = ({ status }) => {
    const statusInfo = useMemo(() => {
        switch (status) {
            case SatStatus.AL_CORRIENTE:
                return { text: 'Al corriente', color: 'bg-green-100 text-green-800', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' };
            case SatStatus.CON_ADEUDOS:
                return { text: 'Con adeudos', color: 'bg-red-100 text-red-800', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };
            case SatStatus.EN_REVISION:
                return { text: 'En revisión', color: 'bg-yellow-100 text-yellow-800', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' };
            default:
                return { text: 'Pendiente', color: 'bg-slate-100 text-slate-800', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4c0-1.191.526-2.262 1.342-3.024M12 3v2m0 14v2m-9-9h2m14 0h2' };
        }
    }, [status]);

    return (
        <div className={`p-6 rounded-lg shadow-md flex items-center ${statusInfo.color}`}>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={statusInfo.icon} /></svg>
            <div>
                <p className="font-semibold text-sm">Estado actual con el SAT</p>
                <p className="font-bold text-2xl">{statusInfo.text}</p>
            </div>
        </div>
    );
};

const MessagingWidget: React.FC<{ client: Client }> = ({ client }) => {
    const { messages, sendMessage } = useAppContext();
    const [newMessage, setNewMessage] = useState('');
    const clientMessages = messages.filter(m => m.clientId === client.id);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [clientMessages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if(newMessage.trim()){
            sendMessage(client.id, newMessage.trim());
            setNewMessage('');
        }
    }

    return (
         <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col h-full">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Mensajes Privados</h3>
            <p className="text-sm text-slate-500 mb-4">Comuníquese directamente con el administrador asignado.</p>
            <div className="flex-grow bg-slate-50 rounded-md p-4 overflow-y-auto mb-4 h-64">
                <div className="space-y-4">
                    {clientMessages.map(msg => (
                         <div key={msg.id} className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${msg.sender === 'client' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-800'}`}>
                                <p className="text-sm">{msg.content}</p>
                                <p className={`text-xs mt-1 ${msg.sender === 'client' ? 'text-emerald-200' : 'text-slate-500'} text-right`}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escriba su mensaje..." 
                    className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button type="submit" className="p-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition">
                    <PaperAirplaneIcon className="w-5 h-5"/>
                </button>
            </form>
        </div>
    )
}

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


export default function ClientDashboardScreen() {
    const { currentClient } = useAppContext();
    
    if (!currentClient) {
        return <div>Cargando...</div>;
    }

    const companyData = {
        "Razón Social": currentClient.legalName,
        "Ubicación": currentClient.location,
        "Correo Electrónico": currentClient.email,
        "Teléfono": currentClient.phone,
    };

    const adminData = {
        "Nombre": `${currentClient.admin.firstName} ${currentClient.admin.paternalLastName} ${currentClient.admin.maternalLastName}`,
        "Teléfono": currentClient.admin.phone,
    };

    const fiscalData = {
        "RFC": currentClient.rfc,
        "Firma Electrónica": currentClient.eFirma,
        "Constancia de Situación Fiscal": currentClient.csf
    };


    return (
        <div className="min-h-screen bg-slate-100">
            <ClientHeader client={currentClient} />
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <SatStatusCard status={currentClient.satStatus} />
                        <InfoCard title="Datos de la Empresa" data={companyData} />
                        <InfoCard title="Datos del Administrador" data={adminData} />
                        <InfoCard title="Documentos Fiscales" data={fiscalData} />
                    </div>
                    <div className="lg:col-span-1">
                        <MessagingWidget client={currentClient} />
                    </div>
                </div>
            </main>
        </div>
    );
}