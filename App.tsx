import React, { useState, useCallback, useContext, createContext, useEffect } from 'react';
import type { User, Client, Message, Task, Document } from './types';
import { UserRole, SatStatus, TaskStatus } from './types';
import LoginScreen from './components/LoginScreen';
import DashboardScreen from './components/DashboardScreen';
import ClientDashboardScreen from './components/ClientDashboardScreen';
import { supabase } from './supabaseClient';

// --- Data Mapping Helpers ---
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

const clientToSupabase = (client: Omit<Client, 'id' | 'satStatus' | 'isActive'> | Client) => ({
    company_name: client.companyName,
    legal_name: client.legalName,
    location: client.location,
    email: client.email,
    phone: client.phone,
    rfc: client.rfc,
    e_firma_filename: client.eFirma || null,
    csf_filename: client.csf || null,
    password: client.password,
    contact_admin_first_name: client.admin.firstName,
    contact_admin_paternal_last_name: client.admin.paternalLastName,
    contact_admin_maternal_last_name: client.admin.maternalLastName,
    contact_admin_phone: client.admin.phone,
    contact_admin_e_firma_filename: client.admin.eFirma || null,
    contact_admin_csf_filename: client.admin.csf || null,
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

const taskFromSupabase = (dbTask: any): Task => ({
    id: dbTask.id,
    clientId: dbTask.client_id,
    title: dbTask.title,
    description: dbTask.description,
    dueDate: dbTask.due_date,
    status: dbTask.status,
    createdAt: dbTask.created_at,
    completedAt: dbTask.completed_at,
});

const documentFromSupabase = (dbDoc: any): Document => ({
    id: dbDoc.id,
    clientId: dbDoc.client_id,
    fileName: dbDoc.file_name,
    filePath: dbDoc.file_path,
    folder: dbDoc.folder,
    uploadedBy: dbDoc.uploaded_by,
    uploadedAt: dbDoc.uploaded_at,
});

type AdminUsersState = Record<string, { role: UserRole, isActive: boolean }>;

type ClientFiles = {
  companyEFirma?: File;
  companyCsf?: File;
  adminEFirma?: File;
  adminCsf?: File;
};

interface AppContextType {
  currentUser: User | null;
  currentClient: Client | null;
  clients: Client[];
  adminUsers: AdminUsersState;
  messages: Message[];
  tasks: Task[];
  documents: Document[];
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<{ success: boolean, reason?: string }>;
  clientLogin: (email: string, pass: string) => Promise<{ success: boolean, reason?: string }>;
  logout: () => void;
  addClient: (client: Omit<Client, 'id' | 'satStatus' | 'isActive'>, files: ClientFiles) => Promise<{ success: boolean; reason?: string }>;
  updateClient: (client: Client, files: ClientFiles) => Promise<{ success: boolean; reason?: string }>;
  sendMessage: (clientId: string, content: string) => Promise<void>;
  toggleAdminStatus: (email: string) => Promise<void>;
  toggleClientStatus: (clientId: string) => Promise<void>;
  addAdminUser: (email: string, role: UserRole, password: string) => Promise<{ success: boolean; reason?: string }>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => Promise<{ success: boolean }>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<{ success: boolean }>;
  deleteTask: (taskId: string) => Promise<{ success: boolean }>;
  uploadDocument: (clientId: string, file: File, folder: string, uploadedBy: 'client' | 'admin') => Promise<{ success: boolean; reason?: string }>;
  deleteDocument: (doc: Document) => Promise<{ success: boolean; reason?: string }>;
  deleteClient: (clientId: string) => Promise<{ success: boolean; reason?: string }>;
  updateAdminUser: (email: string, role: UserRole) => Promise<{ success: boolean; reason?: string }>;
  deleteAdminUser: (email: string) => Promise<{ success: boolean; reason?: string }>;
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session?.user) {
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
            await supabase.auth.signOut();
            setCurrentUser(null);
          } else {
            setCurrentUser({
              email: session.user.email!,
              role: adminDetails.role as UserRole,
              isActive: adminDetails.is_active,
            });
          }
        } else {
            await supabase.auth.signOut();
            setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  
  useEffect(() => {
      const fetchDataForAdmin = async () => {
          if (!currentUser) {
              setClients([]);
              setMessages([]);
              setAdminUsers({});
              setTasks([]);
              setDocuments([]);
              return;
          };

          try {
              setLoading(true);
              const [clientsRes, adminsRes, messagesRes, tasksRes, documentsRes] = await Promise.all([
                  supabase.from('clients').select('*'),
                  supabase.from('administrators').select('email, role, is_active'),
                  supabase.from('messages').select('*').order('timestamp', { ascending: true }),
                  supabase.from('tasks').select('*').order('created_at', { ascending: false }),
                  supabase.from('documents').select('*').order('uploaded_at', { ascending: false })
              ]);

              if (clientsRes.error) throw clientsRes.error;
              if (adminsRes.error) throw adminsRes.error;
              if (messagesRes.error) throw messagesRes.error;
              if (tasksRes.error) throw tasksRes.error;
              if (documentsRes.error) throw documentsRes.error;

              setClients((clientsRes.data || []).map(clientFromSupabase));
              
              const adminsObject = (adminsRes.data || []).reduce((acc, admin) => {
                  acc[admin.email] = { role: admin.role, isActive: admin.is_active };
                  return acc;
              }, {} as AdminUsersState);
              setAdminUsers(adminsObject);

              setMessages((messagesRes.data || []).map(messageFromSupabase));
              setTasks((tasksRes.data || []).map(taskFromSupabase));
              setDocuments((documentsRes.data || []).map(documentFromSupabase));

          } catch (err: any) {
              console.error("Error fetching admin data:", err);
              setError('No se pudo cargar la información del panel de control. Verifique las políticas de seguridad (RLS).');
          } finally {
              setLoading(false);
          }
      };

      fetchDataForAdmin();
  }, [currentUser]);

  // --- Real-time subscriptions for new modules ---
    useEffect(() => {
        const handleDbChanges = (payload: any) => {
            console.log('DB Change:', payload);
            if (payload.eventType === 'INSERT') {
                if (payload.table === 'messages') setMessages(prev => [...prev, messageFromSupabase(payload.new)]);
                if (payload.table === 'tasks') setTasks(prev => [taskFromSupabase(payload.new), ...prev]);
                if (payload.table === 'documents') setDocuments(prev => [documentFromSupabase(payload.new), ...prev]);
            }
            if (payload.eventType === 'UPDATE') {
                if (payload.table === 'tasks') setTasks(prev => prev.map(t => t.id === payload.new.id ? taskFromSupabase(payload.new) : t));
                 if (payload.table === 'clients') setClients(prev => prev.map(c => c.id === payload.new.id ? clientFromSupabase(payload.new) : c));
                 if (payload.table === 'administrators') {
                    setAdminUsers(prev => ({...prev, [payload.new.email]: { role: payload.new.role, isActive: payload.new.is_active }}));
                 }
            }
            if (payload.eventType === 'DELETE') {
                 if (payload.table === 'tasks') setTasks(prev => prev.filter(t => t.id !== payload.old.id));
                 if (payload.table === 'documents') setDocuments(prev => prev.filter(d => d.id !== payload.old.id));
                 if (payload.table === 'clients') setClients(prev => prev.filter(c => c.id !== payload.old.id));
                 if (payload.table === 'administrators') {
                    setAdminUsers(prev => {
                        const newAdmins = {...prev};
                        delete newAdmins[payload.old.email];
                        return newAdmins;
                    });
                 }
            }
        };

        const subscription = supabase.channel('public-schema-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, handleDbChanges)
            .subscribe();
            
        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

  const login = useCallback(async (email: string, pass: string): Promise<{ success: boolean, reason?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    if (error) {
        return { success: false, reason: 'Correo electrónico o contraseña inválidos.' };
    }
    return { success: true };
  }, []);

  const clientLogin = useCallback(async (email: string, pass: string): Promise<{ success: boolean, reason?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const { data: client, error } = await supabase.from('clients').select('*').eq('email', trimmedEmail).single();
    if (error || !client) {
        return { success: false, reason: 'Correo electrónico o contraseña inválidos.' };
    }
    if (client.password === pass) {
        if (!client.is_active) return { success: false, reason: 'Su cuenta ha sido desactivada.' };
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

  const uploadAndReplaceCredential = async (
    clientId: string,
    file: File,
    oldFileName: string | undefined | null,
    type: 'company_efirma' | 'company_csf' | 'admin_efirma' | 'admin_csf'
  ) => {
    if (oldFileName) {
        const { error: removeError } = await supabase.storage
            .from('client-files')
            .remove([`${clientId}/credentials/${oldFileName}`]);
        if (removeError) {
            console.warn(`Could not remove old file: ${oldFileName}`, removeError);
        }
    }
    const newFileName = `${type}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from('client-files')
        .upload(`${clientId}/credentials/${newFileName}`, file);

    if (uploadError) {
        console.error('Upload error:', uploadError);
        return { success: false, fileName: null, reason: 'Error al subir el archivo.' };
    }
    return { success: true, fileName: newFileName, reason: null };
  };

  const addClient = useCallback(async (clientData: Omit<Client, 'id' | 'satStatus' | 'isActive'>, files: ClientFiles): Promise<{ success: boolean; reason?: string }> => {
    if (clients.some(c => c.email.toLowerCase() === clientData.email.toLowerCase())) {
        return { success: false, reason: 'Ya existe un cliente con este correo electrónico.' };
    }
    if (adminUsers[clientData.email]) {
        return { success: false, reason: 'Este correo electrónico ya está en uso por un administrador.' };
    }

    const initialSupabaseClient = {
        ...clientToSupabase(clientData),
        sat_status: SatStatus.PENDIENTE,
        is_active: true
    };
    
    const { data: newClientData, error: insertError } = await supabase.from('clients').insert(initialSupabaseClient).select().single();
    if (insertError || !newClientData) {
        console.error("Error adding client:", insertError);
        return { success: false, reason: 'Error en la base de datos al crear cliente.' };
    }
    
    const newClientId = newClientData.id;
    const fileUpdates: Record<string, string> = {};
    let uploadFailed = false;

    if (files.companyEFirma) {
        const result = await uploadAndReplaceCredential(newClientId, files.companyEFirma, null, 'company_efirma');
        if (result.success) fileUpdates.e_firma_filename = result.fileName!; else uploadFailed = true;
    }
    if (files.companyCsf) {
        const result = await uploadAndReplaceCredential(newClientId, files.companyCsf, null, 'company_csf');
        if (result.success) fileUpdates.csf_filename = result.fileName!; else uploadFailed = true;
    }
    if (files.adminEFirma) {
        const result = await uploadAndReplaceCredential(newClientId, files.adminEFirma, null, 'admin_efirma');
        if (result.success) fileUpdates.contact_admin_e_firma_filename = result.fileName!; else uploadFailed = true;
    }
    if (files.adminCsf) {
        const result = await uploadAndReplaceCredential(newClientId, files.adminCsf, null, 'admin_csf');
        if (result.success) fileUpdates.contact_admin_csf_filename = result.fileName!; else uploadFailed = true;
    }
    
    if (uploadFailed) {
        await supabase.from('clients').delete().eq('id', newClientId);
        return { success: false, reason: 'Falló la subida de uno o más archivos. Se canceló el registro.' };
    }

    if (Object.keys(fileUpdates).length > 0) {
        const { data: updatedClientData, error: updateError } = await supabase.from('clients').update(fileUpdates).eq('id', newClientId).select().single();
        if (updateError) {
            console.error("Error updating client with files:", updateError);
            return { success: false, reason: 'No se pudieron guardar los nombres de los archivos.' };
        }
        setClients(prevClients => [...prevClients, clientFromSupabase(updatedClientData)]);
    } else {
        setClients(prevClients => [...prevClients, clientFromSupabase(newClientData)]);
    }

    return { success: true };
  }, [clients, adminUsers]);

  const updateClient = useCallback(async (clientToUpdate: Client, files: ClientFiles): Promise<{ success: boolean; reason?: string }> => {
    let clientWithNewFiles = JSON.parse(JSON.stringify(clientToUpdate));
    let uploadFailed = false;
    let uploadErrorReason = '';

    const processUpload = async (fileKey: keyof ClientFiles, credentialType: 'company_efirma' | 'company_csf' | 'admin_efirma' | 'admin_csf', oldFileName: string | undefined | null, updatePath: string[]) => {
        if (files[fileKey]) {
            const result = await uploadAndReplaceCredential(clientToUpdate.id, files[fileKey]!, oldFileName, credentialType);
            if (result.success) {
                if(updatePath.length === 1) (clientWithNewFiles as any)[updatePath[0]] = result.fileName!;
                else (clientWithNewFiles as any)[updatePath[0]][updatePath[1]] = result.fileName!;
            } else {
                uploadFailed = true;
                uploadErrorReason = result.reason!;
            }
        }
    };
    
    await processUpload('companyEFirma', 'company_efirma', clientToUpdate.eFirma, ['eFirma']);
    if(uploadFailed) return { success: false, reason: uploadErrorReason };

    await processUpload('companyCsf', 'company_csf', clientToUpdate.csf, ['csf']);
    if(uploadFailed) return { success: false, reason: uploadErrorReason };

    await processUpload('adminEFirma', 'admin_efirma', clientToUpdate.admin.eFirma, ['admin', 'eFirma']);
    if(uploadFailed) return { success: false, reason: uploadErrorReason };

    await processUpload('adminCsf', 'admin_csf', clientToUpdate.admin.csf, ['admin', 'csf']);
    if(uploadFailed) return { success: false, reason: uploadErrorReason };
    
    const supabaseClient = clientToSupabase(clientWithNewFiles);
    const { data, error } = await supabase.from('clients').update(supabaseClient).eq('id', clientToUpdate.id).select().single();
    
    if (error) {
        console.error("Error updating client:", error);
        return { success: false, reason: 'Error en la base de datos.' };
    }
    setClients(prevClients => prevClients.map(c => c.id === clientToUpdate.id ? clientFromSupabase(data) : c));
    return { success: true };
}, []);

  const sendMessage = useCallback(async (clientId: string, content: string) => {
    const sender = currentUser ? 'admin' : 'client';
    if (!content.trim()) return;

    const { error } = await supabase.from('messages').insert({
        client_id: clientId,
        content: content,
        sender: sender,
    });
    if (error) {
        console.error("Error sending message:", error);
    }
  }, [currentUser]);

  const toggleAdminStatus = useCallback(async (email: string) => {
    const userToToggle = adminUsers[email];
    if (!userToToggle) return;
    const newStatus = !userToToggle.isActive;

    const { error } = await supabase.from('administrators').update({ is_active: newStatus }).eq('email', email);

    if (error) {
        console.error("Error toggling admin status:", error);
        return;
    }
    setAdminUsers(prev => ({
        ...prev,
        [email]: { ...prev[email], isActive: newStatus }
    }));
  }, [adminUsers]);

  const toggleClientStatus = useCallback(async (clientId: string) => {
    const clientToToggle = clients.find(c => c.id === clientId);
    if (!clientToToggle) return;
    const newStatus = !clientToToggle.isActive;

    const { error } = await supabase.from('clients').update({ is_active: newStatus }).eq('id', clientId);

    if (error) {
        console.error("Error toggling client status:", error);
        return;
    }

    setClients(prev => prev.map(c => c.id === clientId ? { ...c, isActive: newStatus } : c));
  }, [clients]);

  const addAdminUser = useCallback(async (email: string, role: UserRole, password: string): Promise<{ success: boolean; reason?: string }> => {
    if (adminUsers[email]) {
        return { success: false, reason: 'Ya existe un administrador con este correo electrónico.' };
    }
    if (clients.some(client => client.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, reason: 'Este correo electrónico ya está en uso por un cliente.' };
    }

    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (signUpError) {
        console.error("Error signing up new admin:", signUpError);
        return { success: false, reason: signUpError.message };
    }
    if (!user) {
        return { success: false, reason: "No se pudo crear el usuario en el sistema de autenticación."}
    }

    const { error: insertError } = await supabase
        .from('administrators')
        .insert({ user_id: user.id, email: email, role: role, is_active: true });

    if (insertError) {
        console.error("Error inserting new admin into profiles:", insertError);
        return { success: false, reason: "No se pudo guardar el perfil del administrador." };
    }

    setAdminUsers(prev => ({...prev, [email]: { role, isActive: true }}));
    return { success: true };
  }, [adminUsers, clients]);

  // --- New Task and Document Functions ---
  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'status'>): Promise<{ success: boolean }> => {
    const { error } = await supabase.from('tasks').insert({
        client_id: task.clientId,
        title: task.title,
        description: task.description,
        due_date: task.dueDate,
        status: TaskStatus.PENDIENTE,
    });
    if (error) {
        console.error("Error adding task:", error);
        return { success: false };
    }
    return { success: true };
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>): Promise<{ success: boolean }> => {
    const dbUpdates: any = {
      ...('title' in updates && { title: updates.title }),
      ...('description' in updates && { description: updates.description }),
      ...('dueDate' in updates && { due_date: updates.dueDate }),
      ...('status' in updates && { status: updates.status }),
    };
    if (updates.status === TaskStatus.COMPLETADA) {
        dbUpdates.completed_at = new Date().toISOString();
    }
    const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', taskId);
    if (error) {
        console.error("Error updating task:", error);
        return { success: false };
    }
    return { success: true };
  }, []);

  const deleteTask = useCallback(async (taskId: string): Promise<{ success: boolean }> => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
        console.error("Error deleting task:", error);
        return { success: false };
    }
    return { success: true };
  }, []);
  
  const uploadDocument = useCallback(async (clientId: string, file: File, folder: string, uploadedBy: 'client' | 'admin'): Promise<{ success: boolean; reason?: string }> => {
      const filePath = `${clientId}/documents/${folder}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage.from('client-files').upload(filePath, file);
      if (uploadError) {
          console.error("Storage upload error:", uploadError);
          return { success: false, reason: "Error al subir el archivo." };
      }

      const { error: dbError } = await supabase.from('documents').insert({
          client_id: clientId,
          file_name: file.name,
          file_path: filePath,
          folder: folder,
          uploaded_by: uploadedBy
      });

      if (dbError) {
          console.error("DB insert error after upload:", dbError);
          // Attempt to clean up orphaned file
          await supabase.storage.from('client-files').remove([filePath]);
          return { success: false, reason: "Error al guardar la referencia del archivo." };
      }
      return { success: true };
  }, []);

  const deleteDocument = useCallback(async (doc: Document): Promise<{ success: boolean; reason?: string }> => {
      const { error: storageError } = await supabase.storage.from('client-files').remove([doc.filePath]);
      if (storageError) {
          console.error("Storage delete error:", storageError);
          return { success: false, reason: "Error al eliminar el archivo del almacenamiento." };
      }

      const { error: dbError } = await supabase.from('documents').delete().eq('id', doc.id);
      if (dbError) {
          console.error("DB delete error:", dbError);
          return { success: false, reason: "Error al eliminar la referencia del archivo." };
      }
      return { success: true };
  }, []);

  // --- New Admin Management Functions ---
  const deleteClient = useCallback(async (clientId: string): Promise<{ success: boolean; reason?: string }> => {
      const { data: clientDocs, error: docsError } = await supabase
          .from('documents')
          .select('file_path')
          .eq('client_id', clientId);
      
      if (docsError) {
          console.error("Error fetching client documents for deletion:", docsError);
          return { success: false, reason: 'No se pudieron obtener los documentos del cliente para eliminar.' };
      }

      if (clientDocs && clientDocs.length > 0) {
          const filePaths = clientDocs.map(doc => doc.file_path);
          const { error: removeError } = await supabase.storage.from('client-files').remove(filePaths);
          if (removeError) {
              console.error("Error deleting client files from storage:", removeError);
              return { success: false, reason: 'No se pudieron eliminar los archivos del cliente del almacenamiento.' };
          }
      }

      await supabase.from('messages').delete().eq('client_id', clientId);
      await supabase.from('tasks').delete().eq('client_id', clientId);
      await supabase.from('documents').delete().eq('client_id', clientId);

      const { error: deleteError } = await supabase.from('clients').delete().eq('id', clientId);
      if (deleteError) {
          console.error("Error deleting client:", deleteError);
          return { success: false, reason: 'Error al eliminar el cliente de la base de datos.' };
      }

      setClients(prev => prev.filter(c => c.id !== clientId));
      return { success: true };
  }, []);

  const updateAdminUser = useCallback(async (email: string, role: UserRole): Promise<{ success: boolean; reason?: string }> => {
      const { error } = await supabase
          .from('administrators')
          .update({ role: role })
          .eq('email', email);

      if (error) {
          console.error("Error updating admin user:", error);
          return { success: false, reason: "No se pudo actualizar el rol del administrador." };
      }

      setAdminUsers(prev => ({
          ...prev,
          [email]: { ...prev[email], role: role }
      }));
      return { success: true };
  }, []);

  const deleteAdminUser = useCallback(async (email: string): Promise<{ success: boolean; reason?: string }> => {
      if (currentUser && currentUser.email === email) {
          return { success: false, reason: "No puede eliminar su propia cuenta." };
      }
      
      const { error } = await supabase
          .from('administrators')
          .delete()
          .eq('email', email);
      
      if (error) {
          console.error("Error deleting admin user:", error);
          return { success: false, reason: "No se pudo eliminar al administrador." };
      }

      setAdminUsers(prev => {
          const newAdmins = { ...prev };
          delete newAdmins[email];
          return newAdmins;
      });

      return { success: true };
  }, [currentUser]);

  const contextValue = {
    currentUser,
    currentClient,
    clients,
    adminUsers,
    messages,
    tasks,
    documents,
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
    addTask,
    updateTask,
    deleteTask,
    uploadDocument,
    deleteDocument,
    deleteClient,
    updateAdminUser,
    deleteAdminUser,
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