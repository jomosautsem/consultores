import React, { useState, useCallback, useContext, createContext } from 'react';
import type { User, Client, Message } from './types';
import { UserRole, SatStatus } from './types';
import { ADMIN_USERS, MOCK_CLIENTS, MOCK_MESSAGES } from './constants';
import LoginScreen from './components/LoginScreen';
import DashboardScreen from './components/DashboardScreen';
import ClientDashboardScreen from './components/ClientDashboardScreen';

type AdminUsersState = Record<string, { role: UserRole, isActive: boolean, password?: string }>;

interface AppContextType {
  currentUser: User | null;
  currentClient: Client | null;
  clients: Client[];
  adminUsers: AdminUsersState;
  messages: Message[];
  login: (email: string, pass: string) => { success: boolean, reason?: string };
  clientLogin: (email: string, pass: string) => { success: boolean, reason?: string };
  logout: () => void;
  addClient: (client: Omit<Client, 'id' | 'satStatus' | 'isActive'>) => void;
  updateClient: (client: Client) => void;
  sendMessage: (clientId: string, content: string) => void;
  toggleAdminStatus: (email: string) => void;
  toggleClientStatus: (clientId: string) => void;
  addAdminUser: (email: string, role: UserRole, password: string) => { success: boolean; reason?: string };
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [adminUsers, setAdminUsers] = useState<AdminUsersState>(ADMIN_USERS);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);

  const login = useCallback((email: string, pass: string): { success: boolean, reason?: string } => {
    const trimmedEmail = email.trim().toLowerCase();
    const userDetails = adminUsers[trimmedEmail];
    
    if (userDetails && userDetails.password === pass) {
      if (!userDetails.isActive) {
        return { success: false, reason: 'Su cuenta ha sido desactivada.' };
      }
      setCurrentUser({ email: trimmedEmail, role: userDetails.role, isActive: userDetails.isActive });
      setCurrentClient(null);
      return { success: true };
    }
    return { success: false, reason: 'Correo electrónico o contraseña inválidos.' };
  }, [adminUsers]);

  const clientLogin = useCallback((email: string, pass: string): { success: boolean, reason?: string } => {
    const trimmedEmail = email.trim().toLowerCase();
    const client = clients.find(c => c.email.toLowerCase() === trimmedEmail && c.password === pass);
    if (client) {
      if (!client.isActive) {
          return { success: false, reason: 'Su cuenta ha sido desactivada.' };
      }
      setCurrentClient(client);
      setCurrentUser(null);
      return { success: true };
    }
    return { success: false, reason: 'Correo electrónico o contraseña inválidos.' };
  }, [clients]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setCurrentClient(null);
  }, []);

  const addClient = useCallback((clientData: Omit<Client, 'id' | 'satStatus' | 'isActive'>) => {
    const newClient: Client = {
      ...clientData,
      id: `cl-${Date.now()}`,
      satStatus: SatStatus.PENDIENTE,
      isActive: true,
    };
    setClients(prevClients => [newClient, ...prevClients]);
    
    console.log(`
      --- SIMULATING EMAIL ---
      To: ${newClient.email}
      Subject: ¡Bienvenido a Grupo Kali Consultores!

      Hola ${newClient.admin.firstName},

      Le confirmamos el alta de su empresa "${newClient.companyName}" con nosotros.
      
      Puede acceder a su portal de cliente en nuestro sitio web con las siguientes credenciales:
      Usuario: ${newClient.email}
      Contraseña: ${newClient.password}

      Atentamente,
      Grupo Kali Consultores
      -----------------------
    `);
  }, []);

  const updateClient = useCallback((updatedClient: Client) => {
    setClients(prevClients => prevClients.map(c => c.id === updatedClient.id ? updatedClient : c));
  }, []);

  const sendMessage = useCallback((clientId: string, content: string) => {
    const newMessage: Message = {
        id: `msg-${Date.now()}`,
        clientId,
        content,
        sender: 'client',
        timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
    
    setTimeout(() => {
        const adminReply: Message = {
            id: `msg-${Date.now() + 1}`,
            clientId,
            content: "Recibido. Nuestro equipo revisará su mensaje y le contactará a la brevedad.",
            sender: 'admin',
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, adminReply]);
    }, 2000);
  }, []);

  const toggleAdminStatus = useCallback((email: string) => {
    setAdminUsers(prevAdmins => {
        const newAdmins = { ...prevAdmins };
        if (newAdmins[email]) {
            newAdmins[email] = { ...newAdmins[email], isActive: !newAdmins[email].isActive };
        }
        return newAdmins;
    });
  }, []);

  const toggleClientStatus = useCallback((clientId: string) => {
    setClients(prevClients => 
        prevClients.map(c => c.id === clientId ? { ...c, isActive: !c.isActive } : c)
    );
  }, []);

  const addAdminUser = useCallback((email: string, role: UserRole, password: string): { success: boolean; reason?: string } => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
        return { success: false, reason: 'El correo no puede estar vacío.' };
    }
     if (!password) {
        return { success: false, reason: 'La contraseña no puede estar vacía.' };
    }
    if (adminUsers[trimmedEmail] || clients.some(c => c.email.toLowerCase() === trimmedEmail)) {
        return { success: false, reason: 'Este correo electrónico ya está en uso.' };
    }

    setAdminUsers(prev => ({
        ...prev,
        [trimmedEmail]: {
            role,
            isActive: true,
            password,
        }
    }));

    return { success: true };
  }, [adminUsers, clients]);

  const contextValue = {
    currentUser,
    currentClient,
    clients,
    adminUsers,
    messages,
    login,
    clientLogin,
    logout,
    addClient,
    updateClient,
    sendMessage,
    toggleAdminStatus,
    toggleClientStatus,
    addAdminUser,
  };
  
  const renderContent = () => {
    if (currentUser) return <DashboardScreen />;
    if (currentClient) return <ClientDashboardScreen />;
    return <LoginScreen />;
  }

  return (
    <AppContext.Provider value={contextValue}>
      {renderContent()}
    </AppContext.Provider>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-slate-100 text-slate-800">
        {/* The provider will handle which component to show */}
      </div>
    </AppProvider>
  );
}