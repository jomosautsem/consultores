
import React, { useState, useCallback, useContext, createContext, useEffect } from 'react';
import type { User, Client, Message } from './types';
import { UserRole, SatStatus } from './types';
import LoginScreen from './components/LoginScreen';
import DashboardScreen from './components/DashboardScreen';
import ClientDashboardScreen from './components/ClientDashboardScreen';
import { supabase } from './supabaseClient';

// --- Data Mapping Helpers ---
// Transforms data from Supabase (snake_case) to frontend format (camelCase)
const clientFromSupabase = (dbClient: any): Client => ({
  id: dbClient.id,
  companyName: dbClient.company_name,
  legalName: dbClient.legal_name,
  location: dbClient.location,
  email: dbClient.email,
  phone: dbClient.phone,
  rfc: dbClient.rfc,
  eFirma: dbClient.e_firma_filename,
  csf: dbClient.csf_filename,
  password: dbClient.password,
  satStatus: dbClient.sat_status,
  isActive: dbClient.is_active,
  admin: {
    firstName: dbClient.contact_admin_first_name,
    paternalLastName: dbClient.contact_admin_paternal_last_name,
    maternalLastName: dbClient.contact_admin_maternal_last_name,
    phone: dbClient.contact_admin_phone,
    eFirma: dbClient.contact_admin_e_firma_filename,
    csf: dbClient.contact_admin_csf_filename,
  },
});

// Transforms data from frontend format to Supabase format for inserts/updates
const clientToSupabase = (client: Omit<Client, 'id' | 'satStatus' | 'isActive'> | Client) => ({
    company_name: client.companyName,
    legal_name: client.legalName,
    location: client.location,
    email: client.email,
    phone: client.phone,
    rfc: client.rfc,
    e_firma_filename: client.eFirma,
    csf_filename: client.csf,
    password: client.password,
    contact_admin_first_name: client.admin.firstName,
    contact_admin_paternal_last_name: client.admin.paternalLastName,
    contact_admin_maternal_last_name: client.admin.maternalLastName,
    contact_admin_phone: client.admin.phone,
    contact_admin_e_firma_filename: client.admin.eFirma,
    contact_admin_csf_filename: client.admin.csf,
    // Include status and active state if they exist on the object (for updates)
    ...('satStatus' in client && { sat_status: client.satStatus }),
    ...('isActive' in client && { is_active: client.isActive }),
});

const messageFromSupabase = (dbMessage: any): Message => ({
    id: dbMessage.id,
    clientId: dbMessage.client_id,
    sender: dbMessage.sender,
    content: dbMessage.content,
    timestamp: dbMessage.timestamp,
});

type AdminUsersState = Record<string, { role: UserRole, isActive: boolean }>;

