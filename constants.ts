import { User, UserRole, Client, SatStatus, Message } from './types';

export const ADMIN_USERS: Record<string, { role: UserRole; isActive: boolean; password?: string; }> = {
  'adminuno@gmail.com': { role: UserRole.LEVEL_1, isActive: true, password: '123456' },
  'admindos@gmail.com': { role: UserRole.LEVEL_2, isActive: true, password: '123456' },
  'admintres@gmail.com': { role: UserRole.LEVEL_3, isActive: true, password: '123456' },
};

export const MOCK_CLIENTS: Client[] = [
    {
        id: 'cl-001',
        companyName: 'Innovatech Solutions',
        legalName: 'Innovatech Solutions S.A. de C.V.',
        location: 'Monterrey, NL, México',
        email: 'contact@innovatech.com',
        phone: '81-1234-5678',
        rfc: 'ISO180101ABC',
        eFirma: 'efirma_innovatech.zip',
        csf: 'csf_innovatech.pdf',
        password: 'cliente123',
        satStatus: SatStatus.AL_CORRIENTE,
        isActive: true,
        admin: {
            firstName: 'Ana',
            paternalLastName: 'García',
            maternalLastName: 'Pérez',
            phone: '81-8765-4321'
        }
    },
    {
        id: 'cl-002',
        companyName: 'Constructora del Norte',
        legalName: 'Constructora del Norte S.A.',
        location: 'Ciudad de México, México',
        email: 'info@constructora-norte.mx',
        phone: '55-9876-5432',
        rfc: 'CNO090512XYZ',
        eFirma: 'efirma_constructora.zip',
        csf: 'csf_constructora.pdf',
        password: 'cliente123',
        satStatus: SatStatus.CON_ADEUDOS,
        isActive: true,
        admin: {
            firstName: 'Carlos',
            paternalLastName: 'Rodríguez',
            maternalLastName: 'Martínez',
            phone: '55-2345-6789'
        }
    },
    {
        id: 'cl-003',
        companyName: 'Agro-Exportadores del Bajío',
        legalName: 'Agro-Exportadores del Bajío S. de R.L.',
        location: 'Guadalajara, JAL, México',
        email: 'ventas@agroexport.com',
        phone: '33-1122-3344',
        rfc: 'AEB151120DEF',
        eFirma: 'efirma_agro.zip',
        csf: 'csf_agro.pdf',
        password: 'cliente123',
        satStatus: SatStatus.EN_REVISION,
        isActive: true,
        admin: {
            firstName: 'Sofía',
            paternalLastName: 'Hernández',
            maternalLastName: 'López',
            phone: '33-5566-7788'
        }
    }
];

export const MOCK_MESSAGES: Message[] = [
    {
        id: 'msg-001',
        clientId: 'cl-001',
        sender: 'client',
        content: 'Hola, tengo una duda sobre mi última declaración. ¿Podrían revisarla?',
        timestamp: '2024-07-29T10:30:00Z'
    },
    {
        id: 'msg-002',
        clientId: 'cl-001',
        sender: 'admin',
        content: 'Claro Ana, lo revisamos y te contactamos en breve.',
        timestamp: '2024-07-29T10:35:00Z'
    }
];