interface AppContextType {
  currentUser: User | null;
  currentClient: Client | null;
  clients: Client[];
  adminUsers: AdminUsersState;
  messages: Message[];
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<{ success: boolean, reason?: string }>;
  clientLogin: (email: string, pass: string) => Promise<{ success: boolean, reason?: string }>;
  logout: () => void;
  addClient: (client: Omit<Client, 'id' | 'satStatus' | 'isActive'>) => Promise<{ success: boolean; reason?: string }>;
  updateClient: (client: Client) => Promise<{ success: boolean; reason?: string }>;
  sendMessage: (clientId: string, content: string) => Promise<void>;
  toggleAdminStatus: (email: string) => Promise<void>;
  toggleClientStatus: (clientId: string) => Promise<void>;
  addAdminUser: (email: string, role: UserRole, password: string) => Promise<{ success: boolean; reason?: string }>;
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
  const [clients, setClients] = useState<Client[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUsersState>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manages Supabase Auth state, which is the source of truth for admin logins
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session?.user) {
        // User is logged in via Supabase Auth. Fetch their role from our custom administrators table.
        const { data: adminDetails, error: profileError } = await supabase
          .from('administrators')
          .select('role, is_active')
          .eq('email', session.user.email)
          .single();

        if (profileError) {
           console.error("Error fetching admin profile:", profileError);
           setError("No se pudo cargar el perfil del administrador.");
           await supabase.auth.signOut();
           setCurrentUser(null);
        } else if (adminDetails) {
          if (!adminDetails.is_active) {
            // User is authenticated but their profile is disabled in our system.
            await supabase.auth.signOut();
            setCurrentUser(null);
            // We could set an error here to inform the user.
          } else {
            setCurrentUser({
              email: session.user.email!,
              role: adminDetails.role as UserRole,
              isActive: adminDetails.is_active,
            });
          }
        } else {
            // This is an inconsistent state: user exists in Supabase Auth but not in our administrators table.
            // For security, we log them out.
            await supabase.auth.signOut();
            setCurrentUser(null);
        }
      } else {
        // No session, so no admin user is logged in.
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // Fetch data for the dashboard once an admin is authenticated
  useEffect(() => {
      const fetchDataForAdmin = async () => {
          if (!currentUser) {
              setClients([]);
              setMessages([]);
              setAdminUsers({});
              return;
          };

          try {
              setLoading(true);
              const [clientsRes, adminsRes, messagesRes] = await Promise.all([
                  supabase.from('clients').select('*'),
                  supabase.from('administrators').select('email, role, is_active'),
                  supabase.from('messages').select('*').order('timestamp', { ascending: true })
              ]);

              if (clientsRes.error) throw clientsRes.error;
              if (adminsRes.error) throw adminsRes.error;
              if (messagesRes.error) throw messagesRes.error;

              setClients((clientsRes.data || []).map(clientFromSupabase));
              
              const adminsObject = (adminsRes.data || []).reduce((acc, admin) => {
                  acc[admin.email] = { role: admin.role, isActive: admin.is_active };
                  return acc;
              }, {} as AdminUsersState);
              setAdminUsers(adminsObject);

              setMessages((messagesRes.data || []).map(messageFromSupabase));
          } catch (err: any) {
              console.error("Error fetching admin data:", err);
              setError('No se pudo cargar la información del panel de control. Verifique las políticas de seguridad (RLS).');
          } finally {
              setLoading(false);
          }
      };

      fetchDataForAdmin();
  }, [currentUser]);

  const login = useCallback(async (email: string, pass: string): Promise<{ success: boolean, reason?: string }> => {
    // Uses Supabase's built-in, secure authentication.
    const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
    });
    
    if (error) {
        console.error("Supabase login error:", error.message);
        if (error.message.includes('Invalid login credentials')) {
            return { success: false, reason: 'Correo electrónico o contraseña inválidos.' };
        }
        return { success: false, reason: 'Ocurrió un error al iniciar sesión.' };
    }
    
    // onAuthStateChange will handle setting the user state.
    return { success: true };
  }, []);

  const clientLogin = useCallback(async (email: string, pass: string): Promise<{ success: boolean, reason?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    
    // Direct database query for client login.
    // NOTE: This requires the 'clients' table to have a public RLS policy for SELECT.
    const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('email', trimmedEmail)
        .single();
    
    if (error || !client) {
        console.error("Client login error:", error);
        return { success: false, reason: 'Correo electrónico o contraseña inválidos.' };
    }

    if (client.password === pass) {
        if (!client.is_active) {
            return { success: false, reason: 'Su cuenta ha sido desactivada.' };
        }
        setCurrentClient(clientFromSupabase(client));
        setCurrentUser(null);
        return { success: true };
    }
    
    return { success: false, reason: 'Correo electrónico o contraseña inválidos.' };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentClient(null);
  }, []);

  const addClient = useCallback(async (clientData: Omit<Client, 'id' | 'satStatus' | 'isActive'>): Promise<{ success: boolean; reason?: string }> => {
    const existingClients = await supabase.from('clients').select('email, rfc');
    if (existingClients.data?.some(c => c.email.toLowerCase() === clientData.email.trim().toLowerCase())) {
        return { success: false, reason: 'Este correo electrónico ya está en uso.' };
    }
    if (existingClients.data?.some(c => c.rfc.toUpperCase() === clientData.rfc.trim().toUpperCase())) {
        return { success: false, reason: 'Este RFC ya está registrado.' };
    }

    const supabaseClient = clientToSupabase(clientData);
    
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...supabaseClient, sat_status: SatStatus.PENDIENTE, is_active: true })
      .select()
      .single();

    if (error) {
        console.error("Error adding client:", error);
        const reason = error.message.includes('violates row-level security policy') 
            ? 'Error de permisos. Revise las políticas de seguridad (RLS) en su base de datos.'
            : 'Error en la base de datos.';
        return { success: false, reason };
    }
    
    setClients(prevClients => [clientFromSupabase(data), ...prevClients]);
    
    console.log(`
      --- SIMULATING EMAIL ---
      To: ${data.email}
      Subject: ¡Bienvenido a Grupo Kali Consultores!

      Hola ${data.contact_admin_first_name},
      Le confirmamos el alta de su empresa "${data.company_name}" con nosotros.
      Puede acceder a su portal de cliente con:
      Usuario: ${data.email} | Contraseña: ${data.password}

      Atentamente,
      Grupo Kali Consultores
      -----------------------
    `);
    return { success: true };
  }, []);

  const updateClient = useCallback(async (updatedClient: Client): Promise<{ success: boolean; reason?: string }> => {
    const supabaseClient = clientToSupabase(updatedClient);
    
    const { data, error } = await supabase
        .from('clients')
        .update(supabaseClient)
        .eq('id', updatedClient.id)
        .select()
        .single();
    
    if (error) {
        console.error("Error updating client:", error);
        const reason = error.message.includes('violates row-level security policy') 
            ? 'Error de permisos. Revise las políticas de seguridad (RLS) en su base de datos.'
            : 'Error en la base de datos.';
        return { success: false, reason };
    }
    setClients(prevClients => prevClients.map(c => c.id === updatedClient.id ? clientFromSupabase(data) : c));
    return { success: true };
  }, []);

  const sendMessage = useCallback(async (clientId: string, content: string) => {
    const newMessagePayload = {
        client_id: clientId,
        content,
        sender: 'client' as const
    };

    const { data, error } = await supabase
        .from('messages')
        .insert(newMessagePayload)
        .select()
        .single();
    
    if (error) {
        console.error("Error sending message:", error);
        return;
    }

    setMessages(prev => [...prev, messageFromSupabase(data)]);
    
    setTimeout(async () => {
        const adminReplyPayload = {
            client_id: clientId,
            content: "Recibido. Nuestro equipo revisará su mensaje y le contactará a la brevedad.",
            sender: 'admin' as const
        };
        const { data: replyData, error: replyError } = await supabase
            .from('messages')
            .insert(adminReplyPayload)
            .select()
            .single();

        if (replyError) {
            console.error("Error sending admin reply:", replyError);
            return;
        }
        setMessages(prev => [...prev, messageFromSupabase(replyData)]);
    }, 2000);
  }, []);

  const toggleAdminStatus = useCallback(async (email: string) => {
    if (email === 'admintres@gmail.com') {
        console.warn("Attempted to deactivate the super admin. Operation blocked.");
        return;
    }
    const user = adminUsers[email];
    if (!user) return;
    const newStatus = !user.isActive;

    const { error } = await supabase
        .from('administrators')
        .update({ is_active: newStatus })
        .eq('email', email);

    if (error) {
        console.error("Error toggling admin status:", error);
        return;
    }
    
    setAdminUsers(prevAdmins => {
        const newAdmins = { ...prevAdmins };
        if (newAdmins[email]) {
            newAdmins[email] = { ...newAdmins[email], isActive: newStatus };
        }
        return newAdmins;
    });
  }, [adminUsers]);

  const toggleClientStatus = useCallback(async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const newStatus = !client.isActive;

    const { error } = await supabase
        .from('clients')
        .update({ is_active: newStatus })
        .eq('id', clientId);
    
    if (error) {
        console.error("Error toggling client status:", error);
        return;
    }
    
    setClients(prevClients => 
        prevClients.map(c => c.id === clientId ? { ...c, isActive: newStatus } : c)
    );
  }, [clients]);

  const addAdminUser = useCallback(async (email: string, role: UserRole, password: string): Promise<{ success: boolean; reason?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
        return { success: false, reason: 'El correo es obligatorio.' };
    }
    if (adminUsers[trimmedEmail] || clients.some(c => c.email.toLowerCase() === trimmedEmail)) {
        return { success: false, reason: 'Este correo electrónico ya está en uso.' };
    }

    // IMPORTANT: Admin users must now be created in the Supabase Auth dashboard.
    // This function only creates their profile in the 'administrators' table.
    const { data, error } = await supabase
        .from('administrators')
        .insert({ email: trimmedEmail, role, is_active: true })
        .select('email, role, is_active')
        .single();
    
    if (error) {
        console.error("Error adding admin user:", error);
        const reason = error.message.includes('violates row-level security policy') 
            ? 'Error de permisos. Revise las políticas de seguridad (RLS) en su base de datos.'
            : 'Error en la base de datos.';
        return { success: false, reason };
    }

    setAdminUsers(prev => ({ ...prev, [data.email]: { role: data.role, isActive: data.is_active } }));

    return { success: true };
  }, [adminUsers, clients]);

  const contextValue = {
    currentUser,
    currentClient,
    clients,
    adminUsers,
    messages,
    loading,
    error,
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

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

const AppContent: React.FC = () => {
  const { loading, currentUser, currentClient, error } = useAppContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center">
          <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-slate-400">Verificando sesión...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-800 p-4">
        <div className="text-center max-w-2xl bg-white p-8 rounded-lg shadow-lg border border-red-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          <h2 className="text-2xl font-bold mb-2">Error de Aplicación</h2>
          <p className="text-red-700">{error}</p>
          <p className="mt-4 text-sm text-slate-500">
            Ocurrió un error al cargar los datos. Por favor, recargue la página.
            Si el problema persiste, contacte al soporte.
          </p>
        </div>
      </div>
    );
  }

  if (currentUser) return <DashboardScreen />;
  if (currentClient) return <ClientDashboardScreen />;
  return <LoginScreen />;
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}